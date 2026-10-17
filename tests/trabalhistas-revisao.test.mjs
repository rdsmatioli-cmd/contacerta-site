// Revisão das calculadoras trabalhistas (achados CC-TRAB-01 a CC-TRAB-11). Rode: node --test 'tests/*.test.mjs'
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as C from '../assets/js/calc.js';
import { INSS_POR_ANO, INSS_2024, IRRF_POR_DATA } from '../assets/js/tabelas.js';
import rescisaoPag from './_src/content/rescisao.mjs';
import feriasPag from './_src/content/ferias.mjs';

// HTML publicado: "R$" é seguido de espaço não separável; normaliza para comparar com o texto.
const pagina = (p) => readFileSync(new URL(`../${p}/index.html`, import.meta.url), 'utf8').replace(/ /g, ' ');
const R = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/ /g, ' ');

test('CC-TRAB-01: admissão no mês do desligamento conta o saldo de salário desde a admissão', () => {
  const r = C.rescisao({ salario: 3000, admissao: '2026-03-10', desligamento: '2026-03-20', tipo: 'pedidoDemissao', aviso: 'trabalhado' });
  assert.equal(r.diasNoMes, 11); // 10 a 20/03
  assert.equal(r.saldoSalario, 1100);
  assert.equal(r.inssSaldo, 82.5);
  assert.equal(r.liquido, 1017.5);
  assert.equal(C.diasSaldoSalario('2026-03-20', '2026-03-20'), 1); // admitido e desligado no mesmo dia
  assert.equal(C.diasSaldoSalario('2026-03-01', '2026-03-20'), 20); // admissão no dia 1º: igual a não ter admissão no mês
  // sem admissão no mês: inalterado
  assert.equal(C.diasSaldoSalario('2020-01-01', '2026-03-20'), 20);
  assert.equal(C.rescisao({ salario: 3000, admissao: '2024-03-10', desligamento: '2026-10-08' }).saldoSalario, 800);
});

test('CC-TRAB-10: mês trabalhado por inteiro vale 30 dias (mês comercial), inclusive fevereiro', () => {
  const r = C.rescisao({ salario: 3000, admissao: '2020-01-01', desligamento: '2026-02-28', tipo: 'pedidoDemissao', aviso: 'trabalhado' });
  assert.equal(r.diasNoMes, 30); assert.equal(r.saldoSalario, 3000);
  assert.equal(C.diasSaldoSalario('2020-01-01', '2024-02-29'), 30); // bissexto, último dia
  assert.equal(C.diasSaldoSalario('2020-01-01', '2024-02-28'), 28); // não é o último dia
  assert.equal(C.diasSaldoSalario('2020-01-01', '2026-03-31'), 30); // 31 dias trabalhados = 30
  assert.equal(C.diasSaldoSalario('2026-02-01', '2026-02-28'), 30); // admitido no dia 1º e trabalhou o mês todo
  // admissão no mês e desligamento no último dia: mês comercial, 30 − dia da admissão + 1 (revisão do CC-TRAB-01/10)
  assert.equal(C.diasSaldoSalario('2026-02-02', '2026-02-28'), 29); // antes: 27, 3 dias a menos que a admissão em 01/02
  assert.equal(C.diasSaldoSalario('2026-03-02', '2026-03-31'), 29); // antes: 30, igual ao mês inteiro
  assert.equal(C.diasSaldoSalario('2026-02-10', '2026-02-28'), 21);
  assert.equal(C.diasSaldoSalario('2026-03-10', '2026-03-31'), 21);
  assert.equal(C.diasSaldoSalario('2024-02-10', '2024-02-29'), 21); // bissexto
  assert.equal(C.diasSaldoSalario('2026-03-31', '2026-03-31'), 1); // admissão no dia 31 vale como dia 30
  // um dia a mais de admissão tira exatamente um dia de saldo, em fevereiro e em março
  for (const m of ['2026-02', '2026-03']) {
    const fimMes = m === '2026-02' ? `${m}-28` : `${m}-31`;
    assert.equal(C.diasSaldoSalario(`${m}-01`, fimMes) - C.diasSaldoSalario(`${m}-02`, fimMes), 1, m);
  }
  assert.equal(C.rescisao({ salario: 3000, admissao: '2026-02-02', desligamento: '2026-02-28', tipo: 'pedidoDemissao', aviso: 'trabalhado' }).saldoSalario, 2900);
  // desligamento antes do último dia: dias corridos desde a admissão (inalterado)
  assert.equal(C.diasSaldoSalario('2026-03-10', '2026-03-30'), 21);
  assert.equal(C.diasSaldoSalario('2024-02-10', '2024-02-28'), 19);
  const html = pagina('rescisao');
  assert.match(html, /Se a admissão foi no próprio mês, contam só os dias desde a admissão, também pelo mês de 30 dias: quem entra no dia 10 e sai no último dia do mês recebe 21 dias, em qualquer mês\./);
  assert.ok(rescisaoPag.artigo.includes('quem entra no dia 10 e sai no último dia do mês recebe 21 dias'));
});

test('CC-TRAB-02: acordo paga a metade exata do aviso; a projeção usa a metade arredondada para baixo', () => {
  const r = C.rescisao({ salario: 3000, admissao: '2024-01-01', desligamento: '2025-06-01', tipo: 'acordo' });
  assert.equal(r.diasAviso, 33);
  assert.equal(r.avisoIndenizado, 1650); // 33 × 100 ÷ 2
  assert.equal(r.diasProjecao, 16);
  assert.equal(r.fimProjetado, '2025-06-17');
  // número par de dias: inalterado
  assert.equal(C.rescisao({ salario: 3000, admissao: '2024-03-10', desligamento: '2026-10-08', tipo: 'acordo' }).avisoIndenizado, 1800);
  const a = C.avisoPrevio({ salario: 3000, admissao: '2019-05-06', desligamento: '2026-09-30', tipo: 'acordo' });
  assert.equal(a.diasLei, 51); assert.equal(a.dias, 25); assert.equal(a.diasValor, 25.5);
  assert.equal(a.valor, 2550);
  assert.equal(a.fimProjetado, '2026-10-25');
  const s = C.avisoPrevio({ salario: 3000, admissao: '2019-05-06', desligamento: '2026-09-30' });
  assert.equal(s.diasValor, 51); assert.equal(s.valor, 5100);
  // exemplo da página /aviso-previo/ igual ao cálculo
  assert.ok(pagina('aviso-previo').includes(`seriam 25,5 dias (metade de 51), ou ${R(a.valor)}.`));
});

test('CC-TRAB-04: adicional noturno nunca abaixo do mínimo legal (25% rural, 20% urbano)', () => {
  // valor padrão do formulário (20) com tipo rural: usa 25%
  const r = C.adicionalNoturno({ salario: 2200, jornadaMensal: 220, horas: 120, tipo: 'rural', percentual: 20 });
  assert.equal(r.pct, 0.25); assert.equal(r.adicional, 300); assert.equal(r.pisoAplicado, true);
  const r30 = C.adicionalNoturno({ salario: 2200, jornadaMensal: 220, horas: 120, tipo: 'rural', percentual: 30 });
  assert.equal(r30.pct, 0.3); assert.equal(r30.adicional, 360); assert.equal(r30.pisoAplicado, false);
  const u = C.adicionalNoturno({ salario: 2200, jornadaMensal: 220, horas: 154, percentual: 10 });
  assert.equal(u.pct, 0.2); assert.equal(u.adicional, 352); assert.equal(u.pisoAplicado, true);
  assert.equal(C.adicionalNoturno({ salario: 2200, horas: 154, percentual: 20 }).pisoAplicado, false);
  // o formulário troca 20 ↔ 25 ao mudar o tipo
  const ui = readFileSync(new URL('../assets/js/ui.js', import.meta.url), 'utf8');
  assert.match(ui, /id === 'adicional-noturno' && form\.elements\.tipo/);
});

test('CC-TRAB-05: multa e saque do FGTS incluem o depósito sobre as verbas da rescisão', () => {
  const base = { salario: 4000, admissao: '2023-02-01', desligamento: '2026-09-15', tipo: 'semJustaCausa', aviso: 'indenizado', saldoFgts: 12000 };
  const r = C.rescisao(base);
  assert.equal(r.depositoFgtsRescisao, 842.67); // 8% × (2.000 + 5.200 + 3.333,33)
  assert.equal(r.baseFgts, 12842.67);
  assert.equal(r.multaFgts, 5137.07);
  assert.equal(r.saqueFgts, 12842.67);
  assert.equal(r.liquido, 14089.04); // líquido do TRCT não muda
  // férias indenizadas não têm depósito
  const comVencidas = C.rescisao({ ...base, feriasVencidas: 1 });
  assert.equal(comVencidas.depositoFgtsRescisao, r.depositoFgtsRescisao);
  // acordo: 20% e 80% sobre a mesma base
  const a = C.rescisao({ ...base, tipo: 'acordo' });
  assert.equal(a.multaFgts, C.r2(a.baseFgts * 0.2)); assert.equal(a.saqueFgts, C.r2(a.baseFgts * 0.8));
  // pedido de demissão e justa causa: sem multa e sem saque
  const p = C.rescisao({ ...base, tipo: 'pedidoDemissao', aviso: 'trabalhado' });
  assert.equal(p.multaFgts, 0); assert.equal(p.saqueFgts, 0);
  // exemplo da Carla e ajuda do campo, na página e no conteúdo-fonte
  const html = pagina('rescisao');
  for (const v of [r.depositoFgtsRescisao, r.multaFgts, r.baseFgts, r.liquido]) assert.ok(html.includes(R(v)), `faltou ${R(v)}`);
  assert.ok(!html.includes('multa de R$ 4.800,00'));
  const ajuda = rescisaoPag.campos.find((c) => c.n === 'saldoFgts').ajuda;
  assert.match(ajuda, /a calculadora já o soma/);
  assert.ok(html.includes(ajuda));
  assert.ok(rescisaoPag.artigo.includes(`a multa de ${R(r.multaFgts)}`));
});

test('CC-TRAB-06: tabelas de 2024 (INSS e IRRF) e bloqueio antes da primeira tabela', () => {
  const r = C.rescisao({ salario: 6000, admissao: '2020-01-01', desligamento: '2024-11-30', tipo: 'pedidoDemissao', aviso: 'trabalhado' });
  assert.equal(r.saldoSalario, 6000);
  assert.equal(r.inssSaldo, 658.82); // Portaria MPS/MF 2/2024
  assert.equal(r.inssSaldoSubstituida, null);
  assert.equal(r.irSaldo, 572.82); // fev/2024: 27,5% × (6.000 − 658,82) − 896,00, sem redução
  assert.equal(r.tabelaIrrf.rotulo, 'fevereiro/2024 a abril/2025');
  assert.equal(r.tabelaIrrf.substituida, false);
  assert.equal(INSS_POR_ANO[2024], INSS_2024);
  // janeiro/2024: isenção até 2.112,00 e desconto simplificado de 528,00 (Lei 14.663/2023)
  const jan = C.tabelaIrrfPorData('2024-01-31');
  assert.equal(jan.tabela.rotulo, 'janeiro/2024'); assert.equal(jan.tabela.descontoSimplificado, 528);
  assert.equal(jan.tabela.faixas[0].ate, 2112); assert.equal(jan.tabela.reducao, null);
  assert.equal(C.irrfMensal({ rendimentos: 5000, tabela: jan.tabela }).irrf, 354.47); // 22,5% × 4.472 − 651,73
  assert.equal(C.tabelaIrrfPorData('2024-02-01').tabela.descontoSimplificado, 564.8);
  // 13º de dois anos (2024 e 2025): tabelas dos dois anos, sem substituição
  const d = C.rescisao({ salario: 3000, admissao: '2024-01-10', desligamento: '2024-12-20' });
  assert.equal(d.anoFim, 2025); assert.deepEqual(d.tabelasSubstituidas, []);
  assert.equal(d.inss13Anterior, C.inssEmpregado(d.decimoAnterior, INSS_2024).inss);
  // antes da primeira tabela: não calcula
  assert.equal(C.PRIMEIRO_ANO_TABELAS, 2024);
  assert.equal(IRRF_POR_DATA[0].desde, '2024-01-01');
  assert.deepEqual(C.rescisao({ salario: 6000, admissao: '2020-01-01', desligamento: '2023-12-31' }), { anteriorTabelas: true, primeiroAno: 2024 });
  assert.equal(C.tabelaIrrfPorData('2023-12-31').anterior, true);
  // ano futuro continua usando a mais recente e sinalizando (nota de tabela ainda não publicada)
  assert.equal(C.tabelaIrrfPorData('2027-02-01').substituida, true);
  const ui = readFileSync(new URL('../assets/js/ui.js', import.meta.url), 'utf8');
  assert.match(ui, /if \(r\.anteriorTabelas\)/);
});

test('CC-TRAB-07: FGTS deposita também sobre o 13º e o 1/3 de férias a cada 12 meses', () => {
  const f = C.fgts({ salario: 3500, meses: 36 });
  assert.equal(f.deposito, 280); assert.equal(f.depositoAnual, 373.33); assert.equal(f.depositosAnuais, 3);
  assert.equal(f.depositado, 11199.99);
  assert.equal(f.saldo, 11681.39);
  assert.equal(f.multa, 4672.56);
  assert.equal(f.saque, 16353.95);
  // menos de 12 meses: só depósitos mensais
  const f11 = C.fgts({ salario: 3000, meses: 11, comRendimento: false });
  assert.equal(f11.depositosAnuais, 0); assert.equal(f11.saldo, 2640);
  // aprendiz: 2% também nos depósitos anuais
  assert.equal(C.fgts({ salario: 3000, meses: 12, aprendiz: true, comRendimento: false }).saldo, 800); // 60 × 12 + 2% × 4.000
  const html = pagina('fgts');
  for (const v of [f.depositado, f.saldo, f.multa, f.saque, f.depositoAnual]) assert.ok(html.includes(R(v)), `faltou ${R(v)}`);
  const f12 = C.fgts({ salario: 3000, meses: 12, comRendimento: false });
  assert.ok(html.includes(`o total é de ${R(f12.depositado)}, antes do rendimento`));
  assert.ok(!html.includes('R$ 2.880,00 em 12 meses'));
});

test('CC-TRAB-08: o campo de dias de férias é o direito antes da venda', () => {
  const html = pagina('ferias');
  const rot = 'Dias de férias a que tem direito (antes da venda)';
  assert.ok(html.includes(`<label for="f-dias">${rot}</label>`));
  assert.equal(feriasPag.campos.find((c) => c.n === 'dias').l, rot);
  assert.match(html, /para tirar 20 dias e vender 10, informe 30\./);
  assert.ok(!html.includes('Escolha quantos dias de férias vai tirar'));
  // quem informa 30 e marca a venda tira 20 e vende 10: o valor que a página cita
  const v = C.ferias({ salario: 3000, dias: 30, venderDias: true });
  assert.equal(v.diasGozo, 20); assert.equal(v.diasAbono, 10);
  assert.ok(html.includes(R(v.liquido)));
});

test('CC-TRAB-09: INSS do 13º de um só ano usa a tabela do ano', () => {
  const r = C.rescisao({ salario: 6000, admissao: '2024-01-01', desligamento: '2025-06-15' });
  assert.equal(r.avos13Anterior, 0); assert.equal(r.decimo, 3500);
  assert.equal(r.inss13, 313.41); // Portaria MPS/MF 6/2025
  assert.deepEqual(r.tabelasSubstituidas, []);
  assert.equal(C.rescisao({ salario: 12000, admissao: '2024-01-01', desligamento: '2025-06-15' }).inss13, 789.6);
  // 2026: inalterado
  assert.equal(C.rescisao({ salario: 4000, admissao: '2023-02-01', desligamento: '2026-09-15' }).inss13, 288.6);
  // ano sem tabela (2027): usa a mais recente e registra a substituição
  const f = C.rescisao({ salario: 3000, admissao: '2026-01-10', desligamento: '2027-03-20' });
  assert.deepEqual(f.tabelasSubstituidas, [[2027, 2026]]);
  assert.equal(f.inss13, C.inssEmpregado(f.decimo).inss);
  // sem 13º (justa causa): nada a registrar
  assert.deepEqual(C.rescisao({ salario: 3000, admissao: '2026-01-10', desligamento: '2027-03-20', tipo: 'justaCausa' }).tabelasSubstituidas, []);
});

test('CC-TRAB-11: rótulo do vale-transporte deixa claro a base e o limite legal', () => {
  const html = pagina('salario-liquido');
  assert.match(html, /<label for="f-vt">Descontar vale-transporte \(6% do valor digitado; por lei, o desconto é de até 6% do salário-base e não passa do custo das passagens\)<\/label>/);
  // cálculo inalterado: 6% do valor digitado
  assert.equal(C.salarioLiquido({ bruto: 3000, valeTransporte: true }).vt, 180);
});
