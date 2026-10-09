// Liga os formulários às funções de cálculo. Sem dependências externas.
import * as C from './calc.js';
import { INDICADORES } from './tabelas.js';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const n2 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const n6 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 6 });
const pct = (x, d = 2) => `${(x * 100).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })}%`;
const R = (v) => brl.format(v || 0);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function tabela(linhas) {
  return `<table class="res"><tbody>${linhas
    .filter(Boolean)
    .map(([k, v, cls]) => `<tr${cls ? ` class="${cls}"` : ''}><th scope="row">${k}</th><td>${v}</td></tr>`)
    .join('')}</tbody></table>`;
}
const destaque = (rotulo, valor) => `<p class="destaque"><span>${rotulo}</span> <strong>${valor}</strong></p>`;
// Barra de composição (visual) com legenda em texto; partes: [rótulo, valor, classe de cor c1..c5]
function barra(partes) {
  const ok = partes.filter((p) => p && p[1] > 0);
  const total = ok.reduce((s, p) => s + p[1], 0);
  if (!total || ok.length < 2) return '';
  const pc = (v) => Math.round((v / total) * 1000) / 10;
  return `<div class="barra" aria-hidden="true">${ok.map(([, v, c]) => `<i class="${c}" style="flex:${pc(v)} 1 0"></i>`).join('')}</div><ul class="legenda">${ok.map(([r, v, c]) => `<li class="${c}">${r} ${pc(v).toLocaleString('pt-BR')}%</li>`).join('')}</ul>`;
}

function ler(form) {
  const d = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') d[el.name] = el.checked;
    else if (el.type === 'number') d[el.name] = el.value === '' ? 0 : Number(el.value);
    else d[el.name] = el.value;
  }
  return d;
}

const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

const CALCS = {
  'salario-liquido'(d) {
    const s = C.salarioLiquido({ bruto: d.bruto, dependentes: d.dependentes, pensao: d.pensao, outrosDescontos: d.outros, valeTransporte: d.vt });
    return destaque('Salário líquido estimado', R(s.liquido)) + barra([['Líquido', s.liquido, 'c1'], ['INSS', s.inss, 'c2'], ['IRRF', s.irrf, 'c5'], ['Outros', s.descontos - s.inss - s.irrf, 'c3']]) + tabela([
      ['Salário bruto', R(s.bruto)],
      ['INSS', `− ${R(s.inss)}`],
      ['IRRF', `− ${R(s.irrf)}`],
      s.vt ? ['Vale-transporte (6%)', `− ${R(s.vt)}`] : null,
      s.pensao ? ['Pensão alimentícia', `− ${R(s.pensao)}`] : null,
      s.outrosDescontos ? ['Outros descontos', `− ${R(s.outrosDescontos)}`] : null,
      ['Total de descontos', `− ${R(s.descontos)}`],
      ['Salário líquido', R(s.liquido), 'total'],
    ]) + `<p class="nota">IR calculado com ${s.ir.usaSimplificado ? 'desconto simplificado de R$ 607,20' : 'deduções legais'} (a opção mais vantajosa). Imposto pela tabela: ${R(s.ir.impostoTabela)}; redução da Lei 15.270/2025: ${R(s.ir.reducao)}.</p>`;
  },
  rescisao(d) {
    const r = C.rescisao({ salario: d.salario, admissao: d.admissao, desligamento: d.desligamento, tipo: d.tipo, aviso: d.aviso, feriasVencidas: d.feriasVencidas, saldoFgts: d.saldoFgts, dependentes: d.dependentes });
    if (!r) return '<p class="erro">Confira as datas: o desligamento deve ser depois da admissão.</p>';
    return destaque('Valor líquido estimado da rescisão', R(r.liquido)) + tabela([
      [`Saldo de salário (${r.diasNoMes} dias)`, R(r.saldoSalario)],
      r.avisoIndenizado ? [`Aviso prévio indenizado (${r.diasProjecao} dias)`, R(r.avisoIndenizado)] : null,
      [`13º proporcional (${r.avos13}/12)`, R(r.decimo)],
      [`Férias proporcionais (${r.avosFerias}/12)`, R(r.feriasProp)],
      r.feriasVenc ? ['Férias vencidas', R(r.feriasVenc)] : null,
      ['1/3 constitucional sobre férias', R(r.tercoFerias)],
      ['Total bruto das verbas', R(r.verbas), 'sub'],
      ['INSS sobre saldo de salário', `− ${R(r.inssSaldo)}`],
      r.irSaldo ? ['IRRF sobre saldo de salário', `− ${R(r.irSaldo)}`] : null,
      ['INSS sobre 13º', `− ${R(r.inss13)}`],
      r.ir13 ? ['IRRF sobre 13º', `− ${R(r.ir13)}`] : null,
      r.descontoAviso ? ['Desconto do aviso prévio não cumprido', `− ${R(r.descontoAviso)}`] : null,
      ['Líquido a receber na rescisão', R(r.liquido), 'total'],
      r.multaFgts ? [`Multa do FGTS (depositada na conta do FGTS)`, R(r.multaFgts)] : null,
      r.saqueFgts ? ['Saque do saldo do FGTS', R(r.saqueFgts)] : null,
    ]) + `<p class="nota">Aviso prévio de ${r.diasAviso} dias pela Lei 12.506/2011.${r.diasProjecao ? ` A projeção do aviso leva o contrato até ${r.fimProjetado.split('-').reverse().join('/')} para contar 13º e férias.` : ''}</p>`;
  },
  'decimo-terceiro'(d) {
    const r = C.decimoTerceiro({ salario: d.salario, meses: d.meses, mediaVariaveis: d.media, dependentes: d.dependentes });
    return destaque('13º líquido total', R(r.liquidoTotal)) + barra([['Líquido', r.liquidoTotal, 'c1'], ['INSS', r.inss, 'c2'], ['IRRF', r.irrf, 'c5']]) + tabela([
      [`13º bruto (${r.meses}/12)`, R(r.bruto)],
      ['1ª parcela (até 30/11, sem descontos)', R(r.primeira), 'sub'],
      ['INSS (descontado na 2ª parcela)', `− ${R(r.inss)}`],
      ['IRRF (descontado na 2ª parcela)', `− ${R(r.irrf)}`],
      ['2ª parcela (até 20/12)', R(r.segunda), 'sub'],
      ['Total líquido', R(r.liquidoTotal), 'total'],
    ]);
  },
  ferias(d) {
    const r = C.ferias({ salario: d.salario, mediaVariaveis: d.media, dias: d.dias, venderDias: d.vender, dependentes: d.dependentes });
    return destaque('Férias líquidas estimadas', R(r.liquido)) + barra([['Líquido', r.liquido, 'c1'], ['INSS', r.inss, 'c2'], ['IRRF', r.irrf, 'c5']]) + tabela([
      [`Férias (${r.diasGozo} dias)`, R(r.valorFerias)],
      ['1/3 constitucional', R(r.terco)],
      r.diasAbono ? [`Abono pecuniário (${r.diasAbono} dias vendidos)`, R(r.abono)] : null,
      r.diasAbono ? ['1/3 sobre o abono', R(r.tercoAbono)] : null,
      ['Total bruto', R(r.bruto), 'sub'],
      ['INSS', `− ${R(r.inss)}`],
      ['IRRF', `− ${R(r.irrf)}`],
      ['Valor líquido', R(r.liquido), 'total'],
    ]) + (r.diasAbono ? '<p class="nota">O abono pecuniário e seu 1/3 não sofrem desconto de INSS nem de IR.</p>' : '');
  },
  fgts(d) {
    const r = C.fgts({ salario: d.salario, meses: d.meses, saldoAtual: d.saldo, aprendiz: d.aprendiz, comRendimento: d.rendimento, tipo: d.tipo });
    return destaque('Saldo estimado do FGTS', R(r.saldo)) + tabela([
      ['Depósito mensal do empregador', R(r.deposito)],
      ['Total depositado no período', R(r.depositado)],
      d.rendimento ? ['Rendimento estimado (3% a.a.)', R(r.rendimento)] : null,
      ['Saldo estimado', R(r.saldo), 'sub'],
      r.multa ? [`Multa rescisória (${pct(r.multaPct, 0)})`, R(r.multa)] : null,
      ['Valor que pode ser sacado na saída', R(r.saque), 'total'],
    ]);
  },
  inss(d) {
    if (d.categoria === 'empregado') {
      const r = C.inssEmpregado(d.salario);
      return destaque('Contribuição ao INSS', R(r.inss)) + tabela([
        ...r.faixas.map((f) => [`${R(f.de)} a ${R(f.ate)} × ${pct(f.aliquota, 1)}`, R(f.valor)]),
        ['Total', R(r.inss), 'total'],
        ['Alíquota efetiva', pct(r.aliquotaEfetiva)],
      ]);
    }
    const r = C.inssIndividual(d.salario, d.categoria);
    return destaque('Contribuição mensal (GPS/DAS)', R(r.inss)) + tabela([
      ['Salário de contribuição', R(r.base)],
      ['Alíquota', pct(r.aliquota, 0)],
      ['Contribuição', R(r.inss), 'total'],
    ]);
  },
  'imposto-de-renda'(d) {
    const r = C.irrfMensal({ rendimentos: d.rendimentos, inss: d.inss, dependentes: d.dependentes, pensao: d.pensao, outrasDeducoes: d.outras });
    return destaque('IR retido na fonte', R(r.irrf)) + tabela([
      ['Rendimentos tributáveis', R(d.rendimentos)],
      [r.usaSimplificado ? 'Desconto simplificado' : 'Deduções legais', `− ${R(r.deducoes)}`],
      ['Base de cálculo', R(r.base), 'sub'],
      ['Alíquota da faixa', pct(r.aliquotaNominal, 1)],
      ['Imposto pela tabela progressiva', R(r.impostoTabela)],
      ['Redução (Lei 15.270/2025)', `− ${R(r.reducao)}`],
      ['IRRF devido', R(r.irrf), 'total'],
      ['Alíquota efetiva', pct(r.aliquotaEfetiva)],
    ]);
  },
  'horas-extras'(d) {
    const r = C.horasExtras({ salario: d.salario, jornadaMensal: d.jornada, horas50: d.h50, horas100: d.h100, diasUteis: d.diasUteis, domingosFeriados: d.domingos });
    return destaque('Total de horas extras + DSR', R(r.total)) + tabela([
      ['Valor da hora normal', R(r.valorHora)],
      [`Horas a 50% (${n2.format(d.h50 || 0)} h)`, R(r.he50)],
      [`Horas a 100% (${n2.format(d.h100 || 0)} h)`, R(r.he100)],
      ['Subtotal de horas extras', R(r.totalHE), 'sub'],
      ['Reflexo no DSR', R(r.dsr)],
      ['Total bruto', R(r.total), 'total'],
    ]);
  },
  'seguro-desemprego'(d) {
    const r = C.seguroDesemprego({ salarios: [d.s1, d.s2, d.s3], solicitacao: d.solicitacao, mesesTrabalhados: d.meses });
    if (!r.temDireito) return `<p class="erro">Pelas regras informadas, ainda não há direito: na ${d.solicitacao}ª solicitação são exigidos ao menos ${r.carenciaMinima} meses trabalhados.</p>` + tabela([['Média salarial', R(r.media)], ['Valor que seria pago por parcela', R(r.parcela)]]);
    return destaque(`${r.parcelas} parcelas de`, R(r.parcela)) + tabela([
      ['Média dos últimos 3 salários', R(r.media)],
      ['Valor de cada parcela', R(r.parcela)],
      ['Número de parcelas', String(r.parcelas)],
      ['Total estimado', R(r.total), 'total'],
    ]);
  },
  'juros-compostos'(d) {
    const r = C.jurosCompostos({ inicial: d.inicial, aporte: d.aporte, taxa: d.taxa, periodo: d.periodo, meses: d.meses });
    return destaque('Valor final', R(r.total)) + barra([['Investido', r.investido, 'c4'], ['Juros', r.juros, 'c1']]) + tabela([
      ['Total investido', R(r.investido)],
      ['Juros ganhos', R(r.juros)],
      ['Taxa mensal equivalente', pct(r.taxaMensal, 4)],
      ['Valor final', R(r.total), 'total'],
    ]) + (r.evolucao.length > 1 ? `<details><summary>Evolução ano a ano</summary><table class="grade"><thead><tr><th>Mês</th><th>Investido</th><th>Saldo</th></tr></thead><tbody>${r.evolucao.map((e) => `<tr><td>${e.mes}</td><td>${R(e.investido)}</td><td>${R(e.saldo)}</td></tr>`).join('')}</tbody></table></details>` : '');
  },
  financiamento(d) {
    const r = C.financiamento({ valor: d.valor, taxa: d.taxa, periodo: d.periodo, meses: d.meses, sistema: d.sistema });
    const outro = C.financiamento({ valor: d.valor, taxa: d.taxa, periodo: d.periodo, meses: d.meses, sistema: d.sistema === 'price' ? 'sac' : 'price' });
    const nome = d.sistema === 'price' ? 'Price' : 'SAC';
    const nomeOutro = d.sistema === 'price' ? 'SAC' : 'Price';
    return destaque(`Primeira parcela (${nome})`, R(r.primeira)) + barra([['Valor financiado', r.totalPago - r.totalJuros, 'c4'], ['Juros', r.totalJuros, 'c2']]) + tabela([
      ['Última parcela', R(r.ultima)],
      ['Total de juros', R(r.totalJuros)],
      ['Total pago', R(r.totalPago), 'total'],
      ['Taxa mensal equivalente', pct(r.taxaMensal, 4)],
      [`Comparação: total de juros no ${nomeOutro}`, R(outro.totalJuros)],
    ]) + `<details><summary>Tabela de amortização (${r.linhas.length} parcelas)</summary><div class="rolagem"><table class="grade"><thead><tr><th>Nº</th><th>Parcela</th><th>Juros</th><th>Amortização</th><th>Saldo</th></tr></thead><tbody>${r.linhas.map((l) => `<tr><td>${l.n}</td><td>${R(l.parcela)}</td><td>${R(l.juros)}</td><td>${R(l.amortizacao)}</td><td>${R(l.saldo)}</td></tr>`).join('')}</tbody></table></div></details><p class="nota">Não inclui seguros (MIP/DFI), tarifas, IOF nem correção pela TR, que entram no CET do banco.</p>`;
  },
  investimentos(d) {
    const r = C.investimentos({ valor: d.valor, dias: d.dias, cdi: d.cdi, pctCdb: d.pctCdb, pctLci: d.pctLci, selic: d.selic, trMensal: d.tr });
    const melhor = [...r.resultados].sort((a, b) => b.final - a.final)[0];
    return destaque('Melhor resultado líquido', `${esc(melhor.nome)}: ${R(melhor.final)}`) + `<div class="rolagem"><table class="grade"><thead><tr><th>Aplicação</th><th>Rendimento bruto</th><th>IR</th><th>Valor final líquido</th><th>Rentab. líquida</th></tr></thead><tbody>${r.resultados.map((x) => `<tr><td>${esc(x.nome)}</td><td>${R(x.rendimentoBruto)}</td><td>${R(x.ir)}</td><td>${R(x.final)}</td><td>${pct(x.rentabilidadeLiquida)}</td></tr>`).join('')}</tbody></table></div><p class="nota">Alíquota de IR para ${d.dias} dias: ${pct(r.aliquotaIr, 1)}. Não considera IOF (resgates em menos de 30 dias) nem a taxa de custódia da B3.</p>`;
  },
  porcentagem(d) {
    const P = C.porcentagem;
    const f = (x) => (Number.isFinite(x) ? n6.format(x) : '—');
    return tabela([
      [`${f(d.p1)}% de ${f(d.v1)}`, f(P.deValor(d.p1, d.v1)), 'total'],
      [`${f(d.x2)} é quantos % de ${f(d.v2)}`, `${f(P.quantoPorcento(d.x2, d.v2))}%`, 'total'],
      [`Variação de ${f(d.a3)} para ${f(d.b3)}`, `${f(P.variacao(d.a3, d.b3))}%`, 'total'],
      [`${f(d.v4)} com aumento de ${f(d.p4)}%`, f(P.aumento(d.v4, d.p4)), 'total'],
      [`${f(d.v4)} com desconto de ${f(d.p4)}%`, f(P.desconto(d.v4, d.p4)), 'total'],
    ]);
  },
  'regra-de-tres'(d) {
    const x = C.regraDeTres({ a: d.a, b: d.b, c: d.c, inversa: d.tipo === 'inversa' });
    return destaque('Valor de X', Number.isFinite(x) ? n6.format(x) : '—') + `<p class="nota">${d.tipo === 'inversa' ? `Inversa: X = (${n6.format(d.a)} × ${n6.format(d.b)}) ÷ ${n6.format(d.c)}` : `Direta: X = (${n6.format(d.b)} × ${n6.format(d.c)}) ÷ ${n6.format(d.a)}`}</p>`;
  },
  imc(d) {
    const r = C.imc({ peso: d.peso, altura: d.altura });
    if (!r) return '<p class="erro">Informe peso e altura válidos.</p>';
    return destaque('Seu IMC', `${n2.format(r.imc)} — ${r.classe}`) + tabela([
      ['Faixa de peso considerada normal para sua altura', `${n2.format(r.pesoMin)} kg a ${n2.format(r.pesoMax)} kg`],
    ]);
  },
  'das-mei'(d) {
    const r = C.dasMei({ atividade: d.atividade, caminhoneiro: d.caminhoneiro, faturamentoAnual: d.faturamento, mesesAtivos: d.meses });
    const sit = { dentro: 'Dentro do limite do MEI.', excessoAte20: 'Excedeu o limite em até 20%: continua MEI até o fim do ano, mas paga DAS complementar sobre o excesso e passa a ME no ano seguinte.', excessoAcima20: 'Excedeu o limite em mais de 20%: o desenquadramento é retroativo a janeiro (ou à abertura). Procure um contador.' }[r.situacao];
    return destaque('DAS mensal', R(r.mensal)) + tabela([
      ['INSS (previdência)', R(r.inss)],
      r.icms ? ['ICMS', R(r.icms)] : null,
      r.iss ? ['ISS', R(r.iss)] : null,
      [`Total no ano (${d.meses} meses)`, R(r.anual), 'total'],
      ['Limite de faturamento proporcional', R(r.limite)],
      d.faturamento ? ['Situação do faturamento informado', sit] : null,
    ]);
  },
  'adicional-noturno'(d) {
    const r = C.adicionalNoturno({ salario: d.salario, jornadaMensal: d.jornada, horas: d.horas, tipo: d.tipo, percentual: d.percentual, diasUteis: d.diasUteis, domingosFeriados: d.domingos });
    return destaque('Adicional noturno + DSR', R(r.total)) + tabela([
      ['Valor da hora normal', R(r.valorHora)],
      ['Valor da hora noturna (com adicional)', R(r.valorHoraNoturna)],
      [`Horas trabalhadas no relógio`, `${n2.format(r.horasRelogio)} h`],
      [d.tipo === 'rural' ? 'Horas consideradas (rural, sem hora reduzida)' : 'Horas noturnas consideradas (hora de 52min30s)', `${n2.format(r.horasConsideradas)} h`],
      [`Adicional noturno (${pct(r.pct, 0)})`, R(r.adicional), 'sub'],
      ['Reflexo no DSR', R(r.dsr)],
      ['Total bruto a mais no mês', R(r.total), 'total'],
    ]);
  },
  'aviso-previo'(d) {
    const r = C.avisoPrevio({ salario: d.salario, admissao: d.admissao, desligamento: d.desligamento, tipo: d.tipo });
    if (!r) return '<p class="erro">Confira as datas: o desligamento deve ser depois da admissão.</p>';
    const fimBR = r.fimProjetado.split('-').reverse().join('/');
    return destaque('Aviso prévio', `${r.dias} dias`) + tabela([
      ['Anos completos de empresa', String(r.anos)],
      ['Aviso pela Lei 12.506/2011 (30 + 3 por ano)', `${r.diasLei} dias`],
      d.tipo === 'pedidoDemissao' ? ['No pedido de demissão (sem proporcional)', '30 dias'] : null,
      d.tipo === 'acordo' ? ['No acordo (art. 484-A da CLT)', 'metade'] : null,
      ['Valor de um dia de salário', R(r.diaria)],
      [d.tipo === 'pedidoDemissao' ? 'Valor do aviso (desconto se não for cumprido)' : 'Valor do aviso indenizado', R(r.valor), 'total'],
      d.tipo !== 'pedidoDemissao' ? ['Data final com a projeção do aviso', fimBR] : null,
    ]);
  },
  'custo-funcionario'(d) {
    const r = C.custoFuncionario({ salario: d.salario, regime: d.regime, rat: d.rat, terceiros: d.terceiros, beneficios: d.beneficios, valeTransporte: d.vt, provisionarMulta: d.multa });
    return destaque('Custo médio mensal para a empresa', R(r.mensal)) + barra([['Salários', r.salarios, 'c1'], ['13º e férias', r.decimo + r.terco, 'c4'], ['FGTS e INSS', r.fgts + (r.multa || 0) + r.inssPatronal, 'c2'], ['Benefícios', (r.vtEmpresa || 0) + (r.beneficios || 0), 'c3']]) + tabela([
      ['12 salários (um deles pago como férias)', R(r.salarios)],
      ['13º salário', R(r.decimo)],
      ['1/3 constitucional de férias', R(r.terco)],
      ['FGTS (8%)', R(r.fgts)],
      r.multa ? ['Provisão da multa de 40% do FGTS', R(r.multa)] : null,
      [r.aliqPatronal ? `INSS patronal e outras contribuições (${pct(r.aliqPatronal, 1)})` : 'INSS patronal (já incluído no DAS)', R(r.inssPatronal)],
      r.vtEmpresa ? ['Vale-transporte pago pela empresa (11 meses)', R(r.vtEmpresa)] : null,
      r.beneficios ? ['Benefícios (12 meses)', R(r.beneficios)] : null,
      ['Custo anual total', R(r.anual), 'total'],
      ['Custo médio por mês (÷ 12)', R(r.mensal), 'sub'],
      ['Custo por mês efetivamente trabalhado (÷ 11)', R(r.porMesTrabalhado)],
      ['Custo em relação ao salário', `${n2.format(r.fator)} vezes`],
    ]);
  },
  markup(d) {
    const r = C.markup({ custo: d.custo, despesasFixas: d.fixas, impostos: d.impostos, taxas: d.taxas, lucro: d.lucro });
    if (!r) return '<p class="erro">A soma dos percentuais precisa ser menor que 100%. Reduza as despesas ou a margem de lucro.</p>';
    return destaque('Preço de venda sugerido', R(r.preco)) + tabela([
      ['Índice de markup (multiplicador)', n2.format(Math.round(r.indice * 10000) / 10000)],
      ['Markup sobre o custo', pct(r.markupPct, 1)],
      ['Custo do produto ou serviço', R(d.custo)],
      ['Despesas fixas', R(r.vFixas)],
      ['Impostos sobre a venda', R(r.vImpostos)],
      ['Taxas e comissões', R(r.vTaxas)],
      ['Lucro líquido por unidade', R(r.vLucro), 'sub'],
      ['Preço de venda', R(r.preco), 'total'],
    ]);
  },
  'parcelado-ou-a-vista'(d) {
    const r = C.parceladoOuVista({ vista: d.vista, parcelas: d.parcelas, valorParcela: d.parcela, comEntrada: d.entrada, rendimentoAnual: d.rendimento });
    const msg = { vista: 'Pagar à vista sai mais barato', parcelado: 'Parcelar e deixar o dinheiro rendendo sai mais barato', empate: 'Tanto faz: os dois caminhos custam o mesmo' }[r.melhor];
    return destaque('Melhor opção', msg) + tabela([
      ['Total parcelado', R(r.total)],
      ['Desconto à vista em relação ao total', pct(r.descontoVista, 1)],
      ['Juros embutidos (ao mês)', pct(r.taxaImplicita)],
      ['Juros embutidos (ao ano)', pct(r.taxaImplicitaAnual)],
      ['Rendimento do seu dinheiro (ao mês)', pct(r.rendimentoMensal)],
      ['Valor das parcelas trazido a hoje', R(r.vp), 'sub'],
      [r.vantagem >= 0 ? 'Economia ao parcelar' : 'Economia ao pagar à vista', R(Math.abs(r.vantagem)), 'total'],
    ]) + '<p class="nota">O rendimento é bruto, sem imposto de renda. Se o dinheiro não fosse ficar aplicado, compare só os juros embutidos: qualquer taxa acima de zero significa que à vista é mais barato.</p>';
  },
  'conversor-de-medidas'(d) {
    const v = C.converter(d.valor, d.categoria, d.de, d.para);
    return destaque('Resultado', Number.isFinite(v) ? `${n6.format(v)} ${esc(d.para)}` : '—');
  },
  idade(d) {
    const r = C.idade(d.nascimento, d.referencia || hoje());
    if (!r) return '<p class="erro">A data de referência precisa ser posterior ao nascimento.</p>';
    return destaque('Idade', `${r.anos} anos, ${r.meses} meses e ${r.dias} dias`) + tabela([
      ['Total em meses', n2.format(r.totalMeses)],
      ['Total em dias', n2.format(r.totalDias)],
      ['Total em semanas', n2.format(Math.floor(r.totalDias / 7))],
      ['Dias até o próximo aniversário', r.diasProximoAniversario === 0 ? 'É hoje! 🎉' : n2.format(r.diasProximoAniversario)],
    ]);
  },
};

// Conversor: troca as unidades conforme a categoria
const OPCOES_TEMP = { C: 'Celsius (°C)', F: 'Fahrenheit (°F)', K: 'Kelvin (K)' };
function popularUnidades(form) {
  const cat = form.elements.categoria.value;
  const lista = cat === 'temperatura' ? Object.keys(OPCOES_TEMP) : Object.keys(C.UNIDADES[cat]);
  for (const nome of ['de', 'para']) {
    const sel = form.elements[nome];
    const atual = sel.value || sel.dataset.padrao;
    sel.innerHTML = lista.map((u) => `<option value="${u}">${cat === 'temperatura' ? OPCOES_TEMP[u] : u}</option>`).join('');
    if (lista.includes(atual)) sel.value = atual;
  }
  if (form.elements.de.value === form.elements.para.value && lista.length > 1) form.elements.para.value = lista[1];
}

function iniciar() {
  const form = document.querySelector('form[data-calc]');
  if (!form) return;
  const id = form.dataset.calc;
  const out = document.getElementById('resultado');
  const fn = CALCS[id];
  // valores padrão dinâmicos
  for (const el of form.querySelectorAll('[data-hoje]')) if (!el.value) el.value = hoje();
  for (const el of form.querySelectorAll('[data-indicador]')) if (el.value === '') el.value = INDICADORES[el.dataset.indicador];
  if (id === 'conversor-de-medidas') {
    popularUnidades(form);
    form.elements.categoria.addEventListener('change', () => popularUnidades(form));
  }
  const rodar = () => {
    try {
      out.innerHTML = fn(ler(form));
    } catch (e) {
      out.innerHTML = '<p class="erro">Não foi possível calcular. Confira os valores informados.</p>';
      console.error(e);
    }
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); rodar(); out.focus(); });
  let t;
  form.addEventListener('input', () => { clearTimeout(t); t = setTimeout(rodar, 250); });
  rodar();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();
