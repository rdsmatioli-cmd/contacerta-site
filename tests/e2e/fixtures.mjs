// Fixtures comuns: rede isolada (só o servidor local) e coleta de erros de console e pageerror.
import { test as base, expect } from '@playwright/test';
import { BASE } from './site.mjs';

const LOCAL = new URL(BASE).host;
const http = (u) => u.protocol === 'http:' || u.protocol === 'https:';
const externa = (url) => { try { const u = new URL(url); return http(u) && u.host !== LOCAL; } catch { return false; } };

// google*, googletagmanager*, google-analytics*, doubleclick* e gstatic*, em qualquer nível do host.
export const ehGoogle = (url) => {
  try { return new URL(url).hostname.split('.').some((r) => /^(google|doubleclick|gstatic)/i.test(r)); } catch { return false; }
};

export const test = base.extend({
  // Toda requisição a outro host é abortada e registrada. `tentativas` vem do evento request (vale também para o que
  // não passar pelo roteamento); `abortadas` prova que o roteamento barrou. Falha de recurso local (4xx/5xx ou erro de
  // rede) também é registrada.
  rede: [async ({ context }, use) => {
    const rede = { tentativas: [], abortadas: [], falhasLocais: [] };
    rede.google = () => rede.tentativas.filter(ehGoogle);
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

// Sem erro de console, sem pageerror e sem recurso local quebrado. `externasAbortadas`: aceita o erro de console do
// carregamento externo que o próprio teste abortou (o gtag.js depois do Aceitar).
export function semErros(erros, rede, { externasAbortadas = false } = {}) {
  const lista = erros
    .filter((e) => !(externasAbortadas && rede.abortadas.includes(e.url)))
    .map((e) => (e.url ? `${e.texto} [${e.url}]` : e.texto));
  expect(lista, 'erros de console ou pageerror').toEqual([]);
  expect(rede.falhasLocais, 'recursos locais com falha').toEqual([]);
}

export function semRedeExterna(rede) {
  expect(rede.tentativas, 'requisições a hosts externos (abortadas)').toEqual([]);
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
