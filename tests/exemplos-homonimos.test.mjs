// Exemplos homônimos (31/10/2026): o mesmo caso aparece na calculadora e no post do blog, com os mesmos números, e
// os números saem do calc.js.
// CC-CALC-TRABALHISTA-11: 13º de quem foi admitido em junho, R$ 2.500,00 (1ª parcela pelo Decreto 10.854/2021, art. 78,
//   § 4º: metade de 1/12 por mês de serviço até o pagamento em novembro).
// CC-CALC-TRABALHISTA-05: rescisão da Carla; a multa de 40% do FGTS inclui o depósito sobre as verbas da rescisão.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as C from '../assets/js/calc.js';

const ler = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const BRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); // R$ com espaço sem quebra, como no site

test('13º admitido em junho (R$ 2.500,00): página, post e calc.js iguais', () => {
  const r = C.decimoTerceiro({ salario: 2500, meses: 7 });
  assert.equal(r.mesesPrimeira, 6);
  const pag = ler('decimo-terceiro/index.html');
  const post = ler('blog/decimo-terceiro-2026/index.html');
  assert.ok(pag.includes(`o 13º bruto é ${BRL(r.bruto)}. A 1ª parcela, paga em 30 de novembro, considera os 6 meses de serviço até novembro: R$ 2.500,00 ÷ 12 × 6 ÷ 2 = ${BRL(r.primeira)}. Após INSS de ${BRL(r.inss)}, a 2ª parcela é ${BRL(r.segunda)}.`));
  for (const v of [r.bruto, r.primeira, r.inss, r.segunda, r.liquidoTotal]) assert.ok(post.includes(BRL(v)), `post sem ${BRL(v)}`);
  assert.ok(post.includes(`R$ 2.500,00 ÷ 12 × 6 meses de serviço até novembro ÷ 2</td><td data-label="Valor">${BRL(r.primeira)}`));
  assert.doesNotMatch(pag, /A 1ª parcela é R\$ 729,17/);
  // FAQ de 7 meses (R$ 3.000,00), FAQPage e visível
  const f = C.decimoTerceiro({ salario: 3000, meses: 7 });
  const txt = `a 1ª parcela, paga em novembro, conta os 6 meses até ali: ${BRL(f.primeira)}; a 2ª, após INSS e IR, é de ${BRL(f.segunda)}.`;
  assert.equal(pag.split(txt).length - 1, 2);
});

test('rescisão da Carla: post e /rescisao/ com depósito da rescisão e multa de 40% do calc.js', () => {
  const r = C.rescisao({ salario: 4000, admissao: '2023-02-01', desligamento: '2026-09-15', tipo: 'semJustaCausa', aviso: 'indenizado', saldoFgts: 12000 });
  const post = ler('blog/como-calcular-rescisao-2026/index.html');
  const pag = ler('rescisao/index.html');
  for (const v of [r.saldoSalario, r.avisoIndenizado, r.decimo, r.liquido, r.depositoFgtsRescisao, r.multaFgts]) {
    assert.ok(post.includes(BRL(v)), `post sem ${BRL(v)}`);
    assert.ok(pag.includes(BRL(v)), `/rescisao/ sem ${BRL(v)}`);
  }
  assert.ok(post.includes(`40% × (R$ 12.000,00 + ${BRL(r.depositoFgtsRescisao)}): depósitos do contrato, atualizados, mais o depósito da rescisão</td><td data-label="Valor">${BRL(r.multaFgts)}`));
  assert.ok(post.includes(`8% × (${BRL(r.saldoSalario)} + ${BRL(r.avisoIndenizado)} + ${BRL(r.decimo)})`));
  assert.ok(post.includes(`saldo do FGTS (${BRL(r.baseFgts)}, já com o depósito da rescisão)`));
  assert.ok(!post.includes('R$ 4.800,00') && !pag.includes('R$ 4.800,00'), 'multa sem o depósito da rescisão');
});

test('13º: nota da 1ª parcela supõe pagamento na 2ª quinzena de novembro e distingue as frações de 15 dias', () => {
  const ui = readFileSync(new URL('../assets/js/ui.js', import.meta.url), 'utf8');
  assert.match(ui, /supõe o pagamento na segunda quinzena de novembro \(até 30\/11\), quando novembro já tem mais de 15 dias de serviço/);
  assert.match(ui, /Na 1ª parcela, conta como mês a fração de mais de 15 dias \(art\. 78, § 4º\); no 13º, a de 15 dias ou mais \(art\. 76, § 2º\)/);
  assert.doesNotMatch(ui, /supõe o pagamento em novembro/);
});
