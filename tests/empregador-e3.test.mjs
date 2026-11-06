// Empregador em Dia E3 (backlog v3 T05-T08, T10, T12; v3.3 telas 8-11, 13, 15). Flags OFF, pagamento só em mock (D-22).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { FLAGS, FAIXAS, ED_PAGAMENTO_MODO, ED_PAYMENT_LINK_20_50, ED_PAYMENT_LINKS, LIMIAR_ANALISE } from '../assets/js/empregador/config.js';
import { ctaCheckoutLiberado, linkDePagamentoValido, urlDoLink, TEXTO_OK_PAGINA, VERSAO_TERMOS } from '../assets/js/empregador/textos-checkout.js';
import { cnpjValido, formatarCnpj, pagamento, andamento } from '../assets/js/empregador/motor.js';

const raiz = new URL('../', import.meta.url).pathname;
const ler = (p) => readFileSync(join(raiz, p), 'utf8');
const E3 = ['precos', 'contratar', 'pagamento', 'pagamento/ok', 'painel'].map((c) => `empregador-em-dia/${c}/index.html`);

test('E3: ED_CHECKOUT ligado, login off, pagamento em link vazio', () => {
  assert.equal(FLAGS.EMPREGADOR_EM_DIA, true);
  assert.equal(FLAGS.ED_CHECKOUT, true);
  assert.equal(FLAGS.ED_LOGIN, false);
  assert.equal(FLAGS.ED_ORCAMENTO_NR1, false);
  assert.equal(ED_PAGAMENTO_MODO, 'link');
  assert.equal(ED_PAYMENT_LINK_20_50, '');
  assert.deepEqual(ED_PAYMENT_LINKS, { '20-50': '' });
});

test('E3: noindex; preços e retorno visíveis; contratar, pagamento e painel no aviso', () => {
  const visiveis = new Set(['empregador-em-dia/precos/index.html', 'empregador-em-dia/pagamento/ok/index.html']);
  for (const p of E3) {
    const h = ler(p);
    assert.match(h, /<meta name="robots" content="noindex, nofollow">/, p);
    assert.match(h, p.includes('painel') ? /data-ed-e3="login"/ : /data-ed-e3="checkout"/, p);
    if (visiveis.has(p)) assert.match(h, /<div id="ed-app">/, p);
    else assert.match(h, /<div id="ed-app" hidden>/, p);
  }
  const ui = ler('assets/js/empregador/ui.js');
  assert.match(ui, /data-ed-e3="checkout"\]'\) && !FLAGS\.ED_CHECKOUT\) return/);
  assert.match(ui, /data-ed-e3="login"\]'\) && !FLAGS\.ED_LOGIN\) return/);
});

test('T05: 20-50 à vista; 51-200 em breve, sem parcela; >200 = "Orçamento sob medida"', () => {
  const h = ler('empregador-em-dia/precos/index.html');
  assert.ok(h.includes('R$ 1.490</span><span>à vista</span>'));
  assert.ok(h.includes('data-ed-faixa="51-100"') && h.includes('>Em breve.</span>'));
  assert.ok(h.includes('data-ed-faixa="101-200"'));
  assert.ok(!h.includes('745'));
  assert.ok(h.includes('Orçamento sob medida'));
  for (const p of E3) assert.ok(!ler(p).toLowerCase().includes('sob consulta'), p);
  for (const t of ['Questionário anônimo</li>', 'Inventário dos riscos psicossociais para apoiar o PGR da sua empresa', 'Plano de ação com prazos e responsáveis', 'Lembrete de revisão: a NR-1 pede revisar a avaliação de riscos pelo menos a cada 2 anos']) assert.ok(h.includes(t), t);
});

test('T06: CNPJ por dígito verificador, exemplo fictício válido (D-09), sem Receita/BrasilAPI (D-07)', () => {
  assert.equal(cnpjValido('11.222.333/0001-81'), true);
  assert.equal(cnpjValido('11.222.333/0001-82'), false);
  assert.equal(cnpjValido('11111111111111'), false);
  assert.equal(cnpjValido('123'), false);
  assert.equal(formatarCnpj('11222333000181'), '11.222.333/0001-81');
  const h = ler('empregador-em-dia/contratar/index.html');
  assert.ok(!h.includes('id="ct-cnpj"') && !h.includes('name="cnpj"'));
  assert.ok(h.includes('id="ct-razao"') && h.includes('required'));
  assert.match(h, /id="ct-whats"(?![^>]*required)[^>]*>/);
  const js = ler('assets/js/empregador/ui.js') + ler('assets/js/empregador/motor.js');
  assert.ok(!/brasilapi\.com|receitaws\.com|receita\.fazenda\.gov/i.test(js));
});

test('T07/T12: à vista = preço cheio agora e 0 na entrega; 50/50 soma o preço, nas 3 faixas', () => {
  for (const f of FAIXAS.filter((x) => x.preco)) {
    assert.deepEqual(pagamento(f.id, 'avista'), { preco: f.preco, agora: f.preco, entrega: 0 });
    const m = pagamento(f.id, 'metade');
    assert.equal(m.agora + m.entrega, f.preco);
    assert.equal(m.entrega, f.preco - m.agora);
  }
  assert.equal(pagamento('gt200', 'avista'), null);
  assert.equal(pagamento('lt20', 'metade'), null);
  assert.ok(!ler('empregador-em-dia/pagamento/index.html').includes('data-ed-mock'));
});

test('T07 CA 3: nenhuma chave live nem payload Pix real no repositório publicável', () => {
  const ruim = /sk_live_|pk_live_|rk_live_|000201(26|01)\d{2}0014br\.gov\.bcb\.pix/i;
  const achados = [];
  const andar = (d) => { for (const n of readdirSync(join(raiz, d))) {
    if (['.git', 'node_modules', 'tests'].includes(n)) continue;
    const p = join(d, n); const st = statSync(join(raiz, p));
    if (st.isDirectory()) andar(p); else if (/\.(html|js|mjs|json|css|txt|xml)$/.test(n) && ruim.test(ler(p))) achados.push(p);
  } };
  andar('');
  assert.deepEqual(achados, []);
});

test('T08: o redirect leva só o e-mail e não grava pedido falso', () => {
  const ui = ler('assets/js/empregador/ui.js');
  assert.match(ui, /location\.assign\(urlDoLink\(ED_PAYMENT_LINKS\['20-50'\], form\.nf\.value\.trim\(\)\)\)/);
  assert.doesNotMatch(ui, /client_reference_id|codigo\(6\)|Pagamento recebido/);
  const url = urlDoLink('https://buy.stripe.com/abc?locale=pt-BR', 'financeiro@example.com');
  const u = new URL(url);
  assert.equal(u.searchParams.get('prefilled_email'), 'financeiro@example.com');
  assert.equal(u.searchParams.get('locale'), 'pt-BR');
  assert.equal(u.searchParams.get('client_reference_id'), null);
});

test('T10: percentual arredondado para baixo; "já dá para analisar" a partir de 70% (config)', () => {
  assert.equal(LIMIAR_ANALISE, 0.7);
  assert.deepEqual(andamento(26, 34, LIMIAR_ANALISE), { pct: 76, podeAnalisar: true });
  assert.deepEqual(andamento(23, 34, LIMIAR_ANALISE), { pct: 67, podeAnalisar: false });
  assert.deepEqual(andamento(7, 10, LIMIAR_ANALISE), { pct: 70, podeAnalisar: true });
  assert.equal(andamento(1, 0, LIMIAR_ANALISE), null);
});

test('G-1 (parecer NR-1 5243f004): sem "12 meses" nas telas E3; revisão do PGR pela regra de 2 anos', () => {
  for (const p of E3) assert.ok(!ler(p).includes('12 meses'), p);
  assert.ok(ler('empregador-em-dia/precos/index.html').includes('Lembrete de revisão: a NR-1 pede revisar a avaliação de riscos pelo menos a cada 2 anos'));
});

const SST = 'SST: em definição, não incluído no preço';
const VAL = 'Preços válidos até 31/12/2026.';
test('G-2 (NR-1 d8e801e9): revisão da avaliação de riscos (não do PGR), sem "Incluído em todas as faixas"', () => {
  for (const p of E3) { const h = ler(p); assert.ok(!/Revisão do PGR|Incluído em todas as faixas|12 meses/i.test(h), p); }
});
test('M-01 (Advogado 31f8fa10): validade em toda superfície de preço', () => {
  for (const p of ['precos', 'pagamento', 'avaliacao-rapida-nr1/resultado', 'orcamento-nr1']) assert.ok(ler(`empregador-em-dia/${p}/index.html`).includes(VAL), p);
});
test('M-02: sem afirmação de SST incluído; slot data-ed-sst preenchido pelo ui.js (sem texto fixo)', () => {
  for (const p of ['precos', 'painel']) { const h = ler(`empregador-em-dia/${p}/index.html`); assert.ok(h.includes('<p class="ed-sst" data-ed-sst></p>'), p); assert.ok(!h.includes(SST), p); assert.ok(!/profissional de SST analisa|Análise do SST|Análise por profissional/.test(h), p); }
});
test('M-03/M-04/M-05: aviso LGPD em contratar e pagamento; Me avise com consentimento; fornecedor no rodapé', () => {
  for (const p of ['contratar', 'pagamento']) { const h = ler(`empregador-em-dia/${p}/index.html`); assert.match(h, /art\. 7º, V/, p); assert.match(h, /art\. 18/, p); assert.ok(h.includes('href="/privacidade/"'), p); }
  const r = ler('empregador-em-dia/avaliacao-rapida-nr1/resultado/index.html');
  // F-1 (Advogado d39ff580): com ED_ME_AVISE OFF, o resultado não tem formulário, campo de e-mail nem botão "Me avise".
  assert.ok(!/id="ed-avise|type="email"|Me avise/.test(r));
  for (const p of ['empregador-em-dia/index.html', ...E3]) assert.ok(ler(p).includes('RODRIGO DE SIMONE MATIOLI LTDA (LCM Global Services) · CNPJ 61.193.879/0001-20'), p);
});

test('G-3 NR-1 9f7f0070: prazo do resultado definido no contrato', () => {
  const h = readFileSync(new URL('../empregador-em-dia/avaliacao-rapida-nr1/resultado/index.html', import.meta.url), 'utf8');
  assert.ok(h.includes('Prazo estimado de entrega: 5 dias úteis após o pagamento confirmado e o encerramento do questionário (meta de respostas atingida)'));
  assert.ok(!h.includes('profissional de SST após o questionário'));
  assert.ok(!h.includes('conforme contratado pelo estabelecimento'));
});

test('link vazio ou de teste não libera o botão; constante commitada sem /test_', () => {
  assert.equal(linkDePagamentoValido(''), false);
  assert.equal(linkDePagamentoValido('http://buy.stripe.com/abc'), false);
  assert.equal(linkDePagamentoValido('https://buy.stripe.com/test_abc'), false);
  assert.equal(linkDePagamentoValido('https://buy.stripe.com/abc'), true);
  assert.equal(ctaCheckoutLiberado(''), false);
  assert.equal(ctaCheckoutLiberado('https://buy.stripe.com/test_live'), false);
  assert.equal(ctaCheckoutLiberado('https://exemplo.com/test_'), false);
  assert.equal(ctaCheckoutLiberado('https://buy.stripe.com/abc123'), true);
  const cfg = ler('assets/js/empregador/config.js');
  for (const m of cfg.matchAll(/ED_PAYMENT_LINK\w*\s*=\s*'([^']*)'/g)) assert.ok(!m[1].includes('/test_'), m[0]);
  assert.equal(VERSAO_TERMOS, 'TERMOS-EMPREGADOR-1.2');
  const ok = ler('empregador-em-dia/pagamento/ok/index.html');
  assert.ok(ok.includes('Pedido recebido.'));
  assert.ok(!ok.includes('envie o link'));
  assert.ok(!ok.includes('Agora:'));
  const norm = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const i = ok.indexOf('id="ed-pg-ok"');
  const sec = ok.slice(ok.indexOf('>', i) + 1, ok.indexOf('</section>', i));
  assert.equal(norm(sec), norm(TEXTO_OK_PAGINA));
  for (const p of [...E3, 'empregador-em-dia/index.html']) assert.ok(!ler(p).includes('Adequação NR-1'), p);
  assert.ok(!ler('termos/index.html').includes('Adequação NR-1'));
  for (const p of ['contratar', 'pagamento']) {
    const h = ler(`empregador-em-dia/${p}/index.html`);
    assert.ok(!/<(input|select|textarea)\b[^>]*\bname="cnpj"/i.test(h), p);
  }
});
