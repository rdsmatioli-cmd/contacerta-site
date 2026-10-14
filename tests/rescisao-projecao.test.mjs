// Parecer PARECER_RESCISAO_8749b7e (R-1, R-2, R-3), reteste QA N2-01 e N-02 com a data projetada. Rode: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../assets/js/calc.js';
import { validarFeriasVencidas, periodosAquisitivosCompletos, periodosComPrazoVencido } from '../assets/js/valida.js';

const base = { salario: 3000, tipo: 'semJustaCausa', aviso: 'indenizado' };
const totalFerias = (r) => C.r2(r.feriasProp + r.feriasVenc + r.tercoFerias);

test('Caso A (R-1 e R-2): projeção cruza o ano; 13º 12/12 + 1/12 e período completado na projeção', () => {
  const r = C.rescisao({ ...base, admissao: '2025-01-10', desligamento: '2025-12-20' });
  assert.equal(r.fimProjetado, '2026-01-19');
  assert.equal(r.avos13Anterior, 12); assert.equal(r.avos13Atual, 1);
  assert.equal(r.decimoAnterior, 3000); assert.equal(r.decimoAtual, 250); assert.equal(r.decimo, 3250);
  assert.equal(r.periodosProjecao, 1); assert.equal(r.feriasProjecao, 3000);
  assert.equal(r.avosFerias, 0); assert.equal(r.feriasProp, 0);
  assert.equal(r.tercoFerias, 1000);
  assert.equal(r.verbas, 12250);
});

test('Caso B (R-2): período de 01/11/2024 a 31/10/2025 completado na projeção, simples', () => {
  const r = C.rescisao({ ...base, admissao: '2024-11-01', desligamento: '2025-10-15' });
  assert.equal(r.fimProjetado, '2025-11-14');
  assert.equal(r.periodosProjecao, 1); assert.equal(r.feriasProjecao, 3000);
  assert.equal(r.dobraFeriasVenc, 0);
  assert.equal(r.avosFerias, 0);
  assert.equal(r.tercoFerias, 1000);
  assert.equal(r.avos13, 10); assert.equal(r.decimo, 2500);
  assert.equal(r.verbas, 11000);
  // o usuário não deve informar esse período: ele entra sozinho
  const v = validarFeriasVencidas({ admissao: '2024-11-01', desligamento: '2025-10-15', fimProjetado: r.fimProjetado, periodos: 1 });
  assert.equal(v.campo, 'feriasVencidas');
  assert.match(v.erro, /entra no cálculo automaticamente/);
});

test('Caso C (R-2 e R-3): P1 e P2 em dobro pela data projetada, P3 completado na projeção, simples', () => {
  const c = { ...base, admissao: '2022-03-01', desligamento: '2025-02-10', feriasVencidas: 2, vencidasEmDobro: [true, true] };
  const r = C.rescisao(c);
  assert.equal(r.fimProjetado, '2025-03-18');
  assert.equal(r.feriasVencSimples, 6000); assert.equal(r.dobraFeriasVenc, 6000); assert.equal(r.feriasProjecao, 3000);
  assert.equal(r.feriasVenc, 15000); assert.equal(r.feriasProp, 250);
  assert.equal(r.tercoFerias, 5083.33);
  assert.equal(totalFerias(r), 20333.33);
  // P2 vence em 28/02/2025: entre a data real (10/02) e a projetada (18/03). Pela projetada, pode marcar Sim nos dois.
  assert.equal(validarFeriasVencidas({ admissao: c.admissao, desligamento: c.desligamento, fimProjetado: r.fimProjetado, periodos: 2, emDobro: [true, true] }), null);
  // pela data real, só P1 teria a dobra
  assert.ok(validarFeriasVencidas({ admissao: c.admissao, desligamento: c.desligamento, fimProjetado: c.desligamento, periodos: 2, emDobro: [true, true] }));
});

test('Caso D: justa causa, 1 vencida (sem projeção, sem proporcionais)', () => {
  const r = C.rescisao({ ...base, tipo: 'justaCausa', admissao: '2022-03-01', desligamento: '2025-02-10', feriasVencidas: 1 });
  assert.equal(r.fimProjetado, '2025-02-10');
  assert.equal(r.feriasProp, 0); assert.equal(r.decimo, 0); assert.equal(r.periodosProjecao, 0);
  assert.equal(r.feriasVenc, 3000); assert.equal(r.tercoFerias, 1000);
  assert.equal(r.verbas, 5000);
});

test('N2-01: admissão 01/10/2025, desligamento 15/09/2026, R$ 4.000 → 12/12 + 1/12 + 1/3 (antes faltavam R$ 5.333,33)', () => {
  const r = C.rescisao({ ...base, salario: 4000, admissao: '2025-10-01', desligamento: '2026-09-15' });
  assert.equal(r.fimProjetado, '2026-10-15');
  assert.equal(r.feriasProjecao, 4000); assert.equal(r.dobraFeriasVenc, 0);
  assert.equal(r.avosFerias, 1); assert.equal(r.feriasProp, 333.33);
  assert.equal(r.tercoFerias, 1444.44);
  assert.equal(totalFerias(r), 5777.77);
  assert.equal(r.verbas, 15111.1);
});

test('23 meses: P1 vencido (dobra só se o concessivo venceu até a data projetada), P2 integral simples', () => {
  const c = { ...base, salario: 4000, admissao: '2024-10-01', desligamento: '2026-08-31', feriasVencidas: 1 };
  const simples = C.rescisao(c);
  assert.equal(simples.fimProjetado, '2026-10-03');
  assert.equal(simples.feriasVencSimples, 4000); assert.equal(simples.feriasProjecao, 4000);
  assert.equal(simples.avosFerias, 0); // 3 dias após o fim de P2: não chega a 15 dias
  assert.equal(simples.tercoFerias, 2666.67);
  // concessivo de P1 termina em 30/09/2026, antes da data projetada (03/10/2026): Sim é aceito
  assert.equal(validarFeriasVencidas({ admissao: c.admissao, desligamento: c.desligamento, fimProjetado: simples.fimProjetado, periodos: 1, emDobro: [true] }), null);
  const dobro = C.rescisao({ ...c, vencidasEmDobro: [true] });
  assert.equal(dobro.feriasVenc, 12000); assert.equal(dobro.tercoFerias, 4000);
  // aviso trabalhado (sem projeção): o concessivo de P1 ainda não venceu em 31/08/2026 → Sim recusado
  const trab = C.rescisao({ ...c, aviso: 'trabalhado' });
  assert.equal(trab.fimProjetado, '2026-08-31');
  assert.equal(validarFeriasVencidas({ admissao: c.admissao, desligamento: c.desligamento, fimProjetado: trab.fimProjetado, periodos: 1, emDobro: [true] }).campo, 'dobro1');
  // com a projeção, P2 nunca vai em dobro e não pode ser informado à mão (máximo 1 informado)
  assert.equal(validarFeriasVencidas({ admissao: c.admissao, desligamento: c.desligamento, fimProjetado: simples.fimProjetado, periodos: 2 }).campo, 'feriasVencidas');
});

test('N-02 com a data projetada: contagem de períodos e prazo de concessão', () => {
  assert.equal(periodosAquisitivosCompletos('2023-02-01', '2026-09-15'), 3);
  assert.equal(periodosComPrazoVencido('2023-02-01', '2026-09-15'), 2);
  assert.equal(periodosAquisitivosCompletos('2026-01-01', '2026-09-15'), 0);
  assert.equal(periodosAquisitivosCompletos('2025-01-01', '2025-12-31'), 1);
  assert.equal(periodosComPrazoVencido('2024-01-01', '2025-12-31'), 0);
  assert.equal(periodosComPrazoVencido('2024-01-01', '2026-01-01'), 1);
  // caso do laudo: menos de 12 meses, 2 Sim/Sim → erro
  const e = validarFeriasVencidas({ admissao: '2026-01-01', desligamento: '2026-09-15', fimProjetado: '2026-10-15', periodos: 2, emDobro: [true, true] });
  assert.equal(e.campo, 'feriasVencidas');
  // matriz padrão do QA continua válida
  const pad = { admissao: '2023-02-01', desligamento: '2026-09-15', fimProjetado: '2026-10-24' };
  assert.equal(validarFeriasVencidas({ ...pad, periodos: 2, emDobro: [true, true] }), null);
  assert.equal(validarFeriasVencidas({ ...pad, periodos: 3 }), null);
  assert.equal(validarFeriasVencidas({ ...pad, periodos: 4 }).campo, 'feriasVencidas');
});

test('R-8 (não alterado): no acordo a projeção é metade do aviso', () => {
  const r = C.rescisao({ ...base, tipo: 'acordo', admissao: '2023-02-01', desligamento: '2026-09-15' });
  assert.equal(r.diasProjecao, Math.floor(r.diasAviso / 2));
});

test('Caso A: INSS do 13º separado por ano (tabela 2025 e 2026), IRRF sobre o total', () => {
  const r = C.rescisao({ ...base, admissao: '2025-01-10', desligamento: '2025-12-20' });
  // 2025 (Portaria MPS/MF 6/2025) sobre 3.000: 1.518×7,5% + 1.275,88×9% + 206,12×12% = 253,41
  assert.equal(r.inss13Anterior, 253.41);
  // 2026 (Portaria MPS/MF 13/2026) sobre 250: 7,5% = 18,75
  assert.equal(r.inss13Atual, 18.75);
  assert.equal(r.inss13, 272.16);
  assert.deepEqual(r.tabelasSubstituidas, []);
  assert.equal(r.ir13, 16.05); // tabela de 2025 (pagamento em 20/12/2025), ver teste de IRRF por data
  assert.equal(r.inssSaldo, 157.23);
  assert.equal(r.liquido, 11804.56);
  // um único ano: inalterado (tabela vigente)
  const p = C.rescisao({ ...base, admissao: '2023-02-01', desligamento: '2026-09-15', salario: 4000 });
  assert.equal(p.inss13, 288.6); assert.equal(p.inss13Anterior, 0);
});

test('13º de dois anos sem tabela do ano seguinte: usa a mais recente e informa', () => {
  const r = C.rescisao({ ...base, admissao: '2025-03-01', desligamento: '2026-12-20' });
  assert.equal(r.anoFim, 2027);
  assert.deepEqual(r.tabelasSubstituidas, [[2027, 2026]]);
  assert.equal(r.inss13Atual, C.inssEmpregado(r.decimoAtual).inss);
});

test('IRRF por data de pagamento — caso A (pago em 20/12/2025): tabela de maio-dez/2025, sem redução da Lei 15.270', () => {
  const r = C.rescisao({ ...base, admissao: '2025-01-10', desligamento: '2025-12-20' });
  assert.equal(r.tabelaIrrf.vigencia, 'maio a dezembro/2025');
  assert.equal(r.inss13, 272.16);
  // desconto simplificado (607,20) é alternativo às deduções legais (Lei 9.250, art. 4º, § 2º): 3.250 − 607,20 = 2.642,80 (> 3.250 − 272,16 = 2.977,84 é pior)
  assert.equal(r.ir13Base, 2642.8);
  assert.equal(r.ir13Reducao, 0);
  assert.equal(r.ir13, 16.05); // 2.642,80 × 7,5% − 182,16
  assert.equal(r.irSaldo, 0);
  assert.equal(r.liquido, 11804.56);
});

test('IRRF por data de pagamento — 2026 com redução da Lei 15.270; mesmo caso em 2025 sem redução', () => {
  const a = { salario: 6000, admissao: '2023-02-01', tipo: 'semJustaCausa', aviso: 'indenizado' };
  const r26 = C.rescisao({ ...a, desligamento: '2026-09-15' });
  assert.equal(r26.decimo, 5000); assert.equal(r26.inss13, 501.51);
  assert.equal(r26.ir13Base, 4392.8); assert.equal(r26.ir13Reducao, 312.89); assert.equal(r26.ir13, 0);
  const r25 = C.rescisao({ ...a, admissao: '2022-02-01', desligamento: '2025-09-15' });
  assert.equal(r25.tabelaIrrf.vigencia, 'maio a dezembro/2025');
  assert.equal(r25.ir13Reducao, 0);
  assert.ok(r25.ir13 > 0);
});

test('IRRF: jan-abr/2025 usa a tabela antiga; ano sem tabela usa a mais recente e sinaliza', () => {
  assert.equal(C.tabelaIrrfPorData('2025-04-30').tabela.descontoSimplificado, 564.8);
  assert.equal(C.tabelaIrrfPorData('2025-05-01').tabela.descontoSimplificado, 607.2);
  assert.equal(C.tabelaIrrfPorData('2025-12-31').tabela.reducao, null);
  assert.ok(C.tabelaIrrfPorData('2026-01-01').tabela.reducao);
  const x = C.tabelaIrrfPorData('2027-02-01');
  assert.equal(x.substituida, true); assert.equal(x.ano, 2026);
  // salário líquido (sem data) continua na tabela vigente
  assert.equal(C.irrfMensal({ rendimentos: 5000, inss: 501.51 }).irrf, 0);
});

test('INSS do saldo de salário pela tabela do mês trabalhado (ano do desligamento)', () => {
  // caso A: 20 dias de dez/2025 = 2.000 na tabela 2025: 1.518×7,5% + 482×9% = 157,23
  const a = C.rescisao({ ...base, admissao: '2025-01-10', desligamento: '2025-12-20' });
  assert.equal(a.inssSaldo, 157.23); assert.equal(a.inssSaldoSubstituida, null);
  // 2026: tabela 2026 (inalterado)
  const b = C.rescisao({ ...base, admissao: '2024-01-10', desligamento: '2026-06-20' });
  assert.equal(b.inssSaldo, C.inssEmpregado(b.saldoSalario).inss); assert.equal(b.inssSaldoSubstituida, null);
  // 2027 sem tabela: usa a mais recente (2026) e sinaliza
  const c = C.rescisao({ ...base, admissao: '2026-01-10', desligamento: '2027-03-20' });
  assert.equal(c.inssSaldo, C.inssEmpregado(c.saldoSalario).inss); assert.deepEqual(c.inssSaldoSubstituida, [2027, 2026]);
});

test('Nota do IRRF: rótulos das tabelas', () => {
  assert.equal(C.tabelaIrrfPorData('2025-03-10').tabela.rotulo, 'janeiro a abril/2025');
  assert.equal(C.tabelaIrrfPorData('2025-12-20').tabela.rotulo, 'maio a dezembro/2025');
  assert.equal(C.tabelaIrrfPorData('2026-09-15').tabela.rotulo, '2026 em diante');
});

test('Data de pagamento: 20/12/2025 pago em 05/01/2026 usa a tabela de 2026 com redução; sem data fica como o caso A', () => {
  const sem = C.rescisao({ ...base, admissao: '2025-01-10', desligamento: '2025-12-20' });
  assert.equal(sem.pagamentoInformado, false); assert.equal(sem.dataPagamento, '2025-12-20');
  assert.equal(sem.ir13, 16.05); assert.equal(sem.liquido, 11804.56);
  const com = C.rescisao({ ...base, admissao: '2025-01-10', desligamento: '2025-12-20', dataPagamento: '2026-01-05' });
  assert.equal(com.pagamentoInformado, true);
  assert.equal(com.tabelaIrrf.rotulo, '2026 em diante');
  // INSS segue o mês trabalhado (2025)
  assert.equal(com.inssSaldo, 157.23); assert.equal(com.inss13, 272.16);
  // 13º: 3.250 − 607,20 = 2.642,80 → 7,5% − 182,16 = 16,05; redução Lei 15.270 (≤ 5.000) zera
  assert.equal(com.ir13Base, 2642.8); assert.equal(com.ir13Reducao, 16.05); assert.equal(com.ir13, 0);
  assert.equal(com.liquido, 11820.61);
});
