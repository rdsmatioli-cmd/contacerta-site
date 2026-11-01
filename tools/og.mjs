// Gera as artes de compartilhamento do Conta Certa (og/<nome>.jpg, 1200x630) no layout das demais: fundo tinta com
// grade, marca, selo da categoria, título, subtítulo, chips, domínio e o ícone da página num quadrado lima. Criado no
// CC-SITE-07 (o /irpf/ saiu com a arte da calculadora de IRRF mensal); serve para as próximas páginas.
//
// Uso, na raiz do repositório (precisa do `npm ci --ignore-scripts` de tests/e2e, que traz o Playwright):
//   node tools/og.mjs            gera todas as artes de ARTES
//   node tools/og.mjs irpf       gera só og/irpf.jpg
// CHROME_PATH aponta outro Chromium quando o build do Playwright não está instalado.
//
// Sem rede: a página é montada em memória (setContent) com a fonte de /fonts embutida e o ícone tirado do sprite da
// própria página; toda requisição é abortada. Textos da arte saem do que a página já diz (H1, lead, meta): arte nova
// não cria afirmação que a página não tem. Depois de gerar, confira a arte e rode node --test 'tests/*.test.mjs'
// (tests/og-imagens.test.mjs barra arte copiada de outra página e medida diferente da declarada).
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(join(RAIZ, 'tests/e2e/package.json'));

// nome -> página (para o ícone) e textos. selo: categoria da página (cat-pill); chips: até 3, curtos.
export const ARTES = {
  irpf: {
    pagina: 'irpf/index.html',
    icone: 'i-recibo',
    selo: 'Impostos',
    titulo: 'Simulador do IRPF 2027: estimativa da restituição',
    subtitulo: 'Compare os modelos completo e simplificado.',
    chips: ['Grátis', 'Valores de 2026', 'Sem cadastro'],
  },
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function icone(pagina, id) {
  const html = readFileSync(join(RAIZ, pagina), 'utf8');
  const m = html.match(new RegExp(`<symbol id="${id}" viewBox="([^"]+)">([^]*?)</symbol>`));
  if (!m) throw new Error(`${pagina}: símbolo ${id} não está no sprite`);
  return `<svg viewBox="${m[1]}" fill="none" stroke="#0b2b20" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${m[2]}</svg>`;
}

function montar(arte) {
  const fonte = readFileSync(join(RAIZ, 'fonts/plus-jakarta-sans-latin.woff2')).toString('base64');
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>
@font-face{font-family:"Plus Jakarta Sans";font-weight:400 800;src:url(data:font/woff2;base64,${fonte}) format("woff2")}
*{box-sizing:border-box;margin:0}
html,body{width:1200px;height:630px;overflow:hidden}
body{position:relative;font-family:"Plus Jakarta Sans";color:#fff;background:#0b2b20;-webkit-font-smoothing:antialiased}
.fundo{position:absolute;inset:0;background:radial-gradient(900px 520px at 100% 0,#1d5842,transparent 70%),radial-gradient(700px 420px at 0 100%,#0f392b,transparent 70%)}
.grade{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px);background-size:44px 44px;-webkit-mask-image:linear-gradient(90deg,transparent 15%,#000 85%)}
.marca{position:absolute;left:72px;top:60px;display:flex;align-items:center;gap:18px;font-size:34px;font-weight:800;letter-spacing:-.02em}
.marca .logo{width:62px;height:62px;border-radius:15px;border:2px solid rgba(255,255,255,.22);background:rgba(0,0,0,.12);display:grid;place-items:center}
.marca .logo svg{width:54px;height:54px}
.marca b{color:#c5f25c;font-weight:800}
.texto{position:absolute;left:72px;top:172px;width:760px}
.selo{display:inline-flex;align-items:center;height:48px;padding:0 20px;border-radius:999px;background:rgba(197,242,92,.14);border:1.5px solid rgba(197,242,92,.45);color:#dbf3a8;font-size:22px;font-weight:700}
h1{margin-top:28px;font-size:62px;line-height:1.1;font-weight:800;letter-spacing:-.035em}
p{margin-top:16px;font-size:28px;line-height:1.3;font-weight:500;color:#bcd8cb}
.chips{position:absolute;left:72px;top:523px;display:flex;gap:12px}
.chips span{display:inline-flex;align-items:center;height:47px;padding:0 17px;border-radius:10px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);color:#cfeadd;font-size:22px;font-weight:700}
.dominio{position:absolute;right:72px;top:530px;line-height:36px;font-size:24px;font-weight:800;letter-spacing:-.01em}
.tile{position:absolute;left:905px;top:150px;width:226px;height:226px;border-radius:50px;background:#c5f25c;transform:rotate(-7deg);box-shadow:0 30px 70px rgba(0,0,0,.4);display:grid;place-items:center}
.tile svg{width:118px;height:118px}
</style></head><body>
<div class="fundo"></div><div class="grade"></div>
<div class="marca"><span class="logo"><svg viewBox="8 8 48 48" aria-hidden="true"><path d="M16 24h32M16 40h14" stroke="#fff" stroke-width="6.5" stroke-linecap="round"/><path d="M37 39.5l4.5 4.5L50 35" fill="none" stroke="#c5f25c" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span>Conta <b>Certa</b></span></div>
<div class="texto"><span class="selo">${esc(arte.selo)}</span><h1>${esc(arte.titulo)}</h1><p>${esc(arte.subtitulo)}</p></div>
<div class="chips">${arte.chips.map((c) => `<span>${esc(c)}</span>`).join('')}</div>
<div class="dominio">contacertabr.com.br</div>
<div class="tile">${icone(arte.pagina, arte.icone)}</div>
</body></html>`;
}

async function gerar(nomes) {
  const { chromium } = require('@playwright/test');
  const navegador = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-proxy-server'] });
  try {
    const pagina = await navegador.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    await pagina.route(/.*/, (r) => (r.request().url().startsWith('data:') ? r.continue() : r.abort()));
    for (const nome of nomes) {
      const arte = ARTES[nome];
      if (!arte) throw new Error(`arte desconhecida: ${nome} (conhecidas: ${Object.keys(ARTES).join(', ')})`);
      await pagina.setContent(montar(arte), { waitUntil: 'load' });
      await pagina.evaluate(() => document.fonts.ready);
      // Título e subtítulo precisam caber: no máximo 2 linhas de título e o texto acima dos chips.
      const medida = await pagina.evaluate(() => {
        const h1 = document.querySelector('h1');
        const linhas = Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight));
        const fimTexto = document.querySelector('.texto').getBoundingClientRect().bottom;
        const fonteOk = document.fonts.check('800 62px "Plus Jakarta Sans"');
        return { linhas, fimTexto, fonteOk };
      });
      if (!medida.fonteOk) throw new Error(`${nome}: a fonte Plus Jakarta Sans não carregou`);
      if (medida.linhas > 2 || medida.fimTexto > 500) throw new Error(`${nome}: texto grande demais (${medida.linhas} linhas de título, termina em ${Math.round(medida.fimTexto)}px; o limite é 500px)`);
      const saida = join(RAIZ, 'og', `${nome}.jpg`);
      await pagina.screenshot({ path: saida, type: 'jpeg', quality: 88, clip: { x: 0, y: 0, width: 1200, height: 630 } });
      console.log(`og/${nome}.jpg gerada (${medida.linhas} linha(s) de título)`);
    }
  } finally {
    await navegador.close();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const nomes = process.argv.slice(2);
  gerar(nomes.length ? nomes : Object.keys(ARTES)).catch((e) => { console.error(e.message); process.exitCode = 1; });
}
