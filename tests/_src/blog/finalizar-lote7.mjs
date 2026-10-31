// Pós-build do lote 7 (parcial: nr-1-pequenas-empresas e gro-pgr-nr-1): sprite das páginas, índice do blog e da
// categoria Trabalho e salário (cards + JSON-LD Blog), feed, sitemap, llms.txt e "Guias recentes" da home.
// Uso: node tests/_src/blog/finalizar-lote7.mjs AAAA-MM-DD (a mesma data do build-lote7.py). Idempotente.
import { readFileSync as r, writeFileSync as w } from 'node:fs';
import { sprite } from '../content/_visual.mjs';
import { blocoGuiasRecentes } from '../content/_seo.mjs';
const DATA = process.argv[2]; if (!/^\d{4}-\d{2}-\d{2}$/.test(DATA)) throw new Error('data AAAA-MM-DD');
const BR = DATA.split('-').reverse().join('/'); const CAT = 'Trabalho e salário';
const POSTS = ['gro-pgr-nr-1', 'nr-1-pequenas-empresas'].map((s) => {
  const h = r(`blog/${s}/index.html`, 'utf8');
  const h1 = h.match(/<h1>([^<]+)<\/h1>/)[1], desc = h.match(/<meta name="description" content="([^"]+)">/)[1];
  return { s, h1, desc, url: `https://contacertabr.com.br/blog/${s}/` };
});
const un = (x) => x.replace(/&amp;/g, '&').replace(/&quot;/g, '"');
for (const p of POSTS) { const f = `blog/${p.s}/index.html`; const h = r(f, 'utf8'); w(f, h.replace(/<svg class="sprite"[^]*?<\/svg>/, () => sprite(h.slice(h.indexOf('<body>'))))); }
const card = (p) => `<li><a class="post-card" href="/blog/${p.s}/"><small>${CAT}</small><strong>${p.h1}</strong><span>${p.desc}</span><small>Publicado em <time datetime="${DATA}">${BR}</time></small></a></li>`;
const ldItem = (p) => ({ '@type': 'BlogPosting', headline: un(p.h1), url: p.url, datePublished: DATA });
for (const f of ['blog/index.html', 'blog/categoria/trabalho-e-salario/index.html']) {
  let h = r(f, 'utf8');
  for (const p of POSTS) h = h.replace(new RegExp(`<li><a class="post-card" href="/blog/${p.s}/">.*?</li>`, 's'), '');
  h = h.replace('<ul class="posts">', '<ul class="posts">' + POSTS.map(card).join(''));
  h = h.replace(/("blogPost":)(\[.*?\])(\}<\/script>|,")/s, (m, a, arr, z) => {
    const lista = JSON.parse(arr).filter((x) => !POSTS.some((p) => p.url === x.url));
    return a + JSON.stringify([...POSTS.map(ldItem), ...lista]) + z;
  });
  w(f, h);
}
let feed = r('blog/feed.xml', 'utf8');
const dRss = new Date(`${DATA}T15:00:00Z`).toUTCString();
for (const p of POSTS) feed = feed.replace(new RegExp(`<item><title>[^<]*</title><link>${p.url}</link>.*?</item>\\n?`, 's'), '');
feed = feed.replace(/<lastBuildDate>[^<]+<\/lastBuildDate>/, `<lastBuildDate>${dRss}</lastBuildDate>`)
  .replace(/(<item>)/, POSTS.map((p) => `<item><title>${p.h1}</title><link>${p.url}</link><guid isPermaLink="true">${p.url}</guid><pubDate>${dRss}</pubDate><category>${CAT}</category><description>${p.desc}</description></item>\n`).join('') + '$1');
w('blog/feed.xml', feed);
let sm = r('sitemap.xml', 'utf8');
for (const p of POSTS) if (!sm.includes(`<loc>${p.url}</loc>`)) sm = sm.replace(/(\s*<url><loc>https:\/\/contacertabr\.com\.br\/blog\/[^<]+<\/loc>)/, `\n  <url><loc>${p.url}</loc><lastmod>${DATA}</lastmod></url>$1`);
w('sitemap.xml', sm);
let llms = r('llms.txt', 'utf8');
for (const p of POSTS) if (!llms.includes(p.url)) llms = llms.replace(/(- \[Blog do Conta Certa\][^\n]*\n)/, `$1- [${un(p.h1)}](${p.url}): ${un(p.desc)}\n`);
w('llms.txt', llms);
const idx = r('blog/index.html', 'utf8');
const posts = [...idx.matchAll(/<li><a class="post-card" href="(\/blog\/[^"]+\/)"><small>([^<]+)<\/small><strong>([^<]+)<\/strong>/g)]
  .map((m) => ({ href: m[1], categoria: un(m[2]), titulo: un(m[3]) }));
let home = r('index.html', 'utf8');
home = home.replace(/<section class="secao" aria-labelledby="guias">.*?<\/section>\n/s, () => blocoGuiasRecentes(posts));
home = home.replace(/<svg class="sprite"[^]*?<\/svg>/, () => sprite(home.slice(home.indexOf('<body>'))));
w('index.html', home);
console.log('ok', posts.length, 'posts no índice');
