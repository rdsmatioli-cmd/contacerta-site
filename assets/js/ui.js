// Liga os formulários às funções de cálculo. Sem dependências externas.
import * as C from './calc.js?v=2fb16734fb';
import { INDICADORES } from './tabelas.js?v=2469a7d685';
import { validarNumero, attrNum, validarFeriasVencidas, validarDataPagamento } from './valida.js?v=722fe9c125';

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

// Lê o formulário validando os campos numéricos (laudo QA CC-01 a CC-05):
// erros (vazio obrigatório, texto, negativo, abaixo do mínimo) bloqueiam o cálculo;
// valor acima do máximo é limitado ao máximo, com aviso visível no campo e no resultado.
function ler(form) {
  const d = { _orig: {}, _vazio: {}, _invalidos: {} };
  const erros = [];
  const avisos = [];
  const alertas = [];
  const marca = (el, texto, erro) => {
    const msg = document.getElementById(`${el.id}-msg`);
    if (msg) { msg.textContent = texto || ''; msg.hidden = !texto; msg.className = `campo-msg${erro ? ' err' : ''}`; }
    if (erro) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  };
  const rotulo = (el) => ((form.querySelector(`label[for="${el.id}"]`) || {}).textContent || el.name);
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') d[el.name] = el.checked;
    else if (el.hasAttribute('data-num')) {
      const ds = el.dataset;
      // CC-NUM-01: a dica de 3 casas do erro ambíguo só vale em campo não monetário (sem o prefixo R$) e não inteiro.
      const pre = el.parentElement && el.parentElement.querySelector('.pre');
      const moeda = !!pre && pre.textContent.trim() === 'R$';
      const r = validarNumero({ raw: el.value, min: attrNum(ds.min), max: attrNum(ds.max), teto: attrNum(ds.teto), obrig: 'obrig' in ds, positivo: 'positivo' in ds, inteiro: 'inteiro' in ds, decimal: 'decimal' in ds, dicaCasas: !moeda && !('inteiro' in ds) });
      if (r.aviso && ds.avisoMax) r.aviso = ds.avisoMax;
      marca(el, r.erro || r.aviso, !!r.erro);
      // data-bloco (porcentagem): o erro bloqueia só a linha do bloco do campo, não o cálculo inteiro.
      if (r.erro) { if ('bloco' in ds) d._invalidos[el.name] = [rotulo(el), r.erro, el.id]; else erros.push([rotulo(el), r.erro, el.id]); }
      if (r.aviso) avisos.push([rotulo(el), r.aviso]);
      // data-decimal: ponto lido como separador de milhar ("1.125" = 1125) gera alerta visível; o cálculo segue.
      if (r.alerta) { marca(el, [r.aviso, r.alerta].filter(Boolean).join(' '), false); alertas.push([rotulo(el), r.alerta]); }
      if (!r.erro && !el.value.trim()) d._vazio[el.name] = true;
      if (r.original !== undefined) d._orig[el.name] = r.original;
      // Salário abaixo do mínimo: só alerta, o cálculo segue.
      const minimo = attrNum(ds.alertaMinimo);
      if (!r.erro && minimo !== null && r.valor > 0 && r.valor < minimo) {
        const t = `Valor abaixo do salário mínimo (${brl.format(minimo)}). Confira se é o salário mensal integral.`;
        marca(el, t, false); alertas.push([rotulo(el), t]);
      }
      d[el.name] = r.valor ?? 0;
    } else {
      d[el.name] = el.value;
      if (el.tagName === 'SELECT' && document.getElementById(`${el.id}-msg`)) marca(el, '', false);
    }
  }
  return { d, erros, avisos, alertas };
}
const listaErros = (erros) => `<div class="erro" role="alert"><p><strong>Confira ${erros.length > 1 ? 'os campos' : 'o campo'} antes de calcular:</strong></p><ul>${erros.map(([r, m, id]) => `<li><a href="#${id}">${esc(r)}</a>: ${esc(m)}</li>`).join('')}</ul></div>`;
const listaAlertas = (a) => (a.length ? `<div class="aviso-limite" role="status"><p><strong>Atenção:</strong></p><ul>${a.map(([r, m]) => `<li>${esc(r)}: ${esc(m)}</li>`).join('')}</ul></div>` : '');
const listaAvisos = (avisos) => (avisos.length ? `<div class="aviso-limite" role="status"><p><strong>Valor ajustado ao limite:</strong></p><ul>${avisos.map(([r, m]) => `<li>${esc(r)}: ${esc(m)}</li>`).join('')}</ul></div>` : '');

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
    ]) + (s.liquido < 0 ? '<p class="erro">Os descontos informados são maiores que o salário bruto. Confira pensão e outros descontos.</p>' : '') + `<p class="nota">IR calculado com ${s.ir.usaSimplificado ? 'desconto simplificado de R$ 607,20' : 'deduções legais'} (a opção mais vantajosa). Imposto pela tabela: ${R(s.ir.impostoTabela)}; redução da Lei 15.270/2025: ${R(s.ir.reducao)}.</p>`;
  },
  rescisao(d) {
    const r = C.rescisao({ salario: d.salario, admissao: d.admissao, desligamento: d.desligamento, tipo: d.tipo, aviso: d.aviso, feriasVencidas: d.feriasVencidas, vencidasEmDobro: [d.dobro1 === 'sim', d.dobro2 === 'sim'], saldoFgts: d.saldoFgts, dependentes: d.dependentes, dataPagamento: d.dataPagamento });
    if (!r) return '<p class="erro">Confira as datas: o desligamento deve ser depois da admissão.</p>';
    const elD = document.getElementById('f-desligamento');
    if (elD) elD.removeAttribute('aria-invalid');
    if (r.anteriorTabelas) {
      if (elD) elD.setAttribute('aria-invalid', 'true');
      return `<div class="erro" role="alert"><p><strong>Confira o campo antes de calcular:</strong></p><ul><li><a href="#f-desligamento">Data do desligamento (último dia)</a>: ${esc(`A calculadora tem as tabelas de INSS e de IR a partir de janeiro de ${r.primeiroAno}. Para desligamento anterior, o cálculo precisa ser feito com as tabelas da época.`)}</li></ul></div>`;
    }
    const vp = validarDataPagamento(d.desligamento, d.dataPagamento);
    const elP = document.getElementById('f-dataPagamento');
    if (elP) elP.removeAttribute('aria-invalid');
    if (vp && vp.erro) {
      if (elP) elP.setAttribute('aria-invalid', 'true');
      return `<div class="erro" role="alert"><p><strong>Confira o campo antes de calcular:</strong></p><ul><li><a href="#f-dataPagamento">Data de pagamento das verbas</a>: ${esc(vp.erro)}</li></ul></div>`;
    }
    const alertaPag = vp && vp.alerta ? listaAlertas([['Data de pagamento das verbas', vp.alerta]]) : '';
    // N-02: períodos e dobra conferidos contra as datas, com a projeção do aviso.
    const v = validarFeriasVencidas({ admissao: d.admissao, desligamento: d.desligamento, fimProjetado: r.fimProjetado, periodos: d._orig.feriasVencidas ?? d.feriasVencidas, emDobro: [d.dobro1 === 'sim', d.dobro2 === 'sim'] });
    if (v) {
      const el = document.getElementById(`f-${v.campo}`);
      const msg = document.getElementById(`f-${v.campo}-msg`);
      if (el) el.setAttribute('aria-invalid', 'true');
      if (msg) { msg.textContent = v.erro; msg.hidden = false; msg.className = 'campo-msg err'; }
      const rot = (document.querySelector(`label[for="f-${v.campo}"]`) || {}).textContent || '';
      return `<div class="erro" role="alert"><p><strong>Confira o campo antes de calcular:</strong></p><ul><li><a href="#f-${v.campo}">${esc(rot)}</a>: ${esc(v.erro)}</li></ul></div>`;
    }
    const informados = d._orig.feriasVencidas;
    const usados = d.feriasVencidas;
    const topo = informados > usados
      ? `<p class="destaque parcial"><span>Valor líquido <strong>parcial</strong>: inclui só ${usados} de ${informados} períodos de férias vencidas</span> <strong>${R(r.liquido)}</strong><em class="parcial-aviso">O valor devido é maior: faltam ${informados - usados} ${informados - usados === 1 ? 'período' : 'períodos'}, que precisam de cálculo manual.</em></p>`
      : destaque('Valor líquido estimado da rescisão', R(r.liquido));
    return alertaPag + topo + tabela([
      [`Saldo de salário (${r.diasNoMes} dias)`, R(r.saldoSalario)],
      r.avisoIndenizado ? [d.tipo === 'acordo' ? `Aviso prévio indenizado (${n2.format(r.diasAviso / 2)} dias, metade de ${r.diasAviso})` : `Aviso prévio indenizado (${r.diasProjecao} dias)`, R(r.avisoIndenizado)] : null,
      ...(r.avos13Anterior ? [[`13º proporcional de ${r.anoDes} (${r.avos13Anterior}/12)`, R(r.decimoAnterior)], [`13º proporcional de ${r.anoFim}, pela projeção do aviso (${r.avos13Atual}/12)`, R(r.decimoAtual)]] : [[`13º proporcional (${r.avos13}/12)`, R(r.decimo)]]),
      [`Férias proporcionais (${r.avosFerias}/12)`, R(r.feriasProp)],
      r.feriasVencSimples ? [`Férias vencidas (${r.periodosVenc} ${r.periodosVenc === 1 ? 'período' : 'períodos'})`, R(r.feriasVencSimples)] : null,
      r.dobraFeriasVenc ? [`Dobra das férias vencidas fora do prazo (${r.periodosEmDobro} ${r.periodosEmDobro === 1 ? 'período' : 'períodos'}, art. 137 da CLT)`, R(r.dobraFeriasVenc)] : null,
      r.feriasProjecao ? [`Férias do período completado no aviso projetado (${r.periodosProjecao} ${r.periodosProjecao === 1 ? 'período' : 'períodos'})`, R(r.feriasProjecao)] : null,
      [r.dobraFeriasVenc ? '1/3 constitucional sobre férias (inclui a dobra)' : '1/3 constitucional sobre férias', R(r.tercoFerias)],
      ['Total bruto das verbas', R(r.verbas), 'sub'],
      ['INSS sobre saldo de salário', `− ${R(r.inssSaldo)}`],
      r.irSaldo ? ['IRRF sobre saldo de salário', `− ${R(r.irSaldo)}`] : null,
      ...(r.avos13Anterior ? [[`INSS sobre 13º de ${r.anoDes}`, `− ${R(r.inss13Anterior)}`], [`INSS sobre 13º de ${r.anoFim}`, `− ${R(r.inss13Atual)}`]] : [['INSS sobre 13º', `− ${R(r.inss13)}`]]),
      r.ir13 ? ['IRRF sobre 13º', `− ${R(r.ir13)}`] : null,
      r.descontoAviso ? ['Desconto do aviso prévio não cumprido', `− ${R(r.descontoAviso)}`] : null,
      ['Líquido a receber na rescisão', R(r.liquido), 'total'],
      (r.multaFgts || r.saqueFgts) && r.depositoFgtsRescisao ? ['Depósito do FGTS sobre as verbas da rescisão (8%, somado ao saldo informado)', R(r.depositoFgtsRescisao)] : null,
      r.multaFgts ? [`Multa do FGTS (depositada na conta do FGTS)`, R(r.multaFgts)] : null,
      r.saqueFgts ? ['Saque do saldo do FGTS', R(r.saqueFgts)] : null,
    ]) + (d.tipo === 'justaCausa' ? '' : `<p class="nota">Aviso prévio de ${r.diasAviso} dias pela Lei 12.506/2011.${r.diasProjecao ? ` A projeção do aviso leva o contrato até ${r.fimProjetado.split('-').reverse().join('/')} para contar 13º e férias.` : ''}</p>`) + (r.avos13Anterior ? `<p class="nota">Quando o 13º abrange dois anos pela projeção do aviso, o INSS é calculado separadamente por ano, com a tabela de cada ano, e o IR incide sobre o total, num pagamento único. A prática de folha varia nesse ponto.${r.tabelasSubstituidas.map(([a, b]) => ` A tabela do INSS de ${a} ainda não está disponível no site; foi usada a de ${b}, e o resultado pode mudar quando a tabela oficial for publicada.`).join('')}</p>` : '') + `<p class="nota">IRRF pela data de pagamento (${r.dataPagamento.split('-').reverse().join('/')}${r.pagamentoInformado ? '' : ', data do desligamento, pois não foi informada outra'}): tabela de ${r.tabelaIrrf.rotulo}${r.tabelaIrrf.ano >= 2026 ? ', com a redução da Lei 15.270/2025' : ', sem a redução da Lei 15.270/2025 (vigente a partir de 2026)'}.${r.inssSaldoSubstituida ? ` A tabela do INSS de ${r.inssSaldoSubstituida[0]} ainda não está disponível no site; para o saldo de salário foi usada a de ${r.inssSaldoSubstituida[1]}, e o resultado pode mudar quando a tabela oficial for publicada.` : ''}${r.avos13Anterior ? '' : r.tabelasSubstituidas.map(([a, b]) => (r.inssSaldoSubstituida && r.inssSaldoSubstituida[0] === a ? ` A mesma tabela foi usada no INSS do 13º.` : ` A tabela do INSS de ${a} ainda não está disponível no site; para o 13º foi usada a de ${b}, e o resultado pode mudar quando a tabela oficial for publicada.`)).join('')}${r.tabelaIrrf.substituida ? ` Ainda não há tabela do IR de ${r.tabelaIrrf.anoPagamento} no site; foi usada a mais recente, e o resultado pode mudar quando a tabela oficial for publicada.` : ''}</p>` + (d.tipo === 'acordo' ? '<p class="nota">No acordo (CLT, art. 484-A), o aviso indenizado é pago pela metade, e a calculadora projeta também metade do prazo no tempo de serviço, que é o entendimento predominante. A lei não trata expressamente da projeção, e há decisões que projetam o aviso inteiro.</p>' : '');
  },
  'decimo-terceiro'(d) {
    const r = C.decimoTerceiro({ salario: d.salario, meses: d.meses, mediaVariaveis: d.media, dependentes: d.dependentes });
    return destaque('13º líquido total', R(r.liquidoTotal)) + barra([['Líquido', r.liquidoTotal, 'c1'], ['INSS', r.inss, 'c2'], ['IRRF', r.irrf, 'c5']]) + tabela([
      [`13º bruto (${r.meses}/12)`, R(r.bruto)],
      [r.meses < 12 ? `1ª parcela (até 30/11, sem descontos; ${r.mesesPrimeira}/12 ÷ 2)` : '1ª parcela (até 30/11, sem descontos)', R(r.primeira), 'sub'],
      ['INSS (descontado na 2ª parcela)', `− ${R(r.inss)}`],
      ['IRRF (descontado na 2ª parcela)', `− ${R(r.irrf)}`],
      ['2ª parcela (até 20/12)', R(r.segunda), 'sub'],
      ['Total líquido', R(r.liquidoTotal), 'total'],
    ]) + (r.meses < 12 ? `<p class="nota">Com menos de 12 meses no ano, a 1ª parcela é metade de 1/12 do salário por mês de serviço até o pagamento (Decreto 10.854/2021, art. 78, § 4º). A calculadora supõe o pagamento em novembro e os ${r.meses} meses informados contados até dezembro: ${r.mesesPrimeira} até novembro. Se a empresa pagar antes, a 1ª parcela é menor e a 2ª, maior; o total não muda.</p>` : '');
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
      r.depositosAnuais ? [`Depósito anual sobre 13º e 1/3 de férias (${r.depositosAnuais} ${r.depositosAnuais === 1 ? 'vez' : 'vezes'})`, R(r.depositoAnual)] : null,
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
    ]) + `<p class="nota">Divisor usado: ${n2.format(d.jornada)} horas. Padrão pela EC 141/2026: 220 (44 horas semanais) até 15/12/2026, 210 (42 horas) a partir de 16/12/2026 e 200 (40 horas) a partir de 16/12/2027; o contrato ou a convenção coletiva podem prever outro.</p>`;
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
    ]) + `<details><summary>Tabela de amortização (${r.linhas.length} parcelas)</summary><div class="rolagem" tabindex="0" role="region" aria-label="Tabela de amortização (role para o lado)"><table class="grade"><thead><tr><th>Nº</th><th>Parcela</th><th>Juros</th><th>Amortização</th><th>Saldo</th></tr></thead><tbody>${r.linhas.map((l) => `<tr><td>${l.n}</td><td>${R(l.parcela)}</td><td>${R(l.juros)}</td><td>${R(l.amortizacao)}</td><td>${R(l.saldo)}</td></tr>`).join('')}</tbody></table></div></details><p class="nota">Não inclui seguros (MIP/DFI), tarifas, IOF nem correção pela TR, que entram no CET do banco.</p>`;
  },
  investimentos(d) {
    const r = C.investimentos({ valor: d.valor, dias: d.dias, cdi: d.cdi, pctCdb: d.pctCdb, pctLci: d.pctLci, selic: d.selic, trMensal: d.tr });
    const melhor = [...r.resultados].sort((a, b) => b.final - a.final)[0];
    return destaque('Melhor resultado líquido', `${esc(melhor.nome)}: ${R(melhor.final)}`) + `<div class="rolagem" tabindex="0" role="region" aria-label="Tabela comparativa das aplicações (role para o lado)"><table class="grade"><thead><tr><th>Aplicação</th><th>Rendimento bruto</th><th>IR</th><th>Valor final líquido</th><th>Rentab. líquida</th></tr></thead><tbody>${r.resultados.map((x) => `<tr><td>${esc(x.nome)}</td><td>${R(x.rendimentoBruto)}</td><td>${R(x.ir)}</td><td>${R(x.final)}</td><td>${pct(x.rentabilidadeLiquida)}</td></tr>`).join('')}</tbody></table></div><p class="nota">Alíquota de IR para ${d.dias} dias: ${pct(r.aliquotaIr, 1)}. Não considera IOF (resgates em menos de 30 dias) nem a taxa de custódia da B3. O Tesouro Selic é calculado com o CDI informado, porque rende a Selic efetiva (over), praticamente igual ao CDI e um pouco abaixo da meta; a Selic meta entra só na regra da poupança.</p>`;
  },
  porcentagem(d) {
    const P = C.porcentagem;
    const f = (x) => (Number.isFinite(x) ? n6.format(x) : '—');
    // CC-PCT-01: bloco com campo vazio (ausente, não zero) ou inválido mostra "—"; os outros blocos são calculados.
    const falta = (nomes) => nomes.some((n) => d._vazio[n] || d._invalidos[n]);
    const linha = (nomes, rotulo, generico, valor) => (falta(nomes) ? [generico, '—'] : [rotulo, valor(), 'total']);
    const linhas = [
      linha(['p1', 'v1'], `${f(d.p1)}% de ${f(d.v1)}`, '1) X% de um valor', () => f(P.deValor(d.p1, d.v1))),
      linha(['x2', 'v2'], `${f(d.x2)} é quantos % de ${f(d.v2)}`, '2) Quantos % um valor é de outro', () => `${f(P.quantoPorcento(d.x2, d.v2))}%`),
      linha(['a3', 'b3'], `Variação de ${f(d.a3)} para ${f(d.b3)}`, '3) Variação percentual', () => `${f(P.variacao(d.a3, d.b3))}%`),
      linha(['v4', 'p4'], `${f(d.v4)} com aumento de ${f(d.p4)}%`, '4) Valor com aumento', () => f(P.aumento(d.v4, d.p4))),
      linha(['v4', 'p4'], `${f(d.v4)} com desconto de ${f(d.p4)}%`, '4) Valor com desconto', () => f(P.desconto(d.v4, d.p4))),
    ];
    const inv = Object.values(d._invalidos);
    const erroBloco = inv.length ? `<div class="erro" role="alert"><p><strong>Confira ${inv.length > 1 ? 'os campos' : 'o campo'} para ver o resultado do bloco:</strong></p><ul>${inv.map(([r, m, id]) => `<li><a href="#${id}">${esc(r)}</a>: ${esc(m)}</li>`).join('')}</ul></div>` : '';
    const semResultado = linhas.some((l) => l[1] === '—');
    // Nenhum bloco calculado (tudo vazio ou inválido): rodar() não envia o calculo_concluido do GA4.
    d._semResultadoTotal = linhas.every((l) => l[1] === '—');
    return erroBloco + tabela(linhas) + (semResultado ? '<p class="nota">“—”: bloco com campo em branco ou inválido. Preencha os dois campos do bloco para ver o resultado; os outros blocos são calculados normalmente.</p>' : '');
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
      [`Total no ano (${r.meses} ${r.meses === 1 ? 'mês' : 'meses'})`, R(r.anual), 'total'],
      ['Limite de faturamento proporcional', R(r.limite)],
      d.faturamento ? ['Situação do faturamento informado', sit] : null,
    ]);
  },
  'adicional-noturno'(d) {
    const r = C.adicionalNoturno({ salario: d.salario, jornadaMensal: d.jornada, horas: d.horas, tipo: d.tipo, percentual: d.percentual, diasUteis: d.diasUteis, domingosFeriados: d.domingos });
    // Percentual abaixo do mínimo legal: o cálculo usa o mínimo, com aviso no campo e no resultado.
    const avisoPiso = r.pisoAplicado ? `O mínimo legal para o trabalhador ${d.tipo === 'rural' ? 'rural é 25% (Lei 5.889/1973, art. 7º)' : 'urbano é 20% (CLT, art. 73)'}; o cálculo usa ${pct(r.pct, 0)}.` : '';
    const msgPct = document.getElementById('f-percentual-msg');
    if (msgPct && avisoPiso) { msgPct.textContent = avisoPiso; msgPct.hidden = false; msgPct.className = 'campo-msg'; }
    return listaAvisos(avisoPiso ? [['Percentual do adicional', avisoPiso]] : []) + destaque('Adicional noturno + DSR', R(r.total)) + tabela([
      ['Valor da hora normal', R(r.valorHora)],
      ['Valor da hora noturna (com adicional)', R(r.valorHoraNoturna)],
      [`Horas trabalhadas no relógio`, `${n2.format(r.horasRelogio)} h`],
      [d.tipo === 'rural' ? 'Horas consideradas (rural, sem hora reduzida)' : 'Horas noturnas consideradas (hora de 52min30s)', `${n2.format(r.horasConsideradas)} h`],
      [`Adicional noturno (${pct(r.pct, 0)})`, R(r.adicional), 'sub'],
      ['Reflexo no DSR', R(r.dsr)],
      ['Total bruto a mais no mês', R(r.total), 'total'],
    ]) + `<p class="nota">Divisor usado: ${n2.format(d.jornada)} horas. Padrão pela EC 141/2026: 220 (44 horas semanais) até 15/12/2026, 210 (42 horas) a partir de 16/12/2026 e 200 (40 horas) a partir de 16/12/2027; o contrato ou a convenção coletiva podem prever outro.</p>`;
  },
  'aviso-previo'(d) {
    const r = C.avisoPrevio({ salario: d.salario, admissao: d.admissao, desligamento: d.desligamento, tipo: d.tipo });
    if (!r) return '<p class="erro">Confira as datas: o desligamento deve ser depois da admissão.</p>';
    const fimBR = r.fimProjetado.split('-').reverse().join('/');
    const acordo = d.tipo === 'acordo';
    return destaque('Aviso prévio', `${n2.format(r.diasValor)} dias`) + tabela([
      ['Anos completos de empresa', String(r.anos)],
      ['Aviso pela Lei 12.506/2011 (30 + 3 por ano)', `${r.diasLei} dias`],
      d.tipo === 'pedidoDemissao' ? ['No pedido de demissão (sem proporcional)', '30 dias'] : null,
      acordo ? ['No acordo (art. 484-A da CLT): metade do aviso', `${n2.format(r.diasValor)} dias`] : null,
      ['Valor de um dia de salário', R(r.diaria)],
      [d.tipo === 'pedidoDemissao' ? 'Valor do aviso (desconto se não for cumprido)' : 'Valor do aviso indenizado', R(r.valor), 'total'],
      d.tipo !== 'pedidoDemissao' ? [acordo ? `Data final com a projeção do aviso (${r.dias} dias, metade arredondada para baixo)` : 'Data final com a projeção do aviso', fimBR] : null,
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
    // CC-PARC-01: parcela no ato igual ou maior que o preço à vista não tem taxa de juros (null), e não 0%.
    const semTaxa = r.taxaImplicita === null;
    return destaque('Melhor opção', msg) + tabela([
      ['Total parcelado', R(r.total)],
      ['Desconto à vista em relação ao total', pct(r.descontoVista, 1)],
      ['Juros embutidos (ao mês)', semTaxa ? 'não se aplica' : pct(r.taxaImplicita)],
      ['Juros embutidos (ao ano)', semTaxa ? 'não se aplica' : pct(r.taxaImplicitaAnual)],
      ['Rendimento do seu dinheiro (ao mês)', pct(r.rendimentoMensal)],
      ['Valor das parcelas trazido a hoje', R(r.vp), 'sub'],
      [r.vantagem >= 0 ? 'Economia ao parcelar' : 'Economia ao pagar à vista', R(Math.abs(r.vantagem)), 'total'],
    ]) + (semTaxa ? '<p class="nota">Juros embutidos não se aplicam: a parcela paga no ato já é igual ou maior que o preço à vista, sem prazo que explique a diferença. Compare pelo desconto à vista.</p>' : '')
      // Sem taxa, a orientação de comparar os juros embutidos contradiz a nota acima: fica só a ressalva do rendimento.
      + `<p class="nota">O rendimento é bruto, sem imposto de renda.${semTaxa ? '' : ' Se o dinheiro não fosse ficar aplicado, compare só os juros embutidos: qualquer taxa acima de zero significa que à vista é mais barato.'}</p>`;
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
      + `<div class="tabela-rolar" tabindex="0" role="region" aria-label="Tabela do resultado (role para o lado)"><table class="res"><thead><tr><th scope="col">Ano</th><th scope="col">Fase</th><th scope="col">PIS/Cofins + ISS</th><th scope="col">CBS + IBS</th><th scope="col">Cliente paga</th><th scope="col">Carga</th></tr></thead><tbody>${linhas}</tbody></table></div>`
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
    const sinal = (v) => `${v >= 0 ? '+ ' : '− '}${R(Math.abs(v))}`;
    const cen = repasseB2B ? 'com a CBS/IBS repassada ao B2B' : 'cobrando o mesmo valor total';
    const rec = {
      hibrido: ['Nesta simulação, ficar com CBS e IBS fora do DAS tende a render mais', `Nas premissas desta simulação (alíquotas de 2027-2028), ${cen}, o seu lucro estimado fica ${R(r.diferencaLucro)}/mês maior ao ficar com CBS e IBS fora do DAS, e o custo efetivo dos clientes B2B do regime regular muda em ${sinal(-r.ganhoClientes)}/mês. É uma estimativa: confirme com o seu contador antes de optar.`],
      'hibrido-negociar': ['Nesta simulação, ficar com CBS e IBS fora do DAS só compensa se houver negociação de preço', `Mantendo o mesmo valor total, o seu lucro estimado cai ${R(-r.diferencaLucro)}/mês. Em compensação, o custo efetivo dos clientes B2B do regime regular pode cair até ${R(r.ganhoClientes)}/mês, se eles tiverem débitos para usar o crédito. Essa diferença pode abrir espaço para negociar preço com esses clientes, o que depende de acordo com cada um e do que prevê o contrato; sem negociação, ficar no DAS rende mais nesta simulação.`],
      puro: ['Nesta simulação, ficar no DAS tende a ser melhor', `Nesta simulação (alíquotas de 2027-2028), ${cen}, ao ficar com CBS e IBS fora do DAS, o seu lucro estimado cairia ${R(-r.diferencaLucro)}/mês${r.ganhoClientes > 0 ? `, mais do que a redução de custo que os clientes B2B teriam (${R(r.ganhoClientes)}/mês)` : ''}. Reavalie a cada janela semestral.`],
    }[r.recomendacao];
    const comp = `<div class="tabela-rolar" tabindex="0" role="region" aria-label="Tabela: tudo no DAS x CBS e IBS fora do DAS (role para o lado)"><table class="res comp"><thead><tr><td></td><th scope="col">Tudo no DAS</th><th scope="col">CBS e IBS fora do DAS</th></tr></thead><tbody>
<tr><th scope="row">Valor total cobrado dos clientes</th><td>${R(d.receita)}</td><td>${R(r.hibrido.recebido)}</td></tr>
<tr><th scope="row">DAS</th><td>${R(r.puro.imposto)}</td><td>${R(r.hibrido.das)}</td></tr>
<tr><th scope="row">CBS + IBS por fora (débito − crédito das compras)</th><td>—</td><td>${R(r.hibrido.cbsIbsAPagar)}</td></tr>
<tr><th scope="row">Tributos da empresa</th><td>${R(r.puro.imposto)}</td><td>${R(r.hibrido.imposto)}</td></tr>
<tr class="total"><th scope="row">Lucro estimado</th><td>${R(r.puro.lucro)} (${pct(r.puro.margem, 1)})</td><td>${R(r.hibrido.lucro)} (${pct(r.hibrido.margem, 1)})</td></tr>
<tr><th scope="row">Crédito de CBS/IBS para clientes B2B</th><td>${R(r.puro.creditoClientes)}</td><td>${R(r.hibrido.creditoClientes)}</td></tr>
</tbody></table></div>`;
    const lado = `<div class="tabela-rolar" tabindex="0" role="region" aria-label="Tabela: CBS e IBS fora do DAS nos dois cenários de preço (role para o lado)"><table class="res comp"><caption>CBS e IBS fora do DAS nos dois cenários de preço</caption><thead><tr><td></td><th scope="col">Preço mantido</th><th scope="col">CBS/IBS repassado ao B2B</th></tr></thead><tbody>
<tr><th scope="row">Lucro estimado com CBS e IBS fora do DAS</th><td>${R(mant.hibrido.lucro)}</td><td>${R(rep.hibrido.lucro)}</td></tr>
<tr><th scope="row">Diferença para o puro</th><td>${sinal(mant.diferencaLucro)}</td><td>${sinal(rep.diferencaLucro)}</td></tr>
<tr><th scope="row">Crédito dos clientes B2B</th><td>${R(mant.hibrido.creditoClientes)}</td><td>${R(rep.hibrido.creditoClientes)}</td></tr>
</tbody></table></div>`;
    // Prazo de opção para jan-jun/2027 encerrado em 30/10/2026; cancelamento de 03/11 a 20/12/2026 (Res. CGSN 194/2026).
    const prazo = (hoje() <= '2026-12-20' ? 'Quem optou para janeiro a junho de 2027 pode cancelar a opção até 20/12/2026, em caráter irretratável (cancelamento aberto de 03/11 a 20/12/2026). ' : '')
      + 'Próxima janela de opção: março de 2027, para valer de julho a dezembro de 2027 (datas na forma regulamentada pelo CGSN). Empresas em início de atividade seguem regra própria (LC 123/2006, art. 13, § 11).';
    return `<div class="recomenda rec-${r.recomendacao}"><p class="rec-rot">Indicação da simulação</p><p class="rec-tit">${rec[0]}</p><p>${rec[1]}</p></div>`
      + destaque('Diferença de lucro (fora do DAS − tudo no DAS)', `${sinal(r.diferencaLucro)}/mês`) + comp + lado
      + `<p class="nota">Dados e premissas: faturamento de ${R(d.receita)}; margem de ${n2.format(d.margem)}%; DAS de ${n2.format(d.das)}%, com ${n2.format(d.parcela)}% de CBS/IBS na partilha; compras com crédito de ${R(d.compras)}; ${pctB2B}% das vendas para empresas do regime regular. Preço com CBS e IBS fora do DAS: ${repasseB2B ? 'CBS/IBS repassados ao B2B, valor total mantido para o B2C' : 'mesmo valor total cobrado nas duas opções'}; CBS + IBS de ${pct(r.aliquota)} por fora (valor da operação ${R(r.hibrido.valorOperacao)}); DAS do híbrido calculado sobre ${dasSobreValorSemCbsIbs ? 'o valor sem CBS/IBS' : 'a receita total'} (ponto ainda não definido pela lei), sem a parcela de CBS/IBS; custos iguais (faturamento × (1 − margem)). Simulação para 2027-2028; a CBS de 2027 é estimativa até a fixação oficial. Crédito do cliente condicionado às regras gerais (LC 214/2025, arts. 47 e 48). Custos tratados como valores brutos: as compras com crédito já estão dentro dos custos, com o tributo que gera o crédito incluído. Saldo credor das compras não aproveitado aqui (pode subestimar o resultado fora do DAS). ${prazo}</p>`
      + marcaResultado();
  },
  'preco-reforma-tributaria'(d) {
    const issPorDentro = d.issmodo !== 'fora';
    const r = C.precoReforma({ precoAtual: d.preco, tributosAtuaisPct: d.atuais, issPct: d.iss, ano: Number(d.ano), cbsPct: d.cbs, ibsPct: d.ibs, issPorDentro });
    if (!r) return '<p class="erro">Confira o preço e os percentuais (precisam ser menores que 100%).</p>';
    // CC-PRECO-01: de 2029 em diante o IBS deixa de ser 0,1%; avisa se o campo ficou com o valor de 2027-2028.
    // calc.js antigo vindo do cache não tem aliquotasPadraoPreco: o cálculo segue, só sem o aviso.
    const sug = typeof C.aliquotasPadraoPreco === 'function' ? C.aliquotasPadraoPreco(d.ano) : null;
    const avisoIbs = Number(d.ano) >= 2029 && d.ibs <= 0.1 && sug
      ? listaAlertas([['IBS', `Em ${d.ano}, o IBS não é mais de 0,1%: a estimativa da calculadora para o ano é de ${n2.format(sug.ibsPct)}%. Com ${n6.format(d.ibs)}%, o total da nota fica subestimado. Ajuste o campo IBS.`]])
      : '';
    return avisoIbs + destaque('Total da nota para manter a margem', R(r.total)) + tabela([
      ['Receita líquida de hoje (mantida) = base de CBS/IBS', R(r.base)],
      ['CBS', `+ ${R(r.cbs)}`],
      ['IBS', `+ ${R(r.ibs)}`],
      [`ISS/ICMS do ano (${pct(r.issAno, 2)}${issPorDentro ? ', por dentro do total' : ', por fora'})`, `+ ${R(r.iss)}`],
      ['Total cobrado do cliente', R(r.total), 'total'],
      ['Variação do total da nota', pct(r.variacaoTotal, 1)],
      ['Custo efetivo para cliente com direito a crédito (total − CBS − IBS)', R(r.custoClienteComCredito), 'sub'],
      ['Variação para esse cliente', pct(r.variacaoComCredito, 1)],
    ]) + `<p class="nota">A base da CBS e do IBS não inclui o ISS/ICMS (ADCT, art. 133; LC 214/2025, art. 12, § 2º, V). ISS/ICMS do ano = alíquota informada × ${n2.format(r.fatorIss)} (ADCT, arts. 128 e 129). ${issPorDentro ? 'Padrão: ISS calculado por dentro, sobre o total, inclusive a CBS/IBS: total = (base + CBS + IBS) ÷ (1 − ISS do ano). É uma interpretação: a lei ainda não diz se a CBS/IBS integra a base do ISS (PLP 16/2025); a alternativa com ISS por fora está no formulário.' : 'Alternativa: ISS por fora, sobre a base: total = base × (1 + CBS + IBS + ISS do ano). O padrão (ISS por dentro, sobre o total) é a outra interpretação possível.'} Alíquotas de CBS e IBS são estimativas editáveis: CBS ${n6.format(d.cbs)}% e IBS ${n6.format(d.ibs)}% nesta simulação (${d.ano}).</p>`;
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
    return destaque('Próximo marco', prox) + `<p class="nota">Fase na data informada: <strong>${esc(r.fase)}</strong>.</p><div class="tabela-rolar" tabindex="0" role="region" aria-label="Tabela do resultado (role para o lado)"><table class="res"><thead><tr><th scope="col">Data</th><th scope="col">O que acontece</th><th scope="col">Situação</th></tr></thead><tbody>${r.marcos.map((m) => `<tr><th scope="row">${fmt(m.data)}</th><td>${esc(m.t)}</td><td>${m.passou ? 'Já passou' : `Faltam ${m.dias} dias`}</td></tr>`).join('')}</tbody></table></div>`;
  },
  'nr1-riscos-psicossociais'(d) {
    const r = C.nr1Diagnostico(d);
    if (!r.respondidos) return `<p class="nota">Responda às ${r.total} perguntas para ver o nível indicativo de exposição. As respostas ficam só no seu navegador: nada é enviado nem gravado.</p>`;
    const msg = {
      baixo: 'Mantenha o monitoramento e registre no inventário de riscos que os fatores foram avaliados.',
      moderado: 'Há fatores que merecem medidas de prevenção no plano de ação, com prazo e responsável.',
      alto: 'Priorize os fatores abaixo no plano de ação e ouça os trabalhadores para confirmar o diagnóstico.',
      muitoAlto: 'Trate os fatores abaixo como prioridade e procure apoio de profissional de SST para a avaliação no PGR.',
    }[r.nivel];
    const falta = r.completo ? '' : `<p class="nota">Você respondeu ${r.respondidos} de ${r.total} perguntas. O resultado considera só as respondidas.</p>`;
    const prio = r.prioridades.length
      ? `<p class="nota"><strong>Fatores para priorizar e exemplos de medidas:</strong></p><ul>${r.prioridades.map((p) => `<li><strong>${esc(p.t)}.</strong> ${esc(p.medida)}</li>`).join('')}</ul>`
      : '<p class="nota">Nenhum fator apareceu com frequência. Registre a avaliação e repita o diagnóstico após mudanças na organização do trabalho.</p>';
    return destaque('Nível indicativo', C.NR1_NIVEIS[r.nivel]) + `<p class="nota">${msg}</p>` + falta + prio
      + '<p class="nota">Resultado orientativo, baseado na percepção de quem respondeu. Não é laudo, não avalia a saúde de ninguém e não substitui a avaliação de riscos do PGR feita com profissional de SST.</p>';
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
  // M01: o bloqueio do envio nativo é registrado ANTES de restaurar os names e habilitar o botão.
  form.addEventListener('submit', (e) => { e.preventDefault(); rodar(true); out.focus(); });
  // Campos sem name no HTML (sem envio nativo sem JS); o nome vem de data-name.
  for (const el of form.querySelectorAll('[data-name]')) if (!el.name) el.name = el.dataset.name;
  for (const el of form.querySelectorAll('[data-requer-js]')) el.disabled = false;
  const fn = CALCS[id];
  // valores padrão dinâmicos
  for (const el of form.querySelectorAll('[data-hoje]')) if (!el.value) el.value = hoje();
  for (const el of form.querySelectorAll('[data-indicador]')) if (el.value === '') el.value = String(INDICADORES[el.dataset.indicador]).replace('.', ',');
  // Adicional noturno: ao trocar urbano/rural, o percentual acompanha o mínimo legal (20% ou 25%),
  // salvo se o usuário digitou outro valor.
  if (id === 'adicional-noturno' && form.elements.tipo && form.elements.percentual) {
    const pisoTxt = (t) => (t === 'rural' ? '25' : '20');
    let tipoAnterior = form.elements.tipo.value;
    form.elements.tipo.addEventListener('change', () => {
      const el = form.elements.percentual;
      const v = el.value.trim();
      if (v === '' || v === pisoTxt(tipoAnterior)) el.value = pisoTxt(form.elements.tipo.value);
      tipoAnterior = form.elements.tipo.value;
    });
  }
  // EC 141/2026: divisor padrão pela data de hoje (220; 210 a partir de 16/12/2026; 200 a partir de 16/12/2027), só se o
  // campo ainda tem o valor do HTML. Sem jornadaPadrao (calc.js antigo vindo do cache), fica o valor do HTML.
  if ((id === 'horas-extras' || id === 'adicional-noturno') && form.elements.jornada && typeof C.jornadaPadrao === 'function') {
    const el = form.elements.jornada;
    if (el.value.trim() === el.defaultValue) el.value = String(C.jornadaPadrao(hoje()).divisor);
  }
  if (id === 'conversor-de-medidas') {
    popularUnidades(form);
    form.elements.categoria.addEventListener('change', () => popularUnidades(form));
  }
  // CC-PRECO-01: ao trocar o ano, CBS e IBS recebem a estimativa do ano (aliquotasPadraoPreco), só se o usuário não editou o campo.
  // Sem a função (calc.js antigo vindo do cache), a página funciona como antes, sem o preenchimento por ano:
  // um erro aqui, fora do try e antes de `rodar`, deixaria a calculadora sem resultado e o botão quebrado.
  if (id === 'preco-reforma-tributaria' && typeof C.aliquotasPadraoPreco === 'function') {
    const campos = ['cbs', 'ibs'].map((nome) => form.elements[nome]);
    for (const el of campos) el.dataset.padrao = el.defaultValue;
    const aplicarAno = () => {
      const sug = C.aliquotasPadraoPreco(form.elements.ano.value);
      if (!sug) return;
      [sug.cbsPct, sug.ibsPct].forEach((v, i) => {
        const el = campos[i];
        if (el.value.trim() !== el.dataset.padrao) return; // editado pelo usuário: mantém
        el.value = String(v).replace('.', ',');
        el.dataset.padrao = el.value;
      });
    };
    form.elements.ano.addEventListener('change', aplicarAno);
    aplicarAno();
  }
  const vencN = form.elements.feriasVencidas;
  const ajustaDobro = () => {
    if (!vencN) return;
    const n = Math.min(2, Math.max(0, Math.floor(Number(vencN.value) || 0)));
    ['dobro1', 'dobro2'].forEach((nome, i) => { const el = form.elements[nome]; if (!el) return; const box = el.closest('.campo'); if (box) box.hidden = i >= n; if (i >= n) el.value = 'nao'; });
  };
  const rodar = (enviado = false) => {
    ajustaDobro();
    try {
      const { d, erros, avisos, alertas } = ler(form);
      out.innerHTML = erros.length ? listaErros(erros) : listaAvisos(avisos) + listaAlertas(alertas) + fn(d);
      // GA4 (E-03): só o fato de o cálculo ter sido concluído pelo usuário; nenhum valor sai daqui.
      if (enviado && !erros.length && !d._semResultadoTotal) form.dispatchEvent(new CustomEvent('cc:calculo-concluido', { bubbles: true }));
    } catch (e) {
      out.innerHTML = '<p class="erro">Não foi possível calcular. Confira os valores informados.</p>';
      console.error(e);
    }
  };
  let t;
  form.addEventListener('input', () => { clearTimeout(t); t = setTimeout(rodar, 250); });
  rodar();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();
