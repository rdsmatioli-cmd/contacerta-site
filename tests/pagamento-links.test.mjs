// DEC CEO 06/11 20h24 + plano CPO v2 39c50fff §4: Payment Links em /licitacoes/assinar/ (sem form, form-action 'none').
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { render, paginasComStripe } from './manutencao/licitacoes-links-pagamento.mjs';
import { LINKS_PAGAMENTO, ROTULOS, EM_BREVE, NA_PAGINA, PAGINA_ASSINAR, PAGINA_OBRIGADO, PAGINAS_SEM_REFERRER, VENDA_LICITACOES } from './config-pagamento-links.mjs';

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const hrefsStripe = (h) => [...h.matchAll(/href="(https:\/\/buy\.stripe\.com\/[^"]*)"/g)].map((m) => m[1]);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('config: URL vazia ou https://buy.stripe.com/<id>, sem repetir', () => {
  const v = Object.values(LINKS_PAGAMENTO).filter(Boolean);
  assert.equal(new Set(v).size, v.length);
  for (const u of v) assert.match(u, /^https:\/\/buy\.stripe\.com\/[A-Za-z0-9_]+$/);
});
test('assinar/ no repositório: todos "em breve" (S-PL1 muda só a constante)', () => {
  const vazio = Object.fromEntries(NA_PAGINA.map((k) => [k, '']));
  assert.equal(ler(PAGINA_ASSINAR), render(ler(PAGINA_ASSINAR), vazio));
  const cheio = render(ler(PAGINA_ASSINAR), Object.fromEntries(NA_PAGINA.map((k, i) => [k, `https://buy.stripe.com/teste${i}`])));
  assert.equal(hrefsStripe(cheio).length, 3);
});
test('assinar/ como o Pages publica (render da constante): URL = link, vazio = "em breve" sem link', () => {
  const h = render(ler(PAGINA_ASSINAR));
  assert.deepEqual(hrefsStripe(h), NA_PAGINA.map((k) => LINKS_PAGAMENTO[k]).filter(Boolean));
  for (const k of NA_PAGINA) {
    const bloco = (h.match(new RegExp(`<p class="compra" data-produto="${k}">[\\s\\S]*?</p>`)) || [])[0];
    assert.ok(bloco, k);
    if (LINKS_PAGAMENTO[k]) assert.ok(bloco.includes(`<a class="btn" href="${LINKS_PAGAMENTO[k]}">${ROTULOS[k]}</a>`), k);
    else { assert.ok(bloco.includes(`aria-disabled="true">${EM_BREVE[k]}</span>`), k); assert.doesNotMatch(bloco, /<a\b/, k); }
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
  assert.doesNotMatch(h.replace('depende do respectivo pagamento confirmado', ''), /[Pp]agamento (recebido|confirmado)|sessionStorage/, 'vedado (ADV 4e6fa371, 4decb25a); exceção: literal L10 do ADV 47da365a');
});
test('home do /licitacoes/ tem CTA para assinar/', () => assert.ok(ler('licitacoes/index.html').includes('href="assinar/"')));
test('Termos 1.5 (cobranca/): sem "indisponível", aceite versão 1.5, links de compra só da config', () => {
  const h = ler('licitacoes/cobranca/index.html');
  assert.match(h, /TERMOS-VENDA-LICITACOES-1\.5/);
  assert.doesNotMatch(h, /temporariamente indisponível|Assinaturas em breve|versão 1\.3\)|nenhuma contratação/);
  assert.ok(h.includes('Termos de Venda do Licitações, versão 1.5 (contacertabr.com.br/licitacoes/cobranca/)'));
  assert.doesNotMatch(h, /[Tt]este gratuito:|\(link, versão/);
  const cfg = Object.values(LINKS_PAGAMENTO).filter(Boolean);
  for (const u of hrefsStripe(h)) assert.ok(cfg.includes(u), u);
});
// DEC CEO 20h51: slot vazio é publicável; só '/test_' barra.
test('slot vazio: assinar/ renderiza "em breve" em todos os produtos, sem href para buy.stripe.com', () => {
  const vazio = Object.fromEntries(Object.keys(LINKS_PAGAMENTO).map((k) => [k, '']));
  const h = render(ler(PAGINA_ASSINAR), vazio);
  assert.deepEqual(hrefsStripe(h), []);
  for (const k of NA_PAGINA) assert.ok(h.includes(`aria-disabled="true">${EM_BREVE[k]}</span>`), k);
});
test('repositório: nenhuma URL de sandbox na config nem nas páginas', () => {
  for (const [k, u] of Object.entries(LINKS_PAGAMENTO)) assert.ok(!u.includes('/test_'), k);
  for (const p of [PAGINA_ASSINAR, PAGINA_OBRIGADO, 'licitacoes/cobranca/index.html', 'licitacoes/index.html']) assert.doesNotMatch(ler(p), /buy\.stripe\.com\/test_|7Re0[0-9]/, p);
});
// PR-S0 (DEC CEO 11/11/2026 19h17): venda fechada; links LIVE desativados na Stripe (19h03 e 19h05). Substitui o teste
// S-PL1 (3 URLs LIVE). Os 3 produtos mostram só 'Em breve', não clicável (span aria-disabled, sem <a>/href).
test('PR-S0: venda fechada, slots vazios; Pages renderiza "Em breve" nos 3 produtos, sem link', () => {
  assert.equal(VENDA_LICITACOES, 'fechada');
  for (const [k, u] of Object.entries(LINKS_PAGAMENTO)) assert.equal(u, '', k);
  const h = render(ler(PAGINA_ASSINAR));
  assert.equal(h, ler(PAGINA_ASSINAR), 'build do Pages não muda assinar/ com a venda fechada');
  for (const k of NA_PAGINA) {
    assert.equal(EM_BREVE[k], 'Em breve', k);
    const bloco = (h.match(new RegExp(`<p class="compra" data-produto="${k}">[\\s\\S]*?</p>`)) || [])[0];
    assert.equal(bloco, `<p class="compra" data-produto="${k}"><span class="btn" aria-disabled="true">Em breve</span></p>`, k);
  }
  for (const r of Object.values(ROTULOS)) assert.ok(!h.includes(r), r);
});
test('PR-S0: com a venda fechada, nenhuma página de licitacoes/ aponta para buy.stripe.com (repositório e build)', () => {
  assert.equal(VENDA_LICITACOES, 'fechada');
  assert.deepEqual(paginasComStripe(fileURLToPath(new URL('../', import.meta.url))), []);
  assert.doesNotMatch(render(ler(PAGINA_ASSINAR)), /buy\.stripe\.com/);
  const tmp = mkdtempSync(join(tmpdir(), 'pr-s0-'));
  mkdirSync(join(tmp, 'licitacoes', 'x'), { recursive: true });
  writeFileSync(join(tmp, 'licitacoes', 'x', 'a.html'), '<a href="https://buy.stripe.com/abc">x</a>');
  assert.equal(paginasComStripe(tmp).length, 1, 'autoteste: a varredura acha o link');
});
// Guarda de deploy: link de sandbox (test_) nunca vai ao ar.
test('DEPLOY=1 / build do Pages: nenhuma URL de Payment Link de sandbox (/test_)', { skip: process.env.DEPLOY !== '1' && process.env.LINKS_PAGAMENTO_PRODUCAO !== '1' && 'só com DEPLOY=1 ou no build do Pages' }, () => {
  for (const [k, u] of Object.entries(LINKS_PAGAMENTO)) assert.ok(!u.includes('/test_'), `${k}: URL de sandbox`);
});
test('guarda de sandbox: URL test_ falha, URL live e vazio passam (autoteste)', () => {
  const ruim = (links) => Object.values(links).some((u) => u.includes('/test_'));
  assert.equal(ruim({ a: 'https://buy.stripe.com/test_abc' }), true);
  assert.equal(ruim({ a: 'https://buy.stripe.com/abc', b: '' }), false);
});
// Adendo ADV A-2 fd1fc8e6 + corte mensal (DEC CPO c50de42a; adendo ADV 9efa7cf6): aviso literal antes de cada link.
test('assinar/: aviso A-2 antes de cada produto (A3: radar-cnpj entre aviso e botão Radar); corte mensal nas 3 páginas', () => {
  const h = ler(PAGINA_ASSINAR);
  for (const k of NA_PAGINA) {
    const cnpjRadar = (k === 'radarMensal' || k === 'radarAnual')
      ? '<p class="radar-cnpj">Somente para empresas com CNPJ.</p>\\n'
      : '';
    assert.match(h, new RegExp(`<p class="aviso-fiscal">Depois da confirmação do pagamento pela Stripe, a Conta Certa enviará um e-mail pedindo o CNPJ da empresa\\.[^<]*</p>\\n${cnpjRadar}<p class="compra" data-produto="${k}">`), k);
  }
  const corte = 'o encerramento do mês dessa confirmação, às 23h59 no horário de Brasília (America/Sao_Paulo, UTC-3)';
  assert.equal(h.split(corte).length - 1, 3);
  assert.equal(ler(PAGINA_OBRIGADO).split(corte).length - 1, 1);
  assert.equal(ler('licitacoes/cobranca/index.html').split(corte).length - 1, 2);
  assert.doesNotMatch(ler('licitacoes/index.html'), /em preparação|Ainda não há inscrição|Não pede senha/);
});

// Adendo ADV f27cdb3a (1): restaura as asserções apagadas em 331adc11 (DEC CPO 7a1eaf70 D1/D3; sem custom_field).
// (Nos Termos, "login"/"senha" só aparecem como o login/senha do próprio cliente no portal do órgão.)
test('Radar sem promessa de login, painel, dashboard, área logada ou plataforma; sem custom_field/<input', () => {
  for (const p of [PAGINA_ASSINAR, PAGINA_OBRIGADO]) {
    const tx = ler(p).replace('não há login, painel nem acesso a plataforma', '').replaceAll('sem login nem painel', '');
    assert.doesNotMatch(tx, /login|painel|dashboard|área logada|área do cliente|plataforma|acess/i, p);
  }
  assert.doesNotMatch(ler('licitacoes/cobranca/index.html').replace('não há login, painel nem acesso a plataforma', '').replaceAll('sem login nem painel', ''), /painel|dashboard|área logada|plataforma/i);
  assert.match(ler(PAGINA_ASSINAR), /envio semanal, por e-mail/);
  assert.match(ler(PAGINA_ASSINAR), /O serviço começa após a emissão da nota fiscal\./);
  assert.doesNotMatch(ler('licitacoes/cobranca/index.html'), /primeiro acesso ao serviço|data em que o acesso termina/);
  for (const p of [PAGINA_ASSINAR, PAGINA_OBRIGADO, 'licitacoes/cobranca/index.html', 'licitacoes/index.html']) assert.doesNotMatch(ler(p), /custom_field|<input/i, p);
});
// Adendo ADV f27cdb3a (2): "em preparação" fora do ar no blog e em editais/.
test('blog e editais/: sem "em preparação"; link para a página de planos', () => {
  for (const p of ['licitacoes/blog/pregoes-material-de-limpeza-pncp.html', 'licitacoes/editais/material-de-limpeza.html']) {
    const h = ler(p); assert.doesNotMatch(h, /em preparação/i, p); assert.ok(h.includes('href="../assinar/"'), p);
  }
});
