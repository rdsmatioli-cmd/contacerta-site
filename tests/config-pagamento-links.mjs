// DEC CEO 06/11/2026 20h24 + plano CPO v2 (39c50fff, seção 4): /licitacoes/assinar/ vende por Stripe Payment Links
// (<a href>, sem form, POST, Worker ou SDK). Fonte única das URLs. Vazio = produto não liberado: a página mostra
// "em breve", sem link. S-PL1 (DEC CEO 20h50): só esta constante muda. O HTML do repositório fica sempre com "em breve";
// o build do Pages (pages.yml) roda tools/licitacoes-links-pagamento.mjs no _site e troca cada produto com URL por
// <a class="btn" href="URL">ROTULO</a>. Preços: DEC-CFO 23/10 (config-checkout.mjs, DEC_CFO_PRECOS).
export const LINKS_PAGAMENTO = {
  radarMensal: '', // R$ 197 por mês
  radarAnual: '', // R$ 1.970 por ano
  montagemSinal: '', // R$ 495 no aceite (50% de R$ 990)
  montagemEntrega: '', // R$ 495 na entrega; enviado pelo atendimento, nunca na página
};
export const ROTULOS = {
  radarMensal: 'Assinar o Radar mensal (R$ 197 por mês)',
  radarAnual: 'Assinar o Radar anual (R$ 1.970 por ano)',
  montagemSinal: 'Contratar a Montagem de proposta (R$ 990; R$ 495 no aceite)',
};
export const EM_BREVE = {
  radarMensal: 'Radar mensal (R$ 197 por mês): em breve',
  radarAnual: 'Radar anual (R$ 1.970 por ano): em breve',
  montagemSinal: 'Montagem de proposta (R$ 990; R$ 495 no aceite): em breve',
};
export const NA_PAGINA = ['radarMensal', 'radarAnual', 'montagemSinal'];
export const PAGINA_ASSINAR = 'licitacoes/assinar/index.html';
export const PAGINA_OBRIGADO = 'licitacoes/obrigado/index.html';
export const PAGINAS_SEM_REFERRER = [PAGINA_ASSINAR, PAGINA_OBRIGADO, 'licitacoes/cobranca/index.html'];
