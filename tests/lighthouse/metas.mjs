// Metas do Lighthouse no CI (job "lighthouse" do .github/workflows/ci.yml), sem dependências.
// Versão fixa 13.5.0 pelo npx: o @lhci/cli 0.15.1 embute o Lighthouse 12.6, que não tem a categoria
// agentic-browsing nem o audit llms-txt.
// Metas por relatório (URL x perfil): SEO >= 0,95, Acessibilidade >= 0,95, CLS < 0,1 e o audit llms-txt
// da categoria agentic-browsing com nota 1. Performance só é registrada: a máquina do CI varia demais.
export const LIGHTHOUSE = '13.5.0';

// 10 URLs: home, 5 calculadoras (inclui /irpf/), 1 tabela, índice do blog e 2 posts.
export const URLS = [
  '/',
  '/salario-liquido/',
  '/rescisao/',
  '/juros-compostos/',
  '/simples-hibrido/',
  '/irpf/',
  '/tabela-inss-2026/',
  '/blog/',
  '/blog/como-calcular-rescisao-2026/',
  '/blog/salario-liquido-2026/',
];

// Páginas noindex do Conta Certa Empregador (E2, flags OFF): mesmas metas, mas o SEO não usa a nota da categoria,
// que o noindex derruba de propósito (audit is-crawlable). Passa se todo audit de SEO com peso tirou 1, menos o
// is-crawlable.
export const URLS_NOINDEX = [
  '/empregador-em-dia/precos/',
  '/empregador-em-dia/avaliacao-rapida-nr1/resultado/',
  '/empregador-em-dia/orcamento-nr1/',
  '/empregador-em-dia/contratar/',
  '/empregador-em-dia/pagamento/',
  '/empregador-em-dia/pagamento/ok/',
  '/empregador-em-dia/pagamento/2/',
  '/empregador-em-dia/painel/',
];
// DEC CPO 31/10 (PR #56, go-live 03/11): páginas indexáveis do Empregador em Dia, mesmas metas das URLS.
export const URLS_EMPREGADOR = [
  '/empregador-em-dia/',
  '/empregador-em-dia/avaliacao-rapida-nr1/',
  '/empregador-em-dia/jornada-42h/',
];
// A-PR35-18: páginas indexáveis do Licitações (/licitacoes/), mesmas metas das URLS.
export const URLS_LICITACOES = [
  '/licitacoes/',
  '/licitacoes/politica.html',
  '/licitacoes/blog/',
  '/licitacoes/blog/como-encontrar-licitacoes.html',
  '/licitacoes/blog/pregoes-material-de-limpeza-pncp.html',
  '/licitacoes/blog/pregao-material-de-expediente-pncp/',
  '/licitacoes/editais/material-de-limpeza.html',
];
export const TODAS_URLS = [...URLS, ...URLS_LICITACOES, ...URLS_EMPREGADOR, ...URLS_NOINDEX];
export const ehNoindex = (url) => URLS_NOINDEX.includes(url);

// mobile = padrão do Lighthouse (Moto G Power, 4G lento simulado); desktop = --preset=desktop.
export const PERFIS = ['mobile', 'desktop'];

export const METAS = { seo: 0.95, acessibilidade: 0.95, clsMax: 0.1, auditLlms: 'llms-txt' };

const num = (v, casas = 2) => v.toFixed(casas).replace('.', ',');

export const nomeRelatorio = (url, perfil) => `${url.replace(/^\/|\/$/g, '').replace(/\//g, '_') || 'home'}__${perfil}.json`;

// Audits com peso na categoria que não tiraram 1 (ajuda a achar a causa sem abrir o relatório).
function reprovados(lhr, categoria) {
  const c = lhr.categories?.[categoria];
  if (!c || !Array.isArray(c.auditRefs)) return [];
  return c.auditRefs
    .filter((r) => r.weight > 0 && typeof lhr.audits?.[r.id]?.score === 'number' && lhr.audits[r.id].score < 1)
    .map((r) => r.id);
}

// Devolve a lista de metas violadas (vazia = passou), em texto para o log do CI.
export function avaliar(lhr, metas = METAS, { noindex = false } = {}) {
  if (!lhr || typeof lhr !== 'object') return ['relatório ilegível'];
  const falhas = [];
  if (lhr.lighthouseVersion !== LIGHTHOUSE) falhas.push(`Lighthouse ${lhr.lighthouseVersion ?? '?'}, esperado ${LIGHTHOUSE}`);
  if (lhr.runtimeError) falhas.push(`erro do Lighthouse: ${lhr.runtimeError.code ?? ''} ${lhr.runtimeError.message ?? ''}`.trim());
  for (const [id, nome, min] of [['seo', 'SEO', metas.seo], ['accessibility', 'Acessibilidade', metas.acessibilidade]]) {
    const s = lhr.categories?.[id]?.score;
    if (typeof s !== 'number') falhas.push(`${nome}: sem nota`);
    else if (noindex && id === 'seo') {
      const r = reprovados(lhr, id).filter((a) => a !== 'is-crawlable');
      if (r.length) falhas.push(`SEO (noindex): audits abaixo de 1 além do is-crawlable: ${r.join(', ')}`);
    } else if (s < min) {
      const r = reprovados(lhr, id);
      falhas.push(`${nome} ${num(s)} < ${num(min)}${r.length ? ` (audits abaixo de 1: ${r.join(', ')})` : ''}`);
    }
  }
  const cls = lhr.audits?.['cumulative-layout-shift']?.numericValue;
  if (typeof cls !== 'number') falhas.push('CLS: sem valor');
  else if (!(cls < metas.clsMax)) falhas.push(`CLS ${num(cls, 3)} >= ${String(metas.clsMax).replace('.', ',')}`);
  const agentic = lhr.categories?.['agentic-browsing'];
  if (!agentic || !(agentic.auditRefs || []).some((r) => r.id === metas.auditLlms)) {
    falhas.push(`categoria agentic-browsing ausente ou sem o audit ${metas.auditLlms}`);
  }
  const llms = lhr.audits?.[metas.auditLlms];
  if (!llms) falhas.push(`audit ${metas.auditLlms} ausente`);
  else if (llms.score !== 1) {
    const motivo = [llms.scoreDisplayMode, llms.explanation, llms.errorMessage].filter(Boolean).join(': ');
    falhas.push(`${metas.auditLlms} não passou (nota ${llms.score ?? 'nula'}${motivo ? `, ${motivo}` : ''})`);
  }
  return falhas;
}

// Linha do resumo impresso no log.
export function resumo(lhr) {
  const c = lhr?.categories || {};
  const nota = (id) => (typeof c[id]?.score === 'number' ? Math.round(c[id].score * 100) : '-');
  const cls = lhr?.audits?.['cumulative-layout-shift']?.numericValue;
  const llms = lhr?.audits?.['llms-txt']?.score;
  return `perf ${nota('performance')} | a11y ${nota('accessibility')} | bp ${nota('best-practices')} | seo ${nota('seo')} | agentic ${nota('agentic-browsing')} | CLS ${typeof cls === 'number' ? num(cls, 3) : '-'} | llms-txt ${llms ?? '-'}`;
}
