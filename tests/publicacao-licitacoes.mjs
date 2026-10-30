// DEC CPO (Bugbot PR #48, 30/10/2026): data de publicação ÚNICA do Licitações, fixa no código. Termos de Venda
// (licitacoes/cobranca/index.html) e aviso (licitacoes/politica.html, pílula e item 12) têm de exibir exatamente este
// valor; o selo (método A) das 7 páginas de /licitacoes/ é calculado sobre politica.html já com esta data. Nenhuma
// comparação com "hoje": mudar a data exige mudar esta constante, as 2 páginas e o selo das 7 páginas no mesmo commit.
export const PUBLICACAO_LICITACOES = '30/10/2026';
