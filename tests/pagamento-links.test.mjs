// DEC CEO 06/11 20h24: links de pagamento Stripe em /licitacoes/assinar/ (sem form, form-action 'none').
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LINKS_PAGAMENTO, NA_PAGINA, PAGINA_ASSINAR, PAGINA_OBRIGADO } from './config-pagamento-links.mjs';

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const hrefsStripe = (h) => [...h.matchAll(/href="(https:\/\/buy\.stripe\.com\/[^"]*)"/g)].map((m) => m[1]);

test('config: 4 links em https://buy.stripe.com/, distintos', () => {
  const v = Object.values(LINKS_PAGAMENTO);
  assert.equal(v.length, 4);
  assert.equal(new Set(v).size, 4);
  for (const u of v) assert.match(u, /^https:\/\/buy\.stripe\.com\/[A-Za-z0-9_]+$/);
});
test('assinar/: exatamente os 3 links da config, nesta ordem, sem form, form-action none, noindex', () => {
  const h = ler(PAGINA_ASSINAR);
  assert.deepEqual(hrefsStripe(h), NA_PAGINA.map((k) => LINKS_PAGAMENTO[k]));
  assert.doesNotMatch(h, /<form\b/);
  assert.match(h, /form-action 'none'"/);
  assert.match(h, /<meta name="robots" content="noindex,follow">/);
  assert.ok(h.includes('href="../cobranca/"') && h.includes('href="../politica.html"'), 'Termos e aviso');
  assert.ok(!h.includes(LINKS_PAGAMENTO.montagemEntrega), 'link da entrega só pelo atendimento');
});
test('obrigado/: noindex, sem link de pagamento, com atendimento', () => {
  const h = ler(PAGINA_OBRIGADO);
  assert.match(h, /<meta name="robots" content="noindex,follow">/);
  assert.deepEqual(hrefsStripe(h), []);
  assert.ok(h.includes('mailto:contato@contacertabr.com.br'));
  assert.doesNotMatch(h, /[Pp]agamento (recebido|confirmado)/, 'vedado pelo parecer ADV 4e6fa371');
});
test('home do /licitacoes/ tem CTA para assinar/', () => assert.ok(ler('licitacoes/index.html').includes('href="assinar/"')));
test('Termos 1.5 (cobranca/): sem form nem link de pagamento, sem "indisponível", aceite versão 1.5', () => {
  const h = ler('licitacoes/cobranca/index.html');
  assert.match(h, /TERMOS-VENDA-LICITACOES-1\.5/);
  assert.doesNotMatch(h, /temporariamente indisponível|Assinaturas em breve|versão 1\.3\)/);
  assert.ok(h.includes('(link, versão 1.5)'));
  assert.doesNotMatch(h, /<form\b/);
  assert.deepEqual(hrefsStripe(h), []);
});
// Trava de produção: o Pages roda este arquivo com LINKS_PAGAMENTO_PRODUCAO=1 antes do upload.
test('produção: nenhum PLACEHOLDER nos links publicados', { skip: process.env.LINKS_PAGAMENTO_PRODUCAO !== '1' && 'só no build do Pages' }, () => {
  for (const k of NA_PAGINA) assert.doesNotMatch(LINKS_PAGAMENTO[k], /PLACEHOLDER/, k);
  assert.doesNotMatch(ler(PAGINA_ASSINAR), /PLACEHOLDER/);
});
