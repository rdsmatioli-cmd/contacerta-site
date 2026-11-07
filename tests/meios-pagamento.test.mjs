// DEC CEO 21h20: links com cartão+boleto (Radar) e cartão+Pix+boleto (Montagem); texto do adendo ADV 47da365a.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { L } from './literais-meios-pagamento.mjs';
const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const conta = (h, s) => h.split(s).length - 1;
const T = 'licitacoes/cobranca/index.html', A = 'licitacoes/assinar/index.html', O = 'licitacoes/obrigado/index.html', H = 'licitacoes/index.html';
const onde = {
  [T]: { L1: 1, L1r: 1, L2: 1, L3: 1, L4: 1, L6a: 1, L6b: 2 /* L6a contém L6b */, L6d: 1, L7: 1, L11: 1, L12a: 1, L12b: 1 },
  [A]: { L1: 1, L1r: 1, L2: 1, L3: 1, L4: 2, L9: 3 },
  [O]: { L10a: 1, L10b: 1, L10c: 1 },
  [H]: { L8: 1 },
};
for (const [p, m] of Object.entries(onde)) test(`${p}: literais 47da365a presentes`, () => {
  const h = ler(p);
  for (const [k, n] of Object.entries(m)) assert.equal(conta(h, L[k]), n, k);
});
test('Termos 4.2: subtítulo "Forma da devolução" e os 4 parágrafos L5', () => {
  const h = ler(T);
  assert.ok(h.includes('<p><strong>4.2 Forma da devolução</strong></p>'));
  for (const x of L.L5) assert.equal(conta(h, `<p>${x}</p>`), 1);
});
test('sem texto só-cartão nem "mesmo meio" nas páginas LIC', () => {
  for (const p of [T, A, O, H]) assert.doesNotMatch(ler(p), /pelo mesmo meio|estornada pelo mesmo meio|no cartão informado|prazo da administradora do cartão|crédito segue o prazo da Stripe e do emissor|o cartão é informado diretamente na página da Stripe|por ele você troca o cartão|Para trocar o cartão, ver recibos/, p);
});
