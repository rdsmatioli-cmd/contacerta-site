// B-02 (DEC CPO 30/10; Jurídico 5a441f81 T4/T9): prazo X=5 com acentos na oferta e em /termos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const ler = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const P = 'Prazo estimado de entrega: 5 dias úteis após o pagamento confirmado e o encerramento do questionário (meta de respostas atingida)';
test('B-02: prazo literal na oferta e nos termos', () => {
  const oferta = ler('empregador-em-dia/avaliacao-rapida-nr1/resultado/index.html');
  assert.ok(oferta.includes(P));
  assert.ok(!oferta.includes('definido no contrato, após o questionário'));
  const termos = ler('termos/index.html');
  assert.ok(termos.includes('O relatório é enviado por e-mail em até 5 dias úteis contados do recebimento do questionário completo'));
  assert.ok(!termos.includes('definido no contrato, após o questionário'));
});
