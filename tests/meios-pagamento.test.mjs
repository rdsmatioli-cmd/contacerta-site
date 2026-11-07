// DEC CEO 21h28: Radar só cartão; Montagem cartão ou Pix; boleto desligado. Texto dos adendos ADV 22428393 + 722a154e.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { L } from './literais-meios-pagamento.mjs';
const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const conta = (h, s) => h.split(s).length - 1;
const T = 'licitacoes/cobranca/index.html', A = 'licitacoes/assinar/index.html', O = 'licitacoes/obrigado/index.html', H = 'licitacoes/index.html';
const onde = {
  [T]: { L1: 1, L1r: 1, L2: 1, L3: 1, L4: 1, L6a: 1, L6b: 2 /* L6a contém L6b */, L6d: 1, L11: 1, L12a: 1, L12b: 1, ARR: 1 },
  [A]: { L1: 1, L1r: 1, L2: 1, L3: 1, L4: 1, L9: 3 },
  [O]: { L10a: 1, L10nf: 1, L10c: 1, L10m: 1 },
  [H]: { L8: 1 },
};
for (const [p, m] of Object.entries(onde)) test(`${p}: literais 22428393/722a154e presentes`, () => {
  const h = ler(p);
  for (const [k, n] of Object.entries(m)) assert.equal(conta(h, L[k]), n, k);
});
test('Termos: 4.2 "Forma da devolução" (5 parágrafos) e item 6 integral', () => {
  const h = ler(T);
  assert.ok(h.includes('<p><strong>4.2 Forma da devolução</strong></p>'));
  for (const x of [...L.L5, ...L.L7]) assert.equal(conta(h, `<p>${x}</p>`), 1);
  assert.ok(h.includes('<h2>6. Tributos, nota fiscal e início do serviço</h2>\n<p>' + L.L7[0]));
});
test('obrigado/: desistência literal, com link para os Termos (itens 4 e 4.2)', () => {
  const tx = ler(O).replace(/<a href="\.\.\/cobranca\/">([^<]*)<\/a>/g, '$1');
  assert.ok(tx.includes(`<p>${L.L10d}</p>`));
});
test('assinar/: confirmação Pix (L4) só na Montagem, não no Radar', () => {
  const h = ler(A);
  assert.ok(h.indexOf(L.L4) > h.indexOf('<h2>Montagem de proposta por edital</h2>'));
});
test('sem boleto e sem texto de 47da365a nas páginas LIC', () => {
  for (const p of [T, A, O, H, 'licitacoes/politica.html']) assert.doesNotMatch(ler(p), /boleto|pelo mesmo meio|após recebê-los|crédito segue o prazo da Stripe e do emissor/i, p);
});
