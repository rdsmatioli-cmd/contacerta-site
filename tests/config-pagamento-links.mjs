// DEC CEO 06/11/2026 20h24: /licitacoes/assinar/ vende por Stripe Payment Links (links <a>, sem form e sem Worker).
// Fonte única das 4 URLs. PLACEHOLDER_ até o CEO enviar os links live; trocar aqui e nas páginas no mesmo commit
// (tests/pagamento-links.test.mjs exige que batam). Com placeholder, o build do Pages falha (LINKS_PAGAMENTO_PRODUCAO=1).
// Preços: DEC-CFO 23/10 (config-checkout.mjs, DEC_CFO_PRECOS).
export const LINKS_PAGAMENTO = {
  radarMensal: 'https://buy.stripe.com/PLACEHOLDER_RADAR_MENSAL', // R$ 197 por mês
  radarAnual: 'https://buy.stripe.com/PLACEHOLDER_RADAR_ANUAL', // R$ 1.970 por ano
  montagemSinal: 'https://buy.stripe.com/PLACEHOLDER_MONTAGEM_SINAL', // R$ 495 (50% de R$ 990, no aceite)
  montagemEntrega: 'https://buy.stripe.com/PLACEHOLDER_MONTAGEM_ENTREGA', // R$ 495 (50% na entrega; enviado pelo atendimento, não vai na página)
};
export const NA_PAGINA = ['radarMensal', 'radarAnual', 'montagemSinal'];
export const PAGINA_ASSINAR = 'licitacoes/assinar/index.html';
export const PAGINA_OBRIGADO = 'licitacoes/assinar/obrigado/index.html';
