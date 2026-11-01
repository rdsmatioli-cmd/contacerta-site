// CC-CALC-TESTES-02: casos de oráculo do INSS 2026 e do IRRF 2026 (com a redução da Lei 15.270/2025) nas bordas das
// faixas. Os valores esperados foram digitados à mão a partir das tabelas oficiais (conta no comentário de cada caso),
// sem importar assets/js/tabelas.js; cada caso é conferido também contra o cálculo exato em centavos de
// tests/oraculo/oficial-2026.mjs, que traz as fontes. Mudança em tabelas.js ou em calc.js que mexa num centavo destes
// valores derruba o teste. Testes por propriedade (fast-check): tests/oraculo/. Rode: node --test 'tests/*.test.mjs'
import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../assets/js/calc.js';
import { inssOraculo, tabelaIrrfOraculo, irrfOraculo, centavos } from './oraculo/oficial-2026.mjs';

// [salário de contribuição, INSS esperado] — empregado, faixas progressivas.
const INSS_BORDAS = [
  [0, 0],
  [1621.0, 121.58], // 1.621,00 × 7,5% = 121,575
  [1621.01, 121.58], // 121,575 + 0,01 × 9% = 121,5759
  [2902.84, 236.94], // 121,575 + 1.281,84 × 9% (115,3656) = 236,9406
  [2902.85, 236.94], // 236,9406 + 0,01 × 12% = 236,9418
  [4354.27, 411.11], // 236,9406 + 1.451,43 × 12% (174,1716) = 411,1122
  [4354.28, 411.11], // 411,1122 + 0,01 × 14% = 411,1136
  [8475.55, 988.09], // 411,1122 + 4.121,28 × 14% (576,9792) = 988,0914: contribuição máxima
  [8475.56, 988.09], // acima do teto: a do teto
  [100000, 988.09],
];

test('INSS 2026 nas bordas das faixas (Portaria MPS/MF 13/2026)', () => {
  for (const [salario, esperado] of INSS_BORDAS) {
    assert.equal(inssOraculo(centavos(salario)), centavos(esperado), `oráculo, salário ${salario}`);
    assert.equal(C.inssEmpregado(salario).inss, esperado, `calc.js, salário ${salario}`);
  }
  // Contribuinte individual, facultativo e MEI: valores publicados na mesma página do INSS.
  assert.equal(C.inssIndividual(0, 'baixaRendaMei').inss, 81.05); // 5% de R$ 1.621,00
  assert.equal(C.inssIndividual(0, 'simplificado').inss, 178.31); // 11% de R$ 1.621,00
  assert.equal(C.inssIndividual(0, 'normal').inss, 324.2); // 20% do salário mínimo
  assert.equal(C.inssIndividual(8475.55, 'normal').inss, 1695.11); // 20% do teto
  assert.equal(C.inssIndividual(50000, 'normal').inss, 1695.11);
});

// [base de cálculo, imposto pela tabela, alíquota da faixa] — Tabela de Incidência Mensal, sem a redução.
const IRRF_TABELA_BORDAS = [
  [2428.8, 0, 0], // isento
  [2428.81, 0, 0.075], // 2.428,81 × 7,5% − 182,16 = 0,00075
  [2826.65, 29.84, 0.075], // 211,99875 − 182,16 = 29,83875
  [2826.66, 29.84, 0.15], // 423,999 − 394,16 = 29,839
  [3751.05, 168.5, 0.15], // 562,6575 − 394,16 = 168,4975
  [3751.06, 168.5, 0.225], // 843,9885 − 675,49 = 168,4985
  [4664.68, 374.06, 0.225], // 1.049,553 − 675,49 = 374,063
  [4664.69, 374.06, 0.275], // 1.282,78975 − 908,73 = 374,05975
  [10000, 1841.27, 0.275], // 2.750 − 908,73
];

test('IRRF 2026: tabela de incidência mensal nas bordas (Receita Federal, Tributação de 2026)', () => {
  for (const [base, esperado, aliquota] of IRRF_TABELA_BORDAS) {
    assert.equal(tabelaIrrfOraculo(centavos(base)), centavos(esperado), `oráculo, base ${base}`);
    const t = C.tabelaProgressiva(base);
    assert.equal(t.imposto, esperado, `calc.js, base ${base}`);
    assert.equal(t.faixa.aliquota, aliquota, `faixa da base ${base}`);
  }
});

// Rendimentos sem deduções legais: vale o desconto simplificado de R$ 607,20.
// [rendimentos, imposto pela tabela, redução, IRRF devido]
const IRRF_REDUCAO_BORDAS = [
  [5000.0, 312.89, 312.89, 0], // base 4.392,80: 988,38 − 675,49 = 312,89; redução até 312,89 (imposto zero)
  [5000.01, 312.89, 312.89, 0], // base 4.392,81: 312,89225; redução 978,62 − 0,133145 × 5.000,01 = 312,89366855
  [6000.0, 574.29, 179.75, 394.54], // base 5.392,80: 1.483,02 − 908,73; redução 978,62 − 798,87
  [7349.99, 945.54, 0.01, 945.53], // base 6.742,79: 945,53725; redução 978,62 − 978,61441855 = 0,00558145
  [7350.0, 945.54, 0, 945.54], // base 6.742,80; redução 978,62 − 978,61575 = 0,00425: R$ 0,00
  [7350.01, 945.54, 0, 945.54], // acima de R$ 7.350,00: sem redução
  [7607.2, 1016.27, 0, 1016.27], // exemplo 5 da Receita: base 7.000,00 × 27,5% − 908,73
];

test('IRRF 2026: redução da Lei 15.270/2025 nas bordas de R$ 5.000,00 e R$ 7.350,00', () => {
  for (const [rendimentos, tabela, reducao, irrf] of IRRF_REDUCAO_BORDAS) {
    const o = irrfOraculo({ rendimentos: centavos(rendimentos) });
    assert.deepEqual([o.impostoTabela, o.reducao, o.irrf], [tabela, reducao, irrf].map(centavos), `oráculo, ${rendimentos}`);
    const r = C.irrfMensal({ rendimentos });
    assert.deepEqual([r.impostoTabela, r.reducao, r.irrf], [tabela, reducao, irrf], `calc.js, ${rendimentos}`);
    assert.equal(r.usaSimplificado, true);
    assert.equal(r.deducoes, 607.2);
  }
  // Dependentes (R$ 189,59 cada) e INSS como deduções legais, acima da faixa de redução:
  // base 10.000 − 988,09 − 379,18 = 8.632,73 × 27,5% − 908,73 = 1.465,27075.
  const d = C.irrfMensal({ rendimentos: 10000, inss: 988.09, dependentes: 2 });
  assert.deepEqual([d.usaSimplificado, d.base, d.deducoes, d.irrf], [false, 8632.73, 1367.27, 1465.27]);
  assert.equal(irrfOraculo({ rendimentos: 1000000, inss: 98809, dependentes: 2 }).irrf, 146527);
});

test('IRRF 2026: rendimento até R$ 5.000,00 dá imposto zero com qualquer dedução (Lei 15.270/2025)', () => {
  const casos = [
    { rendimentos: 5000 },
    { rendimentos: 5000, inss: 501.51 },
    { rendimentos: 5000, inss: 501.51, dependentes: 3 },
    { rendimentos: 5000, pensao: 1200 },
    { rendimentos: 5000, outrasDeducoes: 4999.99 },
    { rendimentos: 4999.99, inss: 501.51, dependentes: 1, pensao: 300 },
    { rendimentos: 3036, inss: 257.73 }, // exemplo 1 da Receita
    { rendimentos: 2428.8 },
    { rendimentos: 0.01 },
  ];
  for (const c of casos) {
    const r = C.irrfMensal(c);
    assert.equal(r.irrf, 0, JSON.stringify(c));
    assert.ok(r.reducao === r.impostoTabela && r.impostoTabela <= 312.89, JSON.stringify(c));
    const o = irrfOraculo({ rendimentos: centavos(c.rendimentos), inss: centavos(c.inss ?? 0), dependentes: c.dependentes ?? 0, pensao: centavos(c.pensao ?? 0), outras: centavos(c.outrasDeducoes ?? 0) });
    assert.equal(o.irrf, 0, `oráculo ${JSON.stringify(c)}`);
  }
  // Um centavo acima, sem deduções, o imposto ainda zera: tabela 312,89 e redução 312,89 (caso acima). Com R$ 5.200,00
  // já sobra imposto: base 4.592,80 × 22,5% − 675,49 = 357,89; redução 978,62 − 692,354 = 286,266 → 286,27; 71,62.
  assert.equal(C.irrfMensal({ rendimentos: 5200 }).irrf, 71.62);
});

// Salário líquido nas bordas: INSS 2026 + IRRF 2026 com a redução, sem dependentes nem outros descontos.
// [bruto, INSS, IRRF, líquido]
const LIQUIDO_BORDAS = [
  [2428.8, 194.28, 0, 2234.52], // INSS 121,575 + 807,80 × 9% = 194,277; base 2.234,52: isento
  [5000.0, 501.51, 0, 4498.49], // INSS 501,5144; simplificado (312,89) < legal (336,67); redução 312,89
  [5000.01, 501.52, 0, 4498.49], // INSS 501,5158; tabela 312,89; redução 312,89
  [7349.99, 830.51, 884.12, 5635.36], // INSS 830,513; legal 6.519,48 × 27,5% − 908,73 = 884,127; redução 0,01
  [7350.0, 830.51, 884.13, 5635.36], // INSS 830,5144; legal 6.519,49: 884,12975; redução 0,00
  [7350.01, 830.52, 884.13, 5635.36], // INSS 830,5158; sem redução
  [8475.55, 988.09, 1150.32, 6337.14], // teto do INSS; legal 7.487,46 × 27,5% − 908,73 = 1.150,3215
];

test('Salário líquido 2026 nas bordas (INSS e IRRF de 2026)', () => {
  for (const [bruto, inss, irrf, liquido] of LIQUIDO_BORDAS) {
    const s = C.salarioLiquido({ bruto });
    assert.deepEqual([s.inss, s.irrf, s.liquido], [inss, irrf, liquido], `calc.js, bruto ${bruto}`);
    const bc = centavos(bruto);
    const ic = inssOraculo(bc);
    const oc = irrfOraculo({ rendimentos: bc, inss: ic }).irrf;
    assert.deepEqual([ic, oc, bc - ic - oc], [inss, irrf, liquido].map(centavos), `oráculo, bruto ${bruto}`);
  }
});
