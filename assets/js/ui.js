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

// Assinatura do resultado (molde "ferramenta gratuita com a marca no resultado") + botão de imprimir/salvar PDF.
const dataBR = () => new Date().toLocaleDateString('pt-BR');
const marcaResultado = () => `<div class="marca-res"><p>Simulação feita no <strong>Conta Certa</strong> (contacertabr.com.br) em ${dataBR()}. Estimativa com as premissas acima; não é cálculo oficial nem parecer tributário.</p><button type="button" class="imprimir" data-imprimir>Imprimir ou salvar em PDF</button></div>`;
document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-imprimir]')) window.print(); });

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
  'transicao-cbs-ibs'(d) {
    const issSobreCbsIbs = d.issbase !== 'nao';
    const r = C.transicaoCbsIbs({ precoAtual: d.preco, pisCofinsPct: d.piscofins, issPct: d.iss, cbsRefPct: d.cbs, ibsRefPct: d.ibs, dasPct: d.das, issSobreCbsIbs });
    if (!r) return '<p class="erro">Informe um preço maior que zero.</p>';
    const final = r.anos[r.anos.length - 1];
    const linhas = r.anos.map((a) => `<tr><th scope="row">${a.ano}</th><td>${a.fase}</td><td>${pct(a.antigos)}</td><td>${pct(a.novos)}${a.ano === 2026 ? '*' : ''}${a.ano >= 2029 && a.ano <= 2032 ? '**' : ''}</td><td>${R(a.totalCliente)}</td><td>${pct(a.carga)}</td></tr>`).join('');
    return destaque('Carga sobre a venda em 2033 (estimativa)', `${pct(final.carga)} (hoje ${pct(r.cargaHoje)})`)
      + `<div class="tabela-rolar"><table class="res"><thead><tr><th scope="col">Ano</th><th scope="col">Fase</th><th scope="col">PIS/Cofins + ISS</th><th scope="col">CBS + IBS</th><th scope="col">Cliente paga</th><th scope="col">Carga</th></tr></thead><tbody>${linhas}</tbody></table></div>`
      + `<p class="nota">Valor que fica com a empresa em todos os anos: ${R(r.liquido)}, que também é a base de CBS/IBS (sem ISS, PIS e Cofins: LC 214/2025, art. 12, § 2º, V). ISS ${issSobreCbsIbs ? 'calculado também sobre a CBS/IBS (cenário conservador)' : 'calculado sem a CBS/IBS na base'}: o tema ainda não está definido em lei. Por padrão, o ISS é calculado por dentro, sobre o total: cliente paga = (base + CBS + IBS) ÷ (1 − ISS do ano). É uma interpretação; a alternativa está no campo “ISS sobre a CBS/IBS?”. *2026: CBS 0,9% e IBS 0,1% de teste, destacados mas compensáveis ou dispensados para quem cumpre as obrigações acessórias, sem custo adicional; não se aplicam ao Simples Nacional. **2029-2032: IBS aproximado como (1 − fração do ISS/ICMS restante) × alíquota final estimada; as alíquotas de referência de cada ano serão fixadas pelo Senado (LC 214/2025, arts. 361 a 364).${r.simples ? ` No Simples, com DAS de ${pct(r.simples.carga)}, a carga segue a alíquota do DAS informada (${R(r.simples.tributos)} nesta venda), salvo opção pelo regime regular; as tabelas do Simples mudam a partir de 2027 (LC 214/2025, art. 519).` : ''} Alíquotas de referência são estimativas editáveis: CBS ${n2.format(d.cbs)}% e IBS ${n2.format(d.ibs)}% nesta simulação.</p>` + marcaResultado();
  },
  'simples-hibrido'(d) {
    const pctB2B = d.perfil === 'b2b' ? 100 : d.perfil === 'b2c' ? 0 : d.b2b;
    const dasSobreValorSemCbsIbs = d.basedas === 'valor';
    const repasseB2B = d.precohib === 'repasse';
    const base = { receitaMensal: d.receita, pctB2B, margemPct: d.margem, dasPct: d.das, parcelaCbsIbsDasPct: d.parcela, cbsPct: d.cbs, ibsPct: d.ibs, comprasComCredito: d.compras, dasSobreValorSemCbsIbs };
    const r = C.simplesHibridoOuPuro({ ...base, repasseB2B });
    if (!r) return '<p class="erro">Informe o faturamento mensal e a alíquota efetiva do DAS.</p>';
    const outro = C.simplesHibridoOuPuro({ ...base, repasseB2B: !repasseB2B });
    const [mant, rep] = repasseB2B ? [outro, r] : [r, outro];
    const posPrazo = hoje() > '2026-10-30';
    const sinal = (v) => `${v >= 0 ? '+ ' : '− '}${R(Math.abs(v))}`;
    const cen = repasseB2B ? 'com a CBS/IBS repassada ao B2B' : 'cobrando o mesmo valor total';
    const rec = {
      hibrido: ['Nesta simulação, o híbrido tende a render mais', `Nas premissas desta simulação (alíquotas de 2027-2028), ${cen}, o seu lucro estimado fica ${R(r.diferencaLucro)}/mês maior no híbrido, e o custo efetivo dos clientes B2B do regime regular muda em ${sinal(-r.ganhoClientes)}/mês. É uma estimativa: confirme com o seu contador antes de optar.`],
      'hibrido-negociar': ['Nesta simulação, o híbrido só compensa se houver negociação de preço', `Mantendo o mesmo valor total, o seu lucro estimado cai ${R(-r.diferencaLucro)}/mês. Em compensação, o custo efetivo dos clientes B2B do regime regular pode cair até ${R(r.ganhoClientes)}/mês, se eles tiverem débitos para usar o crédito. Essa diferença pode abrir espaço para negociar preço com esses clientes, o que depende de acordo com cada um e do que prevê o contrato; sem negociação, o puro rende mais nesta simulação.`],
      puro: ['Nesta simulação, o puro tende a ser melhor', `Nesta simulação (alíquotas de 2027-2028), ${cen}, no híbrido o seu lucro estimado cairia ${R(-r.diferencaLucro)}/mês${r.ganhoClientes > 0 ? `, mais do que a redução de custo que os clientes B2B teriam (${R(r.ganhoClientes)}/mês)` : ''}. Reavalie a cada janela semestral.`],
    }[r.recomendacao];
    const comp = `<div class="tabela-rolar"><table class="res comp"><thead><tr><td></td><th scope="col">Simples puro</th><th scope="col">Simples híbrido</th></tr></thead><tbody>
<tr><th scope="row">Valor total cobrado dos clientes</th><td>${R(d.receita)}</td><td>${R(r.hibrido.recebido)}</td></tr>
<tr><th scope="row">DAS</th><td>${R(r.puro.imposto)}</td><td>${R(r.hibrido.das)}</td></tr>
<tr><th scope="row">CBS + IBS por fora (débito − crédito das compras)</th><td>—</td><td>${R(r.hibrido.cbsIbsAPagar)}</td></tr>
<tr><th scope="row">Tributos da empresa</th><td>${R(r.puro.imposto)}</td><td>${R(r.hibrido.imposto)}</td></tr>
<tr class="total"><th scope="row">Lucro estimado</th><td>${R(r.puro.lucro)} (${pct(r.puro.margem, 1)})</td><td>${R(r.hibrido.lucro)} (${pct(r.hibrido.margem, 1)})</td></tr>
<tr><th scope="row">Crédito de CBS/IBS para clientes B2B</th><td>${R(r.puro.creditoClientes)}</td><td>${R(r.hibrido.creditoClientes)}</td></tr>
</tbody></table></div>`;
    const lado = `<div class="tabela-rolar"><table class="res comp"><caption>Híbrido nos dois cenários de preço</caption><thead><tr><td></td><th scope="col">Preço mantido</th><th scope="col">CBS/IBS repassado ao B2B</th></tr></thead><tbody>
<tr><th scope="row">Lucro estimado no híbrido</th><td>${R(mant.hibrido.lucro)}</td><td>${R(rep.hibrido.lucro)}</td></tr>
<tr><th scope="row">Diferença para o puro</th><td>${sinal(mant.diferencaLucro)}</td><td>${sinal(rep.diferencaLucro)}</td></tr>
<tr><th scope="row">Crédito dos clientes B2B</th><td>${R(mant.hibrido.creditoClientes)}</td><td>${R(rep.hibrido.creditoClientes)}</td></tr>
</tbody></table></div>`;
    const prazo = posPrazo ? 'Próxima janela de opção: 1º a 31/03/2027, para valer de julho a dezembro de 2027.' : 'Prazo da opção para jan-jun/2027: 30/10/2026.';
    return `<div class="recomenda rec-${r.recomendacao}"><p class="rec-rot">Indicação da simulação</p><p class="rec-tit">${rec[0]}</p><p>${rec[1]}</p></div>`
      + destaque('Diferença de lucro (híbrido − puro)', `${sinal(r.diferencaLucro)}/mês`) + comp + lado
      + `<p class="nota">Dados e premissas: faturamento de ${R(d.receita)}; margem de ${n2.format(d.margem)}%; DAS de ${n2.format(d.das)}%, com ${n2.format(d.parcela)}% de CBS/IBS na partilha; compras com crédito de ${R(d.compras)}; ${pctB2B}% das vendas para empresas do regime regular. Preço no híbrido: ${repasseB2B ? 'CBS/IBS repassados ao B2B, valor total mantido para o B2C' : 'mesmo valor total cobrado nas duas opções'}; CBS + IBS de ${pct(r.aliquota)} por fora (valor da operação ${R(r.hibrido.valorOperacao)}); DAS do híbrido calculado sobre ${dasSobreValorSemCbsIbs ? 'o valor sem CBS/IBS' : 'a receita total'} (ponto ainda não definido pela lei), sem a parcela de CBS/IBS; custos iguais (faturamento × (1 − margem)). Simulação para 2027-2028; a CBS de 2027 é estimativa até a fixação oficial. Crédito do cliente condicionado às regras gerais (LC 214/2025, arts. 47 e 48). Custos tratados como valores brutos: as compras com crédito já estão dentro dos custos, com o tributo que gera o crédito incluído. Saldo credor das compras não aproveitado aqui (pode subestimar o híbrido). ${prazo}</p>`
      + marcaResultado();
  },
  'preco-reforma-tributaria'(d) {
    const issPorDentro = d.issmodo !== 'fora';
    const r = C.precoReforma({ precoAtual: d.preco, tributosAtuaisPct: d.atuais, issPct: d.iss, ano: Number(d.ano), cbsPct: d.cbs, ibsPct: d.ibs, issPorDentro });
    if (!r) return '<p class="erro">Confira o preço e os percentuais (precisam ser menores que 100%).</p>';
    return destaque('Total da nota para manter a margem', R(r.total)) + tabela([
      ['Receita líquida de hoje (mantida) = base de CBS/IBS', R(r.base)],
      ['CBS', `+ ${R(r.cbs)}`],
      ['IBS', `+ ${R(r.ibs)}`],
      [`ISS/ICMS do ano (${pct(r.issAno, 2)}${issPorDentro ? ', por dentro do total' : ', por fora'})`, `+ ${R(r.iss)}`],
      ['Total cobrado do cliente', R(r.total), 'total'],
      ['Variação do total da nota', pct(r.variacaoTotal, 1)],
      ['Custo efetivo para cliente com direito a crédito (total − CBS − IBS)', R(r.custoClienteComCredito), 'sub'],
      ['Variação para esse cliente', pct(r.variacaoComCredito, 1)],
    ]) + `<p class="nota">A base da CBS e do IBS nunca inclui o ISS/ICMS (ADCT, art. 133; LC 214/2025, art. 12, § 2º, V). ISS/ICMS do ano = alíquota informada × ${n2.format(r.fatorIss)} (ADCT, art. 128). ${issPorDentro ? 'Padrão: ISS calculado por dentro, sobre o total, inclusive a CBS/IBS: total = (base + CBS + IBS) ÷ (1 − ISS do ano). É uma interpretação: a lei ainda não diz se a CBS/IBS integra a base do ISS (PLP 16/2025); a alternativa com ISS por fora está no formulário.' : 'Alternativa: ISS por fora, sobre a base: total = base × (1 + CBS + IBS + ISS do ano). O padrão (ISS por dentro, sobre o total) é a outra interpretação possível.'} Alíquotas de CBS e IBS são estimativas editáveis.</p>`;
  },
  'credito-travado'(d) {
    const r = C.creditoTravado({ comprasMensais: d.compras, cbsPct: d.cbs, ibsPct: d.ibs, pctInadimplente: d.inad, diasAtraso: d.dias, custoDinheiroMes: d.custo });
    if (!r) return '<p class="erro">Informe o valor das compras do mês.</p>';
    return destaque('Crédito travado por mês (estimativa)', R(r.travado)) + tabela([
      ['Crédito de CBS/IBS nas compras do mês', R(r.credito)],
      ['Crédito que depende de fornecedor com débito em aberto', R(r.travado)],
      ['Em 12 meses', R(r.travadoAno), 'sub'],
      ['Custo financeiro da espera (mês)', R(r.custoFinanceiroMes)],
      ['Custo financeiro em 12 meses', R(r.custoFinanceiroAno), 'total'],
    ]);
  },
  'calendario-reforma-tributaria'(d) {
    const r = C.calendarioReforma(d.data);
    if (!r) return '<p class="erro">Informe uma data válida.</p>';
    const fmt = (iso) => iso.split('-').reverse().join('/');
    const prox = r.proximo ? `${fmt(r.proximo.data)} (em ${r.proximo.dias} dias)` : 'todos os marcos já passaram';
    return destaque('Próximo marco', prox) + `<p class="nota">Fase na data informada: <strong>${esc(r.fase)}</strong>.</p><div class="tabela-rolar"><table class="res"><thead><tr><th scope="col">Data</th><th scope="col">O que acontece</th><th scope="col">Situação</th></tr></thead><tbody>${r.marcos.map((m) => `<tr><th scope="row">${fmt(m.data)}</th><td>${esc(m.t)}</td><td>${m.passou ? 'Já passou' : `Faltam ${m.dias} dias`}</td></tr>`).join('')}</tbody></table></div>`;
  },
  'nr1-riscos-psicossociais'(d) {
    const r = C.nr1Checklist(d);
    const msg = { avancado: 'Gestão avançada: mantenha as evidências', parcial: 'Gestão parcial: há lacunas a fechar', inicial: 'Gestão inicial: priorize inventário e plano de ação' }[r.nivel];
    return destaque(`${r.pontos} de ${r.total} itens atendidos`, msg) + barra([['Atendidos', r.pontos, 'c1'], ['Pendentes', r.total - r.pontos, 'c5']])
      + (r.pendentes.length ? `<p class="nota"><strong>O que falta:</strong></p><ul>${r.pendentes.map((p) => `<li>${esc(p.t)}</li>`).join('')}</ul>` : '<p class="nota">Todos os itens marcados. Guarde as evidências e revise o PGR quando a organização do trabalho mudar.</p>');
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
