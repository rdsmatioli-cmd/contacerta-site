// Casos de teste com valores esperados conferidos à mão e/ou em exemplos oficiais.
// Rode: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../assets/js/calc.js';

const eq = (a, b, msg) => assert.equal(C.r2(a), b, msg);
const near = (a, b, tol = 0.01, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} esperado ${b}, obtido ${a}`);

test('r2 arredonda meio para cima sem ruído de ponto flutuante', () => {
  eq(46.605, 46.61);
  eq(121.575, 121.58);
  eq(2166.655, 2166.66);
  eq(-1.005, -1.01);
});

test('INSS 2026 — faixas progressivas (Portaria MPS/MF 13/2026)', () => {
  eq(C.inssEmpregado(1621).inss, 121.58); // 1ª faixa cheia
  eq(C.inssEmpregado(3000).inss, 248.6); // 121,575 + 115,3656 + 11,6592
  eq(C.inssEmpregado(8475.55).inss, 988.09); // teto: contribuição máxima oficial R$ 988,09
  eq(C.inssEmpregado(20000).inss, 988.09); // acima do teto não aumenta
  eq(C.inssEmpregado(6000).inss, 641.51);
  eq(C.inssIndividual(0, 'baixaRendaMei').inss, 81.05); // valor oficial INSS
  eq(C.inssIndividual(0, 'simplificado').inss, 178.31); // valor oficial INSS
  eq(C.inssIndividual(20000, 'normal').inss, 1695.11); // teto 20% oficial
  eq(C.inssIndividual(1000, 'normal').inss, 324.2); // piso: salário mínimo
});

test('IRRF 2026 — exemplos oficiais da Receita Federal (Lei 15.270/2025)', () => {
  // Exemplo 1: R$ 3.036,00, INSS 257,73 -> 0
  assert.equal(C.irrfMensal({ rendimentos: 3036, inss: 257.73 }).irrf, 0);
  // Exemplo 2: R$ 4.000,00, INSS 373,41 -> tabela 114,76, redução 114,76, devido 0
  let r = C.irrfMensal({ rendimentos: 4000, inss: 373.41 });
  assert.equal(r.impostoTabela, 114.76); assert.equal(r.reducao, 114.76); assert.equal(r.irrf, 0); assert.ok(r.usaSimplificado);
  // Exemplo 3: R$ 5.000,00, INSS 509,60 -> tabela 312,89, devido 0
  r = C.irrfMensal({ rendimentos: 5000, inss: 509.6 });
  assert.equal(r.impostoTabela, 312.89); assert.equal(r.irrf, 0);
  // Exemplo 4: R$ 6.000,00, INSS 649,60 -> deduções legais, tabela 562,63, redução 179,75, devido 382,88
  r = C.irrfMensal({ rendimentos: 6000, inss: 649.6 });
  assert.equal(r.usaSimplificado, false); assert.equal(r.impostoTabela, 562.63); assert.equal(r.reducao, 179.75); assert.equal(r.irrf, 382.88);
  // Exemplo 5: R$ 7.607,20, sem deduções -> simplificado, 1.016,27 sem redução
  r = C.irrfMensal({ rendimentos: 7607.2 });
  assert.equal(r.irrf, 1016.27); assert.equal(r.reducao, 0);
  // Dependentes: R$ 189,59 cada
  r = C.irrfMensal({ rendimentos: 10000, inss: 988.09, dependentes: 2 });
  assert.equal(r.base, C.r2(10000 - 988.09 - 2 * 189.59));
});

test('Salário líquido', () => {
  let s = C.salarioLiquido({ bruto: 3000 });
  assert.equal(s.inss, 248.6); assert.equal(s.irrf, 0); assert.equal(s.liquido, 2751.4);
  s = C.salarioLiquido({ bruto: 6000 });
  assert.equal(s.inss, 641.51); assert.equal(s.irrf, 385.1); assert.equal(s.liquido, 4973.39);
  s = C.salarioLiquido({ bruto: 10000 });
  assert.equal(s.inss, 988.09); assert.equal(s.irrf, 1569.55); assert.equal(s.liquido, 7442.36);
  s = C.salarioLiquido({ bruto: 3000, valeTransporte: true, outrosDescontos: 100 });
  assert.equal(s.vt, 180); assert.equal(s.liquido, 2471.4);
});

test('13º salário', () => {
  const d = C.decimoTerceiro({ salario: 3000, meses: 12 });
  assert.equal(d.bruto, 3000); assert.equal(d.primeira, 1500); assert.equal(d.inss, 248.6); assert.equal(d.irrf, 0); assert.equal(d.segunda, 1251.4);
  const p = C.decimoTerceiro({ salario: 2400, meses: 6 });
  // menos de 12 meses: 1ª parcela = metade de 1/12 por mês de serviço até o pagamento em novembro (Decreto 10.854/2021,
  // art. 78, § 4º): 5 meses (julho a novembro) -> 2.400 ÷ 12 × 5 ÷ 2 = 500
  assert.equal(p.bruto, 1200); assert.equal(p.primeira, 500); assert.equal(p.mesesPrimeira, 5); assert.equal(p.inss, 90);
  assert.equal(p.segunda, 610); assert.equal(p.liquidoTotal, C.r2(p.bruto - p.inss - p.irrf));
  assert.equal(C.decimoTerceiro({ salario: 2400, meses: 6, mesesAte1aParcela: 4 }).primeira, 400);
  assert.equal(C.decimoTerceiro({ salario: 2400, meses: 1 }).primeira, 0); // só dezembro: sem adiantamento
  assert.equal(C.decimoTerceiro({ salario: 3000, meses: 12, mediaVariaveis: 600 }).primeira, 1800); // caput: metade do mês anterior
});

test('Férias', () => {
  let f = C.ferias({ salario: 3000 });
  assert.equal(f.terco, 1000); assert.equal(f.inss, 368.6); assert.equal(f.irrf, 0); assert.equal(f.liquido, 3631.4);
  f = C.ferias({ salario: 3000, diasGozo: 20, diasAbono: 10 });
  assert.equal(f.diasGozo, 20); assert.equal(f.diasAbono, 10); assert.equal(f.abono, 1000); assert.equal(f.tercoAbono, 333.33);
  assert.equal(f.inss, 215.69); assert.equal(f.bruto, 4000); assert.equal(f.liquido, 3784.31);
});

test('Horas extras e DSR', () => {
  const h = C.horasExtras({ salario: 2200, horas50: 10, horas100: 5, diasUteis: 25, domingosFeriados: 5 });
  assert.equal(h.valorHora, 10); assert.equal(h.he50, 150); assert.equal(h.he100, 100); assert.equal(h.dsr, 50); assert.equal(h.total, 300);
});

test('Seguro-desemprego 2026 (tabela MTE)', () => {
  assert.equal(C.seguroDesemprego({ salarios: [2000, 2000, 2000], mesesTrabalhados: 18 }).parcela, 1621); // piso = salário mínimo
  assert.equal(C.seguroDesemprego({ salarios: [3000, 3000, 3000], mesesTrabalhados: 18 }).parcela, 2166.66);
  assert.equal(C.seguroDesemprego({ salarios: [5000, 5000, 5000], mesesTrabalhados: 30 }).parcela, 2518.65);
  assert.equal(C.seguroDesemprego({ salarios: [2222.17], mesesTrabalhados: 12 }).parcela, 1777.74); // limite da 1ª faixa
  assert.equal(C.seguroDesemprego({ salarios: [3703.99], mesesTrabalhados: 12 }).parcela, 2518.65); // limite da 2ª faixa = teto
  assert.equal(C.seguroDesemprego({ salarios: [3000], solicitacao: 1, mesesTrabalhados: 18 }).parcelas, 4);
  assert.equal(C.seguroDesemprego({ salarios: [3000], solicitacao: 1, mesesTrabalhados: 10 }).parcelas, 0);
  assert.equal(C.seguroDesemprego({ salarios: [3000], solicitacao: 2, mesesTrabalhados: 10 }).parcelas, 3);
  assert.equal(C.seguroDesemprego({ salarios: [3000], solicitacao: 3, mesesTrabalhados: 6 }).parcelas, 3);
  assert.equal(C.seguroDesemprego({ salarios: [3000], solicitacao: 1, mesesTrabalhados: 30 }).parcelas, 5);
});

test('FGTS', () => {
  let f = C.fgts({ salario: 3000, meses: 12, comRendimento: false });
  // CC-TRAB-07: 12 depósitos de 240 + depósito anual sobre 13º e 1/3 de férias (8% × 4.000 = 320)
  assert.equal(f.deposito, 240); assert.equal(f.saldo, 3200); assert.equal(f.multa, 1280); assert.equal(f.saque, 4480);
  f = C.fgts({ salario: 3000, meses: 12, comRendimento: true });
  const i = Math.pow(1.03, 1 / 12) - 1;
  assert.equal(f.saldo, C.r2(240 * (0.03 / i) + 320)); // série de 12 depósitos a 3% a.a. + depósito anual no 12º mês
  f = C.fgts({ salario: 3000, meses: 12, comRendimento: false, tipo: 'acordo' });
  assert.equal(f.multa, 640); assert.equal(f.saque, C.r2(3200 * 0.8 + 640));
  assert.equal(C.fgts({ salario: 3000, meses: 1, aprendiz: true }).deposito, 60);
});

test('Datas: idade, aviso prévio e avos', () => {
  const i = C.idade('1990-05-15', '2026-10-08');
  assert.deepEqual([i.anos, i.meses, i.dias], [36, 4, 23]);
  assert.equal(C.idade('2000-10-08', '2026-10-08').anos, 26);
  assert.equal(C.idade('2000-10-09', '2026-10-08').anos, 25);
  assert.equal(C.idade('2000-10-09', '2026-10-08').diasProximoAniversario, 1);
  assert.equal(C.idade('2000-10-08', '2026-10-08').diasProximoAniversario, 0); // aniversário hoje
  assert.equal(C.idade('1990-03-01', '2027-03-02').diasProximoAniversario, 365); // 2028 é bissexto
  assert.equal(C.idade('1990-05-15', '2026-10-08').totalDias, 13295);
  assert.equal(C.idade('1988-02-29', '2026-10-08').diasProximoAniversario, 144); // até 01/03/2027
  assert.equal(C.idade('1988-02-29', '2027-02-28').anos, 38);
  assert.equal(C.idade('1988-02-29', '2027-03-01').anos, 39);
  assert.equal(C.diasAvisoPrevio('2026-01-05', '2026-10-08'), 30);
  assert.equal(C.diasAvisoPrevio('2024-03-10', '2026-10-08'), 36);
  assert.equal(C.diasAvisoPrevio('2016-01-01', '2026-10-08'), 60);
  assert.equal(C.diasAvisoPrevio('2000-01-01', '2026-10-08'), 90);
  assert.equal(C.avos13('2020-01-01', '2026-10-08'), 9); // out com 8 dias não conta
  assert.equal(C.avos13('2020-01-01', '2026-10-20'), 10);
  assert.equal(C.avos13('2026-03-20', '2026-12-31'), 9); // mar com 12 dias não conta
  assert.equal(C.avosFerias('2024-03-10', '2026-10-08').avos, 7);
  assert.equal(C.avosFerias('2024-03-10', '2026-11-13').avos, 8);
});

test('Rescisão sem justa causa com aviso indenizado', () => {
  const r = C.rescisao({ salario: 3000, admissao: '2024-03-10', desligamento: '2026-10-08', tipo: 'semJustaCausa', aviso: 'indenizado', saldoFgts: 7000 });
  assert.equal(r.saldoSalario, 800); assert.equal(r.diasAviso, 36); assert.equal(r.avisoIndenizado, 3600);
  assert.equal(r.fimProjetado, '2026-11-13'); assert.equal(r.avos13, 10); assert.equal(r.decimo, 2500);
  assert.equal(r.avosFerias, 8); assert.equal(r.feriasProp, 2000); assert.equal(r.tercoFerias, 666.67);
  assert.equal(r.verbas, 9566.67); assert.equal(r.inssSaldo, 60); assert.equal(r.inss13, 200.69);
  // CC-TRAB-05: base do FGTS = 7.000 + 8% × (800 + 3.600 + 2.500) = 7.552
  assert.equal(r.liquido, 9305.98); assert.equal(r.depositoFgtsRescisao, 552); assert.equal(r.multaFgts, 3020.8); assert.equal(r.saqueFgts, 7552);
});

test('Rescisão — pedido de demissão sem cumprir aviso e justa causa', () => {
  const p = C.rescisao({ salario: 3000, admissao: '2024-03-10', desligamento: '2026-10-08', tipo: 'pedidoDemissao', aviso: 'naoCumprido', feriasVencidas: 1, saldoFgts: 7000 });
  assert.equal(p.avisoIndenizado, 0); assert.equal(p.avos13, 9); assert.equal(p.decimo, 2250); assert.equal(p.avosFerias, 7);
  assert.equal(p.feriasProp, 1750); assert.equal(p.feriasVenc, 3000); assert.equal(p.tercoFerias, 1583.33);
  assert.equal(p.verbas, 9383.33); assert.equal(p.descontoAviso, 3000); assert.equal(p.inss13, 178.19);
  assert.equal(p.liquido, 6145.14); assert.equal(p.multaFgts, 0); assert.equal(p.saqueFgts, 0);
  const j = C.rescisao({ salario: 3000, admissao: '2024-03-10', desligamento: '2026-10-08', tipo: 'justaCausa', feriasVencidas: 1 });
  assert.equal(j.verbas, 4800); assert.equal(j.liquido, 4740); assert.equal(j.decimo, 0);
  const a = C.rescisao({ salario: 3000, admissao: '2024-03-10', desligamento: '2026-10-08', tipo: 'acordo', saldoFgts: 7000 });
  // CC-TRAB-05: base do FGTS = 7.000 + 8% × (800 + 1.800 + 2.500) = 7.408
  assert.equal(a.avisoIndenizado, 1800); assert.equal(a.multaFgts, 1481.6); assert.equal(a.saqueFgts, 5926.4);
});

test('Juros compostos', () => {
  assert.equal(C.jurosCompostos({ inicial: 1000, taxa: 10, periodo: 'anual', meses: 24 }).total, 1210);
  const j = C.jurosCompostos({ aporte: 100, taxa: 1, meses: 12 });
  assert.equal(j.total, 1268.25); assert.equal(j.investido, 1200); assert.equal(j.juros, 68.25);
  assert.equal(C.jurosCompostos({ inicial: 500, aporte: 100, taxa: 0, meses: 10 }).total, 1500);
});

test('Financiamento Price e SAC', () => {
  const p = C.financiamento({ valor: 100000, taxa: 1, periodo: 'mensal', meses: 12, sistema: 'price' });
  assert.equal(p.primeira, 8884.88); near(p.totalJuros, 6618.55, 0.05);
  assert.equal(p.linhas[11].saldo, 0);
  const s = C.financiamento({ valor: 100000, taxa: 1, periodo: 'mensal', meses: 12, sistema: 'sac' });
  assert.equal(s.primeira, 9333.33); assert.equal(s.ultima, 8416.67); assert.equal(s.totalJuros, 6500);
  near(C.taxaMensalDeAnual(12.682503) * 100, 1, 1e-6);
});

test('Investimentos: IR regressivo, CDB, LCI, Tesouro Selic, poupança', () => {
  assert.equal(C.aliquotaIrRendaFixa(180), 0.225);
  assert.equal(C.aliquotaIrRendaFixa(181), 0.2);
  assert.equal(C.aliquotaIrRendaFixa(360), 0.2);
  assert.equal(C.aliquotaIrRendaFixa(361), 0.175);
  assert.equal(C.aliquotaIrRendaFixa(720), 0.175);
  assert.equal(C.aliquotaIrRendaFixa(721), 0.15);
  const r = C.investimentos({ valor: 10000, dias: 365, cdi: 10, pctCdb: 100, pctLci: 90, selic: 13.75, trMensal: 0 });
  const [cdb, lci, tesouro, poup] = r.resultados;
  // 365 dias cai na faixa de 361 a 720 dias: 17,5%
  assert.equal(r.aliquotaIr, 0.175);
  assert.equal(cdb.rendimentoBruto, 1000); assert.equal(cdb.ir, 175); assert.equal(cdb.rendimentoLiquido, 825);
  assert.equal(lci.rendimentoLiquido, 900); assert.equal(lci.ir, 0);
  // Tesouro Selic rende a Selic efetiva (≈ CDI), não a meta: com CDI de 10%, igual ao CDB 100% do CDI (CC-SELIC-01)
  assert.equal(tesouro.rendimentoBruto, 1000); assert.equal(tesouro.ir, 175);
  assert.equal(poup.rendimentoBruto, 616.78); // 10.000 x (1,005^12 - 1)
  // 730 dias: 15% sobre 10.000 x (1,1^2 - 1) = 2.100 -> IR 315
  assert.equal(C.investimentos({ valor: 10000, dias: 730, cdi: 10, selic: 10 }).resultados[0].ir, 315);
  // Selic <= 8,5%: poupança = 70% da Selic; 360 dias completam só 11 aniversários (dias × 12 ÷ 365, CC-POUP-01)
  const b = C.investimentos({ valor: 10000, dias: 360, cdi: 8, selic: 8, trMensal: 0 }).resultados[3];
  assert.equal(b.rendimentoBruto, C.r2(10000 * (Math.pow(1.056, 11 / 12) - 1)));
});

test('Porcentagem e regra de três', () => {
  assert.equal(C.porcentagem.deValor(15, 200), 30);
  assert.equal(C.porcentagem.quantoPorcento(50, 200), 25);
  assert.equal(C.porcentagem.variacao(80, 100), 25);
  assert.equal(C.porcentagem.variacao(100, 80), -20);
  near(C.porcentagem.aumento(100, 10), 110, 1e-9);
  assert.equal(C.porcentagem.desconto(100, 10), 90);
  assert.ok(Number.isNaN(C.porcentagem.quantoPorcento(1, 0)));
  assert.equal(C.regraDeTres({ a: 2, b: 10, c: 5 }), 25);
  assert.equal(C.regraDeTres({ a: 4, b: 10, c: 8, inversa: true }), 5);
});

test('IMC (classificação OMS)', () => {
  const r = C.imc({ peso: 70, altura: 1.75 });
  assert.equal(r.imc, 22.86); assert.equal(r.classe, 'Peso normal');
  assert.equal(C.imc({ peso: 70, altura: 175 }).imc, 22.86); // aceita cm
  assert.equal(C.imc({ peso: 50, altura: 1.7 }).classe, 'Abaixo do peso');
  assert.equal(C.imc({ peso: 90, altura: 1.7 }).classe, 'Obesidade grau I');
  assert.equal(C.imc({ peso: 125, altura: 1.7 }).classe, 'Obesidade grau III');
  assert.equal(C.imc({ peso: 0, altura: 1.7 }), null);
});

test('DAS MEI 2026 (valores oficiais Receita/Simples Nacional)', () => {
  assert.equal(C.dasMei({ atividade: 'comercio' }).mensal, 82.05);
  assert.equal(C.dasMei({ atividade: 'servicos' }).mensal, 86.05);
  assert.equal(C.dasMei({ atividade: 'ambos' }).mensal, 87.05);
  assert.equal(C.dasMei({ atividade: 'comercio', caminhoneiro: true }).mensal, 195.52);
  assert.equal(C.dasMei({ atividade: 'servicos', faturamentoAnual: 90000 }).situacao, 'excessoAte20');
  assert.equal(C.dasMei({ atividade: 'servicos', faturamentoAnual: 100000 }).situacao, 'excessoAcima20');
  assert.equal(C.dasMei({ atividade: 'servicos', mesesAtivos: 6 }).limite, 40500);
  assert.equal(C.dasMei({ atividade: 'servicos' }).anual, 1032.6);
});

test('Conversor de medidas', () => {
  assert.equal(C.converter(100, 'temperatura', 'C', 'F'), 212);
  near(C.converter(0, 'temperatura', 'C', 'K'), 273.15, 1e-9);
  near(C.converter(98.6, 'temperatura', 'F', 'C'), 37, 1e-9);
  near(C.converter(1, 'comprimento', 'milha', 'km'), 1.609344, 1e-12);
  near(C.converter(1, 'massa', 'lb', 'kg'), 0.45359237, 1e-12);
  near(C.converter(1, 'area', 'alqueirePaulista', 'hectare'), 2.42, 1e-12);
  near(C.converter(100, 'velocidade', 'km/h', 'm/s'), 27.7777778, 1e-6);
  near(C.converter(1, 'volume', 'xicara', 'ml'), 240, 1e-9);
});

test('Adicional noturno — CLT art. 73 e Lei 5.889/1973', () => {
  const u = C.adicionalNoturno({ salario: 2200, jornadaMensal: 220, horas: 154, diasUteis: 25, domingosFeriados: 5 });
  eq(u.valorHora, 10);
  eq(u.horasConsideradas, 176); // 154 h de relógio × 60 ÷ 52,5
  eq(u.adicional, 352); // 10 × 20% × 176
  eq(u.dsr, 70.4);
  eq(u.total, 422.4);
  const r = C.adicionalNoturno({ salario: 2200, jornadaMensal: 220, horas: 120, tipo: 'rural' });
  eq(r.horasConsideradas, 120); // rural: sem hora reduzida
  eq(r.adicional, 300); // 10 × 25% × 120
});

test('Aviso prévio proporcional — Lei 12.506/2011', () => {
  const a = C.avisoPrevio({ salario: 3000, admissao: '2019-05-06', desligamento: '2026-09-30' });
  assert.equal(a.anos, 7);
  assert.equal(a.dias, 51);
  eq(a.valor, 5100);
  assert.equal(a.fimProjetado, '2026-11-20');
  assert.equal(C.avisoPrevio({ salario: 3000, admissao: '2019-05-06', desligamento: '2026-09-30', tipo: 'pedidoDemissao' }).dias, 30);
  assert.equal(C.avisoPrevio({ salario: 3000, admissao: '2019-05-06', desligamento: '2026-09-30', tipo: 'acordo' }).dias, 25);
  assert.equal(C.avisoPrevio({ salario: 3000, admissao: '2000-01-01', desligamento: '2026-09-30' }).dias, 90); // teto
  assert.equal(C.avisoPrevio({ salario: 3000, admissao: '2026-09-30', desligamento: '2026-01-01' }), null);
});

test('Custo de funcionário CLT por regime', () => {
  const s = C.custoFuncionario({ salario: 3000, regime: 'simples' });
  eq(s.base, 40000); // 12 salários + 13º + 1/3 de férias
  eq(s.fgts, 3200);
  eq(s.anual, 43200);
  eq(s.mensal, 3600);
  eq(C.custoFuncionario({ salario: 3000, regime: 'simplesIV', rat: 2 }).anual, 52000); // + 22%
  const p = C.custoFuncionario({ salario: 3000, regime: 'presumido', rat: 2, terceiros: 5.8 });
  eq(p.inssPatronal, 11120); // 27,8% × 40.000
  eq(p.mensal, 4526.67);
  eq(C.custoFuncionario({ salario: 3000, regime: 'mei' }).inssPatronal, 1200); // 3% (LC 123, art. 18-C)
  const vt = C.custoFuncionario({ salario: 3000, regime: 'simples', valeTransporte: 300, beneficios: 500, provisionarMulta: true });
  eq(vt.vtEmpresa, 1320); // (300 − 180) × 11
  eq(vt.beneficios, 6000);
  eq(vt.multa, 1280);
});

test('Markup divisor (exemplo Sebrae)', () => {
  const m = C.markup({ custo: 60, despesasFixas: 12, impostos: 4, taxas: 11, lucro: 18 });
  near(m.indice, 1.8182, 0.0001);
  eq(m.preco, 109.09);
  eq(m.vLucro, 19.64);
  assert.equal(C.markup({ custo: 60, despesasFixas: 50, lucro: 50 }), null);
});

test('À vista ou parcelado — juros embutidos e valor presente', () => {
  const a = C.parceladoOuVista({ vista: 1000, parcelas: 10, valorParcela: 110, rendimentoAnual: 0 });
  near(a.taxaImplicita, 0.017715, 0.000002);
  eq(a.vp, 1100);
  assert.equal(a.melhor, 'vista');
  const b = C.parceladoOuVista({ vista: 1000, parcelas: 10, valorParcela: 100, rendimentoAnual: 12.682503 }); // 1% a.m.
  assert.equal(b.taxaImplicita, 0);
  eq(b.vp, 947.13);
  assert.equal(b.melhor, 'parcelado');
  const c = C.parceladoOuVista({ vista: 1000, parcelas: 4, valorParcela: 250, comEntrada: true, rendimentoAnual: 0 });
  assert.equal(c.melhor, 'empate');
});

// ---------- Reforma Tributária (EC 132/2023, LC 214/2025) e NR-1
test('Transição CBS/IBS: alíquotas legais fixas por ano', () => {
  const p = { pisCofinsPct: 3.65, issPct: 5, cbsRefPct: 9.21, ibsRefPct: 18.7 };
  const a = (ano) => C.aliquotasAno(C.TRANSICAO.find((l) => l.ano === ano), p);
  near(a(2026).cbs, 0.009, 1e-12); near(a(2026).ibs, 0.001, 1e-12); near(a(2026).antigos, 0.0865, 1e-12);
  near(a(2027).cbs, 0.0911, 1e-12); near(a(2027).ibs, 0.001, 1e-12); near(a(2027).antigos, 0.05, 1e-12); // art. 347 e 344
  near(a(2029).antigos, 0.045, 1e-12); near(a(2029).ibs, 0.0187, 1e-12); // ISS a 9/10
  near(a(2032).antigos, 0.03, 1e-12);
  near(a(2033).antigos, 0, 1e-12); near(a(2033).novos, 0.2791, 1e-12);
});

test('Transição CBS/IBS: mantém a receita líquida e 2026 sem custo', () => {
  const r = C.transicaoCbsIbs({ precoAtual: 10000, cbsRefPct: 9.21, ibsRefPct: 18.7 });
  eq(r.liquido, 9135);
  const y26 = r.anos[0];
  eq(y26.totalCliente, 10000);
  const y33 = r.anos.at(-1);
  eq(y33.totalCliente, 11684.58); // 9135 × 1,2791
  near(y33.carga, 1 - 9135 / 11684.58, 1e-6);
  assert.equal(C.transicaoCbsIbs({ precoAtual: 0, cbsRefPct: 9, ibsRefPct: 18 }), null);
});

test('Simples híbrido: DAS x CBS/IBS por fora', () => {
  const r = C.simplesHibrido({ receitaMensal: 50000, pctB2B: 80, dasPct: 6, parcelaCbsIbsDasPct: 15.6, cbsPct: 9.11, ibsPct: 0.1, comprasComCredito: 10000 });
  eq(r.ficar.imposto, 3000);
  eq(r.ficar.creditoClientes, 374.4); // 3000 × 15,6% × 80%
  eq(r.hibrido.dasReduzido, 2532);
  eq(r.hibrido.cbsIbsAPagar, 3684); // (50000 − 10000) × 9,21%
  eq(r.hibrido.imposto, 6216);
  eq(r.hibrido.creditoClientes, 3684); // 40000 × 9,21%
  assert.equal(C.simplesHibrido({ receitaMensal: 0, dasPct: 6 }), null);
});

test('Preço na reforma: base sem ISS, ISS do ano por dentro (padrão) ou por fora', () => {
  const r = C.precoReforma({ precoAtual: 1000, tributosAtuaisPct: 8.65, issPct: 5, ano: 2027, cbsPct: 9.11, ibsPct: 0.1 });
  eq(r.base, 913.5);
  eq(r.cbs, 83.22); // base × CBS, sem ISS na base
  eq(r.ibs, 0.91);
  eq(r.total, 1050.14); // (913,50 + 83,22 + 0,91) ÷ 0,95
  eq(r.iss, 52.51);
  eq(r.custoClienteComCredito, 966.01);
  const f = C.precoReforma({ precoAtual: 1000, tributosAtuaisPct: 8.65, issPct: 5, ano: 2027, cbsPct: 9.11, ibsPct: 0.1, issPorDentro: false });
  eq(f.total, 1043.31); // 913,50 × (1 + 0,0911 + 0,001 + 0,05)
  eq(f.iss, 45.68);
  const a29 = C.precoReforma({ precoAtual: 1000, tributosAtuaisPct: 8.65, issPct: 5, ano: 2029, cbsPct: 0, ibsPct: 0 });
  near(a29.issAno, 0.045, 1e-12);
  eq(a29.total, 956.54); // 913,50 ÷ 0,955
  const a33 = C.precoReforma({ precoAtual: 1000, tributosAtuaisPct: 8.65, issPct: 5, ano: 2033, cbsPct: 9.21, ibsPct: 18.7 });
  eq(a33.iss, 0);
  eq(a33.total, 1168.46);
  assert.equal(C.precoReforma({ precoAtual: 1000, tributosAtuaisPct: 100, cbsPct: 9, ibsPct: 0 }), null);
  assert.equal(C.precoReforma({ precoAtual: 1000, tributosAtuaisPct: 8.65, issPct: 5, ano: 2026, cbsPct: 9, ibsPct: 0 }), null);
});

test('Crédito travado: crédito, parcela em risco e custo financeiro', () => {
  const r = C.creditoTravado({ comprasMensais: 100000, cbsPct: 9.11, ibsPct: 0.1, pctInadimplente: 10, diasAtraso: 60, custoDinheiroMes: 1.5 });
  eq(r.credito, 9210);
  eq(r.travado, 921);
  eq(r.travadoAno, 11052);
  eq(r.custoFinanceiroMes, 27.63);
  eq(r.custoFinanceiroAno, 331.56);
});

test('Calendário da reforma: próximo marco e fase', () => {
  const r = C.calendarioReforma('2026-10-10');
  assert.equal(r.proximo.data, '2026-10-28'); // cálculo do TCU da CBS de 2027 (marco incluído em 31/10/2026)
  assert.equal(r.proximo.dias, 18);
  assert.equal(C.calendarioReforma('2026-10-29').proximo.data, '2026-10-30');
  assert.equal(r.fase, 'Teste');
  assert.equal(C.calendarioReforma('2027-06-01').proximo.data, '2029-01-01');
  assert.equal(C.calendarioReforma('2034-01-01').proximo, null);
  assert.equal(C.calendarioReforma('xx'), null);
  assert.ok(C.MARCOS_REFORMA.every((m, i, a) => i === 0 || a[i - 1].data < m.data), 'marcos em ordem');
});

test('Diagnóstico NR-1: níveis, respostas parciais e prioridades', () => {
  const vazio = C.nr1Diagnostico({});
  assert.equal(vazio.respondidos, 0); assert.equal(vazio.nivel, null); assert.equal(vazio.total, 12);
  const todos = (v) => Object.fromEntries(C.NR1_FATORES.map(([k]) => [k, String(v)]));
  assert.equal(C.nr1Diagnostico(todos(0)).nivel, 'baixo');
  assert.equal(C.nr1Diagnostico(todos(1)).nivel, 'moderado');
  assert.equal(C.nr1Diagnostico(todos(2)).nivel, 'alto');
  assert.equal(C.nr1Diagnostico(todos(3)).nivel, 'muitoAlto');
  assert.equal(C.nr1Diagnostico(todos(3)).prioridades.length, 12);
  // Um "quase sempre" com o resto em zero sobe para moderado.
  assert.equal(C.nr1Diagnostico({ ...todos(0), jornada: '3' }).nivel, 'moderado');
  // Assédio com frequência leva no mínimo a alto e aparece primeiro entre os de mesmo peso.
  const a = C.nr1Diagnostico({ ...todos(0), demanda: '2', assedio: '2' });
  assert.equal(a.nivel, 'alto'); assert.equal(a.prioridades[0].k, 'assedio');
  // Parcial: só os respondidos contam; valor inválido é ignorado.
  const p = C.nr1Diagnostico({ demanda: '1', jornada: '', autonomia: 'x' });
  assert.equal(p.respondidos, 1); assert.equal(p.completo, false); assert.equal(p.nivel, 'moderado');
});

// Teste sugerido pelo Marketing (10/10/2026), ajustado às revisões tributária e jurídica de 10/10/2026:
// DAS do híbrido sobre a receita total por padrão; cenário de repasse ao B2B; transição com base de CBS/IBS sem ISS.
test('Simples híbrido ou puro: indicação, base do DAS e repasse ao B2B', () => {
  const b = { receitaMensal: 50000, margemPct: 20, dasPct: 6, parcelaCbsIbsDasPct: 15.6, cbsPct: 9.11, ibsPct: 0.1 };
  const r = C.simplesHibridoOuPuro({ ...b, pctB2B: 100, comprasComCredito: 10000 });
  eq(r.puro.imposto, 3000); eq(r.puro.lucro, 7000); eq(r.puro.creditoClientes, 468); // 3000 × 15,6%
  eq(r.hibrido.valorOperacao, 45783.35); // 50000 ÷ 1,0921
  eq(r.hibrido.das, 2532); // padrão conservador: 50000 × 6% × (1 − 15,6%)
  eq(r.hibrido.cbsIbsAPagar, 3295.65); // 45783,35 × 9,21% − 921
  eq(r.hibrido.lucro, 4172.35); // 50000 − 40000 − 2532 − 3295,65
  eq(r.hibrido.creditoClientes, 4216.65);
  eq(r.ganhoClientes, 3748.65); // 4216,65 − 468
  assert.equal(r.recomendacao, 'hibrido-negociar');
  // DAS sobre o valor sem CBS/IBS (premissa alternativa)
  const v = C.simplesHibridoOuPuro({ ...b, pctB2B: 100, comprasComCredito: 10000, dasSobreValorSemCbsIbs: true });
  eq(v.hibrido.das, 2318.47); // 45783,35 × 6% × 0,844
  // Repasse ao B2B: o cliente paga 50000 + CBS/IBS e se credita; custo efetivo dele sobe a parcela do DAS que perdia
  const p = C.simplesHibridoOuPuro({ ...b, pctB2B: 100, comprasComCredito: 10000, repasseB2B: true });
  eq(p.hibrido.valorOperacao, 50000); eq(p.hibrido.recebido, 54605);
  eq(p.hibrido.das, 2765.2); // 54605 × 6% × 0,844
  eq(p.hibrido.cbsIbsAPagar, 3684); // (50000 − 10000) × 9,21%
  eq(p.hibrido.lucro, 8155.8); // 54605 − 40000 − 2765,20 − 3684
  eq(p.hibrido.creditoClientes, 4605); eq(p.ganhoClientes, -468);
  assert.equal(p.recomendacao, 'hibrido');
  assert.equal(C.simplesHibridoOuPuro({ ...b, pctB2B: 0, comprasComCredito: 0 }).recomendacao, 'puro');
  assert.equal(C.simplesHibridoOuPuro({ ...b, pctB2B: 100, comprasComCredito: 45000 }).recomendacao, 'hibrido');
  assert.equal(C.simplesHibridoOuPuro({ receitaMensal: 0, dasPct: 6 }), null);
});

test('Transição CBS/IBS: base sem ISS e cenário sem ISS sobre CBS/IBS', () => {
  const r = C.transicaoCbsIbs({ precoAtual: 10000, cbsRefPct: 9.21, ibsRefPct: 18.7 });
  const y27 = r.anos.find((a) => a.ano === 2027);
  eq(y27.base, 9135); eq(y27.cbsIbs, 841.33); // 9135 × 9,21%
  eq(y27.totalCliente, 10501.4); // 9135 × 1,0921 ÷ 0,95 (padrão: ISS também sobre a CBS/IBS)
  const s = C.transicaoCbsIbs({ precoAtual: 10000, cbsRefPct: 9.21, ibsRefPct: 18.7, issSobreCbsIbs: false });
  const s27 = s.anos.find((a) => a.ano === 2027);
  eq(s27.totalCliente, 10457.12); // 9135 ÷ 0,95 + 841,33
  eq(s.anos[0].totalCliente, 10000); // 2026 sem custo nos dois cenários
  eq(s.anos.at(-1).totalCliente, r.anos.at(-1).totalCliente); // 2033: sem ISS, cenários iguais
});
