// A-PR35-19 (perf mobile 100): o CSS de /licitacoes/assets/ (tokens.css + site.css) vai inline em cada página do
// Licitações, sem request bloqueante de renderização. Os arquivos .css continuam a fonte única; rode
// `node tools/licitacoes-css-inline.mjs` depois de mudá-los (o teste tests/licitacoes-css-inline.test.mjs confere).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../', import.meta.url));
export const PAGINAS = [
  'licitacoes/index.html', 'licitacoes/politica.html', 'licitacoes/cobranca/index.html', 'licitacoes/blog/index.html',
  'licitacoes/blog/como-encontrar-licitacoes.html', 'licitacoes/blog/pregoes-material-de-limpeza-pncp.html',
  'licitacoes/editais/material-de-limpeza.html', 'licitacoes/contratos/index.html',
];
const ler = (p) => readFileSync(raiz + p, 'utf8');
export function cssInline() {
  const css = ler('licitacoes/assets/tokens.css') + '\n' + ler('licitacoes/assets/site.css');
  return minificar(css.replace(/url\("fonts\//g, 'url("/licitacoes/assets/fonts/'));
}
// Minificação conservadora: tira comentários e espaços em volta de { } ; , e > (fora de strings, que o CSS daqui não
// tem com esses caracteres), e o ; antes de }.
export function minificar(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{};,>])\s*/g, '$1')
    .replace(/;}/g, '}').trim();
}
// Por página, só as regras cujos seletores podem casar: toda classe/id do seletor aparece no HTML da página ou nas
// classes que licitacoes/assets/app.js aplica. Seletores sem classe/id (html, body, h1, :root...) e @font-face ficam.
const CLASSES_JS = ['pill', 'cd', 'n', 'r', 'a', 'ruler', 'on'];
function tokensDaPagina(html) {
  const s = new Set(CLASSES_JS.map((c) => '.' + c));
  for (const m of html.matchAll(/\sclass="([^"]*)"/g)) for (const c of m[1].split(/\s+/)) if (c) s.add('.' + c);
  for (const m of html.matchAll(/\sid="([^"]*)"/g)) s.add('#' + m[1]);
  return s;
}
const seletorCasa = (sel, tk) => (sel.match(/[.#][A-Za-z_][\w-]*/g) || []).every((x) => tk.has(x));
function regras(css) { // [prelúdio, corpo] de primeiro nível
  const out = []; let i = 0;
  while (i < css.length) {
    const a = css.indexOf('{', i); if (a < 0) break;
    let d = 1, j = a + 1;
    while (d && j < css.length) { if (css[j] === '{') d++; else if (css[j] === '}') d--; j++; }
    out.push([css.slice(i, a), css.slice(a + 1, j - 1)]); i = j;
  }
  return out;
}
export function podar(css, html) {
  const tk = tokensDaPagina(html);
  const p = (c) => regras(c).map(([pre, corpo]) => {
    if (pre.startsWith('@media')) { const r = p(corpo); return r ? `${pre}{${r}}` : ''; }
    if (pre.startsWith('@')) return `${pre}{${corpo}}`;
    const sels = pre.split(',').filter((s) => seletorCasa(s.replace(/::?[\w-]+(\([^)]*\))?/g, ''), tk));
    return sels.length ? `${sels.join(',')}{${corpo}}` : '';
  }).join('');
  return p(css);
}
const semBloco = (html) => html.replace(/<style id="css-licitacoes">[\s\S]*?<\/style>/, '');
export const bloco = (html) => `<style id="css-licitacoes">${podar(cssInline(), semBloco(html))}</style>`;
const LINKS = /<link rel="stylesheet" href="(?:\.\.\/)?assets\/tokens\.css">\s*<link rel="stylesheet" href="(?:\.\.\/)?assets\/site\.css">/;
const BLOCO = /<style id="css-licitacoes">[\s\S]*?<\/style>/;
export function aplicar(html) {
  if (BLOCO.test(html)) return html.replace(BLOCO, () => bloco(html));
  if (LINKS.test(html)) return html.replace(LINKS, () => bloco(html));
  throw new Error('página sem os links de tokens.css/site.css nem o bloco inline');
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const p of PAGINAS) writeFileSync(raiz + p, aplicar(ler(p)));
}
