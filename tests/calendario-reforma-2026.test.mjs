// CC-CALC-FINANCEIRO-14 (31/10/2026): calendário da reforma com o cálculo do TCU (28/10/2026, CBS de 11,3%), o
// cancelamento da opção do Simples pelo regime regular (Resolução CGSN nº 194/2026, DOU de 28/09/2026: opção de 01/09 a
// 30/10/2026; cancelamento irretratável de 03/11 a 20/12/2026), o prazo do Senado (15/12/2026) e a janela de março de
// 2027 (LC 123/2006, art. 13, § 10). A tabela estática da página repete MARCOS_REFORMA, na mesma ordem.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as C from '../assets/js/calc.js';

const ler = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const br = (d) => d.split('-').reverse().join('/');
const marco = (data) => C.MARCOS_REFORMA.find((m) => m.data === data);

test('marcos novos: TCU 28/10, cancelamento 03/11 a 20/12, Senado 15/12 e janela de março de 2027', () => {
  assert.match(marco('2026-10-28').t, /TCU[^]*11,3%[^]*TC 006\.529\/2026-7/);
  assert.match(marco('2026-10-30').t, /aberto em 01\/09\/2026/);
  assert.match(marco('2026-11-03').t, /cancelar, em caráter irretratável[^]*até 20\/12\/2026[^]*Resolução CGSN nº 194\/2026/);
  assert.match(marco('2026-12-15').t, /Prazo do Senado[^]*11,3%/);
  assert.match(marco('2026-12-20').t, /Fim do prazo para cancelar/);
  assert.match(marco('2027-03-01').t, /janela de março de 2027[^]*LC 123\/2006, art\. 13, § 10/);
  assert.doesNotMatch(C.MARCOS_REFORMA.map((m) => m.t).join(' '), /1º a 31\/03\/2027/);
  assert.equal(C.calendarioReforma('2026-10-31').proximo.data, '2026-11-03');
  assert.equal(C.calendarioReforma('2026-12-16').proximo.data, '2026-12-20');
});

test('tabela "Todas as datas" da página = MARCOS_REFORMA (data e texto, na mesma ordem)', () => {
  const h = ler('calendario-reforma-tributaria/index.html');
  const corpo = h.match(/<table><thead><tr><th scope="col">Data<\/th><th scope="col">O que acontece<\/th><\/tr><\/thead><tbody>\n([^]*?)<\/tbody>/)[1];
  const linhas = [...corpo.matchAll(/<tr><td>([^<]+)<\/td><td>([^<]+)<\/td><\/tr>/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(linhas, C.MARCOS_REFORMA.map((m) => [br(m.data), m.t]));
});

test('texto do calendário: cálculo do TCU e cancelamento da opção do Simples', () => {
  const h = ler('calendario-reforma-tributaria/index.html');
  assert.match(h, /O TCU aprovou o cálculo em 28\/10\/2026: 11,3%, arredondado de 11,3468% \(TC 006\.529\/2026-7\)/);
  assert.match(h, /quem optou pode cancelá-la de 03\/11 a 20\/12\/2026, em caráter irretratável/);
  assert.ok(h.includes('href="https://www.in.gov.br/web/dou/-/resolucao-cgsn-n-194-de-25-de-setembro-de-2026-735097948"'));
});
