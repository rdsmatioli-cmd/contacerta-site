// DEC CPO be1e019d (E1): página-índice dos termos da conta Stripe, texto literal do adendo ADV 63f0d25f (E1 final).
// A trava de placeholder roda no build do Pages (LINKS_PAGAMENTO_PRODUCAO=1) e com DEPLOY=1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const P = 'termos-de-venda/index.html';
const U = 'https://contacertabr.com.br/termos-de-venda/';
test('termos-de-venda/: index,follow, canonical absoluto, no sitemap, sem form', () => {
  const h = ler(P);
  assert.match(h, /<meta name="robots" content="index, follow">/);
  assert.ok(h.includes(`<link rel="canonical" href="${U}">`));
  assert.ok(ler('sitemap.xml').includes(`<loc>${U}</loc>`));
  assert.doesNotMatch(h, /<form\b/);
});
test('termos-de-venda/: LIC 1.5 e ED 1.2 com link; Creditrilha "em breve" sem link nem versão', () => {
  const h = ler(P);
  assert.ok(h.includes('Termos de Venda, versão 1.5: <a href="https://contacertabr.com.br/licitacoes/cobranca/">'));
  assert.ok(h.includes('versão TERMOS-EMPREGADOR-1.2: <a href="https://contacertabr.com.br/termos/">'));
  assert.ok(h.includes('<h2>Creditrilha — Plano Empresa</h2>\n<p>Em breve. Ainda não disponível para contratação por esta página.</p>'));
  assert.doesNotMatch(h, /creditrilha\.com\.br|TERMOS-EMPREGADOR-1\.0|v2\.4/i);
});
test('produção: sem placeholder [MAIÚSCULAS] em termos-de-venda/', { skip: process.env.DEPLOY !== '1' && process.env.LINKS_PAGAMENTO_PRODUCAO !== '1' && 'só com DEPLOY=1 ou no build do Pages' }, () => {
  assert.doesNotMatch(ler(P), /\[[A-ZÀ-Ý][A-ZÀ-Ý0-9 _,.\/-]*\]/);
});
