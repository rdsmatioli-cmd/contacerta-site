// Validação de entradas (laudo QA 10/10/2026: CC-01 a CC-05). Rode: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { validarNumero } from './_src/js/valida.js';
import * as C from './_src/js/calc.js';
import rescisao from './_src/content/rescisao.mjs';
import dasMei from './_src/content/das-mei.mjs';
import ferias from './_src/content/ferias.mjs';
import decimo from './_src/content/decimo-terceiro.mjs';

const campo = (pag, n) => pag.campos.find((c) => c.n === n);

test('CC-01: férias vencidas acima do máximo (2) são limitadas a 2, com aviso', () => {
  const f = campo(rescisao, 'feriasVencidas');
  assert.equal(f.max, 2);
  const r = validarNumero({ raw: '5', min: 0, max: f.max, inteiro: true });
  assert.equal(r.valor, 2);
  assert.match(r.aviso, /máximo é 2/);
  assert.equal(r.erro, undefined);
  // O cálculo com o valor validado é igual ao de 2 períodos, e não ao de 5.
  const base = { salario: 4000, admissao: '2023-02-01', desligamento: '2026-09-15', tipo: 'semJustaCausa', aviso: 'indenizado', saldoFgts: 12000, dependentes: 0 };
  const com2 = C.rescisao({ ...base, feriasVencidas: 2 });
  const comValidado = C.rescisao({ ...base, feriasVencidas: r.valor });
  assert.equal(comValidado.liquido, com2.liquido);
  assert.equal(comValidado.feriasVenc, 8000);
  assert.ok(comValidado.liquido < C.rescisao({ ...base, feriasVencidas: 5 }).liquido);
  assert.equal(validarNumero({ raw: '-1', min: 0, max: 2 }).erro, 'O valor não pode ser negativo.');
  assert.equal(validarNumero({ raw: '1.5', min: 0, max: 2, inteiro: true }).erro, 'Use um número inteiro.');
});

test('CC-02: DAS MEI com 0 meses é erro (mínimo 1) e o total anual usa os meses efetivos', () => {
  const f = campo(dasMei, 'meses');
  assert.equal(f.min, 1);
  const r = validarNumero({ raw: '0', min: f.min, max: f.max, obrig: true, inteiro: true });
  assert.equal(r.erro, 'O mínimo é 1.');
  assert.equal(r.valor, null);
  assert.equal(validarNumero({ raw: '13', min: 1, max: 12 }).valor, 12);
  const m = C.dasMei({ atividade: 'servicos', mesesAtivos: 1, faturamentoAnual: 10000 });
  assert.equal(m.meses, 1);
  assert.equal(m.anual, m.mensal);
});

test('CC-03/CC-04: negativo, vazio e texto geram erro com mensagem', () => {
  assert.equal(validarNumero({ raw: '-3000', min: 0, obrig: true }).erro, 'O valor não pode ser negativo.');
  assert.equal(validarNumero({ raw: '-5', min: 0 }).erro, 'O valor não pode ser negativo.');
  assert.equal(validarNumero({ raw: '', obrig: true, min: 0 }).erro, 'Preencha este campo.');
  assert.equal(validarNumero({ raw: '', badInput: true, obrig: true }).erro, 'Digite só números.');
  assert.equal(validarNumero({ raw: 'abc', min: 0 }).erro, 'Digite só números.');
  // campo opcional vazio vale 0, sem erro
  assert.deepEqual(validarNumero({ raw: '', min: 0 }), { valor: 0 });
  assert.deepEqual(validarNumero({ raw: '3500', min: 0, obrig: true }), { valor: 3500 });
  assert.deepEqual(validarNumero({ raw: '-2', min: null }), { valor: -2 });
});

test('CC-05: férias abaixo de 5 dias e 13º com 0 meses são erro; acima do máximo é limitado com aviso', () => {
  const d = campo(ferias, 'dias');
  assert.equal(validarNumero({ raw: '3', min: d.min, max: d.max }).erro, 'O mínimo é 5.');
  const r45 = validarNumero({ raw: '45', min: d.min, max: d.max });
  assert.equal(r45.valor, 30); assert.match(r45.aviso, /máximo é 30/);
  const m = campo(decimo, 'meses');
  assert.equal(validarNumero({ raw: '0', min: m.min, max: m.max }).erro, 'O mínimo é 1.');
  assert.equal(validarNumero({ raw: '13', min: m.min, max: m.max }).valor, 12);
});

test('Rescisão: férias vencidas fora do prazo de concessão são pagas em dobro, com o 1/3 (CLT art. 137)', () => {
  const base = { salario: 4000, admissao: '2023-02-01', desligamento: '2026-09-15', tipo: 'semJustaCausa', aviso: 'indenizado', saldoFgts: 12000, dependentes: 0, feriasVencidas: 1 };
  const simples = C.rescisao(base);
  const dobro = C.rescisao({ ...base, vencidasEmDobro: [true] });
  assert.equal(simples.feriasVenc, 4000);
  assert.equal(dobro.feriasVenc, 8000);
  assert.equal(dobro.dobraFeriasVenc, 4000);
  assert.equal(dobro.periodosEmDobro, 1);
  // 1/3 sobe exatamente 1/3 da dobra
  // (o 1/3 é arredondado sobre o total de férias, por isso a diferença pode variar 1 centavo)
  assert.ok(Math.abs(dobro.tercoFerias - simples.tercoFerias - 1333.33) <= 0.011);
  assert.ok(Math.abs(dobro.liquido - simples.liquido - 5333.33) <= 0.011);
  // dois períodos, só o 2º em dobro
  const d2 = C.rescisao({ ...base, feriasVencidas: 2, vencidasEmDobro: [false, true] });
  assert.equal(d2.feriasVenc, 12000); assert.equal(d2.periodosEmDobro, 1);
  // marcação de dobro sem período vencido informado não tem efeito
  const zero = C.rescisao({ ...base, feriasVencidas: 0, vencidasEmDobro: [true, true] });
  assert.equal(zero.feriasVenc, 0); assert.equal(zero.dobraFeriasVenc, 0);
  // padrão (sem o campo) = sem dobra, igual ao cálculo anterior
  assert.equal(simples.dobraFeriasVenc, 0);
  // o campo tem limite 2 com aviso específico
  const f = rescisao.campos.find((c) => c.n === 'feriasVencidas');
  assert.match(f.avisoMax, /CLT não limita a 2/);
  assert.equal(rescisao.campos.find((c) => c.n === 'dobro1').v, 'nao');
});
