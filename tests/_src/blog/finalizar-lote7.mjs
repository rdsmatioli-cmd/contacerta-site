// Pós-build do lote 7 (fator-r, nr-1, gro-pgr): sprite só com os símbolos usados e "Guias recentes" da home.
import { readFileSync as r, writeFileSync as w } from 'node:fs';
import { sprite } from '../content/_visual.mjs';
import { blocoGuiasRecentes } from '../content/_seo.mjs';
for (const s of ['fator-r-simples-nacional', 'nr-1-pequenas-empresas', 'gro-pgr-nr-1']) {
  const f = `blog/${s}/index.html`; const h = r(f, 'utf8');
  w(f, h.replace(/<svg class="sprite"[^]*?<\/svg>/, () => sprite(h.slice(h.indexOf('<body>')))));
}
const idx = r('blog/index.html', 'utf8');
const posts = [...idx.matchAll(/<li><a class="post-card" href="(\/blog\/[^"]+\/)"><small>([^<]+)<\/small><strong>([^<]+)<\/strong>/g)]
  .map((m) => ({ href: m[1], categoria: m[2].replace(/&amp;/g, '&'), titulo: m[3].replace(/&amp;/g, '&') }));
let home = r('index.html', 'utf8');
home = home.replace(/<section class="secao" aria-labelledby="guias">.*?<\/section>\n/s, () => blocoGuiasRecentes(posts));
home = home.replace(/<svg class="sprite"[^]*?<\/svg>/, () => sprite(home.slice(home.indexOf('<body>'))));
w('index.html', home); console.log('ok', posts.length, 'posts');
