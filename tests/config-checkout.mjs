// A-08 (CPO, 23/10/2026): constante única da origem do Worker licitacoes-checkout (produção, workers.dev).
// Origem decidida pelo CPO (delta v2 f832ec11): Worker licitacoes-checkout, criado no deploy pelo Novos Negócios.
// Ao trocar, substituir o valor aqui e nas páginas de PAGINAS_COMPRA; o teste checkout-botao.test.mjs exige que batam.
// Se voltar a ser [ORIGEM_CHECKOUT], a trava de publicação (politica-data.test.mjs) falha por placeholder.
export const ORIGEM_CHECKOUT = 'https://licitacoes-checkout.rds-matioli.workers.dev';
export const PAGINAS_COMPRA = ['licitacoes/cobranca/index.html'];
// Fonte CSP de form-action nas páginas de compra. Enquanto a origem for o placeholder, fica 'none' (um token
// "[ORIGEM_CHECKOUT]" na CSP gera erro de console no navegador); o placeholder no action do form mantém a trava.
export const ORIGEM_PENDENTE = ORIGEM_CHECKOUT === '[ORIGEM_CHECKOUT]';
export const FORM_ACTION_COMPRA = ORIGEM_PENDENTE ? "'none'" : ORIGEM_CHECKOUT;
// Produtos com botão nas páginas de compra (A-08 e Radar anual, CEO 23/10).
export const PRODUTOS_BOTAO = ['radar', 'radar-anual'];
// A-02 (diário CEO 26/10 l.47): preços das páginas de compra referenciados na DEC-CFO aprovada pelo Rodrigo
// (23/10/2026 18h30, via CEO): /workspace/ceo/entregas/DEC-CFO-precos-licitacoes-creditrilha-2026-10-23.md,
// sha256 4b6e3baadb369377ebd1ab28e0f3968085a396cb74d5258ec1ec76da4df3c872. Mudar preço exige nova DEC.
export const DEC_CFO_PRECOS = {
  arquivo: 'DEC-CFO-precos-licitacoes-creditrilha-2026-10-23.md',
  sha256: '4b6e3baadb369377ebd1ab28e0f3968085a396cb74d5258ec1ec76da4df3c872',
  radarMensal: 'R$ 197 por mês',
  radarAnual: 'R$ 1.970 por ano',
  proposta: 'R$ 990 por edital',
  parcelaProposta: 'R$ 495',
};
