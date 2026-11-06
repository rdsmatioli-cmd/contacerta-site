// DEC CEO 06/11 20h24 + plano CPO v2 39c50fff §4: Payment Links em /licitacoes/assinar/ (sem form, form-action 'none').
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { LINKS_PAGAMENTO, ROTULOS, NA_PAGINA, PAGINA_ASSINAR, PAGINA_OBRIGADO, PAGINAS_SEM_REFERRER } from './config-pagamento-links.mjs';

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const hrefsStripe = (h) => [...h.matchAll(/href="(https:\/\/buy\.stripe\.com\/[^"]*)"/g)].map((m) => m[1]);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('config: URL vazia ou https://buy.stripe.com/<id>, sem repetir', () => {
  const v = Object.values(LINKS_PAGAMENTO).filter(Boolean);
  assert.equal(new Set(v).size, v.length);
  for (const u of v) assert.match(u, /^https:\/\/buy\.stripe\.com\/[A-Za-z0-9_]+$/);
});
test('assinar/: cada produto com URL tem o link; sem URL mostra "em breve" sem link', () => {
  const h = ler(PAGINA_ASSINAR);
  assert.deepEqual(hrefsStripe(h), NA_PAGINA.map((k) => LINKS_PAGAMENTO[k]).filter(Boolean));
  for (const k of NA_PAGINA) {
    const bloco = (h.match(new RegExp(`<p class="compra" data-produto="${k}">[\\s\\S]*?</p>`)) || [])[0];
    assert.ok(bloco, k);
    if (LINKS_PAGAMENTO[k]) assert.ok(bloco.includes(`<a class="btn" href="${LINKS_PAGAMENTO[k]}">${ROTULOS[k]}</a>`), k);
    else { assert.match(bloco, /aria-disabled="true">[^<]*em breve<\/span>/, k); assert.doesNotMatch(bloco, /<a\b/, k); }
  }
  assert.ok(!LINKS_PAGAMENTO.montagemEntrega || !h.includes(LINKS_PAGAMENTO.montagemEntrega), 'entrega só pelo atendimento');
});
for (const p of [PAGINA_ASSINAR, PAGINA_OBRIGADO, 'licitacoes/cobranca/index.html']) {
  test(`${p}: sem form/POST/Worker, form-action 'none', noindex, fora do sitemap, no-referrer`, () => {
    const h = ler(p);
    assert.doesNotMatch(h, /<form\b|method="post"|workers\.dev|js\.stripe\.com/i);
    assert.match(h, /form-action 'none'"/);
    assert.match(h, /<meta name="robots" content="noindex,follow">/);
    assert.ok(PAGINAS_SEM_REFERRER.includes(p));
    assert.match(h, /<meta name="referrer" content="no-referrer">/);
    const loc = 'https://contacertabr.com.br/' + p.replace(/index\.html$/, '');
    assert.ok(!ler('sitemap.xml').includes(`<loc>${loc}</loc>`), loc);
  });
}
test('assinar/ e obrigado/ linkam Termos e aviso', () => {
  for (const p of [PAGINA_ASSINAR, PAGINA_OBRIGADO]) {
    const h = ler(p);
    assert.ok(h.includes('href="../cobranca/"') && h.includes('href="../politica.html"'), p);
  }
});
test('obrigado/: em /licitacoes/obrigado/ (não em assinar/obrigado/), sem link de pagamento, sem declarar pagamento', () => {
  assert.ok(!existsSync(new URL('../licitacoes/assinar/obrigado/index.html', import.meta.url)));
  const h = ler(PAGINA_OBRIGADO);
  assert.deepEqual(hrefsStripe(h), []);
  assert.ok(h.includes('mailto:contato@contacertabr.com.br'));
  assert.doesNotMatch(h, /[Pp]agamento (recebido|confirmado)/, 'vedado pelo parecer ADV 4e6fa371');
});
test('home do /licitacoes/ tem CTA para assinar/', () => assert.ok(ler('licitacoes/index.html').includes('href="assinar/"')));
test('Termos 1.5 (cobranca/): sem "indisponível", aceite versão 1.5, links de compra só da config', () => {
  const h = ler('licitacoes/cobranca/index.html');
  assert.match(h, /TERMOS-VENDA-LICITACOES-1\.5/);
  assert.doesNotMatch(h, /temporariamente indisponível|Assinaturas em breve|versão 1\.3\)|nenhuma contratação/);
  assert.ok(h.includes('(link, versão 1.5)'));
  const cfg = Object.values(LINKS_PAGAMENTO).filter(Boolean);
  for (const u of hrefsStripe(h)) assert.ok(cfg.includes(u), u);
});
// Trava de produção: o Pages roda este arquivo com LINKS_PAGAMENTO_PRODUCAO=1 antes do upload.
test('produção: pelo menos um produto com URL LIVE na config', { skip: process.env.LINKS_PAGAMENTO_PRODUCAO !== '1' && 'só no build do Pages' }, () => {
  assert.ok(NA_PAGINA.some((k) => LINKS_PAGAMENTO[k]), 'nenhum link de pagamento: /licitacoes/assinar/ não deve ir ao ar');
});
