// DEC CPO be1e019d (E1): página-índice dos termos da conta Stripe, texto literal do adendo ADV 28de9fcc (e) E1.
// [VERSÃO CR] é do ADV (DEC D2): o build do Pages falha enquanto houver placeholder (LINKS_PAGAMENTO_PRODUCAO=1 / DEPLOY=1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const P = 'termos-de-venda/index.html';
test('termos-de-venda/: noindex, fora do sitemap, links dos 3 produtos, sem form', () => {
  const h = ler(P);
  assert.match(h, /<meta name="robots" content="noindex, follow">/);
  assert.ok(!ler('sitemap.xml').includes('https://contacertabr.com.br/termos-de-venda/'));
  for (const u of ['https://www.creditrilha.com.br/termos', 'https://contacertabr.com.br/termos/', 'https://contacertabr.com.br/licitacoes/cobranca/']) assert.ok(h.includes(`href="${u}"`), u);
  assert.match(h, /Termos de Venda, versão 1\.5/);
  assert.doesNotMatch(h, /<form\b/);
});
test('produção: sem placeholder [MAIÚSCULAS] em termos-de-venda/', { skip: process.env.DEPLOY !== '1' && process.env.LINKS_PAGAMENTO_PRODUCAO !== '1' && 'só com DEPLOY=1 ou no build do Pages' }, () => {
  assert.doesNotMatch(ler(P), /\[[A-ZÀ-Ý][A-ZÀ-Ý0-9 _,.\/-]*\]/);
});
