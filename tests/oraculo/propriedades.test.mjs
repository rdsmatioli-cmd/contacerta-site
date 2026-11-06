// CC-CALC-TESTES-03: invariantes das fórmulas com testes por propriedade (fast-check, versão exata no
// package-lock.json desta pasta). Semente fixa: a mesma execução no CI e na máquina de quem desenvolve; uma falha
// imprime o contraexemplo reduzido e o caminho para reproduzi-lo. Rode, a partir da raiz:
//   cd tests/oraculo && npm ci --ignore-scripts && cd ../.. && node --test 'tests/oraculo/*.test.mjs'
// As tabelas de 2026 vêm de ./oficial-2026.mjs (digitadas das fontes oficiais, em centavos), nunca de tabelas.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import * as C from '../../assets/js/calc.js';
import { lerNumeroBR } from '../../assets/js/valida.js';
import { INSS_2026, IRRF_2026, inssOraculo, tabelaIrrfOraculo, irrfOraculo, centavos } from './oficial-2026.mjs';

// ORACULO_SEMENTE troca a semente numa execução local, para explorar outros casos; o CI usa sempre a fixa.
const SEMENTE = Number(process.env.ORACULO_SEMENTE) || 20261031;
const cfg = (numRuns) => ({ seed: SEMENTE, numRuns, includeErrorInReport: true });
const reais = (c) => c / 100;

// Valores em centavos, com peso extra nas bordas das tabelas (± 2 centavos), onde os erros de faixa aparecem.
const BORDAS = [
  ...INSS_2026.faixas.map(([ate]) => ate),
  ...IRRF_2026.faixas.filter(([ate]) => Number.isFinite(ate)).map(([ate]) => ate),
  ...IRRF_2026.faixas.filter(([ate]) => Number.isFinite(ate)).map(([ate]) => ate + IRRF_2026.simplificado),
  IRRF_2026.reducao.isencaoAte, IRRF_2026.reducao.faixaAte,
];
const centavosArb = (max) => fc.oneof(
  { arbitrary: fc.integer({ min: 0, max }), weight: 4 },
  { arbitrary: fc.constantFrom(...BORDAS.filter((b) => b + 2 <= max)).chain((b) => fc.integer({ min: Math.max(0, b - 2), max: b + 2 })), weight: 1 },
);

test('INSS 2026 do empregado igual ao oráculo em centavos (Portaria MPS/MF 13/2026), de R$ 0 a R$ 200 mil', () => {
  fc.assert(fc.property(centavosArb(20_000_000), (s) => {
    assert.equal(centavos(C.inssEmpregado(reais(s)).inss), inssOraculo(s));
  }), cfg(5000));
});

test('IRRF 2026 igual ao oráculo e entre 0 e o imposto pela tabela (Lei 15.191/2025 e Lei 15.270/2025)', () => {
  const arb = fc.record({
    rendimentos: centavosArb(5_000_000),
    inssFracao: fc.double({ min: 0, max: 0.14, noNaN: true }),
    dependentes: fc.integer({ min: 0, max: 6 }),
    pensao: fc.oneof(fc.constant(0), fc.integer({ min: 0, max: 500_000 })),
    outras: fc.oneof(fc.constant(0), fc.integer({ min: 0, max: 200_000 })),
  });
  fc.assert(fc.property(arb, ({ rendimentos, inssFracao, dependentes, pensao, outras }) => {
    const inss = Math.floor(rendimentos * inssFracao);
    const o = irrfOraculo({ rendimentos, inss, dependentes, pensao, outras });
    const r = C.irrfMensal({ rendimentos: reais(rendimentos), inss: reais(inss), dependentes, pensao: reais(pensao), outrasDeducoes: reais(outras) });
    assert.deepEqual([centavos(r.impostoTabela), centavos(r.reducao), centavos(r.irrf)], [o.impostoTabela, o.reducao, o.irrf]);
    assert.equal(r.usaSimplificado, o.usaSimplificado);
    // Entre 0 e o imposto pela tabela (o menor entre deduções legais e desconto simplificado), sem a redução.
    const tabela = Math.min(
      tabelaIrrfOraculo(Math.max(0, rendimentos - inss - dependentes * IRRF_2026.dependente - pensao - outras)),
      tabelaIrrfOraculo(Math.max(0, rendimentos - IRRF_2026.simplificado)),
    );
    assert.ok(r.irrf >= 0 && centavos(r.irrf) <= tabela, `IRRF ${r.irrf} fora de [0, ${reais(tabela)}]`);
  }), cfg(5000));
});

test('IRRF 2026: rendimento até R$ 5.000,00 dá imposto zero com qualquer dedução', () => {
  const arb = fc.record({
    rendimentos: fc.integer({ min: 0, max: IRRF_2026.reducao.isencaoAte }),
    inssFracao: fc.double({ min: 0, max: 1, noNaN: true }),
    dependentes: fc.integer({ min: 0, max: 30 }),
    pensao: fc.integer({ min: 0, max: 1_000_000 }),
    outras: fc.integer({ min: 0, max: 1_000_000 }),
  });
  fc.assert(fc.property(arb, ({ rendimentos, inssFracao, dependentes, pensao, outras }) => {
    const r = C.irrfMensal({ rendimentos: reais(rendimentos), inss: reais(Math.floor(rendimentos * inssFracao)), dependentes, pensao: reais(pensao), outrasDeducoes: reais(outras) });
    assert.equal(r.irrf, 0);
  }), cfg(3000));
});

// Cada desconto (INSS, imposto pela tabela e redução) é arredondado ao centavo em separado, como na folha: de um
// bruto para outro maior, o líquido pode cair no máximo 2 centavos (três arredondamentos de até meio centavo cada,
// sobre um líquido exato que nunca cai). Com R$ 0,10 ou mais de diferença na base, o líquido sobe de fato: a
// perda marginal máxima é 14% de INSS + 27,5% de IR + 13,3145% da redução que some, menos de 55%.
const diferencaArb = fc.oneof(fc.integer({ min: 0, max: 3 }), fc.integer({ min: 0, max: 500_000 }));
const confereSubida = (rotulo, baseA, baseB, liqA, liqB) => {
  const dif = centavos(liqB) - centavos(liqA);
  assert.ok(dif >= -2, `${rotulo}: líquido caiu ${-dif} centavos (${liqA} -> ${liqB})`);
  if (centavos(baseB) - centavos(baseA) >= 10) assert.ok(dif > 0, `${rotulo}: base subiu de ${baseA} para ${baseB} e o líquido não (${liqA} -> ${liqB})`);
};

test('Salário líquido não diminui com o bruto (só o arredondamento a centavo)', () => {
  fc.assert(fc.property(centavosArb(5_000_000), diferencaArb, fc.integer({ min: 0, max: 5 }), fc.integer({ min: 0, max: 100_000 }), (a, d, dependentes, pensao) => {
    const la = C.salarioLiquido({ bruto: reais(a), dependentes, pensao: reais(pensao) });
    const lb = C.salarioLiquido({ bruto: reais(a + d), dependentes, pensao: reais(pensao) });
    confereSubida('salário', la.bruto, lb.bruto, la.liquido, lb.liquido);
    assert.equal(la.liquido, C.r2(la.bruto - la.descontos));
  }), cfg(5000));
});

test('13º líquido não diminui com o salário (só o arredondamento a centavo)', () => {
  fc.assert(fc.property(centavosArb(5_000_000), diferencaArb, fc.integer({ min: 1, max: 12 }), fc.integer({ min: 0, max: 5 }), (a, d, meses, dependentes) => {
    const da = C.decimoTerceiro({ salario: reais(a), meses, dependentes });
    const db = C.decimoTerceiro({ salario: reais(a + d), meses, dependentes });
    confereSubida('13º', da.bruto, db.bruto, da.liquidoTotal, db.liquidoTotal);
    assert.equal(da.liquidoTotal, C.r2(da.bruto - da.inss - da.irrf));
    assert.equal(C.r2(da.primeira + da.segunda), da.liquidoTotal);
  }), cfg(5000));
});

test('Férias líquidas não diminuem com o salário (só o arredondamento a centavo)', () => {
  const arb = fc.tuple(centavosArb(5_000_000), diferencaArb, fc.integer({ min: 1, max: 30 }), fc.integer({ min: 0, max: 10 }), fc.integer({ min: 0, max: 5 }));
  fc.assert(fc.property(arb, ([a, d, diasGozo, diasAbono, dependentes]) => {
    const fa = C.ferias({ salario: reais(a), diasGozo, diasAbono, dependentes });
    const fb = C.ferias({ salario: reais(a + d), diasGozo, diasAbono, dependentes });
    confereSubida('férias', C.r2(fa.valorFerias + fa.terco), C.r2(fb.valorFerias + fb.terco), fa.liquido, fb.liquido);
    assert.equal(fa.liquido, C.r2(fa.bruto - fa.inss - fa.irrf));
  }), cfg(5000));
});

test('r2: idempotente, monotônico, no máximo 2 casas e erro de até meio centavo', () => {
  const x = fc.double({ min: -1e9, max: 1e9, noNaN: true });
  fc.assert(fc.property(x, x, (a, b) => {
    const ra = C.r2(a);
    assert.equal(C.r2(ra), ra);
    assert.ok(Number(ra.toFixed(2)) === ra, `r2(${a}) = ${ra} tem mais de 2 casas`); // === : -0 e 0 valem o mesmo
    assert.ok(Math.abs(ra - a) <= 0.005 + 1e-9 * Math.abs(a), `r2(${a}) = ${ra}`);
    if (a <= b) assert.ok(ra <= C.r2(b), `r2(${a}) = ${ra} > r2(${b}) = ${C.r2(b)}`);
  }), cfg(10000));
});

test('lerNumeroBR lê de volta, ao centavo, o valor formatado em pt-BR (com e sem "R$")', () => {
  // Os formatos que o site exibe (ui.js): moeda com "R$" e espaço não separável, e número com até 2 casas.
  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const n2 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
  const fixo2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const le = (s, o) => {
    const r = lerNumeroBR(s, o);
    assert.ok(Number.isFinite(r.n) && !r.erro, `"${s}" não foi lido: ${r.erro}`);
    return centavos(r.n);
  };
  // Centavos quaisquer e reais inteiros (sem centavos, o número sai sem vírgula: "123.456" é milhar, não decimal).
  const valor = fc.oneof(fc.integer({ min: 0, max: 100_000 }), fc.integer({ min: 0, max: 100_000_000_000 }), fc.integer({ min: 0, max: 1_000_000_000 }).map((r) => r * 100));
  fc.assert(fc.property(valor, fc.boolean(), (c, negativo) => {
    // "R$" só em valor não negativo: os campos de dinheiro têm mínimo 0.
    assert.equal(le(brl.format(reais(c))), c);
    assert.equal(le(brl.format(reais(c)).replace(/\u00a0/g, ' ')), c);
    const v = negativo && c ? -c : c; // "-0" é lido como 0 (CC-CALC-VALIDA-02)
    for (const s of [n2.format(reais(v)), fixo2.format(reais(v))]) {
      assert.equal(le(s), v, `"${s}"`);
      assert.equal(le(s, { decimal: true }), v, `"${s}" em campo decimal`);
    }
  }), cfg(5000));
});

// Rescisão. Matriz de motivo x aviso escrita aqui, independente de AVISOS_POR_MOTIVO (calc.js): sem justa causa e
// acordo com aviso indenizado ou trabalhado (CLT, arts. 487 e 484-A, I, a); pedido de demissão com aviso trabalhado
// ou não cumprido (art. 487, § 2º); na justa causa o aviso não se aplica e qualquer valor é aceito.
const MATRIZ = { semJustaCausa: ['indenizado', 'trabalhado'], pedidoDemissao: ['trabalhado', 'naoCumprido'], acordo: ['indenizado', 'trabalhado'], justaCausa: null };
const DIA = 86400000;
const iso = (dias) => new Date(Date.UTC(2000, 0, 1) + dias * DIA).toISOString().slice(0, 10);
const diasDe = (s) => Math.round((Date.parse(`${s}T00:00:00Z`) - Date.UTC(2000, 0, 1)) / DIA);
const DES_MIN = diasDe('2024-01-01'); // primeiro ano com tabelas de INSS e IRRF no site
const DES_MAX = diasDe('2027-12-31');

const rescisaoArb = fc.record({
  salario: fc.oneof(fc.integer({ min: 1, max: 5_000_000 }), fc.integer({ min: 100_000, max: 1_500_000 })),
  desligamento: fc.integer({ min: DES_MIN, max: DES_MAX }),
  tempo: fc.oneof(fc.integer({ min: 0, max: 400 }), fc.integer({ min: 0, max: 15_000 })),
  tipo: fc.constantFrom('semJustaCausa', 'pedidoDemissao', 'acordo', 'justaCausa', 'xyz'),
  aviso: fc.constantFrom(undefined, 'indenizado', 'trabalhado', 'naoCumprido', 'outro'),
  feriasVencidas: fc.integer({ min: 0, max: 2 }),
  vencidasEmDobro: fc.tuple(fc.boolean(), fc.boolean()),
  saldoFgts: fc.integer({ min: 0, max: 10_000_000 }),
  dependentes: fc.integer({ min: 0, max: 5 }),
  parcela: fc.oneof(fc.constant(0), fc.integer({ min: 0, max: 10_000_000 })),
  pagamentoDepois: fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 40 })),
  saqueAniversario: fc.boolean(),
});

test('Rescisão: matriz motivo x aviso, líquido = verbas − descontos e nunca negativo, aviso pela metade só no acordo indenizado, avos de 0 a 12', () => {
  fc.assert(fc.property(rescisaoArb, (g) => {
    const entrada = {
      salario: reais(g.salario), admissao: iso(g.desligamento - g.tempo), desligamento: iso(g.desligamento), tipo: g.tipo, aviso: g.aviso,
      feriasVencidas: g.feriasVencidas, vencidasEmDobro: g.vencidasEmDobro, saldoFgts: reais(g.saldoFgts), dependentes: g.dependentes,
      primeiraParcela13: reais(g.parcela), dataPagamento: g.pagamentoDepois === null ? '' : iso(g.desligamento + g.pagamentoDepois), saqueAniversario: g.saqueAniversario,
    };
    const caso = JSON.stringify(entrada);
    const r = C.rescisao(entrada);
    const lista = Object.hasOwn(MATRIZ, g.tipo) ? MATRIZ[g.tipo] : undefined;
    const valido = lista !== undefined && (g.aviso === undefined || lista === null || lista.includes(g.aviso));
    if (!valido) {
      assert.deepEqual(r, { avisoInvalido: true }, caso);
      return;
    }
    assert.ok(r && !r.avisoInvalido && !r.anteriorTabelas, caso);
    const aviso = g.aviso ?? (lista ? lista[0] : undefined);

    // Total das verbas = soma das linhas exibidas; líquido = verbas − linhas de desconto, nunca negativo.
    assert.equal(r.verbas, C.r2(r.saldoSalario + r.avisoIndenizado + r.decimoAnterior + r.decimoAtual + r.feriasProp + r.feriasVencSimples + r.dobraFeriasVenc + r.feriasProjecao + r.tercoFerias), caso);
    const inss13 = r.avos13Anterior ? C.r2(r.inss13Anterior + r.inss13Atual) : r.inss13;
    assert.equal(inss13, r.inss13, caso);
    assert.equal(r.descontos, C.r2(r.inssSaldo + r.irSaldo + inss13 + r.ir13 + r.parcela13Aplicada + r.descontoAvisoAplicado), caso);
    assert.equal(r.liquido, C.r2(r.verbas - r.descontos), caso);
    assert.ok(r.liquido >= 0, caso);
    assert.ok(r.parcela13Aplicada >= 0 && r.parcela13Aplicada <= r.primeiraParcela13 && r.excedenteParcela13 === C.r2(r.primeiraParcela13 - r.parcela13Aplicada), caso);
    assert.ok(r.descontoAvisoAplicado >= 0 && r.descontoAvisoAplicado <= r.descontoAviso && r.excedenteAviso === C.r2(r.descontoAviso - r.descontoAvisoAplicado), caso);

    // Aviso prévio: Lei 12.506/2011 (30 dias + 3 por ano completo, até 90); metade só no acordo indenizado.
    assert.ok(r.diasAviso >= 30 && r.diasAviso <= 90 && (r.diasAviso - 30) % 3 === 0, caso);
    const cheio = C.r2((entrada.salario / 30) * r.diasAviso);
    if (g.tipo === 'acordo' && aviso === 'indenizado') {
      assert.ok(Math.abs(r.avisoIndenizado - cheio / 2) <= 0.01, caso);
      assert.equal(r.diasProjecao, Math.floor(r.diasAviso / 2), caso);
    } else if (g.tipo === 'semJustaCausa' && aviso === 'indenizado') {
      assert.equal(r.avisoIndenizado, cheio, caso);
      assert.equal(r.diasProjecao, r.diasAviso, caso);
    } else {
      assert.equal(r.avisoIndenizado, 0, caso);
      assert.equal(r.diasProjecao, 0, caso);
    }
    assert.equal(diasDe(r.fimProjetado) - g.desligamento, r.diasProjecao, caso);
    assert.equal(r.descontoAviso, g.tipo === 'pedidoDemissao' && aviso === 'naoCumprido' ? entrada.salario : 0, caso);

    // Avos de 13º (por ano civil) e de férias entre 0 e 12; na justa causa, sem proporcionais.
    for (const v of [r.avos13Anterior, r.avos13Atual, r.avosFerias]) assert.ok(Number.isInteger(v) && v >= 0 && v <= 12, caso);
    assert.equal(r.avos13, r.avos13Anterior + r.avos13Atual, caso);
    if (r.avos13Anterior) assert.ok(r.anoFim > r.anoDes, caso);
    if (g.tipo === 'justaCausa') assert.deepEqual([r.avos13, r.avosFerias, r.decimo, r.feriasProp], [0, 0, 0, 0], caso);

    // Multa do FGTS: 40% sem justa causa, 20% no acordo, nada nos outros motivos (Lei 8.036/1990, art. 18).
    const multa = { semJustaCausa: 0.4, acordo: 0.2 }[g.tipo] ?? 0;
    assert.equal(r.multaFgts, C.r2(r.baseFgts * multa), caso);
  }), cfg(4000));
});

// À vista ou parcelado: valor presente calculado aqui, sem valorPresenteParcelas do calc.js.
const vp = (parcela, n, i, comEntrada) => {
  let s = 0;
  for (let k = 0; k < n; k++) s += parcela / (1 + i) ** (k + (comEntrada ? 0 : 1));
  return s;
};

test('À vista ou parcelado: as parcelas descontadas à taxa implícita valem o preço à vista (até 1 centavo)', () => {
  const arb = fc.record({
    vista: fc.integer({ min: 1, max: 100_000_000 }),
    n: fc.integer({ min: 1, max: 360 }),
    comEntrada: fc.boolean(),
    // total parcelado de metade a 50 vezes o preço à vista, ou parcela exata (total = à vista)
    razao: fc.oneof(fc.double({ min: 0.5, max: 50, noNaN: true }), fc.constant(1)),
  });
  fc.assert(fc.property(arb, ({ vista, n, comEntrada, razao }) => {
    const parcela = Math.max(1, Math.round((vista * razao) / n));
    const r = C.parceladoOuVista({ vista: reais(vista), parcelas: n, valorParcela: reais(parcela), comEntrada });
    const caso = JSON.stringify({ vista: reais(vista), n, parcela: reais(parcela), comEntrada });
    const total = parcela * n;
    assert.equal(centavos(r.total), total, caso);
    if (total < vista || (total > vista && comEntrada && parcela >= vista)) assert.equal(r.taxaImplicita, null, caso);
    else if (total === vista) assert.equal(r.taxaImplicita, 0, caso);
    else {
      assert.ok(r.taxaImplicita > 0, caso);
      const dif = vp(reais(parcela), n, r.taxaImplicita, comEntrada) - reais(vista);
      assert.ok(Math.abs(dif) <= 0.01, `${caso}: valor presente difere ${dif}`);
    }
  }), cfg(2000));
});

test('Financiamento: Price com parcelas iguais e SAC com parcelas decrescentes; amortizações somam o valor financiado', () => {
  const arb = fc.record({
    valor: fc.oneof(fc.integer({ min: 1, max: 100_000_000 }), fc.integer({ min: 1_000_000, max: 100_000_000 })),
    meses: fc.oneof(fc.integer({ min: 1, max: 24 }), fc.integer({ min: 1, max: 420 })),
    periodo: fc.constantFrom('anual', 'mensal'),
    taxaCentesimos: fc.oneof(fc.constant(0), fc.integer({ min: 0, max: 3000 })),
  });
  fc.assert(fc.property(arb, ({ valor, meses, periodo, taxaCentesimos }) => {
    // Até 30% a.a. ou 3% a.m., por até 420 meses (prazo máximo usual do crédito imobiliário). Muito além disso o fator
    // (1 + i)^n amplifica o ruído de ponto flutuante do saldo: a 4,52% a.m. por 415 meses (fator perto de 10^8) a
    // última parcela da Price sai 2 centavos acima das outras.
    const taxa = (periodo === 'mensal' ? taxaCentesimos / 10 : taxaCentesimos) / 100;
    const caso = JSON.stringify({ valor: reais(valor), meses, periodo, taxa });
    const res = {};
    for (const sistema of ['price', 'sac']) {
      const r = C.financiamento({ valor: reais(valor), taxa, periodo, meses, sistema });
      res[sistema] = r;
      const L = r.linhas;
      assert.equal(L.length, meses, caso);
      assert.equal(L[meses - 1].saldo, 0, `${sistema} ${caso}`);
      for (let k = 1; k < meses; k++) assert.ok(L[k].saldo <= L[k - 1].saldo, `${sistema}: saldo subiu na parcela ${k + 1} ${caso}`);
      // Amortizações exatas somam o valor financiado: total pago − total de juros = valor, ao centavo.
      assert.equal(centavos(r.totalPago) - centavos(r.totalJuros), valor, `${sistema} ${caso}`);
      // Na tabela exibida, cada linha é arredondada ao centavo: a soma da coluna fica a até meio centavo por linha.
      const somaColuna = L.reduce((s, l) => s + centavos(l.amortizacao), 0);
      assert.ok(Math.abs(somaColuna - valor) <= meses / 2, `${sistema}: amortizações somam ${reais(somaColuna)} ${caso}`);
      assert.equal(r.primeira, L[0].parcela, caso);
      assert.equal(r.ultima, L[meses - 1].parcela, caso);
    }
    const P = res.price.linhas;
    for (let k = 1; k < meses - 1; k++) assert.equal(P[k].parcela, P[0].parcela, `Price: parcela ${k + 1} diferente ${caso}`);
    assert.ok(Math.abs(centavos(P[meses - 1].parcela) - centavos(P[0].parcela)) <= 1, `Price: última parcela ${P[meses - 1].parcela} x ${P[0].parcela} ${caso}`);
    const S = res.sac.linhas;
    const i = res.sac.taxaMensal;
    const amort = reais(valor) / meses;
    for (let k = 1; k < meses; k++) {
      assert.ok(S[k].parcela <= S[k - 1].parcela, `SAC: parcela ${k + 1} maior que a anterior ${caso}`);
      if (amort * i > 0.0101) assert.ok(S[k].parcela < S[k - 1].parcela, `SAC: parcela ${k + 1} não caiu ${caso}`);
      assert.equal(S[k].amortizacao, S[0].amortizacao, `SAC: amortização ${k + 1} diferente ${caso}`);
    }
    // Com juros e mais de uma parcela, o SAC paga menos juros no total que a Price (texto da /financiamento/).
    if (i > 0 && meses > 1) assert.ok(res.sac.totalJuros <= res.price.totalJuros, caso);
  }), cfg(1500));
});
