// Lote 1 da linha cc-calc (auditoria de 30-31/10/2026): motivo do desligamento x aviso prévio e campos condicionais da
// /rescisao/ (CC-CALC-TRABALHISTA-02, -03, -11 e -12). O CC-CALC-CSS-01 e o comportamento do formulário estão no e2e
// (tests/e2e/rescisao.spec.mjs). Rode: node --test 'tests/*.test.mjs'
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as C from '../assets/js/calc.js';
import { validarAviso, validarNumero, periodosVisiveisDobra } from '../assets/js/valida.js';
import rescisaoPag from './_src/content/rescisao.mjs';
import { abrirCalculadora } from './_formulario-minimo.mjs';

const carla = { salario: 4000, admissao: '2023-02-01', desligamento: '2026-09-15', saldoFgts: 12000 };

test('CC-CALC-TRABALHISTA-02: acordo com aviso trabalhado não paga metade do aviso nem projeta o contrato', () => {
  const trab = C.rescisao({ ...carla, tipo: 'acordo', aviso: 'trabalhado' });
  assert.equal(trab.avisoIndenizado, 0);
  assert.equal(trab.diasProjecao, 0);
  assert.equal(trab.fimProjetado, '2026-09-15');
  assert.equal(trab.avos13, 9); assert.equal(trab.avos13Anterior, 0);
  assert.equal(trab.avosFerias, 8); assert.equal(trab.periodosProjecao, 0);
  // FGTS sobre saldo de salário e 13º, sem aviso: 8% × (2.000 + 3.000)
  assert.equal(trab.depositoFgtsRescisao, 400);
  assert.equal(trab.liquido, 8151.27);
  // multa de 20% e saque de 80% continuam (art. 484-A, I, b, e § 1º)
  assert.equal(trab.multaFgts, C.r2(trab.baseFgts * 0.2)); assert.equal(trab.saqueFgts, C.r2(trab.baseFgts * 0.8));
  // indenizado inalterado: metade de 39 dias (R$ 2.600,00) e projeção de 19 dias
  const ind = C.rescisao({ ...carla, tipo: 'acordo', aviso: 'indenizado' });
  assert.equal(ind.avisoIndenizado, 2600); assert.equal(ind.diasProjecao, 19); assert.equal(ind.fimProjetado, '2026-10-04');
  assert.equal(ind.liquido, 10751.27); assert.equal(ind.depositoFgtsRescisao, 608);
  // aviso omitido no acordo: o padrão é o indenizado, como antes
  assert.deepEqual(C.rescisao({ ...carla, tipo: 'acordo' }), ind);
});

test('CC-CALC-TRABALHISTA-02: ajuda do campo de aviso na página e na fonte', () => {
  const html = readFileSync(new URL('../rescisao/index.html', import.meta.url), 'utf8');
  const ajuda = 'No acordo, o aviso indenizado é pago pela metade; o trabalhado não gera aviso nem projeção.';
  assert.ok(html.includes(`<div id="f-aviso-ajuda" class="ajuda"><small>${ajuda}</small></div>`));
  assert.ok(!html.includes('No acordo, a calculadora considera metade do aviso indenizado.'));
  assert.equal(rescisaoPag.campos.find((c) => c.n === 'aviso').ajuda, ajuda);
});

// Matriz única (calc.js): o primeiro aviso de cada motivo é o padrão quando o aviso não é informado.
const AVISOS = ['indenizado', 'trabalhado', 'naoCumprido', undefined];
const VALIDOS = {
  semJustaCausa: ['indenizado', 'trabalhado', undefined],
  pedidoDemissao: ['trabalhado', 'naoCumprido', undefined],
  acordo: ['indenizado', 'trabalhado', undefined],
  justaCausa: AVISOS, // não se aplica: o valor é ignorado
};

test('CC-CALC-TRABALHISTA-03: matriz de avisos por motivo', () => {
  assert.deepEqual(C.AVISOS_POR_MOTIVO, {
    semJustaCausa: ['indenizado', 'trabalhado'],
    pedidoDemissao: ['trabalhado', 'naoCumprido'],
    acordo: ['indenizado', 'trabalhado'],
    justaCausa: [],
  });
  assert.ok(Object.isFrozen(C.AVISOS_POR_MOTIVO) && Object.values(C.AVISOS_POR_MOTIVO).every(Object.isFrozen));
  assert.equal(C.avisosDoMotivo('acordo'), C.AVISOS_POR_MOTIVO.acordo);
  assert.deepEqual(C.avisosDoMotivo('justaCausa'), []);
  for (const t of ['xyz', '', undefined, 'constructor', 'toString', '__proto__']) assert.equal(C.avisosDoMotivo(t), null, String(t));
});

test('CC-CALC-TRABALHISTA-03: as 16 combinações de motivo e aviso (3 avisos e o aviso omitido)', () => {
  let validas = 0;
  for (const tipo of Object.keys(VALIDOS)) {
    for (const aviso of AVISOS) {
      const ok = VALIDOS[tipo].includes(aviso);
      const r = C.rescisao({ ...carla, tipo, aviso });
      const v = validarAviso({ tipo, aviso });
      const caso = `${tipo} + ${aviso}`;
      if (ok) {
        validas++;
        assert.equal(v, null, caso);
        assert.equal(r.avisoInvalido, undefined, caso);
        assert.equal(typeof r.liquido, 'number', caso);
      } else {
        assert.deepEqual(r, { avisoInvalido: true }, `${caso}: sem calcular`);
        assert.equal(v.campo, 'aviso', caso); assert.equal(typeof v.erro, 'string', caso);
      }
    }
  }
  assert.equal(validas, 13); // 3 em cada motivo com aviso e as 4 da justa causa (aviso ignorado)
});

test('CC-CALC-TRABALHISTA-03: mensagens do campo de aviso', () => {
  const nc = 'Não cumprido pelo empregado só vale no pedido de demissão (CLT, art. 487, § 2º).';
  assert.deepEqual(validarAviso({ tipo: 'semJustaCausa', aviso: 'naoCumprido' }), { campo: 'aviso', erro: `${nc} Na demissão sem justa causa, escolha indenizado ou trabalhado.` });
  assert.deepEqual(validarAviso({ tipo: 'acordo', aviso: 'naoCumprido' }), { campo: 'aviso', erro: `${nc} No acordo, escolha indenizado ou trabalhado.` });
  assert.deepEqual(validarAviso({ tipo: 'pedidoDemissao', aviso: 'indenizado' }), { campo: 'aviso', erro: 'No pedido de demissão, quem deve o aviso é o empregado: escolha trabalhado ou não cumprido pelo empregado.' });
  assert.deepEqual(validarAviso({ tipo: 'semJustaCausa', aviso: 'xyz' }), { campo: 'aviso', erro: 'Na demissão sem justa causa, escolha indenizado ou trabalhado.' });
  assert.deepEqual(validarAviso({ tipo: 'xyz', aviso: 'indenizado' }), { campo: 'tipo', erro: 'Escolha o motivo do desligamento.' });
  assert.deepEqual(C.rescisao({ ...carla, tipo: 'xyz', aviso: 'indenizado' }), { avisoInvalido: true });
  // propriedade herdada não é motivo
  assert.deepEqual(validarAviso({ tipo: 'constructor', aviso: 'indenizado' }), { campo: 'tipo', erro: 'Escolha o motivo do desligamento.' });
  assert.deepEqual(C.rescisao({ ...carla, tipo: 'toString' }), { avisoInvalido: true });
});

test('CC-CALC-TRABALHISTA-03: na justa causa o aviso não se aplica e não muda nada', () => {
  const base = C.rescisao({ ...carla, tipo: 'justaCausa' });
  for (const aviso of ['indenizado', 'trabalhado', 'naoCumprido', 'xyz', '']) assert.deepEqual(C.rescisao({ ...carla, tipo: 'justaCausa', aviso }), base, aviso);
  assert.equal(base.avisoIndenizado, 0); assert.equal(base.descontoAviso, 0); assert.equal(base.diasProjecao, 0);
  assert.equal(validarAviso({ tipo: 'justaCausa', aviso: 'indenizado' }), null);
});

test('CC-CALC-TRABALHISTA-03: pedido de demissão sem aviso informado é trabalhado (resultado de antes)', () => {
  const omitido = C.rescisao({ ...carla, tipo: 'pedidoDemissao' });
  assert.deepEqual(omitido, C.rescisao({ ...carla, tipo: 'pedidoDemissao', aviso: 'trabalhado' }));
  assert.equal(omitido.liquido, 8151.27);
});

test('CC-CALC-TRABALHISTA-11: desconto do aviso não cumprido limitado às verbas; líquido nunca negativo', () => {
  const r = C.rescisao({ salario: 15000, admissao: '2026-08-03', desligamento: '2026-08-20', tipo: 'pedidoDemissao', aviso: 'naoCumprido' });
  assert.equal(r.verbas, 11916.67);
  assert.equal(r.descontoAviso, 15000);
  const tributos = C.r2(r.inssSaldo + r.irSaldo + r.inss13 + r.ir13);
  assert.equal(r.descontoAvisoAplicado, C.r2(r.verbas - tributos));
  assert.equal(r.excedenteAviso, 5459.72);
  assert.equal(C.r2(r.descontoAvisoAplicado + r.excedenteAviso), r.descontoAviso);
  assert.equal(r.descontos, r.verbas);
  assert.ok(Object.is(r.liquido, 0), `líquido ${r.liquido}`);
  // sem excedente: desconto inteiro, resultado de antes
  const p = C.rescisao({ salario: 3000, admissao: '2024-03-10', desligamento: '2026-10-08', tipo: 'pedidoDemissao', aviso: 'naoCumprido', feriasVencidas: 1, saldoFgts: 7000 });
  assert.equal(p.descontoAviso, 3000); assert.equal(p.descontoAvisoAplicado, 3000); assert.equal(p.excedenteAviso, 0);
  assert.equal(p.liquido, 6145.14);
  // fora do pedido de demissão não há desconto
  const s = C.rescisao({ ...carla, tipo: 'semJustaCausa', aviso: 'trabalhado' });
  assert.equal(s.descontoAviso, 0); assert.equal(s.descontoAvisoAplicado, 0); assert.equal(s.excedenteAviso, 0);
});

test('CC-CALC-TRABALHISTA-11: líquido >= 0 em qualquer pedido de demissão (varredura determinística)', () => {
  // gerador congruencial com semente fixa: a mesma varredura em toda execução
  let s = 20261031;
  const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const DIA = 864e5;
  const dia = (n) => new Date(n * DIA).toISOString().slice(0, 10);
  // desligamento de 2024 (primeiro ano com tabelas) a 2027; metade dos contratos com até 90 dias, onde cabe o excedente
  const desMin = Date.UTC(2024, 0, 1) / DIA;
  const desMax = Date.UTC(2027, 11, 31) / DIA;
  let negativosAntes = 0;
  for (let i = 0; i < 3000; i++) {
    const des = desMin + Math.floor(rnd() * (desMax - desMin + 1));
    const adm = des - Math.floor(rnd() * (rnd() < 0.5 ? 90 : 3650));
    const salario = C.r2(1000 + rnd() * rnd() * 60000);
    const aviso = rnd() < 0.7 ? 'naoCumprido' : 'trabalhado';
    const r = C.rescisao({ salario, admissao: dia(adm), desligamento: dia(des), tipo: 'pedidoDemissao', aviso, dependentes: Math.floor(rnd() * 3) });
    const caso = `${salario} ${dia(adm)} ${dia(des)} ${aviso}`;
    assert.ok(r.liquido >= 0 && !Object.is(r.liquido, -0), `${caso}: líquido ${r.liquido}`);
    assert.equal(C.r2(r.descontoAvisoAplicado + r.excedenteAviso), r.descontoAviso, caso);
    assert.ok(Math.abs(r.liquido - (r.verbas - r.descontos)) < 0.005, caso);
    if (r.excedenteAviso > 0) { negativosAntes++; assert.equal(r.liquido, 0, caso); }
  }
  assert.ok(negativosAntes > 10, `a varredura precisa pegar casos com excedente (${negativosAntes})`);
});

test('CC-CALC-TRABALHISTA-12: selects de dobra seguem o valor lido pelo cálculo (lerNumeroBR, máximo 2)', () => {
  const campo = (raw) => validarNumero({ raw, min: 0, max: 2, teto: 100000, inteiro: true });
  assert.equal(periodosVisiveisDobra(campo('0')), 0);
  assert.equal(periodosVisiveisDobra(campo('')), 0);
  assert.equal(periodosVisiveisDobra(campo('1')), 1);
  assert.equal(periodosVisiveisDobra(campo('1,0')), 1);
  assert.equal(periodosVisiveisDobra(campo('01')), 1);
  assert.equal(periodosVisiveisDobra(campo('2')), 2);
  assert.equal(periodosVisiveisDobra(campo('3')), 2);
  // campo com erro: null (o ui.js não esconde nem zera os selects)
  for (const raw of ['abc', '-1', '1,5', '200000']) assert.equal(periodosVisiveisDobra(campo(raw)), null, raw);
});

// ---------------------------------------------------------------- Formulário publicado (ui.js) com o document mínimo
const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\u00a0/g, ' ');
const txt = (html) => html.replace(/\u00a0/g, ' ');
const opcoes = (sel) => Object.fromEntries(sel.options.map((o) => [o.value, o.disabled]));

test('CC-CALC-TRABALHISTA-03 (formulário): trocar o motivo desabilita as opções fora da matriz e mantém a escolha', async () => {
  const f = await abrirCalculadora('rescisao', { tipo: 'pedidoDemissao', aviso: 'naoCumprido' });
  const tipo = f.campo('tipo'); const aviso = f.campo('aviso');
  assert.deepEqual(opcoes(aviso), { indenizado: true, trabalhado: false, naoCumprido: false });
  assert.ok(f.out.innerHTML.includes('Desconto do aviso prévio não cumprido'));
  // sem justa causa: "não cumprido" fica desabilitado, mas continua escolhido, com erro no campo e sem resultado
  tipo.value = 'semJustaCausa'; tipo.disparar('change');
  assert.equal(aviso.value, 'naoCumprido');
  assert.deepEqual(opcoes(aviso), { indenizado: false, trabalhado: false, naoCumprido: true });
  const erro = f.calcular();
  const msg = 'Não cumprido pelo empregado só vale no pedido de demissão (CLT, art. 487, § 2º). Na demissão sem justa causa, escolha indenizado ou trabalhado.';
  assert.equal(aviso.getAttribute('aria-invalid'), 'true');
  assert.equal(f.el('f-aviso-msg').textContent, msg); assert.equal(f.el('f-aviso-msg').hidden, false);
  assert.equal(f.el('f-aviso-msg').className, 'campo-msg err');
  assert.ok(erro.includes('<a href="#f-aviso">') && erro.includes(msg), erro);
  assert.ok(!erro.includes('Líquido') && !erro.includes('class="destaque'), 'sem resultado');
  // escolhido um aviso válido, o erro some e o resultado volta
  aviso.value = 'trabalhado';
  const ok = f.calcular();
  assert.equal(aviso.getAttribute('aria-invalid'), null);
  assert.equal(f.el('f-aviso-msg').hidden, true);
  assert.ok(ok.includes('Líquido a receber na rescisão'));
});

test('CC-CALC-TRABALHISTA-03 (formulário): indenizado herdado no pedido de demissão é erro; justa causa desabilita o campo', async () => {
  const f = await abrirCalculadora('rescisao');
  const tipo = f.campo('tipo'); const aviso = f.campo('aviso');
  assert.equal(aviso.value, 'indenizado');
  tipo.value = 'pedidoDemissao'; tipo.disparar('change');
  const erro = f.calcular();
  assert.equal(aviso.value, 'indenizado');
  assert.ok(erro.includes('No pedido de demissão, quem deve o aviso é o empregado: escolha trabalhado ou não cumprido pelo empregado.'));
  assert.ok(!erro.includes('Líquido'));
  // justa causa: o campo inteiro fica desabilitado, sem erro, e o resultado sai sem aviso
  tipo.value = 'justaCausa'; tipo.disparar('change');
  assert.equal(aviso.disabled, true);
  const jc = f.calcular();
  assert.equal(aviso.getAttribute('aria-invalid'), null);
  assert.ok(jc.includes('Líquido a receber na rescisão') && !jc.includes('Aviso prévio'));
  // de volta à demissão sem justa causa: campo habilitado, com a mesma escolha
  tipo.value = 'semJustaCausa'; tipo.disparar('change');
  assert.equal(aviso.disabled, false); assert.equal(aviso.value, 'indenizado');
  assert.deepEqual(opcoes(aviso), { indenizado: false, trabalhado: false, naoCumprido: true });
});

test('CC-CALC-TRABALHISTA-02 (formulário): acordo com aviso trabalhado sem linha de aviso nem nota da metade', async () => {
  const f = await abrirCalculadora('rescisao', { tipo: 'acordo', aviso: 'trabalhado' });
  const trab = txt(f.out.innerHTML);
  assert.ok(!trab.includes('Aviso prévio indenizado'), trab.slice(0, 400));
  assert.ok(!trab.includes('A projeção do aviso'));
  assert.ok(!trab.includes('No acordo (CLT, art. 484-A)'));
  assert.ok(trab.includes(brl(8151.27)));
  f.campo('aviso').value = 'indenizado';
  const ind = txt(f.calcular());
  assert.ok(ind.includes('Aviso prévio indenizado (19,5 dias, metade de 39)'));
  assert.ok(ind.includes('No acordo (CLT, art. 484-A), o aviso indenizado é pago pela metade'));
  assert.ok(ind.includes(brl(10751.27)));
});

test('CC-CALC-TRABALHISTA-11 (formulário): desconto maior que as verbas: líquido R$ 0,00 e linha do excedente', async () => {
  const f = await abrirCalculadora('rescisao', { salario: '15000', admissao: '2026-08-03', desligamento: '2026-08-20', tipo: 'pedidoDemissao', aviso: 'naoCumprido' });
  const out = txt(f.out.innerHTML);
  assert.ok(!/−\s*R\$\s*5\.459,72<\/strong>|-R\$/.test(out), 'sem líquido negativo');
  assert.ok(out.includes('<span>Valor líquido estimado da rescisão</span> <strong>R$ 0,00</strong>'), out.slice(0, 300));
  assert.ok(out.includes('<th scope="row">Líquido a receber na rescisão</th><td>R$ 0,00</td>'));
  assert.ok(out.includes('<th scope="row">Desconto do aviso prévio não cumprido (limitado às verbas)</th>'));
  assert.ok(out.includes('O desconto do aviso não cumprido (R$ 15.000,00) é maior que as verbas depois do INSS e do IRRF: o líquido fica em R$ 0,00 e R$ 5.459,72 não foram descontados aqui.'));
  assert.ok(!/cobra|devolv|dever[áa]/i.test(out.match(/O desconto do aviso não cumprido[^<]*/)[0]), 'nenhuma afirmação sobre cobrar a diferença');
});
