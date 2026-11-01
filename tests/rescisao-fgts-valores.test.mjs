// Lote 2 da linha cc-calc (auditoria de 30-31/10/2026): valores que a /rescisao/ e a /fgts/ superestimavam.
// CC-CALC-TRABALHISTA-06 (1ª parcela do 13º já recebida), -04 e CC-CALC-FGTS-01 (saque-aniversário) e -08 (férias
// vencidas = 0 com período aquisitivo completo). O comportamento na página está também no e2e
// (tests/e2e/rescisao.spec.mjs). Rode: node --test 'tests/*.test.mjs'
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as C from '../assets/js/calc.js';
import { alertaFeriasVencidas, validarFeriasVencidas } from '../assets/js/valida.js';
import rescisaoPag from './_src/content/rescisao.mjs';
import { abrirCalculadora } from './_formulario-minimo.mjs';

const pagina = (p) => readFileSync(new URL(`../${p}/index.html`, import.meta.url), 'utf8');
const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/ /g, ' ');
const txt = (html) => html.replace(/ /g, ' ');
const carla = { salario: 4000, admissao: '2023-02-01', desligamento: '2026-09-15', saldoFgts: 12000 };
// Caso do achado -06: dezembro, aviso trabalhado, 13º 12/12
const dez = { salario: 4000, admissao: '2020-01-01', desligamento: '2026-12-15', tipo: 'semJustaCausa', aviso: 'trabalhado', saldoFgts: 12000 };
const NOTA_FGTS = 'Quem adere ao saque-aniversário recebe uma parte do saldo todo ano, no mês do aniversário, mas, se for demitido, saca apenas a multa de 40%, e não o saldo. Para voltar ao saque-rescisão é preciso pedir a mudança e aguardar uma carência de 25 meses.';

// ---------------------------------------------------------------- CC-CALC-TRABALHISTA-06
test('CC-CALC-TRABALHISTA-06: sem a parcela, o resultado é o de antes (padrão do campo = 0)', () => {
  const r = C.rescisao(dez);
  assert.equal(r.liquido, 10809.04); assert.equal(r.depositoFgtsRescisao, 480); assert.equal(r.decimo, 4000);
  assert.equal(r.primeiraParcela13, 0); assert.equal(r.parcela13Aplicada, 0); assert.equal(r.parcela13AcimaDoAno, false);
  assert.deepEqual(C.rescisao({ ...dez, primeiraParcela13: 0 }), r);
  assert.deepEqual(C.rescisao({ ...dez, primeiraParcela13: '' }), r);
  const p = C.rescisao(carla);
  assert.equal(p.liquido, 14089.04); assert.equal(p.depositoFgtsRescisao, 842.67);
});

test('CC-CALC-TRABALHISTA-06: dezembro, parcela de R$ 2.000 sai do líquido e da base do FGTS; INSS e IRRF sobre o 13º inteiro', () => {
  const sem = C.rescisao(dez);
  const r = C.rescisao({ ...dez, primeiraParcela13: 2000 });
  assert.equal(r.inss13, sem.inss13); assert.equal(r.ir13, sem.ir13); assert.equal(r.inss13, 368.6);
  assert.equal(r.verbas, sem.verbas);
  assert.equal(r.parcela13Aplicada, 2000); assert.equal(r.excedenteParcela13, 0);
  assert.equal(r.liquido, 8809.04); // R$ 2.000 a menos
  assert.equal(r.depositoFgtsRescisao, 320); // 8% × (2.000 + 4.000 − 2.000), R$ 160 a menos
  assert.equal(r.baseFgts, 12320); assert.equal(r.multaFgts, 4928);
  assert.equal(r.decimoAnoDesligamento, 4000); assert.equal(r.parcela13AcimaDoAno, false);
  assert.ok(Math.abs(r.liquido - (r.verbas - r.descontos)) < 0.005);
  // texto com vírgula, como vem do campo
  assert.equal(C.rescisao({ ...dez, primeiraParcela13: '2000,00' }).liquido, 8809.04);
});

test('CC-CALC-TRABALHISTA-06: novembro (11/12) e projeção do aviso que passa para o ano seguinte', () => {
  const nov = C.rescisao({ ...dez, desligamento: '2026-11-20', primeiraParcela13: 2000 });
  const novSem = C.rescisao({ ...dez, desligamento: '2026-11-20' });
  assert.equal(nov.decimo, 3666.67); assert.equal(nov.parcela13AcimaDoAno, false);
  assert.equal(nov.liquido, C.r2(novSem.liquido - 2000));
  assert.equal(nov.depositoFgtsRescisao, C.r2(0.08 * (nov.saldoSalario + 3666.67 - 2000)));
  // dezembro com aviso indenizado: a projeção leva o 13º a 2027; a parcela é comparada com o 13º de 2026
  const ind = C.rescisao({ ...dez, aviso: 'indenizado', primeiraParcela13: 2000 });
  assert.equal(ind.anoFim, 2027); assert.equal(ind.decimoAnterior, 4000);
  assert.equal(ind.decimoAnoDesligamento, 4000); assert.equal(ind.parcela13AcimaDoAno, false);
  assert.equal(ind.depositoFgtsRescisao, C.r2(0.08 * (ind.saldoSalario + ind.avisoIndenizado + ind.decimo - 2000)));
  assert.equal(ind.liquido, C.r2(C.rescisao({ ...dez, aviso: 'indenizado' }).liquido - 2000));
});

test('CC-CALC-TRABALHISTA-06: parcela acima do 13º do ano gera o sinal de alerta e é descontada inteira; líquido >= 0', () => {
  const r = C.rescisao({ ...dez, desligamento: '2026-03-20', primeiraParcela13: 2000 });
  assert.equal(r.decimo, 1000); assert.equal(r.decimoAnoDesligamento, 1000);
  assert.equal(r.parcela13AcimaDoAno, true);
  assert.equal(r.parcela13Aplicada, 2000);
  assert.equal(r.depositoFgtsRescisao, C.r2(0.08 * r.saldoSalario)); // 13º menos a parcela, nunca negativo
  // justa causa: não há 13º proporcional; a parcela informada é descontada e sinalizada
  const jc = C.rescisao({ ...dez, tipo: 'justaCausa', primeiraParcela13: 2000 });
  assert.equal(jc.decimo, 0); assert.equal(jc.parcela13AcimaDoAno, true);
  // só o saldo de salário (R$ 2.000 − INSS de R$ 155,69): a parcela fica limitada às verbas
  assert.equal(jc.parcela13Aplicada, 1844.31); assert.equal(jc.excedenteParcela13, 155.69);
  assert.ok(Object.is(jc.liquido, 0), `líquido ${jc.liquido}`);
  // parcela maior que as verbas: limitada, com o excedente devolvido, e o desconto do aviso vem depois
  const g = C.rescisao({ salario: 3000, admissao: '2026-01-05', desligamento: '2026-02-10', tipo: 'pedidoDemissao', aviso: 'naoCumprido', primeiraParcela13: 50000 });
  assert.ok(Object.is(g.liquido, 0), `líquido ${g.liquido}`);
  assert.equal(C.r2(g.parcela13Aplicada + g.excedenteParcela13), 50000);
  assert.equal(g.descontoAvisoAplicado, 0); assert.equal(g.excedenteAviso, g.descontoAviso);
  assert.equal(g.descontos, g.verbas);
  // negativo é ignorado (o campo bloqueia com data-min="0")
  assert.deepEqual(C.rescisao({ ...dez, primeiraParcela13: -500 }), C.rescisao(dez));
});

test('CC-CALC-TRABALHISTA-06: sugestão de metade do salário só em dezembro, com admissão até 1º de janeiro', () => {
  const s = (o) => C.primeiraParcela13Sugerida({ salario: 4000, admissao: '2020-01-01', desligamento: '2026-12-15', ...o });
  assert.equal(s(), 2000);
  assert.equal(s({ admissao: '2026-01-01' }), 2000);
  assert.equal(s({ desligamento: '2026-12-31' }), 2000);
  assert.equal(s({ salario: 3333.33 }), 1666.67);
  // novembro (a parcela pode não ter sido paga ainda), admitido no ano, datas ou salário inválidos: sem sugestão
  for (const o of [{ desligamento: '2026-11-30' }, { desligamento: '2026-01-15' }, { admissao: '2026-01-02' }, { admissao: '2026-06-01' }, { admissao: '2027-01-01' }, { admissao: '' }, { desligamento: 'x' }, { salario: 0 }, { salario: -1 }]) {
    assert.equal(s(o), null, JSON.stringify(o));
  }
});

// ---------------------------------------------------------------- CC-CALC-TRABALHISTA-04 e CC-CALC-FGTS-01
test('saqueFgtsNaSaida: regra única do saque-aniversário (rescisão e FGTS)', () => {
  const f = (tipo, saqueAniversario) => C.saqueFgtsNaSaida({ tipo, saldo: 10000, multa: 4000, saqueAniversario });
  assert.deepEqual(f('semJustaCausa', false), { estimado: true, retido: false, saldo: 10000, multa: 4000, total: 14000 });
  assert.deepEqual(f('acordo', false), { estimado: true, retido: false, saldo: 8000, multa: 4000, total: 12000 });
  assert.deepEqual(f('semJustaCausa', true), { estimado: true, retido: true, saldo: 0, multa: 4000, total: 4000 });
  assert.deepEqual(f('acordo', true), { estimado: false, retido: false, saldo: null, multa: null, total: null });
  for (const tipo of ['pedidoDemissao', 'justaCausa', 'outro']) {
    for (const sa of [false, true]) assert.deepEqual(f(tipo, sa), { estimado: true, retido: false, saldo: 0, multa: 0, total: 0 }, `${tipo} ${sa}`);
  }
});

test('CC-CALC-TRABALHISTA-04: rescisão com saque-aniversário: sem justa causa saca só a multa; acordo não estima', () => {
  const nao = C.rescisao(carla);
  assert.equal(nao.saqueFgts, 12842.67); assert.equal(nao.fgtsRetido, false); assert.equal(nao.saqueFgtsEstimado, true);
  assert.deepEqual(C.rescisao({ ...carla, saqueAniversario: false }), nao);
  const sim = C.rescisao({ ...carla, saqueAniversario: true });
  assert.equal(sim.saqueFgts, 0); assert.equal(sim.fgtsRetido, true); assert.equal(sim.saqueFgtsEstimado, true);
  assert.equal(sim.multaFgts, 5137.07); assert.equal(sim.liquido, nao.liquido); assert.equal(sim.baseFgts, nao.baseFgts);
  const ac = C.rescisao({ ...carla, tipo: 'acordo', saqueAniversario: true });
  assert.equal(ac.saqueFgts, null); assert.equal(ac.saqueFgtsEstimado, false); assert.equal(ac.fgtsRetido, false);
  assert.equal(ac.multaFgts, C.rescisao({ ...carla, tipo: 'acordo' }).multaFgts);
  // pedido de demissão e justa causa: nada muda
  for (const [tipo, aviso] of [['pedidoDemissao', 'trabalhado'], ['justaCausa', undefined]]) {
    assert.deepEqual(C.rescisao({ ...carla, tipo, aviso, saqueAniversario: true }), C.rescisao({ ...carla, tipo, aviso }), tipo);
  }
});

test('CC-CALC-FGTS-01: FGTS com saque-aniversário: sem justa causa só a multa (R$ 4.672,56); acordo não estima', () => {
  const base = { salario: 3500, meses: 36 };
  const nao = C.fgts(base);
  assert.equal(nao.saque, 16353.95); assert.equal(nao.saqueEstimado, true); assert.equal(nao.saldoRetido, false);
  const sim = C.fgts({ ...base, saqueAniversario: true });
  assert.equal(sim.saque, 4672.56); assert.equal(sim.saque, sim.multa); assert.equal(sim.saldoRetido, true);
  assert.equal(sim.saldo, nao.saldo);
  const ac = C.fgts({ ...base, tipo: 'acordo', saqueAniversario: true });
  assert.equal(ac.saque, null); assert.equal(ac.saqueEstimado, false);
  assert.equal(C.fgts({ ...base, tipo: 'acordo' }).saque, C.r2(nao.saldo * 0.8 + C.r2(nao.saldo * 0.2)));
  assert.equal(C.fgts({ ...base, tipo: 'outro', saqueAniversario: true }).saque, 0);
});

test('CC-CALC-TRABALHISTA-04 e CC-CALC-FGTS-01: pergunta nas duas páginas (Não por padrão) e nota igual ao texto publicado', () => {
  const fgts = pagina('fgts');
  assert.ok(fgts.includes(`<p>${NOTA_FGTS}</p>`), 'texto publicado em /fgts/');
  const ui = readFileSync(new URL('../assets/js/ui.js', import.meta.url), 'utf8');
  assert.ok(ui.includes(`'${NOTA_FGTS}'`), 'ui.js usa o mesmo texto');
  const sel = '<div class="campo"><label for="f-saqueAniversario">Aderiu ao saque-aniversário do FGTS?</label><select id="f-saqueAniversario" name="saqueAniversario" data-padrao="nao" aria-describedby="f-saqueAniversario-ajuda"><option value="nao" selected>Não</option><option value="sim">Sim</option></select>';
  for (const p of ['fgts', 'rescisao']) assert.ok(pagina(p).includes(sel), p);
  const fonte = rescisaoPag.campos.find((c) => c.n === 'saqueAniversario');
  assert.equal(fonte.v, 'nao'); assert.ok(pagina('rescisao').includes(`<small>${fonte.ajuda}</small>`));
});

// ---------------------------------------------------------------- CC-CALC-TRABALHISTA-08
test('CC-CALC-TRABALHISTA-08: alerta com 0 período vencido e período aquisitivo completo até a data real', () => {
  const a = alertaFeriasVencidas({ admissao: '2025-08-01', desligamento: '2026-09-15', periodos: 0 });
  assert.equal(a.campo, 'feriasVencidas');
  assert.match(a.alerta, /um período aquisitivo de férias se completou até o desligamento \(terminou em 31\/07\/2026\)/);
  assert.match(a.alerta, /informe 1 período vencido: com 0, o resultado não as inclui\./);
  // o caso do achado continua calculando (não é erro): validarFeriasVencidas não bloqueia
  assert.equal(validarFeriasVencidas({ admissao: '2025-08-01', desligamento: '2026-09-15', periodos: 0 }), null);
  // 1 período informado: sem alerta
  assert.equal(alertaFeriasVencidas({ admissao: '2025-08-01', desligamento: '2026-09-15', periodos: 1 }), null);
  // período completo no último dia trabalhado conta
  assert.ok(alertaFeriasVencidas({ admissao: '2025-08-01', desligamento: '2026-07-31' }));
  assert.equal(alertaFeriasVencidas({ admissao: '2025-08-01', desligamento: '2026-07-30' }), null);
  // nenhum período completo
  assert.equal(alertaFeriasVencidas({ admissao: '2026-01-01', desligamento: '2026-09-15' }), null);
  // padrão da página: 3 períodos, o último até 31/01/2026
  const p = alertaFeriasVencidas({ admissao: '2023-02-01', desligamento: '2026-09-15', periodos: 0 });
  assert.match(p.alerta, /3 períodos aquisitivos de férias se completaram até o desligamento \(o último terminou em 31\/01\/2026\)/);
  // datas vazias ou invertidas: nada
  for (const o of [{ admissao: '', desligamento: '2026-09-15' }, { admissao: '2026-09-15', desligamento: '2025-01-01' }]) assert.equal(alertaFeriasVencidas(o), null);
});

test('CC-CALC-TRABALHISTA-08: o período completado só na projeção do aviso não gera alerta (entra no cálculo)', () => {
  // admissão 01/10/2025, desligamento 15/09/2026: o período fecha em 30/09/2026, dentro da projeção de 33 dias
  const r = C.rescisao({ salario: 4000, admissao: '2025-10-01', desligamento: '2026-09-15', saldoFgts: 5000 });
  assert.equal(r.periodosProjecao, 1);
  assert.equal(alertaFeriasVencidas({ admissao: '2025-10-01', desligamento: '2026-09-15', periodos: 0 }), null);
  // com aviso trabalhado (sem projeção) também não: o período fecha depois do último dia
  assert.equal(alertaFeriasVencidas({ admissao: '2025-10-01', desligamento: '2026-09-29' }), null);
  assert.ok(alertaFeriasVencidas({ admissao: '2025-10-01', desligamento: '2026-09-30' }));
});

// ---------------------------------------------------------------- Formulário publicado (ui.js) com o document mínimo
test('CC-CALC-TRABALHISTA-06 (página): campo opcional na /rescisao/ e na fonte', () => {
  const html = pagina('rescisao');
  assert.match(html, /<label for="f-primeiraParcela13">1ª parcela do 13º já recebida \(opcional\)<\/label><div class="entrada"><span class="pre" aria-hidden="true">R\$<\/span><input [^>]*id="f-primeiraParcela13" name="primeiraParcela13" data-num data-min="0" data-teto="100000000" value="0" aria-describedby="f-primeiraParcela13-ajuda f-primeiraParcela13-msg">/);
  assert.doesNotMatch(html.match(/<input [^>]*id="f-primeiraParcela13"[^>]*>/)[0], /data-obrig/);
  const fonte = rescisaoPag.campos.find((c) => c.n === 'primeiraParcela13');
  assert.equal(fonte.v, 0); assert.ok(html.includes(`<small>${fonte.ajuda}</small>`));
});

test('CC-CALC-TRABALHISTA-06 (formulário): sugestão em dezembro, marcada; valor digitado nunca é sobrescrito', async () => {
  const f = await abrirCalculadora('rescisao', { admissao: '2020-01-01', desligamento: '2026-12-15', aviso: 'trabalhado' });
  const p13 = f.campo('primeiraParcela13');
  assert.equal(p13.value, '2000');
  let out = txt(f.out.innerHTML);
  assert.ok(out.includes(`1ª parcela do 13º já recebida (valor sugerido)</th><td>− ${brl(2000)}`), out.slice(0, 300));
  assert.ok(out.includes(brl(8809.04)));
  assert.ok(out.includes('sem a 1ª parcela do 13º, que já teve depósito)</th><td>' + brl(320)));
  assert.match(f.el('f-primeiraParcela13-msg').textContent, /^Valor sugerido: metade do salário/);
  assert.equal(p13.getAttribute('aria-invalid'), null);
  // salário muda: a sugestão acompanha (campo não editado)
  f.campo('salario').value = '5000';
  f.calcular();
  assert.equal(p13.value, '2500');
  // novembro: sem sugestão, o campo volta ao valor inicial
  f.campo('desligamento').value = '2026-11-20';
  out = txt(f.calcular());
  assert.equal(p13.value, '0');
  assert.ok(!out.includes('1ª parcela do 13º'));
  assert.equal(f.el('f-primeiraParcela13-msg').hidden, true);
  // de volta a dezembro, o usuário digita: o valor fica, mesmo com outro salário ou outro mês
  f.campo('desligamento').value = '2026-12-15';
  f.calcular();
  assert.equal(p13.value, '2500');
  p13.value = '1500'; p13.disparar('input');
  f.campo('salario').value = '6000';
  out = txt(f.calcular());
  assert.equal(p13.value, '1500');
  assert.ok(out.includes(`1ª parcela do 13º já recebida</th><td>− ${brl(1500)}`));
  assert.ok(!out.includes('valor sugerido'));
  f.campo('desligamento').value = '2026-11-20';
  f.calcular();
  assert.equal(p13.value, '1500');
  // digitar o mesmo valor que a sugestão também conta como edição
  const g = await abrirCalculadora('rescisao', { admissao: '2020-01-01', desligamento: '2026-12-15' });
  g.campo('primeiraParcela13').value = '2000'; g.campo('primeiraParcela13').disparar('input');
  g.campo('salario').value = '8000';
  g.calcular();
  assert.equal(g.campo('primeiraParcela13').value, '2000');
});

test('CC-CALC-TRABALHISTA-06 (formulário): admitido no ano e padrão da página sem sugestão; alerta acima do 13º', async () => {
  const ano = await abrirCalculadora('rescisao', { admissao: '2026-03-02', desligamento: '2026-12-15' });
  assert.equal(ano.campo('primeiraParcela13').value, '0');
  assert.ok(!ano.out.innerHTML.includes('1ª parcela'));
  const padrao = await abrirCalculadora('rescisao');
  assert.equal(padrao.campo('primeiraParcela13').value, '0');
  assert.ok(txt(padrao.out.innerHTML).includes(brl(14089.04)));
  // parcela maior que o 13º proporcional do ano: alerta no campo e na lista, sem bloquear
  const f = await abrirCalculadora('rescisao', { admissao: '2020-01-01', desligamento: '2026-03-20', aviso: 'trabalhado', primeiraParcela13: '2000' });
  const out = txt(f.out.innerHTML);
  const alerta = `A 1ª parcela informada (${brl(2000)}) é maior que o 13º proporcional de 2026 calculado aqui (${brl(1000)}). Confira o valor: a calculadora desconta a parcela inteira do líquido.`;
  assert.equal(txt(f.el('f-primeiraParcela13-msg').textContent), alerta);
  assert.equal(f.el('f-primeiraParcela13-msg').className, 'campo-msg');
  assert.equal(f.campo('primeiraParcela13').getAttribute('aria-invalid'), null);
  assert.ok(out.includes(`<li>1ª parcela do 13º já recebida: ${alerta}</li>`), out.slice(0, 600));
  assert.ok(out.includes('Líquido a receber na rescisão') && !out.includes('class="erro"'));
  // negativo: erro no campo, sem resultado
  f.campo('primeiraParcela13').value = '-10';
  const erro = f.calcular();
  assert.ok(erro.includes('<a href="#f-primeiraParcela13">') && !erro.includes('Líquido'));
});

test('CC-CALC-TRABALHISTA-04 (formulário): Sim na rescisão sem justa causa retém o saldo; acordo não estima', async () => {
  const f = await abrirCalculadora('rescisao', { saqueAniversario: 'sim' });
  let out = txt(f.out.innerHTML);
  assert.ok(out.includes('<th scope="row">Saldo do FGTS</th><td>fica retido (saque-aniversário)</td>'));
  assert.ok(!out.includes('Saque do saldo do FGTS'));
  assert.ok(out.includes(`Multa do FGTS (depositada na conta do FGTS)</th><td>${brl(5137.07)}`));
  assert.ok(out.includes(`<p class="nota">${NOTA_FGTS}</p>`));
  f.campo('tipo').value = 'acordo';
  out = txt(f.calcular());
  assert.ok(out.includes('<th scope="row">Saque do saldo do FGTS</th><td>não estimado (saque-aniversário)</td>'));
  assert.ok(out.includes(`<p class="nota">No acordo, a calculadora não estima o saque de quem aderiu ao saque-aniversário. ${NOTA_FGTS}</p>`));
  // Não (padrão): o resultado de antes
  f.campo('saqueAniversario').value = 'nao'; f.campo('tipo').value = 'semJustaCausa';
  out = txt(f.calcular());
  assert.ok(out.includes(`Saque do saldo do FGTS</th><td>${brl(12842.67)}`));
  assert.ok(!out.includes('saque-aniversário'));
});

test('CC-CALC-FGTS-01 (formulário): Sim na /fgts/ mostra só a multa como valor sacável', async () => {
  const f = await abrirCalculadora('fgts', { saqueAniversario: 'sim' });
  let out = txt(f.out.innerHTML);
  assert.ok(out.includes(`<tr class="total"><th scope="row">Valor que pode ser sacado na saída</th><td>${brl(4672.56)}</td></tr>`), out);
  assert.ok(out.includes('<th scope="row">Saldo do FGTS</th><td>fica retido (saque-aniversário)</td>'));
  assert.ok(out.includes(`<p class="nota">${NOTA_FGTS}</p>`));
  f.campo('tipo').value = 'acordo';
  out = txt(f.calcular());
  assert.ok(out.includes('<tr class="total"><th scope="row">Valor que pode ser sacado na saída</th><td>não estimado (saque-aniversário)</td></tr>'));
  f.campo('saqueAniversario').value = 'nao'; f.campo('tipo').value = 'semJustaCausa';
  out = txt(f.calcular());
  assert.ok(out.includes(`Valor que pode ser sacado na saída</th><td>${brl(16353.95)}`));
  assert.ok(!out.includes('saque-aniversário'));
});

test('CC-CALC-TRABALHISTA-08 (formulário): o padrão da página mostra o alerta no campo e na lista, e calcula', async () => {
  const f = await abrirCalculadora('rescisao');
  const out = txt(f.out.innerHTML);
  const msg = f.el('f-feriasVencidas-msg');
  assert.equal(msg.hidden, false); assert.equal(msg.className, 'campo-msg');
  assert.match(msg.textContent, /o último terminou em 31\/01\/2026/);
  assert.equal(f.campo('feriasVencidas').getAttribute('aria-invalid'), null);
  assert.ok(out.includes('<div class="aviso-limite" role="status"><p><strong>Atenção:</strong></p><ul><li>Períodos de férias vencidas não tiradas: Pelas datas informadas, 3 períodos'), out.slice(0, 400));
  assert.ok(out.includes(brl(14089.04)) && !out.includes('class="erro"'));
  // 1 período informado: sem alerta
  f.campo('feriasVencidas').value = '1';
  const um = f.calcular();
  assert.ok(!um.includes('Atenção:'));
  assert.equal(msg.hidden, true);
  // caso do achado
  const g = await abrirCalculadora('rescisao', { admissao: '2025-08-01' });
  assert.match(g.el('f-feriasVencidas-msg').textContent, /terminou em 31\/07\/2026/);
});
