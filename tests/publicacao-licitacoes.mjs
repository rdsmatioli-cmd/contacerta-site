// DEC CPO (Bugbot PR #48, 30/10/2026): data de publicação ÚNICA do Licitações, fixa no código. Termos de Venda
// (licitacoes/cobranca/index.html) e aviso (licitacoes/politica.html, pílula e item 12) têm de exibir exatamente este
// valor; o selo (método A) das 7 páginas de /licitacoes/ é calculado sobre politica.html já com esta data. Nenhuma
// comparação com "hoje": mudar a data exige mudar esta constante, as 2 páginas e o selo das 7 páginas no mesmo commit.
export const PUBLICACAO_LICITACOES = '30/10/2026';
// Termos de Venda 1.5 (parecer ADV P0 4e6fa371, item 3, D1): data própria dos Termos = dia da publicação; o aviso
// usa PUBLICACAO_AVISO_LICITACOES. Publicação em outro dia = novo commit com a data nova (aqui e nos Termos).
export const PUBLICACAO_TERMOS_LICITACOES = '07/11/2026';
// Aviso AVISO-LICITACOES-1.12 (adendo ADV 4780ea74 §8): data real do deploy do SHA do aviso, planejado para 11/11/2026
// (LIVE 11/11 12h BRT; limite 12/11 12h, DEC CEO ff164978). Separada da data dos Termos. Se o deploy escorregar,
// troque esta data, o item 12, a pílula e o selo (método A) no mesmo commit: é um SHA novo e exige nova revisão.
export const PUBLICACAO_AVISO_LICITACOES = '11/11/2026';
