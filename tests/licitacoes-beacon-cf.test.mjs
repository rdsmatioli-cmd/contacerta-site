// Beacon do Cloudflare Web Analytics (DEC CEO 31/10/2026): nunca em /licitacoes/contratos/ (nota do Advogado
// ced6a5c5, condição 3) e nunca fora de /licitacoes/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const raiz = fileURLToPath(new URL('../', import.meta.url));
const listar = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  const p = join(dir, d.name);
  if (d.isDirectory()) return d.name === 'node_modules' || d.name.startsWith('.') ? [] : listar(p);
  return d.name.endsWith('.html') ? [relative(raiz, p).split(sep).join('/')] : [];
});
test('beacon CF: ausente em /licitacoes/contratos/ e fora de /licitacoes/', () => {
  const com = listar(raiz).filter((p) => /cloudflareinsights/.test(readFileSync(join(raiz, p), 'utf8')));
  for (const p of com) {
    assert.ok(p.startsWith('licitacoes/'), `${p}: beacon fora de /licitacoes/`);
    assert.ok(!p.startsWith('licitacoes/contratos/'), `${p}: /licitacoes/contratos/ não pode ter beacon`);
  }
  assert.ok(com.length >= 6);
});
