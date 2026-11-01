// Validação dos campos numéricos das calculadoras (laudo QA 10/10/2026 e reteste: CC-01 a CC-05, N-01, N-02, N-04, N-11).
// Funções puras, testáveis no Node; o ui.js aplica o resultado no formulário.
import { avosFerias, parseData, avisosDoMotivo, addMeses, addDias } from './calc.js?v=9f45ee25a6';
const fmt = (x) => Number(x).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const AMBIGUO = 'Formato ambíguo: use 1.000,00 ou 1000';

// Lê um número digitado no formato brasileiro (N-01).
// "3500,50" → 3500.5 · "3.500" e "3.500,00" → 3500 · "1.234.567,8" → 1234567.8 · "3500.50" → 3500.5 (ponto decimal sem ambiguidade).
// "3.500" com exatamente 3 dígitos após um único ponto e parte inteira sem zero à esquerda é lido como milhar.
// decimal = true (campos não monetários com data-decimal: regra de três, conversor, porcentagem): a vírgula é sempre
// decimal ("1,125" = 1,125) e "1.125" continua milhar, mas com alerta visível da leitura (CC-NUM-01).
// Retorna { n }, { n, alerta } (só com decimal) ou { erro }.
export function lerNumeroBR(raw, { decimal = false } = {}) {
  let s = String(raw ?? '').trim().replace(/^R\$\s*/i, '').replace(/[\s\u00a0]/g, '');
  if (s === '') return { vazio: true };
  if (!/^[-+]?[\d.,]+$/.test(s) || !/\d/.test(s)) return { erro: 'Digite só números.' };
  const neg = s.startsWith('-');
  s = s.replace(/^[-+]/, '');
  const temVirg = s.includes(',');
  const pontos = (s.match(/\./g) || []).length;
  let norm;
  let alerta;
  if (temVirg) {
    if ((s.match(/,/g) || []).length > 1) return { erro: 'Use a vírgula só uma vez, para os centavos.' };
    const [int, dec] = s.split(',');
    // "1,000" sem ponto de milhar é ambíguo (mil no formato americano ou 1 no brasileiro): erro, sem conversão.
    // Em campo decimal, a vírgula é sempre decimal (convenção brasileira).
    if (!decimal && !pontos && /^[1-9]\d{0,2}$/.test(int) && /^\d{3}$/.test(dec)) return { erro: AMBIGUO };
    if (pontos && !/^\d{1,3}(\.\d{3})+$/.test(int)) return { erro: 'Ponto só como separador de milhar (ex.: 3.500,50).' };
    if (!/^\d*$/.test(dec)) return { erro: 'Digite só números.' };
    norm = `${int.replace(/\./g, '') || '0'}.${dec || '0'}`;
  } else if (pontos > 1) {
    if (!/^\d{1,3}(\.\d{3})+$/.test(s)) return { erro: 'Ponto só como separador de milhar (ex.: 1.500.000).' };
    norm = s.replace(/\./g, '');
  } else if (pontos === 1) {
    const milhar = /^[1-9]\d{0,2}\.\d{3}$/.test(s);
    norm = milhar ? s.replace('.', '') : s;
    if (milhar && decimal) {
      const v = Number(norm) * (neg ? -1 : 1);
      alerta = `Lido como ${v} (${porExtenso(v)}): o ponto separa os milhares. Se era decimal, digite com vírgula: ${neg ? '-' : ''}${s.replace('.', ',')}.`;
    }
  } else norm = s;
  const n = Number(norm);
  if (!Number.isFinite(n)) return { erro: 'Digite só números.' };
  // "-0" vira 0 (CC-CALC-VALIDA-02): −0 passava no mínimo 0 (−0 < 0 é falso) e o Intl o mostra como "-R$ 0,00".
  const v = neg && n !== 0 ? -n : n;
  return alerta ? { n: v, alerta } : { n: v };
}

// Inteiro de 0 a 999.999 por extenso, para o alerta de leitura ("1125" → "mil cento e vinte e cinco").
const UNI = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CEN = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
const ate999 = (n) => {
  if (n === 100) return 'cem';
  const c = Math.floor(n / 100);
  const r = n % 100;
  const partes = [];
  if (c) partes.push(CEN[c]);
  if (r) partes.push(r < 20 ? UNI[r] : DEZ[Math.floor(r / 10)] + (r % 10 ? ` e ${UNI[r % 10]}` : ''));
  return partes.join(' e ');
};
export function porExtenso(n) {
  if (n < 0) return `menos ${porExtenso(-n)}`;
  if (n === 0) return UNI[0];
  const m = Math.floor(n / 1000);
  const r = n % 1000;
  const mil = m === 0 ? '' : m === 1 ? 'mil' : `${ate999(m)} mil`;
  if (!r) return mil;
  if (!mil) return ate999(r);
  // "e" depois de mil só quando o resto é menor que 100 ou centena redonda: "mil e quinhentos", "mil cento e vinte e cinco".
  return `${mil}${r < 100 || r % 100 === 0 ? ' e ' : ' '}${ate999(r)}`;
}

// campo: { raw, min, max, teto, obrig, positivo, inteiro, decimal, dicaCasas, badInput }
// Retorna { valor, erro?, aviso?, original?, alerta? }. Erro bloqueia o cálculo; aviso informa que o valor foi limitado ao máximo do campo;
// alerta (só em campo decimal) informa que um ponto foi lido como separador de milhar, e o cálculo segue.
// dicaCasas = true (só campo não monetário e não inteiro; o ui.js decide): o erro ambíguo diz como digitar 3 casas decimais.
export function validarNumero({ raw = '', badInput = false, min = null, max = null, teto = null, obrig = false, positivo = false, inteiro = false, decimal = false, dicaCasas = false }) {
  if (badInput) return { valor: null, erro: 'Digite só números.' };
  const r = lerNumeroBR(raw, { decimal });
  if (r.vazio) return obrig ? { valor: null, erro: 'Preencha este campo.' } : { valor: 0 };
  // Erro ambíguo ("1,125"): em campo não monetário, diz também como digitar 3 casas decimais (CC-NUM-01).
  // Em R$ (ou com "R$" digitado) fica a mensagem do reteste 8749b7e: "1,500" pode ser mil e quinhentos, e a dica levaria a R$ 1,50.
  const limpo = String(raw).trim();
  if (r.erro === AMBIGUO && dicaCasas && !/^R\$/i.test(limpo)) return { valor: null, erro: `${AMBIGUO}. Se for decimal com 3 casas, acrescente um zero no fim: ${limpo.replace(/[\s\u00a0]/g, '')}0.` };
  if (r.erro) return { valor: null, erro: r.erro };
  const n = r.n;
  if (inteiro && !Number.isInteger(n)) return { valor: null, erro: 'Use um número inteiro.' };
  if (min !== null && n < min) return { valor: null, erro: min === 0 ? 'O valor não pode ser negativo.' : `O mínimo é ${fmt(min)}.` };
  if (positivo && n <= 0) return { valor: null, erro: 'Informe um valor maior que zero.' };
  if (teto !== null && n > teto) return { valor: null, erro: `Valor muito alto: o máximo aceito é ${fmt(teto)}.` };
  const extra = r.alerta ? { alerta: r.alerta } : {};
  if (max !== null && n > max) return { valor: max, original: n, aviso: `O máximo é ${fmt(max)}; o cálculo usou ${fmt(max)}.`, ...extra };
  return { valor: n, ...extra };
}

// Lê o atributo numérico (min/max) de um input; null se ausente ou inválido.
export const attrNum = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));


// ---- Datas (CC-CALC-VALIDA-01): o mesmo padrão de erro dos campos numéricos (mensagem no campo, aria-invalid e link na
// lista de erros). Intervalo aceito igual ao min/max dos inputs date publicados.
export const DATA_MIN = '1900-01-01';
export const DATA_MAX = '2100-12-31';
const dataBR = (s) => s.split('-').reverse().join('/');
// Chave numérica AAAAMMDD de uma data AAAA-MM-DD (ano com 4 dígitos ou mais, como o Chromium aceita) que existe no
// calendário; null se o texto não é uma data ou a data não existe (31/04, 29/02 fora de ano bissexto).
function chaveData(s) {
  const m = /^(\d{4,})-(\d{2})-(\d{2})$/.exec(String(s ?? ''));
  if (!m) return null;
  const [a, me, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const bissexto = (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
  const diasMes = [31, bissexto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][me - 1];
  if (!diasMes || d < 1 || d > diasMes) return null;
  return a * 10000 + me * 100 + d;
}
// campo: { raw (value do input date, AAAA-MM-DD ou vazio), badInput (validity.badInput: o navegador deixa o value vazio
// quando a data foi digitada pela metade ou não existe), obrig, min, max }. Retorna { valor } (a data, ou '' se vazia e
// opcional) ou { valor: '', erro }.
export function validarData({ raw = '', badInput = false, obrig = false, min = DATA_MIN, max = DATA_MAX }) {
  const s = String(raw ?? '').trim();
  const invalida = { valor: '', erro: 'Data incompleta ou inexistente: confira dia, mês e ano.' };
  if (badInput) return invalida;
  if (s === '') return obrig ? { valor: '', erro: 'Preencha a data.' } : { valor: '' };
  const k = chaveData(s);
  if (k === null) return invalida;
  const mn = chaveData(min) === null ? DATA_MIN : min;
  const mx = chaveData(max) === null ? DATA_MAX : max;
  if (k < chaveData(mn) || k > chaveData(mx)) return { valor: '', erro: `Informe uma data entre ${dataBR(mn)} e ${dataBR(mx)}.` };
  return { valor: s };
}
// Regra cruzada entre duas datas já validadas (ex.: desligamento x admissão): a data fim não pode ser anterior à
// data início; o mesmo dia passa. Retorna null ou { erro }, que vai no campo da data fim.
export function validarOrdemDatas({ inicio, fim, rotuloInicio = 'data inicial' }) {
  const a = chaveData(inicio);
  const b = chaveData(fim);
  if (a === null || b === null || b >= a) return null;
  const r = String(rotuloInicio).trim();
  return { erro: `A data não pode ser anterior à ${r.charAt(0).toLowerCase()}${r.slice(1)} (${dataBR(inicio)}).` };
}

// ---- Rescisão: férias vencidas × datas (N-02), com a data projetada do aviso (R-2/R-3; art. 487 § 1º, OJ 82)
const iso = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? s : null);
const addAnosISO = (s, k) => { const d = parseData(s); d.setUTCFullYear(d.getUTCFullYear() + k); return d; };
// Períodos aquisitivos de 12 meses completos até a data (inclusive).
export function periodosAquisitivosCompletos(admissao, data) {
  if (!iso(admissao) || !iso(data) || parseData(data) < parseData(admissao)) return 0;
  return avosFerias(admissao, data).periodosCompletos;
}
// Períodos cujo prazo de concessão (12 meses após o fim do período aquisitivo) terminou até a data, exclusive.
export function periodosComPrazoVencido(admissao, data) {
  if (!iso(admissao) || !iso(data) || parseData(data) < parseData(admissao)) return 0;
  const d = parseData(data).getTime();
  let k = 0;
  while (addAnosISO(admissao, k + 2).getTime() - 864e5 < d) k++;
  return k;
}
const pl = (n, s, p) => `${n} ${n === 1 ? s : p}`;
const br = (s) => s.split('-').reverse().join('/');
// desligamento: último dia trabalhado; fimProjetado: fim da projeção do aviso (igual ao desligamento sem aviso indenizado).
// Retorna null (ok) ou { campo, erro }.
export function validarFeriasVencidas({ admissao, desligamento, fimProjetado = desligamento, periodos = 0, emDobro = [] }) {
  if (!iso(admissao) || !iso(desligamento) || parseData(desligamento) < parseData(admissao)) return null;
  const fim = iso(fimProjetado) || desligamento;
  const n = Math.max(0, Math.floor(Number(periodos) || 0));
  const sim = emDobro.slice(0, Math.min(2, n)).filter(Boolean).length;
  const total = periodosAquisitivosCompletos(admissao, fim);
  const naProjecao = Math.max(0, total - periodosAquisitivosCompletos(admissao, desligamento));
  const max = total - naProjecao;
  const dataTxt = fim !== desligamento ? ` (com a projeção do aviso até ${br(fim)})` : '';
  if (n > max) {
    const extra = naProjecao ? ` ${naProjecao === 1 ? 'O período completado' : 'Os períodos completados'} durante a projeção do aviso já ${naProjecao === 1 ? 'entra' : 'entram'} no cálculo automaticamente.` : '';
    return { campo: 'feriasVencidas', erro: max === 0
      ? `Pelas datas informadas${dataTxt}, não há período de férias vencido para informar. Use 0.${extra}`
      : `Pelas datas informadas${dataTxt}, informe no máximo ${pl(max, 'período vencido', 'períodos vencidos')}.${extra}` };
  }
  const v = Math.min(periodosComPrazoVencido(admissao, fim), max);
  if (sim > v) {
    return { campo: 'dobro1', erro: v === 0
      ? `Pelas datas informadas${dataTxt}, nenhum período teve o prazo de concessão encerrado. Marque Não.`
      : `Pelas datas informadas${dataTxt}, só ${pl(v, 'período teve', 'períodos tiveram')} o prazo de concessão encerrado. Marque Sim em no máximo ${v}.` };
  }
  return null;
}

// Rescisão: férias vencidas = 0 com período aquisitivo completo até o desligamento real, sem a projeção do aviso
// (CC-CALC-TRABALHISTA-08). Só alerta, sem bloquear: as férias desse período podem ter sido tiradas. Retorna null ou
// { campo: 'feriasVencidas', alerta } com o fim do último período completo.
export function alertaFeriasVencidas({ admissao, desligamento, periodos = 0 }) {
  if (!iso(admissao) || !iso(desligamento) || parseData(desligamento) < parseData(admissao)) return null;
  if (Math.max(0, Math.floor(Number(periodos) || 0)) !== 0) return null;
  const k = periodosAquisitivosCompletos(admissao, desligamento);
  if (k < 1) return null;
  const fim = br(addDias(addMeses(parseData(admissao), 12 * k), -1).toISOString().slice(0, 10));
  return { campo: 'feriasVencidas', alerta: k === 1
    ? `Pelas datas informadas, um período aquisitivo de férias se completou até o desligamento (terminou em ${fim}). Se essas férias não foram tiradas, informe 1 período vencido: com 0, o resultado não as inclui.`
    : `Pelas datas informadas, ${k} períodos aquisitivos de férias se completaram até o desligamento (o último terminou em ${fim}). Se as férias de algum deles não foram tiradas, informe quantos: com 0, o resultado não as inclui.` };
}

// Rescisão: aviso prévio x motivo do desligamento pela matriz AVISOS_POR_MOTIVO do calc.js (avisosDoMotivo;
// CC-CALC-TRABALHISTA-03).
// Retorna null (ok) ou { campo: 'tipo' | 'aviso', erro }. Aviso omitido vale o padrão do motivo; na justa causa o aviso
// não se aplica.
const MOTIVO_TXT = { semJustaCausa: 'Na demissão sem justa causa', pedidoDemissao: 'No pedido de demissão', acordo: 'No acordo' };
const AVISO_TXT = { indenizado: 'indenizado', trabalhado: 'trabalhado', naoCumprido: 'não cumprido pelo empregado' };
export function validarAviso({ tipo, aviso }) {
  const lista = avisosDoMotivo(tipo);
  if (!lista) return { campo: 'tipo', erro: 'Escolha o motivo do desligamento.' };
  if (aviso == null || !lista.length || lista.includes(aviso)) return null;
  const escolha = `escolha ${lista.map((a) => AVISO_TXT[a]).join(' ou ')}.`;
  if (tipo === 'pedidoDemissao' && aviso === 'indenizado') return { campo: 'aviso', erro: `No pedido de demissão, quem deve o aviso é o empregado: ${escolha}` };
  const prefixo = aviso === 'naoCumprido' ? 'Não cumprido pelo empregado só vale no pedido de demissão (CLT, art. 487, § 2º). ' : '';
  return { campo: 'aviso', erro: `${prefixo}${MOTIVO_TXT[tipo]}, ${escolha}` };
}

// Rescisão: quantos selects de dobra das férias vencidas (1º e 2º período) ficam visíveis, pelo mesmo resultado de
// validarNumero que o cálculo usa (lerNumeroBR, valor limitado ao data-max). null se o campo tem erro: o ui.js não
// esconde nem zera os selects (CC-CALC-TRABALHISTA-12).
export function periodosVisiveisDobra(v, limite = 2) {
  if (!v || v.erro) return null;
  return Math.min(limite, Math.max(0, Math.floor(Number(v.valor) || 0)));
}

// Rescisão: data de pagamento das verbas (CLT, art. 477, § 6º).
export function validarDataPagamento(desligamento, pagamento) {
  if (!iso(pagamento) || !iso(desligamento)) return null;
  const dias = Math.round((parseData(pagamento) - parseData(desligamento)) / 86400000);
  if (dias < 0) return { erro: 'A data de pagamento não pode ser anterior à data do desligamento.' };
  if (dias > 10) return { alerta: `Pagamento ${dias} dias após o desligamento: o prazo legal é de até 10 dias após o término do contrato (CLT, art. 477, § 6º). O cálculo usa a data informada.` };
  return null;
}

// Férias: dias de gozo deste período + dias vendidos (abono) cabem em 30 dias (CC-CALC-FERIAS-01). Os dois campos são
// independentes; a soma acima de 30 é erro no campo dos dias vendidos, sem resultado. Retorna null ou { campo, erro }.
export function validarDiasFerias({ diasGozo, diasAbono }) {
  const g = Math.floor(Number(diasGozo) || 0);
  const a = Math.floor(Number(diasAbono) || 0);
  if (g + a <= 30) return null;
  return { campo: 'diasAbono', erro: `Dias de gozo (${g}) e dias vendidos (${a}) somam ${g + a}: as férias de um período aquisitivo têm no máximo 30 dias. Para tirar 20 e vender 10, informe 20 de gozo e 10 vendidos.` };
}
