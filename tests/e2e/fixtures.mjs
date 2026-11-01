// Fixtures comuns: rede isolada (só o servidor local), coleta de erros de console e pageerror, e conferência de que o
// envio do formulário não recarrega a página.
import { test as base, expect } from '@playwright/test';
import { BASE } from './site.mjs';

const LOCAL = new URL(BASE).host;
const REDE = new Set(['http:', 'https:', 'ws:', 'wss:']);
const externa = (url) => { try { const u = new URL(url); return REDE.has(u.protocol) && u.host !== LOCAL; } catch { return false; } };

// Dicas de conexão (<link rel=preconnect>, dns-prefetch...) não geram o evento request do Playwright, mas o navegador
// abre DNS, TCP e TLS com o host. Um MutationObserver instalado antes de qualquer script da página (inclusive nas
// recargas) avisa cada uma que aponte para outro host, também as inseridas por script.
const DICAS = ['preconnect', 'dns-prefetch', 'preload', 'prefetch', 'modulepreload', 'prerender'];
function observarDicas(dicas) {
  const conferir = (el) => {
    if (el.localName !== 'link') return;
    const rel = (el.getAttribute('rel') || '').toLowerCase().split(/\s+/).filter((r) => dicas.includes(r));
    const href = el.getAttribute('href');
    if (!rel.length || !href) return;
    let u;
    try { u = new URL(href, document.baseURI); } catch { return; }
    if (u.host !== location.host) window.__e2eDicaExterna(rel.join(' '), u.href);
  };
  new MutationObserver((mudancas) => {
    for (const m of mudancas) {
      if (m.type === 'attributes') conferir(m.target);
      for (const n of m.addedNodes) if (n.nodeType === 1) { conferir(n); n.querySelectorAll('link').forEach(conferir); }
    }
  }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['rel', 'href'] });
}

// google*, googletagmanager*, google-analytics*, doubleclick* e gstatic*, em qualquer nível do host.
export const ehGoogle = (url) => {
  try { return new URL(url).hostname.split('.').some((r) => /^(google|doubleclick|gstatic)/i.test(r)); } catch { return false; }
};

export const test = base.extend({
  // Toda requisição a outro host é abortada e registrada. `tentativas` vem do evento request (vale também para o que
  // não passar pelo roteamento) e do roteamento de WebSocket, que o context.route não pega; `abortadas` prova que o
  // roteamento barrou. `dicas` são os preconnect, dns-prefetch etc. para outro host. Falha de recurso local (4xx/5xx
  // ou erro de rede) também é registrada.
  rede: [async ({ context }, use) => {
    const rede = { tentativas: [], abortadas: [], dicas: [], falhasLocais: [] };
    rede.google = () => [...rede.tentativas.filter(ehGoogle), ...rede.dicas.filter((d) => ehGoogle(d.url)).map((d) => `${d.rel} ${d.url}`)];
    await context.exposeBinding('__e2eDicaExterna', (_fonte, rel, url) => { rede.dicas.push({ rel, url }); });
    await context.addInitScript(observarDicas, DICAS);
    context.on('request', (r) => { if (externa(r.url())) rede.tentativas.push(r.url()); });
    context.on('response', (r) => { if (!externa(r.url()) && r.status() >= 400) rede.falhasLocais.push(`${r.status()} ${r.url()}`); });
    context.on('requestfailed', (r) => {
      const motivo = (r.failure() || {}).errorText || '';
      // ERR_ABORTED é cancelamento (recarga da página no meio do carregamento), não falha do recurso.
      if (!externa(r.url()) && !/ERR_ABORTED/.test(motivo)) rede.falhasLocais.push(`${motivo} ${r.url()}`);
    });
    await context.route(/.*/, (route) => {
      const url = route.request().url();
      if (!externa(url)) return route.fallback();
      rede.abortadas.push(url);
      return route.abort('blockedbyclient');
    });
    // WebSocket para outro host: registrado e fechado sem conectar (a página fala com um WebSocket simulado).
    await context.routeWebSocket(/.*/, (ws) => {
      if (!externa(ws.url())) return ws.connectToServer();
      rede.tentativas.push(ws.url());
      rede.abortadas.push(ws.url());
      return ws.close();
    });
    // WebSocket aberto por um Worker não passa pelo routeWebSocket, mas aparece no evento websocket da página; sem
    // proxy e sem DNS (playwright.config.mjs), a conexão falha no navegador.
    const ouvirWebSocket = (p) => p.on('websocket', (ws) => { if (externa(ws.url())) rede.tentativas.push(ws.url()); });
    context.pages().forEach(ouvirWebSocket);
    context.on('page', ouvirWebSocket);
    await use(rede);
  }, { auto: true }],

  erros: [async ({ context }, use) => {
    const erros = [];
    context.on('console', (m) => { if (m.type() === 'error') erros.push({ texto: m.text(), url: m.location().url || '' }); });
    context.on('weberror', (e) => erros.push({ texto: `pageerror: ${e.error().message}`, url: '' }));
    await use(erros);
  }, { auto: true }],
});
export { expect };

// Sem erro de console, sem pageerror e sem recurso local quebrado. O erro de console de um recurso externo que o
// próprio teste abortou (net::ERR_BLOCKED_BY_CLIENT) não conta aqui: quem acusa a requisição externa, com a URL, é o
// semRedeExterna, que os testes chamam antes; o teste do Aceitar confere as tentativas à parte.
export function semErros(erros, rede) {
  const lista = erros
    .filter((e) => !rede.abortadas.includes(e.url))
    .map((e) => (e.url ? `${e.texto} [${e.url}]` : e.texto));
  expect(lista, 'erros de console ou pageerror').toEqual([]);
  expect(rede.falhasLocais, 'recursos locais com falha').toEqual([]);
}

// Nenhuma requisição (HTTP ou WebSocket) e nenhuma dica de conexão para outro host. A página não pode pedir nada de
// fora antes do aceite: imagem, vídeo, fonte, script de terceiro ou preconnect derrubam o teste de propósito.
export function semRedeExterna(rede) {
  expect(rede.tentativas, 'requisições a hosts externos (abortadas)').toEqual([]);
  expect(rede.dicas.map((d) => `${d.rel} ${d.url}`), 'dicas de conexão (preconnect, dns-prefetch...) para hosts externos').toEqual([]);
}

// Envio sem recarga. Se o JS não tratar o submit, o navegador faz o GET nativo, a página recarrega com os valores na
// query string e o cálculo do carregamento mostra o resultado dos padrões (a classe de defeito do M01 no ui.js): o
// número na tela não basta. `prepararEnvio` marca a janela e ouve o submit no fim da propagação; `semRecarga` exige a
// mesma janela e o envio nativo cancelado (defaultPrevented) em cada submit desde a marcação.
export async function prepararEnvio(page) {
  await page.evaluate(() => {
    window.__e2eMesmaJanela = true;
    window.__e2eEnvios = [];
    if (!window.__e2eOuvindoEnvio) {
      window.__e2eOuvindoEnvio = true;
      window.addEventListener('submit', (e) => window.__e2eEnvios.push(e.defaultPrevented));
    }
  });
}
export async function semRecarga(page) {
  const r = await page.evaluate(() => ({ mesmaJanela: window.__e2eMesmaJanela === true, envioNativoCancelado: window.__e2eEnvios }));
  expect(r, 'o envio não recarrega a página (o JS cancela o envio nativo)').toEqual({ mesmaJanela: true, envioNativoCancelado: [true] });
}

// Rolagem horizontal: a largura do documento não pode passar da largura da janela. Na falha, lista até 5 elementos
// que passam da borda direita, para achar o culpado.
export async function semRolagemHorizontal(page) {
  const r = await page.evaluate(() => {
    const raiz = document.documentElement;
    const cw = raiz.clientWidth, sw = raiz.scrollWidth, culpados = [];
    if (sw > cw) {
      for (const el of document.body.querySelectorAll('*')) {
        const b = el.getBoundingClientRect();
        if (b.width > 0 && b.right > cw + 1) {
          culpados.push(`${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.classList.length ? `.${[...el.classList].join('.')}` : ''} (${Math.round(b.right)}px)`);
          if (culpados.length === 5) break;
        }
      }
    }
    return { cw, sw, culpados };
  });
  expect(r.sw, `rolagem horizontal: documento com ${r.sw}px numa janela de ${r.cw}px; passam da borda: ${r.culpados.join(', ')}`)
    .toBeLessThanOrEqual(r.cw);
}

// Espera a rede local assentar (scripts com defer, módulos, eventos tardios) antes de conferir.
export async function assentar(page) {
  await page.waitForLoadState('load');
  await page.waitForLoadState('networkidle');
}

// Células de tabela cortadas (CC-SITE-05 e -08): de cada td/th visível, sobe até o primeiro ancestral que rola
// (overflow auto/scroll); a célula precisa caber em todo ancestral com overflow hidden/clip do caminho. O
// semRolagemHorizontal não vê o que esse corte esconde. Devolve uma linha por célula, com a tabela, o ancestral que corta
// e quantos pixels passam da borda.
export const celulasCortadas = (page) => page.evaluate(medirTabelas);
function medirTabelas() {
  const nome = (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.classList.length ? `.${[...el.classList].join('.')}` : ''}`;
  const fora = [];
  for (const cel of document.querySelectorAll('td, th')) {
    const b = cel.getBoundingClientRect();
    if (b.width <= 1 || b.height <= 1 || !cel.checkVisibility({ checkVisibilityCSS: true })) continue;
    for (let a = cel.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const ox = getComputedStyle(a).overflowX;
      if (ox === 'auto' || ox === 'scroll') break;
      if (ox !== 'hidden' && ox !== 'clip') continue;
      const c = a.getBoundingClientRect();
      const sobra = Math.max(b.right - c.right, c.left - b.left);
      if (sobra <= 1) continue;
      const tabela = cel.closest('table');
      const legenda = tabela && tabela.caption ? ` da tabela "${tabela.caption.textContent.trim().slice(0, 50)}"` : '';
      fora.push(`célula ${nome(cel)} "${cel.textContent.replace(/\s+/g, ' ').trim().slice(0, 30)}"${legenda}: ${Math.round(sobra)}px além da borda de ${nome(a)} (overflow-x ${ox}, sem rolagem)`);
      break;
    }
  }
  return fora;
}
