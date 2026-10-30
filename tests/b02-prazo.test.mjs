// B-02 (DEC CPO 30/10; Jurídico 5a441f81 T4/T9): prazo X=5 com acentos na oferta e em /termos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const ler = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const P = 'Prazo estimado de entrega: 5 dias úteis após o pagamento confirmado e o encerramento do questionário (meta de respostas atingida)';
test('B-02: prazo literal na oferta e nos termos', () => {
  for (const p of ['empregador-em-dia/avaliacao-rapida-nr1/resultado/index.html', 'termos/index.html']) {
    const h = ler(p); assert.ok(h.includes(P), p); assert.ok(!h.includes('definido no contrato, após o questionário'), p);
  }
});
