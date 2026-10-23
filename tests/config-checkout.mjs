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
