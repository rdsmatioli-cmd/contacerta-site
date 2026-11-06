// DEC CPO (Bugbot PR #48, 30/10/2026): data de publicação ÚNICA do Licitações, fixa no código. Termos de Venda
// (licitacoes/cobranca/index.html) e aviso (licitacoes/politica.html, pílula e item 12) têm de exibir exatamente este
// valor; o selo (método A) das 7 páginas de /licitacoes/ é calculado sobre politica.html já com esta data. Nenhuma
// comparação com "hoje": mudar a data exige mudar esta constante, as 2 páginas e o selo das 7 páginas no mesmo commit.
export const PUBLICACAO_LICITACOES = '30/10/2026';
// Termos de Venda 1.5 (parecer ADV P0 4e6fa371, item 3, D1): data própria dos Termos = dia da publicação; o aviso 1.11
// segue com PUBLICACAO_LICITACOES. Publicação em outro dia = novo commit com a data nova (aqui e nos Termos).
export const PUBLICACAO_TERMOS_LICITACOES = '06/11/2026';
