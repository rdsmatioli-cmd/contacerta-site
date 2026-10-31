// IRPF R2 (backlog Tributário 31/10/2026, sha256 c4bf55b9...): motor anual 2026 e trava da página /irpf/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { IRPF_2026, impostoTabela, reducaoAnual, simularIrpf, validar, r2 } from '../assets/js/irpf-2026.js';

const base = { rendimentos: 0, irRetido: 0, inss: 0, dependentes: 0, saude: 0, instrucao: 0, pessoasInstrucao: 0 };
const ana = { rendimentos: 108000, inss: 11857.08, dependentes: 1, saude: 4380, instrucao: 3561.5, pessoasInstrucao: 1, irRetido: 14908.92 };

test('R2-11 regressão Ana (3.5)', () => {
  const r = simularIrpf(ana);
  assert.equal(r.completo.devido, 12725.08);
  assert.equal(r.simplificado.devido, 13944.34);
  assert.equal(r.completo.reducao, 0);
  assert.equal(r.simplificado.reducao, 0);
  assert.equal(r.indicado, 'completo');
  assert.equal(r.restituicao, 2183.84);
  assert.equal(r.saldoSimplificado, 964.58);
});

test('R2-02/R2-11 tabela anual: limites exatos das 5 faixas', () => {
  const casos = [[29145.60, 0], [29145.61, r2(29145.61 * 0.075 - 2185.92)], [33919.80, r2(33919.80 * 0.075 - 2185.92)],
    [33919.81, r2(33919.81 * 0.15 - 4729.91)], [45012.60, r2(45012.60 * 0.15 - 4729.91)], [45012.61, r2(45012.61 * 0.225 - 8105.85)],
    [55976.16, r2(55976.16 * 0.225 - 8105.85)], [55976.17, r2(55976.17 * 0.275 - 10904.66)], [0, 0]];
  for (const [b, esp] of casos) assert.equal(impostoTabela(b).imposto, esp, `base ${b}`);
  assert.equal(impostoTabela(29145.61).faixa.aliquota, 0.075);
  assert.equal(impostoTabela(55976.17).faixa.aliquota, 0.275);
});

test('R2-05/R2-11 redução anual: 60.000,00 / 60.000,01 / 88.200,00 / 88.200,01', () => {
  assert.equal(reducaoAnual(60000, 5000), 2694.15);
  assert.equal(reducaoAnual(60000, 1000), 1000);
  assert.equal(reducaoAnual(60000.01, 9999), r2(8429.73 - r2(0.095575 * 60000.01)));
  assert.equal(reducaoAnual(88200, 9999), r2(8429.73 - r2(0.095575 * 88200)));
  assert.equal(reducaoAnual(88200.01, 9999), 0);
  const r = simularIrpf({ ...base, rendimentos: 60000 });
  assert.equal(r.simplificado.devido, 0);
  assert.equal(r.completo.devido, 2901.19);
  assert.equal(r.indicado, 'simplificado');
  const r2b = simularIrpf({ ...base, rendimentos: 88200.01 });
  assert.equal(r2b.simplificado.reducao, 0);
});

test('R2-04/R2-11 simplificado: 20% com teto 17.640,00 (rendimentos 88.200 -> 17.640)', () => {
  assert.equal(simularIrpf({ ...base, rendimentos: 88200 }).simplificado.deducao, 17640);
  assert.equal(simularIrpf({ ...base, rendimentos: 200000 }).simplificado.deducao, 17640);
  assert.equal(simularIrpf({ ...base, rendimentos: 50000 }).simplificado.deducao, 10000);
});

test('R2-03 instrução limitada por pessoa; dependente 2.275,08', () => {
  const r = simularIrpf({ ...base, rendimentos: 100000, instrucao: 10000, pessoasInstrucao: 2, dependentes: 1 });
  assert.equal(r.deducoes.instrucao, 7123);
  assert.equal(r.deducoes.dependentes, 2275.08);
  assert.equal(IRPF_2026.dependente, 2275.08);
  assert.equal(IRPF_2026.instrucaoPorPessoa, 3561.5);
});

test('R2-06 empate indica simplificado; R2-07 saldo a pagar', () => {
  const r = simularIrpf({ ...base, rendimentos: 20000 });
  assert.equal(r.completo.devido, r.simplificado.devido);
  assert.equal(r.indicado, 'simplificado');
  const p = simularIrpf({ ...ana, irRetido: 10000 });
  assert.equal(p.restituicao, 0);
  assert.equal(p.aPagar, 2725.08);
});

test('R2-08 validação', () => {
  assert.deepEqual(validar(ana), []);
  assert.ok(validar({ ...ana, rendimentos: 0 }).includes('rendimentos'));
  assert.ok(validar({ ...ana, saude: -1 }).includes('saude'));
  assert.ok(validar({ ...ana, dependentes: 21 }).includes('dependentes'));
  assert.ok(validar({ ...ana, dependentes: 1.5 }).includes('dependentes'));
  assert.ok(validar({ ...ana, pessoasInstrucao: 3 }).includes('pessoasInstrucao'));
  assert.ok(validar({ ...ana, inss: NaN }).includes('inss'));
});

const html = readFileSync(new URL('../irpf/index.html', import.meta.url), 'utf8');
const ui = readFileSync(new URL('../assets/js/irpf.js', import.meta.url), 'utf8');
const article = html.slice(html.indexOf('<article>'), html.indexOf('</article>'));
const seo = html.slice(0, html.indexOf('</head>'));
const visivel = (article + seo + ui).toLowerCase();

test('R2-13 lint de linguagem: nenhum termo proibido na página, no SEO e nos textos do resultado', () => {
  const proibidos = [/\bcalcul(a|amos|ado|o)\b/, /\bapura/, /imposto (exato|oficial)/, /garantid/, /você vai receber/, /declaração pronta/,
    /emitir darf/, /\bdarf\b/, /declara por você/, /livro[- ]?caixa/, /carnê-leão/];
  const semComentarios = (article + seo + ui.replace(/^\s*\/\/.*$/gm, '')).toLowerCase();
  for (const p of proibidos) assert.ok(!p.test(semComentarios), `termo proibido: ${p}`);
  for (const t of ['estimativa', 'simulação', 'estimamos', 'parece mais vantajoso', 'programa da receita federal', 'valores de 2026 (declaração 2027)'])
    assert.ok(visivel.includes(t), `termo obrigatório ausente: ${t}`);
});

test('R2-14 aviso fixo; R2-12 fontes', () => {
  assert.match(article, /Simulação educativa com valores de 2026\.<\/strong> Não substitui a declaração no programa da Receita Federal\./);
  for (const f of ['Lei 15.191/2025', '15.270/2025', 'art. 11-A', 'art. 10', 'art. 8º', 'receitafederal']) assert.ok(article.includes(f), f);
});

test('R2-15 nenhuma data de prazo da declaração 2027 na página', () => {
  assert.ok(!/\d{1,2}\/\d{1,2}\/2027|2027-\d{2}-\d{2}|\d{1,2} de [a-zç]+ de 2027/i.test(visivel));
  assert.ok(!/prazo/i.test(article + ui.replace(/^\s*\/\/.*$/gm, '')));
});

test('R2-09 captura depois do resultado e OFF; R2-16 checkout OFF', () => {
  assert.match(ui, /IRPF_CAPTURA: false/);
  assert.match(ui, /IRPF_CHECKOUT: false/);
  assert.ok(html.indexOf('id="irpf-captura"') > html.indexOf('id="resultado"'));
  assert.match(html, /<section id="irpf-captura"[^>]* hidden>/);
  assert.match(html.slice(html.indexOf('id="irpf-captura"')), /href="\/privacidade\/"/);
  assert.ok(!/<input[^>]+name="(telefone|cpf)"/i.test(html));
});
