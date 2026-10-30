// Empregador em Dia E3 (backlog v3 T05-T08, T10, T12; v3.3 telas 8-11, 13, 15). Flags OFF, pagamento só em mock (D-22).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { FLAGS, FAIXAS, ED_PAGAMENTO_MODO, LIMIAR_ANALISE } from '../assets/js/empregador/config.js';
import { cnpjValido, formatarCnpj, pagamento, andamento } from '../assets/js/empregador/motor.js';

const raiz = new URL('../', import.meta.url).pathname;
const ler = (p) => readFileSync(join(raiz, p), 'utf8');
const E3 = ['precos', 'contratar', 'pagamento', 'pagamento/ok', 'pagamento/2', 'painel'].map((c) => `empregador-em-dia/${c}/index.html`);

test('E3: ED_CHECKOUT e ED_LOGIN OFF, pagamento em mock', () => {
  assert.equal(FLAGS.EMPREGADOR_EM_DIA, false);
  assert.equal(FLAGS.ED_CHECKOUT, false);
  assert.equal(FLAGS.ED_LOGIN, false);
  assert.equal(ED_PAGAMENTO_MODO, 'mock');
});

test('E3: telas atrás de flag (data-ed-e3 dentro de #ed-app hidden), noindex', () => {
  for (const p of E3) {
    const h = ler(p);
    const app = h.indexOf('<div id="ed-app" hidden>');
    assert.ok(app > 0, p);
    const gate = h.indexOf('data-ed-e3=');
    assert.ok(gate > app, `${p}: gate dentro de #ed-app`);
    assert.match(h, /<meta name="robots" content="noindex, nofollow">/, p);
    assert.match(h, p.includes('painel') ? /data-ed-e3="login"/ : /data-ed-e3="checkout"/, p);
  }
  const ui = ler('assets/js/empregador/ui.js');
  assert.match(ui, /data-ed-e3="checkout"\]'\) && !FLAGS\.ED_CHECKOUT\) return/);
  assert.match(ui, /data-ed-e3="login"\]'\) && !FLAGS\.ED_LOGIN\) return/);
});

test('T05: preços e parcelas batem com a tabela; >200 = "Orçamento sob medida", sem "sob consulta"', () => {
  const h = ler('empregador-em-dia/precos/index.html');
  for (const f of FAIXAS.filter((x) => x.preco)) {
    const m = (f.preco / 2).toLocaleString('pt-BR');
    assert.ok(h.includes(`R$ ${f.preco.toLocaleString('pt-BR')}</span><span>à vista, ou R$ ${m} agora + R$ ${m} na entrega`), f.id);
  }
  assert.ok(h.includes('Orçamento sob medida'));
  for (const p of E3) assert.ok(!ler(p).toLowerCase().includes('sob consulta'), p);
  for (const t of ['Questionário anônimo por link e QR Code', 'Inventário de riscos psicossociais para o PGR', 'Plano de ação com prazos e responsáveis', 'Revisão do PGR: a NR-1 exige pelo menos a cada 2 anos']) assert.ok(h.includes(t), t);
});

test('T06: CNPJ por dígito verificador, exemplo fictício válido (D-09), sem Receita/BrasilAPI (D-07)', () => {
  assert.equal(cnpjValido('11.222.333/0001-81'), true);
  assert.equal(cnpjValido('11.222.333/0001-82'), false);
  assert.equal(cnpjValido('11111111111111'), false);
  assert.equal(cnpjValido('123'), false);
  assert.equal(formatarCnpj('11222333000181'), '11.222.333/0001-81');
  const h = ler('empregador-em-dia/contratar/index.html');
  assert.ok(h.includes('Exemplo: o CNPJ da nota fiscal.'));
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
  for (const p of ['empregador-em-dia/pagamento/index.html', 'empregador-em-dia/pagamento/2/index.html']) assert.match(ler(p), /data-ed-mock>Modo teste/, p);
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

test('T08: link curto aleatório (>= 5, sem CNPJ) e variante à vista sem 2ª parcela', () => {
  const ui = ler('assets/js/empregador/ui.js');
  assert.match(ui, /link: codigo\(6\)/);
  assert.match(ui, /crypto\.getRandomValues/);
  assert.match(ui, /p\.forma === 'avista' \? 'você recebe o relatório' :/);
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
  assert.ok(ler('empregador-em-dia/precos/index.html').includes('Revisão do PGR: a NR-1 exige pelo menos a cada 2 anos'));
});
