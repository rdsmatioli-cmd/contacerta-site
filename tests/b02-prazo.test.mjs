// B-02 (DEC CPO 30/10; Jurídico 5a441f81 T4/T9): prazo X=5 com acentos na oferta e em /termos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gerarEd } from './_src/empregador/gerar.mjs';
const ler = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const P = 'O relatório orientativo será enviado por e-mail em até 5 dias úteis após a data de encerramento da coleta previamente combinada por e-mail com a empresa.';
const ESTIMADO = 'Prazo estimado de entrega';
test('B-02: prazo do item 6.6 na oferta (flag ON) e nos termos; frase estimada ausente', () => {
  const venda = gerarEd({ flag: true, escrever: false }).find((p) => p.caminho === 'empregador-em-dia/avaliacao-rapida-nr1/resultado/').html;
  assert.ok(venda.includes(P));
  assert.ok(!venda.includes(ESTIMADO));
  const servido = ler('empregador-em-dia/avaliacao-rapida-nr1/resultado/index.html');
  assert.equal(servido.includes(P), false);
  const termos = ler('termos/index.html');
  assert.ok(termos.includes(P));
  assert.ok(!termos.includes(ESTIMADO));
});
