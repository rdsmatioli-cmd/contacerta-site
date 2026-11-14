// Integração da Onda 1 do Empregador em Dia, no molde de finalizar-lote8.mjs.
// Lê tests/_src/blog/onda1-manifesto.json (build-lote8.py --arquivos).
// Três URLs novas entram no índice, na categoria, no feed, no sitemap e no llms.txt.
// Sete URLs já publicadas só têm card, feed, llms e lastmod atualizados.
// /empregador-em-dia/ continua noindex e fora de sitemap, llms e feed.
// Uso, na raiz do site: node tests/_src/blog/finalizar-onda1.mjs
import { readFileSync as r, writeFileSync as w } from 'node:fs';
import { sprite } from '../content/_visual.mjs';
import { blocoGuiasRecentes } from '../content/_seo.mjs';

const M = JSON.parse(r(new URL('./onda1-manifesto.json', import.meta.url), 'utf8'));
const ORIGEM = 'https://contacertabr.com.br';
const NOVOS = new Set([
  '/blog/escala-6x1-domingos-feriados/',
  '/blog/riscos-psicossociais-exemplos/',
  '/blog/escala-12x36-ec-141/',
]);
const ATUALIZADOS = new Set([
  '/blog/fim-da-escala-6x1-aprovado/',
  '/blog/fim-da-escala-6x1-empregador/',
  '/blog/escala-5x2-como-montar/',
  '/blog/o-que-e-escala-6x1/',
  '/blog/mei-pode-ter-funcionario/',
  '/blog/nr-1-pequenas-empresas/',
  '/blog/gro-pgr-nr-1/',
]);
const FORA = ['inventario-riscos-psicossociais-exemplo', 'questionario-riscos-psicossociais', 'trct-como-preencher', 'banco-de-horas-42-horas'];
const CAT_PAGINA = { 'Trabalho e salário': 'trabalho-e-salario', 'Impostos e MEI': 'impostos-e-mei', 'Reforma tributária': 'reforma-tributaria' };
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const br = (d) => d.split('-').reverse().join('/');
const reLit = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const card = (p) => `<li><a class="post-card" href="${p.href}"><small>${esc(p.categoria)}</small><strong>${esc(p.titulo)}</strong><span>${esc(p.resumo)}</span><small>Publicado em <time datetime="${p.data}">${br(p.data)}</time></small></a></li>`;
const ldItem = (p) => ({ '@type': 'BlogPosting', headline: p.titulo, url: `${ORIGEM}${p.href}`, datePublished: p.data });

for (const p of M) {
  if (!NOVOS.has(p.href) && !ATUALIZADOS.has(p.href)) throw new Error(`fora da Onda 1: ${p.href}`);
  if (/["'&<>]/.test(p.titulo + p.resumo + p.descricao)) throw new Error(`caractere especial: ${p.href}`);
}
const novos = M.filter((p) => NOVOS.has(p.href)).sort((a, b) => a.ordem - b.ordem);
const todos = M.slice();
if (novos.length !== 3 || M.length !== 10) throw new Error(`manifesto com ${M.length} posts e ${novos.length} novos`);
const modificado = [...new Set(M.map((p) => p.modificado))];
if (modificado.length !== 1) throw new Error(`dateModified divergente: ${modificado.join(', ')}`);
const DATA = modificado[0];

function gravar(arquivo, html) { w(arquivo, html); return html; }

function atualizarCards(arquivo, posts) {
  let h = r(arquivo, 'utf8');
  for (const p of posts) {
    const re = new RegExp(`(<li><a class="post-card" href="${reLit(p.href)}"><small>[^<]*</small><strong>)[^<]*(</strong><span>)[^<]*(</span>)`);
    if (re.test(h)) h = h.replace(re, `$1${esc(p.titulo)}$2${esc(p.resumo)}$3`);
  }
  return gravar(arquivo, h);
}

function inserirCards(arquivo, posts) {
  let h = r(arquivo, 'utf8');
  const faltam = posts.filter((p) => !h.includes(`href="${p.href}"`));
  if (!faltam.length) return h;
  const ini = '<ul class="posts">';
  if (h.split(ini).length !== 2) throw new Error(`lista de posts não encontrada em ${arquivo}`);
  return gravar(arquivo, h.replace(ini, ini + faltam.map(card).join('')));
}

function atualizarLd(arquivo, presentes, incluir) {
  let h = r(arquivo, 'utf8');
  h = h.replace(/<script type="application\/ld\+json">(\{[^<]*"blogPost":\[[^<]*\})<\/script>/, (_, js) => {
    const o = JSON.parse(js);
    for (const p of presentes) {
      const item = o.blogPost.find((x) => x.url === `${ORIGEM}${p.href}`);
      if (item) item.headline = p.titulo;
    }
    const faltam = incluir.filter((p) => !o.blogPost.some((x) => x.url === `${ORIGEM}${p.href}`));
    o.blogPost = [...faltam.map(ldItem), ...o.blogPost];
    return `<script type="application/ld+json">${JSON.stringify(o)}</script>`;
  });
  return gravar(arquivo, h);
}

function atualizarIndice(arquivo, posts, incluir) {
  atualizarCards(arquivo, posts);
  inserirCards(arquivo, incluir);
  atualizarLd(arquivo, posts, incluir);
}

atualizarIndice('blog/index.html', todos, novos);
for (const [cat, pasta] of Object.entries(CAT_PAGINA)) {
  const daCat = (lista) => lista.filter((p) => p.categoria === cat);
  atualizarIndice(`blog/categoria/${pasta}/index.html`, daCat(todos), daCat(novos));
}

const dataRss = (d) => new Date(`${d}T15:00:00Z`).toUTCString();
let feed = r('blog/feed.xml', 'utf8');
for (const p of todos) {
  const url = `${ORIGEM}${p.href}`;
  const re = new RegExp(`(<item><title>)[^<]*(</title><link>${reLit(url)}</link><guid isPermaLink="true">${reLit(url)}</guid><pubDate>[^<]*</pubDate><category>[^<]*</category><description>)[^<]*(</description></item>)`);
  if (re.test(feed)) feed = feed.replace(re, `$1${esc(p.titulo)}$2${esc(p.descricao)}$3`);
}
const faltamFeed = novos.filter((p) => !feed.includes(`${ORIGEM}${p.href}`));
if (faltamFeed.length) {
  const itens = faltamFeed.map((p) => `<item><title>${esc(p.titulo)}</title><link>${ORIGEM}${p.href}</link><guid isPermaLink="true">${ORIGEM}${p.href}</guid><pubDate>${dataRss(p.data)}</pubDate><category>${esc(p.categoria)}</category><description>${esc(p.descricao)}</description></item>\n`).join('');
  feed = feed.replace('<item>', `${itens}<item>`);
}
feed = feed.replace(/<lastBuildDate>[^<]*<\/lastBuildDate>\n/, `<lastBuildDate>${dataRss(DATA)}</lastBuildDate>\n`);
w('blog/feed.xml', feed);

let sm = r('sitemap.xml', 'utf8');
const faltamSm = novos.filter((p) => !sm.includes(`${ORIGEM}${p.href}`));
if (faltamSm.length) {
  const linhas = sm.split('\n');
  const ultCat = linhas.map((l, i) => (l.includes('/blog/categoria/') ? i : -1)).filter((i) => i >= 0).at(-1);
  linhas.splice(ultCat + 1, 0, ...faltamSm.map((p) => `  <url><loc>${ORIGEM}${p.href}</loc><lastmod>${DATA}</lastmod></url>`));
  sm = linhas.join('\n');
}
const lastmods = [
  `${ORIGEM}/`,
  `${ORIGEM}/blog/`,
  `${ORIGEM}/blog/categoria/trabalho-e-salario/`,
  `${ORIGEM}/blog/categoria/impostos-e-mei/`,
  ...todos.map((p) => `${ORIGEM}${p.href}`),
];
for (const loc of lastmods) {
  const re = new RegExp(`(<loc>${reLit(loc)}</loc><lastmod>)[^<]+(</lastmod>)`);
  if (!re.test(sm)) throw new Error(`sitemap sem ${loc}`);
  sm = sm.replace(re, `$1${DATA}$2`);
}
w('sitemap.xml', sm);

let llms = r('llms.txt', 'utf8');
const faltamLlms = [];
for (const p of todos) {
  const url = `${ORIGEM}${p.href}`;
  const linha = `- [${p.titulo}](${url}): ${p.descricao}`;
  const re = new RegExp(`^- \\[[^\\]]*\\]\\(${reLit(url)}\\):.*$`, 'm');
  if (re.test(llms)) llms = llms.replace(re, linha);
  else faltamLlms.push(p);
}
if (faltamLlms.length) {
  const linhas = llms.split('\n');
  const ultBlog = linhas.map((l, i) => (l.startsWith('- [Blog: ') ? i : -1)).filter((i) => i >= 0).at(-1);
  linhas.splice(ultBlog + 1, 0, ...faltamLlms.map((p) => `- [${p.titulo}](${ORIGEM}${p.href}): ${p.descricao}`));
  llms = linhas.join('\n');
}
if (llms.includes('/empregador-em-dia/')) throw new Error('llms.txt não pode citar /empregador-em-dia/ enquanto a página estiver noindex');
w('llms.txt', llms);

const idx = r('blog/index.html', 'utf8');
const posts = [...idx.matchAll(/<li><a class="post-card" href="(\/blog\/[^"]+\/)"><small>([^<]+)<\/small><strong>([^<]+)<\/strong>/g)]
  .map((m) => ({ href: m[1], categoria: m[2].replace(/&amp;/g, '&'), titulo: m[3].replace(/&amp;/g, '&') }));
let home = r('index.html', 'utf8');
home = home.replace(/<section class="secao" aria-labelledby="guias">.*?<\/section>\n/s, () => blocoGuiasRecentes(posts));
home = home.replace(/<svg class="sprite"[^]*?<\/svg>/, () => sprite(home.slice(home.indexOf('<body>'))));
w('index.html', home);

for (const p of todos) {
  const f = `${p.href.slice(1)}index.html`;
  let h = r(f, 'utf8');
  h = h.replace(/<svg class="sprite"[^]*?<\/svg>/, () => sprite(h.slice(h.indexOf('<body>'))));
  for (const slug of FORA) if (h.includes(`/blog/${slug}/`)) throw new Error(`${p.href} ainda liga /blog/${slug}/`);
  if (h.includes('FAQPage') || h.includes('HowTo') || h.includes('#lcm"') || h.includes('16/12')) throw new Error(`${p.href} fere a regra de JSON-LD ou de data`);
  w(f, h);
}
console.log('ok', novos.length, 'novos;', ATUALIZADOS.size, 'atualizados; lastmod', DATA);
