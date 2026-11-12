// Pós-build do lote 8 (12/11/2026): sprite dos posts novos, índice e categorias do blog (cards e JSON-LD), feed,
// sitemap, llms.txt e bloco "Guias recentes" da home. Lê tests/_src/blog/lote8/manifesto.json (build-lote8.py).
// Uso, na raiz do site: node tests/_src/blog/finalizar-lote8.mjs
import { readFileSync as r, writeFileSync as w } from 'node:fs';
import { sprite } from '../content/_visual.mjs';
import { blocoGuiasRecentes } from '../content/_seo.mjs';

const M = JSON.parse(r(new URL('./lote8/manifesto.json', import.meta.url), 'utf8'));
const ORIGEM = 'https://contacertabr.com.br';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const br = (d) => d.split('-').reverse().join('/');
const CAT_PAGINA = { 'Trabalho e salário': 'trabalho-e-salario', 'Impostos e MEI': 'impostos-e-mei', 'Reforma tributária': 'reforma-tributaria' };
for (const p of M) if (/["'&<>]/.test(p.titulo)) throw new Error(`título com caractere especial: ${p.titulo}`);

const card = (p) => `<li><a class="post-card" href="${p.href}"><small>${esc(p.categoria)}</small><strong>${esc(p.titulo)}</strong><span>${esc(p.resumo)}</span><small>Publicado em <time datetime="${p.data}">${br(p.data)}</time></small></a></li>`;
const ldItem = (p) => ({ '@type': 'BlogPosting', headline: p.titulo, url: `${ORIGEM}${p.href}`, datePublished: p.data });

// 1) sprite só com os símbolos usados, em cada post novo
for (const p of M) {
  const f = `${p.href.slice(1)}index.html`; const h = r(f, 'utf8');
  w(f, h.replace(/<svg class="sprite"[^]*?<\/svg>/, () => sprite(h.slice(h.indexOf('<body>')))));
}

// 2) índice e categorias: cards no topo da lista e itens no início do blogPost do JSON-LD
function lista(arquivo, posts) {
  if (!posts.length) return;
  let h = r(arquivo, 'utf8');
  for (const p of posts) if (h.includes(`href="${p.href}"`)) throw new Error(`${p.href} já está em ${arquivo}`);
  const ini = '<ul class="posts">';
  if (h.split(ini).length !== 2) throw new Error(`lista de posts não encontrada em ${arquivo}`);
  h = h.replace(ini, ini + posts.map(card).join(''));
  h = h.replace(/<script type="application\/ld\+json">(\{[^<]*"blogPost":\[[^<]*\})<\/script>/, (_, js) => {
    const o = JSON.parse(js); o.blogPost = [...posts.map(ldItem), ...o.blogPost];
    return `<script type="application/ld+json">${JSON.stringify(o)}</script>`;
  });
  w(arquivo, h);
}
lista('blog/index.html', M);
for (const [cat, pasta] of Object.entries(CAT_PAGINA)) lista(`blog/categoria/${pasta}/index.html`, M.filter((p) => p.categoria === cat));

// 3) feed: itens no topo e lastBuildDate
const dataRss = (d) => new Date(`${d}T15:00:00Z`).toUTCString();
let feed = r('blog/feed.xml', 'utf8');
const itens = M.map((p) => `<item><title>${esc(p.titulo)}</title><link>${ORIGEM}${p.href}</link><guid isPermaLink="true">${ORIGEM}${p.href}</guid><pubDate>${dataRss(p.data)}</pubDate><category>${esc(p.categoria)}</category><description>${esc(p.descricao)}</description></item>\n`).join('');
feed = feed.replace(/<lastBuildDate>[^<]*<\/lastBuildDate>\n/, `<lastBuildDate>${dataRss(M[0].data)}</lastBuildDate>\n`);
feed = feed.replace('<item>', `${itens}<item>`);
w('blog/feed.xml', feed);

// 4) sitemap: depois da última categoria do blog
let sm = r('sitemap.xml', 'utf8');
const linhasSm = sm.split('\n');
const ultCat = linhasSm.map((l, i) => (l.includes('/blog/categoria/') ? i : -1)).filter((i) => i >= 0).at(-1);
linhasSm.splice(ultCat + 1, 0, ...M.map((p) => `  <url><loc>${ORIGEM}${p.href}</loc><lastmod>${p.data}</lastmod></url>`));
w('sitemap.xml', linhasSm.join('\n'));

// 5) llms.txt: depois das linhas de categoria do bloco Blog
const llms = r('llms.txt', 'utf8').split('\n');
const ultBlog = llms.map((l, i) => (l.startsWith('- [Blog: ') ? i : -1)).filter((i) => i >= 0).at(-1);
llms.splice(ultBlog + 1, 0, ...M.map((p) => `- [${p.titulo}](${ORIGEM}${p.href}): ${p.descricao}`));
w('llms.txt', llms.join('\n'));

// 6) home: "Guias recentes" na ordem do índice e sprite
const idx = r('blog/index.html', 'utf8');
const posts = [...idx.matchAll(/<li><a class="post-card" href="(\/blog\/[^"]+\/)"><small>([^<]+)<\/small><strong>([^<]+)<\/strong>/g)]
  .map((m) => ({ href: m[1], categoria: m[2].replace(/&amp;/g, '&'), titulo: m[3].replace(/&amp;/g, '&') }));
let home = r('index.html', 'utf8');
home = home.replace(/<section class="secao" aria-labelledby="guias">.*?<\/section>\n/s, () => blocoGuiasRecentes(posts));
home = home.replace(/<svg class="sprite"[^]*?<\/svg>/, () => sprite(home.slice(home.indexOf('<body>'))));
w('index.html', home);
console.log('ok', M.length, 'posts novos;', posts.length, 'no índice');
