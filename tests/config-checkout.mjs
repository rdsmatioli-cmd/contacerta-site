// A-08 (CPO, 23/10/2026): constante única da origem do Worker licitacoes-checkout (produção, workers.dev).
// BLOQUEIO: o Worker de produção ainda não existe na conta (leitura sancionada em 23/10: só licitacoes-checkout-teste).
// Ao trocar, substituir o valor aqui e nas páginas de PAGINAS_COMPRA; o teste checkout-botao.test.mjs exige que batam.
// Enquanto for [ORIGEM_CHECKOUT], a trava de publicação (politica-data.test.mjs) falha por placeholder.
export const ORIGEM_CHECKOUT = '[ORIGEM_CHECKOUT]';
export const PAGINAS_COMPRA = ['licitacoes/cobranca/index.html'];
