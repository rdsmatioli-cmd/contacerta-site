// Funções puras de cálculo. Usadas pelo navegador (ui.js) e pelos testes (node --test).
import { INSS, IRRF, IR_RENDA_FIXA, MEI, SEGURO_DESEMPREGO, FGTS, SALARIO_MINIMO } from './tabelas.js';

/** Arredonda para 2 casas (meio para cima), imune a ruído de ponto flutuante. */
export function r2(x) {
  const v = Number((Math.abs(x) * 100).toFixed(6));
  return (Math.sign(x) * Math.round(v)) / 100;
}
const num = (v, d = 0) => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v);
  return Number.isFinite(n) ? n : d;
};

// ---------------------------------------------------------------- INSS
export function inssEmpregado(salario) {
  const base = Math.min(Math.max(num(salario), 0), INSS.teto);
  let anterior = 0;
  let total = 0;
  const faixas = [];
  for (const f of INSS.faixas) {
    if (base <= anterior) break;
    const parcela = Math.min(base, f.ate) - anterior;
    const valor = parcela * f.aliquota;
    faixas.push({ de: anterior, ate: f.ate, aliquota: f.aliquota, base: r2(parcela), valor: r2(valor) });
    total += valor;
    anterior = f.ate;
  }
  const inss = r2(total);
  return { inss, faixas, base, aliquotaEfetiva: salario > 0 ? inss / num(salario) : 0 };
}

export function inssIndividual(salarioContribuicao, plano = 'normal') {
  const sm = SALARIO_MINIMO.valor;
  if (plano === 'simplificado' || plano === 'baixaRendaMei') {
    const aliq = INSS.individual[plano];
    return { base: sm, aliquota: aliq, inss: r2(sm * aliq) };
  }
  const base = Math.min(Math.max(num(salarioContribuicao), sm), INSS.teto);
  return { base, aliquota: INSS.individual.normal, inss: r2(base * INSS.individual.normal) };
}

// ---------------------------------------------------------------- IRRF
export function tabelaProgressiva(base) {
  if (base <= 0) return { imposto: 0, faixa: IRRF.faixas[0] };
  const faixa = IRRF.faixas.find((f) => base <= f.ate);
  return { imposto: r2(Math.max(0, base * faixa.aliquota - faixa.deducao)), faixa };
}

export function reducaoLei15270(rendimentos, imposto) {
  const R = IRRF.reducao;
  let red = 0;
  if (rendimentos <= R.isencaoAte) red = Math.min(R.limiteIsencao, imposto);
  else if (rendimentos <= R.faixaAte) red = r2(Math.max(0, R.a - R.b * rendimentos));
  return r2(Math.min(red, imposto));
}

/**
 * IRRF mensal (salário, férias ou 13º — cada um calculado em separado).
 * Compara deduções legais (INSS + dependentes + pensão + outras) com o desconto simplificado
 * e usa a opção mais vantajosa, depois aplica a redução da Lei 15.270/2025.
 */
export function irrfMensal({ rendimentos, inss = 0, dependentes = 0, pensao = 0, outrasDeducoes = 0 }) {
  rendimentos = Math.max(0, num(rendimentos));
  const dedLegais = num(inss) + num(dependentes) * IRRF.deducaoDependente + num(pensao) + num(outrasDeducoes);
  const baseLegal = Math.max(0, rendimentos - dedLegais);
  const baseSimpl = Math.max(0, rendimentos - IRRF.descontoSimplificado);
  const tLegal = tabelaProgressiva(baseLegal);
  const tSimpl = tabelaProgressiva(baseSimpl);
  const usaSimplificado = tSimpl.imposto < tLegal.imposto;
  const escolhido = usaSimplificado ? tSimpl : tLegal;
  const impostoTabela = escolhido.imposto;
  const reducao = reducaoLei15270(rendimentos, impostoTabela);
  const irrf = r2(impostoTabela - reducao);
  return {
    irrf,
    impostoTabela,
    reducao,
    base: r2(usaSimplificado ? baseSimpl : baseLegal),
    deducoes: r2(usaSimplificado ? IRRF.descontoSimplificado : dedLegais),
    usaSimplificado,
    aliquotaNominal: escolhido.faixa.aliquota,
    aliquotaEfetiva: rendimentos > 0 ? irrf / rendimentos : 0,
  };
}

// ---------------------------------------------------------------- Salário líquido
export function salarioLiquido({ bruto, dependentes = 0, pensao = 0, outrosDescontos = 0, valeTransporte = false }) {
  bruto = num(bruto);
  const { inss } = inssEmpregado(bruto);
  const ir = irrfMensal({ rendimentos: bruto, inss, dependentes, pensao });
  const vt = valeTransporte ? r2(bruto * 0.06) : 0;
  const descontos = r2(inss + ir.irrf + num(pensao) + num(outrosDescontos) + vt);
  return { bruto, inss, irrf: ir.irrf, ir, vt, pensao: num(pensao), outrosDescontos: num(outrosDescontos), descontos, liquido: r2(bruto - descontos) };
}

// ---------------------------------------------------------------- 13º salário
export function decimoTerceiro({ salario, meses = 12, mediaVariaveis = 0, dependentes = 0 }) {
  const m = Math.min(12, Math.max(0, Math.floor(num(meses))));
  const bruto = r2(((num(salario) + num(mediaVariaveis)) / 12) * m);
  const primeira = r2(bruto / 2);
  const { inss } = inssEmpregado(bruto);
  const ir = irrfMensal({ rendimentos: bruto, inss, dependentes });
  const segunda = r2(bruto - primeira - inss - ir.irrf);
  return { bruto, primeira, segunda, inss, irrf: ir.irrf, ir, liquidoTotal: r2(primeira + segunda), meses: m };
}

// ---------------------------------------------------------------- Férias
export function ferias({ salario, mediaVariaveis = 0, dias = 30, venderDias = false, dependentes = 0 }) {
  const remun = num(salario) + num(mediaVariaveis);
  const diaria = remun / 30;
  let diasGozo = Math.min(30, Math.max(1, Math.floor(num(dias, 30))));
  const diasAbono = venderDias ? Math.min(10, Math.floor(diasGozo / 3)) : 0;
  diasGozo -= diasAbono;
  const valorFerias = r2(diaria * diasGozo);
  const terco = r2(valorFerias / 3);
  const abono = r2(diaria * diasAbono);
  const tercoAbono = r2(abono / 3);
  const tributavel = r2(valorFerias + terco);
  const { inss } = inssEmpregado(tributavel);
  const ir = irrfMensal({ rendimentos: tributavel, inss, dependentes });
  const bruto = r2(tributavel + abono + tercoAbono);
  return { diasGozo, diasAbono, valorFerias, terco, abono, tercoAbono, bruto, inss, irrf: ir.irrf, ir, liquido: r2(bruto - inss - ir.irrf) };
}

// ---------------------------------------------------------------- Horas extras
export function horasExtras({ salario, jornadaMensal = 220, horas50 = 0, horas100 = 0, diasUteis = 0, domingosFeriados = 0, outroPercentual = 0, horasOutro = 0 }) {
  const valorHora = num(salario) / Math.max(1, num(jornadaMensal, 220));
  const he50 = r2(valorHora * 1.5 * num(horas50));
  const he100 = r2(valorHora * 2 * num(horas100));
  const heOutro = r2(valorHora * (1 + num(outroPercentual) / 100) * num(horasOutro));
  const totalHE = r2(he50 + he100 + heOutro);
  const dsr = num(diasUteis) > 0 ? r2((totalHE / num(diasUteis)) * num(domingosFeriados)) : 0;
  return { valorHora: r2(valorHora), he50, he100, heOutro, totalHE, dsr, total: r2(totalHE + dsr) };
}

// ---------------------------------------------------------------- Adicional noturno
/**
 * Urbano (CLT art. 73): 22h–5h, adicional mínimo de 20% e hora noturna de 52min30s (fator 60/52,5).
 * Rural (Lei 5.889/1973, art. 7º): 21h–5h (lavoura) ou 20h–4h (pecuária), adicional de 25%, sem hora reduzida.
 */
export function adicionalNoturno({ salario, jornadaMensal = 220, horas = 0, tipo = 'urbano', percentual, diasUteis = 0, domingosFeriados = 0 }) {
  const rural = tipo === 'rural';
  const pct = num(percentual, rural ? 25 : 20) / 100;
  const valorHora = num(salario) / Math.max(1, num(jornadaMensal, 220));
  const horasRelogio = num(horas);
  const horasConsideradas = rural ? horasRelogio : (horasRelogio * 60) / 52.5;
  const adicional = r2(valorHora * pct * horasConsideradas);
  const dsr = num(diasUteis) > 0 ? r2((adicional / num(diasUteis)) * num(domingosFeriados)) : 0;
  return { valorHora: r2(valorHora), horasRelogio, horasConsideradas: r2(horasConsideradas), pct, adicional, dsr, total: r2(adicional + dsr), valorHoraNoturna: r2(valorHora * (1 + pct)) };
}

// ---------------------------------------------------------------- Aviso prévio
/** tipo: semJustaCausa | pedidoDemissao | acordo. Proporcionalidade da Lei 12.506/2011 só a favor do empregado. */
export function avisoPrevio({ salario, admissao, desligamento, tipo = 'semJustaCausa' }) {
  const dAdm = parseData(admissao);
  const dDes = parseData(desligamento);
  if (!(dDes >= dAdm)) return null;
  const anos = anosCompletos(dAdm, dDes);
  const diasLei = diasAvisoPrevio(dAdm, dDes);
  const dias = tipo === 'pedidoDemissao' ? 30 : tipo === 'acordo' ? Math.floor(diasLei / 2) : diasLei;
  const diaria = num(salario) / 30;
  const valor = r2(diaria * dias);
  const fim = addDias(dDes, dias).toISOString().slice(0, 10);
  return { anos, diasLei, dias, valor, fimProjetado: fim, diaria: r2(diaria) };
}

// ---------------------------------------------------------------- Custo do funcionário
/**
 * Custo anual e mensal médio de um empregado CLT para a empresa.
 * Base anual = 12 salários (um deles pago como férias) + 13º + 1/3 de férias.
 * regime: simples (Anexos I, II, III e V: CPP dentro do DAS) | simplesIV | presumido (Lucro Presumido ou Real) | mei
 */
export function custoFuncionario({ salario, regime = 'simples', rat = 2, terceiros = 5.8, beneficios = 0, valeTransporte = 0, provisionarMulta = false }) {
  const s = num(salario);
  const salarios = r2(s * 12);
  const decimo = r2(s);
  const terco = r2(s / 3);
  const base = r2(salarios + decimo + terco);
  const fgts = r2(base * FGTS.aliquota);
  const multa = provisionarMulta ? r2(fgts * FGTS.multaSemJustaCausa) : 0;
  let aliqPatronal = 0;
  if (regime === 'presumido') aliqPatronal = 0.2 + num(rat) / 100 + num(terceiros) / 100;
  else if (regime === 'simplesIV') aliqPatronal = 0.2 + num(rat) / 100;
  else if (regime === 'mei') aliqPatronal = 0.03;
  const inssPatronal = r2(base * aliqPatronal);
  const vtEmpresa = r2(Math.max(0, num(valeTransporte) - s * 0.06) * 11);
  const benef = r2(num(beneficios) * 12);
  const anual = r2(base + fgts + multa + inssPatronal + vtEmpresa + benef);
  return {
    salarios, decimo, terco, base, fgts, multa, aliqPatronal, inssPatronal, vtEmpresa, beneficios: benef, anual,
    mensal: r2(anual / 12), porMesTrabalhado: r2(anual / 11), fator: s > 0 ? anual / 12 / s : 0,
  };
}

// ---------------------------------------------------------------- Markup e preço de venda
/** Markup divisor (Sebrae): preço = custo × 100 ÷ [100 − (despesas fixas + impostos + taxas/comissões + lucro)], tudo em % do preço. */
export function markup({ custo, despesasFixas = 0, impostos = 0, taxas = 0, lucro = 0 }) {
  const soma = num(despesasFixas) + num(impostos) + num(taxas) + num(lucro);
  if (soma >= 100) return null;
  const indice = 100 / (100 - soma);
  const c = num(custo);
  const preco = r2(c * indice);
  return {
    soma, indice, preco, markupPct: c > 0 ? (preco - c) / c : 0,
    vFixas: r2(preco * num(despesasFixas) / 100), vImpostos: r2(preco * num(impostos) / 100),
    vTaxas: r2(preco * num(taxas) / 100), vLucro: r2(preco * num(lucro) / 100),
  };
}

// ---------------------------------------------------------------- À vista ou parcelado
/** Valor presente de n parcelas iguais a uma taxa mensal i; comEntrada = 1ª parcela no ato. */
export function valorPresenteParcelas(parcela, n, i, comEntrada = false) {
  let vp = 0;
  for (let k = 0; k < n; k++) vp += parcela / Math.pow(1 + i, k + (comEntrada ? 0 : 1));
  return vp;
}
export function parceladoOuVista({ vista, parcelas, valorParcela, comEntrada = false, rendimentoAnual = 0 }) {
  const V = num(vista);
  const n = Math.max(1, Math.floor(num(parcelas, 1)));
  const P = num(valorParcela);
  const total = r2(P * n);
  // taxa implícita: resolve V = VP(parcelas, i) por bisseção
  let taxaImplicita = 0;
  if (V > 0 && total > V && !(comEntrada && n === 1)) {
    let lo = 0;
    let hi = 1;
    for (let k = 0; k < 200; k++) {
      const mid = (lo + hi) / 2;
      if (valorPresenteParcelas(P, n, mid, comEntrada) > V) lo = mid; else hi = mid;
    }
    taxaImplicita = (lo + hi) / 2;
  }
  const rend = taxaMensalDeAnual(rendimentoAnual);
  const vp = r2(valorPresenteParcelas(P, n, rend, comEntrada));
  const vantagem = r2(V - vp); // > 0: parcelar e aplicar o dinheiro sai mais barato
  return {
    total, taxaImplicita, taxaImplicitaAnual: Math.pow(1 + taxaImplicita, 12) - 1, descontoVista: total > 0 ? 1 - V / total : 0,
    rendimentoMensal: rend, vp, vantagem, melhor: Math.abs(vantagem) < 0.005 ? 'empate' : vantagem > 0 ? 'parcelado' : 'vista',
  };
}

// ---------------------------------------------------------------- Seguro-desemprego
export function seguroDesemprego({ salarios = [], solicitacao = 1, mesesTrabalhados = 0 }) {
  const vals = salarios.map((s) => num(s)).filter((s) => s > 0);
  const media = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  const T = SEGURO_DESEMPREGO;
  let parcela;
  if (media <= T.faixa1Ate) parcela = media * 0.8;
  else if (media <= T.faixa2Ate) parcela = (media - T.faixa1Ate) * 0.5 + T.fixoFaixa2;
  else parcela = T.teto;
  parcela = r2(Math.max(T.piso, parcela));
  const m = Math.floor(num(mesesTrabalhados));
  const sol = Math.floor(num(solicitacao, 1));
  const minimo = sol <= 1 ? 12 : sol === 2 ? 9 : 6;
  let parcelas = 0;
  if (m >= 24) parcelas = 5;
  else if (m >= 12) parcelas = 4;
  else if (m >= minimo) parcelas = 3;
  if (sol <= 1 && m < 12) parcelas = 0;
  return { media: r2(media), parcela, parcelas, total: r2(parcela * parcelas), temDireito: parcelas > 0, carenciaMinima: minimo };
}

// ---------------------------------------------------------------- FGTS
export function fgts({ salario, meses, saldoAtual = 0, aprendiz = false, comRendimento = true, tipo = 'semJustaCausa' }) {
  const aliq = aprendiz ? FGTS.aliquotaAprendiz : FGTS.aliquota;
  const deposito = r2(num(salario) * aliq);
  const n = Math.max(0, Math.floor(num(meses)));
  const i = comRendimento ? Math.pow(1 + FGTS.jurosAnuais, 1 / 12) - 1 : 0;
  let saldo = num(saldoAtual);
  for (let k = 0; k < n; k++) saldo = saldo * (1 + i) + deposito;
  saldo = r2(saldo);
  const depositado = r2(deposito * n);
  const multaPct = tipo === 'semJustaCausa' ? FGTS.multaSemJustaCausa : tipo === 'acordo' ? FGTS.multaAcordo : 0;
  const multa = r2(saldo * multaPct);
  const saquePct = tipo === 'semJustaCausa' ? 1 : tipo === 'acordo' ? 0.8 : 0;
  return { deposito, depositado, saldo, rendimento: r2(saldo - depositado - num(saldoAtual)), multa, multaPct, saque: r2(saldo * saquePct + multa) };
}

// ---------------------------------------------------------------- Datas
export function parseData(s) {
  if (s instanceof Date) return new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()));
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
const DIA = 86400000;
export function addMeses(dt, n) {
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth() + n;
  const d = dt.getUTCDate();
  const ultimo = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d, ultimo)));
}
export function addDias(dt, n) { return new Date(dt.getTime() + n * DIA); }
export function diffDias(a, b) { return Math.round((parseData(b) - parseData(a)) / DIA); }

export function idade(nascimento, referencia) {
  const n = parseData(nascimento);
  const r = parseData(referencia);
  if (r < n) return null;
  let anos = r.getUTCFullYear() - n.getUTCFullYear();
  let meses = r.getUTCMonth() - n.getUTCMonth();
  let dias = r.getUTCDate() - n.getUTCDate();
  if (dias < 0) {
    meses -= 1;
    dias += new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth(), 0)).getUTCDate();
  }
  if (meses < 0) { anos -= 1; meses += 12; }
  const totalDias = diffDias(n, r);
  // próximo aniversário (29/02 vira 28/02 em anos não bissextos)
  const ehHoje = meses === 0 && dias === 0;
  let prox = addMeses(n, (anos + 1) * 12);
  // Nascidos em 29/02: em ano não bissexto, o aniversário se completa em 01/03 (Código Civil, art. 132, § 3º)
  if (n.getUTCMonth() === 1 && n.getUTCDate() === 29 && prox.getUTCDate() === 28) prox = addDias(prox, 1);
  return { anos, meses, dias, totalDias, totalMeses: anos * 12 + meses, diasProximoAniversario: ehHoje ? 0 : diffDias(r, prox) };
}

/** Anos completos de serviço entre duas datas. */
export function anosCompletos(inicio, fim) { return idade(inicio, fim)?.anos ?? 0; }

/** Dias de aviso prévio (Lei 12.506/2011): 30 + 3 por ano completo, máximo 90. */
export function diasAvisoPrevio(admissao, desligamento) {
  return Math.min(90, 30 + 3 * anosCompletos(admissao, desligamento));
}

/** Avos de 13º no ano do desligamento: mês conta se houve 15 dias ou mais de trabalho. */
export function avos13(admissao, fim) {
  const a = parseData(admissao);
  const f = parseData(fim);
  const ano = f.getUTCFullYear();
  let avos = 0;
  for (let m = 0; m <= f.getUTCMonth(); m++) {
    const ini = new Date(Date.UTC(ano, m, 1));
    const fimMes = new Date(Date.UTC(ano, m + 1, 0));
    const de = a > ini ? a : ini;
    const ate = f < fimMes ? f : fimMes;
    const dias = Math.round((ate - de) / DIA) + 1;
    if (dias >= 15) avos++;
  }
  return avos;
}

/** Avos de férias proporcionais no período aquisitivo em curso (fração >= 15 dias conta 1/12). */
export function avosFerias(admissao, fim) {
  const a = parseData(admissao);
  const f = parseData(fim);
  const anos = anosCompletos(a, addDias(f, 1));
  const inicio = addMeses(a, anos * 12);
  const fimExcl = addDias(f, 1);
  let meses = 0;
  while (meses < 12 && addMeses(inicio, meses + 1) <= fimExcl) meses++;
  const resto = Math.round((fimExcl - addMeses(inicio, meses)) / DIA);
  if (meses < 12 && resto >= 15) meses++;
  return { avos: Math.min(12, meses), periodosCompletos: anos };
}

// ---------------------------------------------------------------- Rescisão
/**
 * tipo: semJustaCausa | pedidoDemissao | justaCausa | acordo
 * aviso: indenizado | trabalhado | naoCumprido (pedido de demissão sem cumprir: desconto de 30 dias)
 */
export function rescisao({ salario, admissao, desligamento, tipo = 'semJustaCausa', aviso = 'indenizado', feriasVencidas = 0, saldoFgts = 0, dependentes = 0 }) {
  salario = num(salario);
  const dAdm = parseData(admissao);
  const dDes = parseData(desligamento);
  if (!(dDes >= dAdm)) return null;
  const diaria = salario / 30;
  const diasNoMes = Math.min(30, dDes.getUTCDate());
  const saldoSalario = r2(diaria * diasNoMes);

  const diasAviso = diasAvisoPrevio(dAdm, dDes);
  let avisoIndenizado = 0;
  let diasProjecao = 0;
  let descontoAviso = 0;
  if ((tipo === 'semJustaCausa') && aviso === 'indenizado') { avisoIndenizado = r2(diaria * diasAviso); diasProjecao = diasAviso; }
  if (tipo === 'acordo') { const d = Math.floor(diasAviso / 2); avisoIndenizado = r2(diaria * d); diasProjecao = d; }
  if (tipo === 'pedidoDemissao' && aviso === 'naoCumprido') descontoAviso = r2(salario);
  const fimProjetado = addDias(dDes, diasProjecao);

  const temProporcionais = tipo !== 'justaCausa';
  const avos13 = temProporcionais ? avos13Fn(dAdm, fimProjetado) : 0;
  const decimo = r2((salario / 12) * avos13);
  const af = avosFerias(dAdm, fimProjetado);
  const avosF = temProporcionais ? af.avos : 0;
  const feriasProp = r2((salario / 12) * avosF);
  const feriasVenc = r2(salario * Math.max(0, Math.floor(num(feriasVencidas))));
  const tercoFerias = r2((feriasProp + feriasVenc) / 3);

  // Descontos estimados: INSS/IRRF sobre saldo de salário e, em separado, sobre o 13º.
  const inssSaldo = inssEmpregado(saldoSalario).inss;
  const irSaldo = irrfMensal({ rendimentos: saldoSalario, inss: inssSaldo, dependentes }).irrf;
  const inss13 = inssEmpregado(decimo).inss;
  const ir13 = irrfMensal({ rendimentos: decimo, inss: inss13, dependentes }).irrf;

  const multaPct = tipo === 'semJustaCausa' ? 0.4 : tipo === 'acordo' ? 0.2 : 0;
  const multaFgts = r2(num(saldoFgts) * multaPct);
  const saqueFgtsPct = tipo === 'semJustaCausa' ? 1 : tipo === 'acordo' ? 0.8 : 0;

  const verbas = r2(saldoSalario + avisoIndenizado + decimo + feriasProp + feriasVenc + tercoFerias);
  const descontos = r2(inssSaldo + irSaldo + inss13 + ir13 + descontoAviso);
  return {
    diasNoMes, saldoSalario, diasAviso, diasProjecao, avisoIndenizado, avos13, decimo, avosFerias: avosF, feriasProp, feriasVenc, tercoFerias,
    inssSaldo, irSaldo, inss13, ir13, descontoAviso, verbas, descontos, liquido: r2(verbas - descontos),
    multaFgts, saqueFgts: r2(num(saldoFgts) * saqueFgtsPct), fimProjetado: fimProjetado.toISOString().slice(0, 10),
  };
}
const avos13Fn = avos13;

// ---------------------------------------------------------------- Juros compostos
export function taxaMensalDeAnual(anualPct) { return Math.pow(1 + num(anualPct) / 100, 1 / 12) - 1; }

export function jurosCompostos({ inicial = 0, aporte = 0, taxa, periodo = 'mensal', meses }) {
  const i = periodo === 'anual' ? taxaMensalDeAnual(taxa) : num(taxa) / 100;
  const n = Math.max(0, Math.floor(num(meses)));
  const P = num(inicial);
  const A = num(aporte);
  const fator = Math.pow(1 + i, n);
  const fvInicial = P * fator;
  const fvAportes = i === 0 ? A * n : A * ((fator - 1) / i);
  const total = r2(fvInicial + fvAportes);
  const investido = r2(P + A * n);
  const evolucao = [];
  let s = P;
  for (let k = 1; k <= n; k++) {
    s = s * (1 + i) + A;
    if (k % 12 === 0 || k === n) evolucao.push({ mes: k, saldo: r2(s), investido: r2(P + A * k) });
  }
  return { total, investido, juros: r2(total - investido), taxaMensal: i, evolucao };
}

// ---------------------------------------------------------------- Financiamento
export function financiamento({ valor, taxa, periodo = 'anual', meses, sistema = 'price' }) {
  const PV = num(valor);
  const n = Math.max(1, Math.floor(num(meses)));
  const i = periodo === 'anual' ? taxaMensalDeAnual(taxa) : num(taxa) / 100;
  const linhas = [];
  let saldo = PV;
  let totalPago = 0;
  let totalJuros = 0;
  if (sistema === 'price') {
    const pmt = i === 0 ? PV / n : (PV * i) / (1 - Math.pow(1 + i, -n));
    for (let k = 1; k <= n; k++) {
      const juros = saldo * i;
      let amort = pmt - juros;
      if (k === n) amort = saldo;
      const parcela = amort + juros;
      saldo -= amort;
      totalPago += parcela;
      totalJuros += juros;
      linhas.push({ n: k, parcela: r2(parcela), juros: r2(juros), amortizacao: r2(amort), saldo: r2(Math.max(0, saldo)) });
    }
  } else {
    const amort = PV / n;
    for (let k = 1; k <= n; k++) {
      const juros = saldo * i;
      const parcela = amort + juros;
      saldo -= amort;
      totalPago += parcela;
      totalJuros += juros;
      linhas.push({ n: k, parcela: r2(parcela), juros: r2(juros), amortizacao: r2(amort), saldo: r2(Math.max(0, saldo)) });
    }
  }
  return { primeira: linhas[0].parcela, ultima: linhas[n - 1].parcela, totalPago: r2(totalPago), totalJuros: r2(totalJuros), taxaMensal: i, linhas };
}

// ---------------------------------------------------------------- Investimentos (CDB x LCI x poupança x Tesouro Selic)
export function aliquotaIrRendaFixa(dias) { return IR_RENDA_FIXA.faixas.find((f) => dias <= f.ateDias).aliquota; }

export function investimentos({ valor, dias, cdi, pctCdb = 100, pctLci = 90, selic, trMensal = 0 }) {
  const V = num(valor);
  const d = Math.max(1, Math.floor(num(dias)));
  const cresc = (anualPct) => V * Math.pow(1 + anualPct / 100, d / 365) - V;
  const aliq = aliquotaIrRendaFixa(d);
  const mk = (nome, bruto, ir) => ({ nome, rendimentoBruto: r2(bruto), ir: r2(ir), rendimentoLiquido: r2(bruto - ir), final: r2(V + bruto - ir), rentabilidadeLiquida: V > 0 ? (bruto - ir) / V : 0 });
  const cdbBruto = cresc(num(cdi) * num(pctCdb) / 100);
  const lciBruto = cresc(num(cdi) * num(pctLci) / 100);
  const selicBruto = cresc(num(selic));
  // poupança: 0,5% a.m. + TR quando Selic > 8,5% a.a.; senão 70% da Selic + TR. Rende só a cada mês completo (aniversário).
  const mesesPoup = Math.floor(d / 30);
  const taxaPoup = num(selic) > 8.5 ? 0.005 + num(trMensal) / 100 : Math.pow(1 + (0.7 * num(selic)) / 100, 1 / 12) - 1 + num(trMensal) / 100;
  const poupBruto = V * Math.pow(1 + taxaPoup, mesesPoup) - V;
  return {
    aliquotaIr: aliq,
    resultados: [
      mk(`CDB ${num(pctCdb)}% do CDI`, cdbBruto, cdbBruto * aliq),
      mk(`LCI/LCA ${num(pctLci)}% do CDI (isenta)`, lciBruto, 0),
      mk('Tesouro Selic (sem custódia)', selicBruto, selicBruto * aliq),
      mk('Poupança', poupBruto, 0),
    ],
  };
}

// ---------------------------------------------------------------- Porcentagem
export const porcentagem = {
  deValor: (p, v) => (num(p) / 100) * num(v),
  quantoPorcento: (x, v) => (num(v) === 0 ? NaN : (num(x) / num(v)) * 100),
  variacao: (a, b) => (num(a) === 0 ? NaN : ((num(b) - num(a)) / num(a)) * 100),
  aumento: (v, p) => num(v) * (1 + num(p) / 100),
  desconto: (v, p) => num(v) * (1 - num(p) / 100),
};

// ---------------------------------------------------------------- Regra de três
export function regraDeTres({ a, b, c, inversa = false }) {
  a = num(a); b = num(b); c = num(c);
  if (inversa) return c === 0 ? NaN : (a * b) / c;
  return a === 0 ? NaN : (b * c) / a;
}

// ---------------------------------------------------------------- IMC
export function imc({ peso, altura }) {
  let h = num(altura);
  if (h > 3) h = h / 100; // aceita centímetros
  const p = num(peso);
  if (!(h > 0) || !(p > 0)) return null;
  const valor = p / (h * h);
  let classe;
  if (valor < 18.5) classe = 'Abaixo do peso';
  else if (valor < 25) classe = 'Peso normal';
  else if (valor < 30) classe = 'Sobrepeso';
  else if (valor < 35) classe = 'Obesidade grau I';
  else if (valor < 40) classe = 'Obesidade grau II';
  else classe = 'Obesidade grau III';
  return { imc: Math.round(valor * 100) / 100, classe, pesoMin: r2(18.5 * h * h), pesoMax: r2(24.9 * h * h) };
}

// ---------------------------------------------------------------- MEI
export function dasMei({ atividade = 'servicos', caminhoneiro = false, faturamentoAnual = 0, mesesAtivos = 12 }) {
  const inss = caminhoneiro ? MEI.inssCaminhoneiro : MEI.inss;
  const icms = atividade === 'comercio' || atividade === 'ambos' ? MEI.icms : 0;
  const iss = atividade === 'servicos' || atividade === 'ambos' ? MEI.iss : 0;
  const mensal = r2(inss + icms + iss);
  const m = Math.min(12, Math.max(1, Math.floor(num(mesesAtivos, 12))));
  const limite = r2(((caminhoneiro ? MEI.limiteAnualCaminhoneiro : MEI.limiteAnual) / 12) * m);
  const fat = num(faturamentoAnual);
  const excesso = Math.max(0, fat - limite);
  let situacao = 'dentro';
  if (excesso > 0) situacao = excesso <= limite * 0.2 ? 'excessoAte20' : 'excessoAcima20';
  return { mensal, anual: r2(mensal * m), inss, icms, iss, limite, excesso: r2(excesso), situacao };
}

// ---------------------------------------------------------------- Conversor de medidas
export const UNIDADES = {
  comprimento: { mm: 0.001, cm: 0.01, m: 1, km: 1000, pol: 0.0254, pe: 0.3048, jarda: 0.9144, milha: 1609.344 },
  massa: { mg: 0.000001, g: 0.001, kg: 1, t: 1000, oz: 0.028349523125, lb: 0.45359237, arroba: 15 },
  volume: { ml: 0.001, l: 1, m3: 1000, xicara: 0.24, colherSopa: 0.015, colherCha: 0.005, galaoUS: 3.785411784 },
  area: { cm2: 0.0001, m2: 1, hectare: 10000, km2: 1000000, alqueirePaulista: 24200, acre: 4046.8564224, pe2: 0.09290304 },
  velocidade: { 'km/h': 1 / 3.6, 'm/s': 1, mph: 0.44704, no: 0.514444444 },
};
export function converter(valor, categoria, de, para) {
  const v = num(valor);
  if (categoria === 'temperatura') {
    const c = de === 'C' ? v : de === 'F' ? ((v - 32) * 5) / 9 : v - 273.15;
    return para === 'C' ? c : para === 'F' ? (c * 9) / 5 + 32 : c + 273.15;
  }
  const t = UNIDADES[categoria];
  return (v * t[de]) / t[para];
}
