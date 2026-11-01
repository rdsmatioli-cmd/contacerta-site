// A-08: botão de compra (form POST para <origem>/checkout) só nas páginas de compra; CSP form-action restrita à origem
// nessas páginas e 'none' em todas as outras. Sem script externo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ORIGEM_CHECKOUT, PAGINAS_COMPRA, FORM_ACTION_COMPRA, PRODUTOS_BOTAO } from './config-checkout.mjs';

const RAIZ = new URL('..', import.meta.url).pathname;
function htmls(d, base = '') {
  return readdirSync(d).flatMap((n) => {
    if (['.git', 'node_modules', 'tests'].includes(n)) return [];
    const p = join(d, n), r = base ? base + '/' + n : n;
    return statSync(p).isDirectory() ? htmls(p, r) : n.endsWith('.html') && !n.startsWith('google') ? [r] : [];
  });
}
const paginas = htmls(RAIZ);
const ler = (p) => readFileSync(join(RAIZ, p), 'utf8');
const formAction = (h) => [...h.matchAll(/form-action ([^;"]+)/g)].map((m) => m[1].trim());

test('config: origem única, sem barra final', () => {
  assert.equal(typeof ORIGEM_CHECKOUT, 'string');
  assert.doesNotMatch(ORIGEM_CHECKOUT, /\/$/);
  assert.ok(ORIGEM_CHECKOUT === '[ORIGEM_CHECKOUT]' || /^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/.test(ORIGEM_CHECKOUT));
});
for (const p of PAGINAS_COMPRA) {
  test(`${p}: form POST para a origem/checkout e CSP form-action só para a origem`, () => {
    const h = ler(p);
    const forms = [...h.matchAll(/<form\b[^>]*>/g)].map((m) => m[0]);
    assert.equal(forms.length, PRODUTOS_BOTAO.length);
    PRODUTOS_BOTAO.forEach((prod, i) => {
      assert.match(forms[i], /method="post"/);
      assert.ok(forms[i].includes(`action="${ORIGEM_CHECKOUT}/checkout?produto=${prod}"`), prod);
    });
    assert.deepEqual(formAction(h), [FORM_ACTION_COMPRA]);
    assert.doesNotMatch(h, /<script[^>]+src="https?:/);
  });
}
test('botões: um por produto, mensal e anual, com o preço no rótulo', { skip: PAGINAS_COMPRA.length === 0 && 'hotfix 1042: compra desativada' }, () => {
  const h = ler(PAGINAS_COMPRA[0]);
  assert.match(h, /produto=radar"><button type="submit" class="btn">Assinar o Radar mensal \(R\$ 197 por mês\)<\/button>/);
  assert.match(h, /produto=radar-anual"><button type="submit" class="btn">Assinar o Radar anual \(R\$ 1\.970 por ano\)<\/button>/);
});
test(`demais páginas (${paginas.length - PAGINAS_COMPRA.length}) mantêm form-action 'none' e não têm form para o checkout`, () => {
  const outras = paginas.filter((p) => !PAGINAS_COMPRA.includes(p));
  assert.ok(outras.length > 10);
  for (const p of outras) {
    const h = ler(p);
    for (const fa of formAction(h)) assert.equal(fa, "'none'", p);
    assert.ok(!h.includes(ORIGEM_CHECKOUT), p);
    assert.doesNotMatch(h, /\/checkout\?produto=/, p);
  }
});
