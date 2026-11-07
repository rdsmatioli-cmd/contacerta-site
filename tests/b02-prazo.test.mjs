// B-02: o prazo da oferta e dos Termos é o literal L-prazo do parecer 6c296519 (Anexo ED-1 §3).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { INICIO_SERVICO, PRAZO_RELATORIO } from '../assets/js/empregador/textos-checkout.js';
const ler = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
test('B-02: prazo literal na oferta e nos termos', () => {
  const oferta = ler('empregador-em-dia/avaliacao-rapida-nr1/resultado/index.html');
  assert.ok(oferta.includes(INICIO_SERVICO));
  assert.ok(oferta.includes(PRAZO_RELATORIO));
  assert.ok(!oferta.includes('Prazo estimado de entrega'));
  assert.ok(!oferta.includes('meta de respostas atingida'));
  assert.ok(!oferta.includes('definido no contrato, após o questionário'));
  const termos = ler('termos/index.html');
  assert.ok(termos.includes(PRAZO_RELATORIO));
  assert.ok(!termos.includes('o prazo do item d recomeça'));
  assert.ok(!termos.includes('definido no contrato, após o questionário'));
});
