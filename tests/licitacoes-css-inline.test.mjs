// A-PR35-19: CSS do Licitações inline e em sincronia com licitacoes/assets/*.css (tools/licitacoes-css-inline.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PAGINAS, bloco } from '../tools/licitacoes-css-inline.mjs';

test('Licitações: CSS inline igual a tokens.css + site.css, sem stylesheet bloqueante (A-PR35-19)', () => {
  for (const p of PAGINAS) {
    const h = readFileSync(new URL('../' + p, import.meta.url), 'utf8');
    assert.ok(h.includes(bloco(h)), `${p}: bloco inline ausente ou desatualizado; rode node tools/licitacoes-css-inline.mjs`);
    assert.doesNotMatch(h, /<link rel="stylesheet"/, p);
    assert.doesNotMatch(h, /<script src="[^"]*"><\/script>/, `${p}: script externo sem defer`);
  }
});

test('poda do CSS inline: mantém regra cujo seletor casa, tira a que não casa, preserva @font-face e @media', async () => {
  const { podar } = await import('../tools/licitacoes-css-inline.mjs');
  const css = '@font-face{font-family:"X"}body{m:0}.a .b{x:1}.zz{y:2}.b,.zz{z:3}.b:hover{w:4}@media(max-width:9px){.zz{q:1}.b{q:2}}';
  assert.equal(podar(css, '<p class="b">'), '@font-face{font-family:"X"}body{m:0}.a .b{x:1}.b{z:3}.b:hover{w:4}@media(max-width:9px){.b{q:2}}');
});

test('poda do CSS inline: @container também é podado por dentro (e some quando fica vazio)', async () => {
  const { podar } = await import('../tools/licitacoes-css-inline.mjs');
  const css = '.b{x:1}@container(min-width:9px){.zz{q:1}.b{q:2}}@container(min-width:8px){.zz{q:3}}';
  assert.equal(podar(css, '<p class="b">'), '.b{x:1}@container(min-width:9px){.b{q:2}}');
});
