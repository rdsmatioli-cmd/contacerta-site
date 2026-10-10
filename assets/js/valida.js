// Validação dos campos numéricos das calculadoras (laudo QA 10/10/2026 e reteste: CC-01 a CC-05, N-01, N-02, N-04, N-11).
// Funções puras, testáveis no Node; o ui.js aplica o resultado no formulário.
import { avosFerias, parseData } from './calc.js?v=825856845b';
const fmt = (x) => Number(x).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

// Lê um número digitado no formato brasileiro (N-01).
// "3500,50" → 3500.5 · "3.500" e "3.500,00" → 3500 · "1.234.567,8" → 1234567.8 · "3500.50" → 3500.5 (ponto decimal sem ambiguidade).
// "3.500" com exatamente 3 dígitos após um único ponto e parte inteira sem zero à esquerda é lido como milhar.
// Retorna { n } ou { erro }.
export function lerNumeroBR(raw) {
  let s = String(raw ?? '').trim().replace(/^R\$\s*/i, '').replace(/[\s\u00a0]/g, '');
  if (s === '') return { vazio: true };
  if (!/^[-+]?[\d.,]+$/.test(s) || !/\d/.test(s)) return { erro: 'Digite só números.' };
  const neg = s.startsWith('-');
  s = s.replace(/^[-+]/, '');
  const temVirg = s.includes(',');
  const pontos = (s.match(/\./g) || []).length;
  let norm;
  if (temVirg) {
    if ((s.match(/,/g) || []).length > 1) return { erro: 'Use a vírgula só uma vez, para os centavos.' };
    const [int, dec] = s.split(',');
    // "1,000" sem ponto de milhar é ambíguo (mil no formato americano ou 1 no brasileiro): erro, sem conversão.
    if (!pontos && /^[1-9]\d{0,2}$/.test(int) && /^\d{3}$/.test(dec)) return { erro: 'Formato ambíguo: use 1.000,00 ou 1000' };
    if (pontos && !/^\d{1,3}(\.\d{3})+$/.test(int)) return { erro: 'Ponto só como separador de milhar (ex.: 3.500,50).' };
    if (!/^\d*$/.test(dec)) return { erro: 'Digite só números.' };
    norm = `${int.replace(/\./g, '') || '0'}.${dec || '0'}`;
  } else if (pontos > 1) {
    if (!/^\d{1,3}(\.\d{3})+$/.test(s)) return { erro: 'Ponto só como separador de milhar (ex.: 1.500.000).' };
    norm = s.replace(/\./g, '');
  } else if (pontos === 1) {
    norm = /^[1-9]\d{0,2}\.\d{3}$/.test(s) ? s.replace('.', '') : s;
  } else norm = s;
  const n = Number(norm);
  if (!Number.isFinite(n)) return { erro: 'Digite só números.' };
  return { n: neg ? -n : n };
}

// campo: { raw, min, max, teto, obrig, positivo, inteiro, badInput }
// Retorna { valor, erro?, aviso?, original? }. Erro bloqueia o cálculo; aviso informa que o valor foi limitado ao máximo do campo.
export function validarNumero({ raw = '', badInput = false, min = null, max = null, teto = null, obrig = false, positivo = false, inteiro = false }) {
  if (badInput) return { valor: null, erro: 'Digite só números.' };
  const r = lerNumeroBR(raw);
  if (r.vazio) return obrig ? { valor: null, erro: 'Preencha este campo.' } : { valor: 0 };
  if (r.erro) return { valor: null, erro: r.erro };
  const n = r.n;
  if (inteiro && !Number.isInteger(n)) return { valor: null, erro: 'Use um número inteiro.' };
  if (min !== null && n < min) return { valor: null, erro: min === 0 ? 'O valor não pode ser negativo.' : `O mínimo é ${fmt(min)}.` };
  if (positivo && n <= 0) return { valor: null, erro: 'Informe um valor maior que zero.' };
  if (teto !== null && n > teto) return { valor: null, erro: `Valor muito alto: o máximo aceito é ${fmt(teto)}.` };
  if (max !== null && n > max) return { valor: max, original: n, aviso: `O máximo é ${fmt(max)}; o cálculo usou ${fmt(max)}.` };
  return { valor: n };
}

// Lê o atributo numérico (min/max) de um input; null se ausente ou inválido.
export const attrNum = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));


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

// Rescisão: data de pagamento das verbas (CLT, art. 477, § 6º).
export function validarDataPagamento(desligamento, pagamento) {
  if (!iso(pagamento) || !iso(desligamento)) return null;
  const dias = Math.round((parseData(pagamento) - parseData(desligamento)) / 86400000);
  if (dias < 0) return { erro: 'A data de pagamento não pode ser anterior à data do desligamento.' };
  if (dias > 10) return { alerta: `Pagamento ${dias} dias após o desligamento: o prazo legal é de até 10 dias após o término do contrato (CLT, art. 477, § 6º). O cálculo usa a data informada.` };
  return null;
}
