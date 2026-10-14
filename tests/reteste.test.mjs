// Regressões do reteste de QA de 10/10/2026 (N-01, N-02, N-04, N-11). Rode: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { lerNumeroBR, validarNumero } from '../assets/js/valida.js';
import { validarDataPagamento } from '../assets/js/valida.js';

test('N-01: formato brasileiro nos campos de valor', () => {
  const n = (s) => lerNumeroBR(s).n;
  assert.equal(n('3500,50'), 3500.5);
  assert.equal(n('3.500'), 3500);
  assert.equal(n('3.500,00'), 3500);
  assert.equal(n('3.500,5'), 3500.5);
  assert.equal(n('1.234.567,89'), 1234567.89);
  assert.equal(n('1.500.000'), 1500000);
  assert.equal(n('3500.50'), 3500.5); // ponto decimal sem ambiguidade
  assert.equal(n('3500.5'), 3500.5);
  assert.equal(n('3500'), 3500);
  assert.equal(n('R$ 3.500,50'), 3500.5);
  assert.equal(n('3 500,50'), 3500.5);
  assert.equal(n('0,5'), 0.5);
  assert.equal(n(',5'), 0.5);
  assert.equal(n('1.78'), 1.78);
  assert.equal(n('0.123'), 0.123); // zero à esquerda: decimal, não milhar
  assert.equal(n('9,11'), 9.11);
  assert.equal(n('-2,5'), -2.5);
  // ambíguos ou malformados: erro, nunca um valor silenciosamente errado
  assert.ok(lerNumeroBR('3,500.50').erro);
  assert.ok(lerNumeroBR('3.50,00').erro);
  assert.ok(lerNumeroBR('1,2,3').erro);
  assert.ok(lerNumeroBR('35.00.0').erro);
  // "1,000" é ambíguo: erro com a mensagem exata, sem conversão (reteste 8749b7e)
  assert.deepEqual(lerNumeroBR('1,000'), { erro: 'Formato ambíguo: use 1.000,00 ou 1000' });
  assert.equal(validarNumero({ raw: '1,000', min: 0 }).valor, null);
  assert.equal(lerNumeroBR('999,500').erro, 'Formato ambíguo: use 1.000,00 ou 1000');
  assert.equal(lerNumeroBR('1,00').n, 1);
  assert.equal(lerNumeroBR('0,125').n, 0.125);
  assert.equal(lerNumeroBR('1.000,000').n, 1000);
  // via validação completa (o que a calculadora usa)
  assert.equal(validarNumero({ raw: '3500,50', min: 0, obrig: true }).valor, 3500.5);
  assert.equal(validarNumero({ raw: '3.500', min: 0, obrig: true }).valor, 3500);
  assert.equal(validarNumero({ raw: '3.500,00', min: 0, obrig: true }).valor, 3500);
});

test('N-04 / CC-04: notação científica, texto colado e teto por campo', () => {
  assert.equal(validarNumero({ raw: '1e5', min: 0 }).erro, 'Digite só números.');
  assert.equal(validarNumero({ raw: '1E5' }).erro, 'Digite só números.');
  assert.equal(validarNumero({ raw: 'abc', min: 0, obrig: true }).erro, 'Digite só números.');
  assert.equal(validarNumero({ raw: '12abc', min: 0 }).erro, 'Digite só números.');
  assert.equal(validarNumero({ raw: 'Infinity' }).erro, 'Digite só números.');
  assert.equal(validarNumero({ raw: '0x10' }).erro, 'Digite só números.');
  assert.equal(validarNumero({ raw: '-', min: 0 }).erro, 'Digite só números.');
  const big = validarNumero({ raw: '999999999999', min: 0, teto: 100000000 });
  assert.equal(big.valor, null);
  assert.match(big.erro, /Valor muito alto: o máximo aceito é 100\.000\.000/);
  assert.equal(validarNumero({ raw: '31', min: 0, teto: 30, inteiro: true }).valor, null);
  assert.equal(validarNumero({ raw: '100.000.000', min: 0, teto: 100000000 }).valor, 100000000);
});

test('N-11: salário 0 é erro com mensagem', () => {
  assert.equal(validarNumero({ raw: '0', min: 0, obrig: true, positivo: true }).erro, 'Informe um valor maior que zero.');
  assert.equal(validarNumero({ raw: '0,00', min: 0, obrig: true, positivo: true }).erro, 'Informe um valor maior que zero.');
  assert.deepEqual(validarNumero({ raw: '0', min: 0 }), { valor: 0 }); // campos não positivos aceitam 0
});


test('Data de pagamento: anterior ao desligamento é erro; mais de 10 dias é alerta; vazia não valida', () => {
  assert.equal(validarDataPagamento('2025-12-20', '2025-12-19').erro, 'A data de pagamento não pode ser anterior à data do desligamento.');
  assert.equal(validarDataPagamento('2025-12-20', '2025-12-30'), null);
  assert.match(validarDataPagamento('2025-12-20', '2025-12-31').alerta, /^Pagamento 11 dias após/);
  assert.equal(validarDataPagamento('2025-12-20', ''), null);
});
