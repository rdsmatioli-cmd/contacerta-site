// DEC CEO 06/11/2026 20h24 + plano CPO v2 (39c50fff, seção 4): /licitacoes/assinar/ vende por Stripe Payment Links
// (<a href>, sem form, POST, Worker ou SDK). Fonte única das URLs. Vazio = produto não liberado: a página mostra
// "em breve", sem link. S-PL1 (DEC CEO 20h50): só esta constante muda. O HTML do repositório fica sempre com "em breve";
// o build do Pages (pages.yml) roda tools/licitacoes-links-pagamento.mjs no _site e troca cada produto com URL por
// <a class="btn" href="URL">ROTULO</a>. Preços: DEC-CFO 23/10 (config-checkout.mjs, DEC_CFO_PRECOS).
// ===== URLs Payment Links: preencher quando a conta live for liberada =====
// S-PL1 (CEO 06/11 21h18): URLs LIVE de /workspace/cfo/stripe/payment-links-live-2026-11-06.md (f8a02598). Links de
// sandbox nunca entram no repositório (preview do QA injeta fora dele); '/test_' falha com DEPLOY=1 e no build do Pages.
// Vazio = "em breve". montagemEntrega (saldo) nunca vai na página: o atendimento envia o link junto com a entrega.
// PR-S0 (DEC CEO 11/11/2026 19h17): venda fechada. Os Payment Links LIVE do Radar (KE, KI) e da Montagem (K1) foram
// desativados na Stripe em 11/11 19h03 e 19h05; os 3 slots ficam vazios e a página mostra só "Em breve", sem link.
// Reabrir a venda = novo PR que preenche os slots, com QA APTO e GO do CEO (tests/pagamento-links.test.mjs trava).
// PR-S1: reabertura só do Radar (radarMensal = KE plink_1UYxKE1UAEXO9bvFta1lo0FO, radarAnual = KI plink_1UYxKI1UAEXO9bvFvyfFaswn).
// montagemSinal e montagemEntrega continuam vazios (Montagem fora do escopo). VENDA_LICITACOES = 'aberta'.
export const LINKS_PAGAMENTO = {
  radarMensal: 'https://buy.stripe.com/00w9AM9B2a7Y2Spfkd5gc03', // R$ 197 por mês
  radarAnual: 'https://buy.stripe.com/dRmeV68wYa7Y50xeg95gc04', // R$ 1.970 por ano
  montagemSinal: '', // R$ 495 no aceite (50% de R$ 990)
  montagemEntrega: '', // R$ 495 na entrega (saldo), só pelo atendimento
};
// 'fechada' = nenhum slot preenchido e nenhuma página de licitacoes/ com buy.stripe.com (teste e build do Pages barram).
// 'aberta' = só radarMensal e radarAnual preenchidos; no _site, buy.stripe.com só em /licitacoes/assinar/.
export const VENDA_LICITACOES = 'aberta';
// ===== fim do slot =====
export const ROTULOS = {
  radarMensal: 'Assinar o Radar mensal (R$ 197 por mês)',
  radarAnual: 'Assinar o Radar anual (R$ 1.970 por ano)',
  montagemSinal: 'Contratar a Montagem de proposta (R$ 990; R$ 495 no aceite)',
};
// PR-S0 (DEC CEO 11/11 19h17): texto exato 'Em breve', sem data.
export const EM_BREVE = {
  radarMensal: 'Em breve',
  radarAnual: 'Em breve',
  montagemSinal: 'Em breve',
};
export const NA_PAGINA = ['radarMensal', 'radarAnual', 'montagemSinal'];
export const PAGINA_ASSINAR = 'licitacoes/assinar/index.html';
export const PAGINA_OBRIGADO = 'licitacoes/obrigado/index.html';
export const PAGINAS_SEM_REFERRER = [PAGINA_ASSINAR, PAGINA_OBRIGADO, 'licitacoes/cobranca/index.html'];
