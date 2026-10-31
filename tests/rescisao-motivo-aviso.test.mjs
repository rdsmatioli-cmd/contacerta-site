// Lote 1 da linha cc-calc (auditoria de 30-31/10/2026): motivo do desligamento x aviso prévio e campos condicionais da
// /rescisao/ (CC-CALC-TRABALHISTA-02, -03, -11 e -12). O CC-CALC-CSS-01 e o comportamento do formulário estão no e2e
// (tests/e2e/rescisao.spec.mjs). Rode: node --test 'tests/*.test.mjs'
import test from 'node:test';
import assert from 'node:assert/strict';
import { validarNumero, periodosVisiveisDobra } from '../assets/js/valida.js';

test('CC-CALC-TRABALHISTA-12: selects de dobra seguem o valor lido pelo cálculo (lerNumeroBR, máximo 2)', () => {
  const campo = (raw) => validarNumero({ raw, min: 0, max: 2, teto: 100000, inteiro: true });
  assert.equal(periodosVisiveisDobra(campo('0')), 0);
  assert.equal(periodosVisiveisDobra(campo('')), 0);
  assert.equal(periodosVisiveisDobra(campo('1')), 1);
  assert.equal(periodosVisiveisDobra(campo('1,0')), 1);
  assert.equal(periodosVisiveisDobra(campo('01')), 1);
  assert.equal(periodosVisiveisDobra(campo('2')), 2);
  assert.equal(periodosVisiveisDobra(campo('3')), 2);
  // campo com erro: null (o ui.js não esconde nem zera os selects)
  for (const raw of ['abc', '-1', '1,5', '200000']) assert.equal(periodosVisiveisDobra(campo(raw)), null, raw);
});
