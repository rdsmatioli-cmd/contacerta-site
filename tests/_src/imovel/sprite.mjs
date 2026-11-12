// Pós-build da seção /imovel/: sprite só com os símbolos usados em cada página (mesma regra do finalizar-lote8.mjs).
// Uso, da raiz: node tests/_src/imovel/sprite.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { sprite } from '../content/_visual.mjs';
const raiz = new URL('../../../', import.meta.url).pathname;
const listar = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? listar(p) : n === 'index.html' ? [p] : []; });
for (const f of listar(join(raiz, 'imovel'))) {
  const h = readFileSync(f, 'utf8');
  const m = h.match(/<svg class="sprite"[^>]*>(?:<symbol\b[^]*?<\/symbol>)*<\/svg>/);
  if (!m) continue;
  writeFileSync(f, h.replace(m[0], () => sprite(h.slice(m.index + m[0].length))));
  console.log('sprite ok:', f.slice(raiz.length));
}
