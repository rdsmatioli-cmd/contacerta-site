// ADV 0b29815b A3 / DEC CPO B: literais Radar somente CNPJ.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
test('Termos 1.5: Radar somente CNPJ apos o preco', () => {
  const s = ler('licitacoes/cobranca/index.html');
  assert.ok(s.includes('por CNPJ, com tributos inclusos. O Radar é contratado somente por empresa com CNPJ; não é vendido para pessoa física com CPF.'));
});
test('Termos 1.5 item 6: CPF somente Montagem', () => {
  const s = ler('licitacoes/cobranca/index.html');
  assert.ok(s.includes('o CPF em vez do CNPJ. Essa opção vale somente para a Montagem de proposta; o Radar exige CNPJ.'));
});
test('Assinar: aviso junto aos botoes do Radar', () => {
  const s = ler('licitacoes/assinar/index.html');
  for (const k of ['radarMensal', 'radarAnual'])
    assert.ok(s.includes('<p class="radar-cnpj">Somente para empresas com CNPJ.</p>\n<p class="compra" data-produto="' + k + '">'));
  assert.equal(s.split('Somente para empresas com CNPJ.').length - 1, 2);
});
