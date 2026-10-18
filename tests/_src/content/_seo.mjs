// SEO da auditoria de 17/10/2026 (PR #25, b863412): fragmentos que o PR editou direto no HTML publicado e que o
// gerador precisa produzir para não apagá-los. Espelho do futuro src/content/_seo.mjs; começa com "_", então o build
// não trata este arquivo como página. Só funções puras e constantes: nada de ler arquivo nem rede. Títulos, resumos e
// categorias chegam por parâmetro (no build, dos posts que passaram no portão, na ordem do índice do blog).
// tests/fonte-seo.test.mjs prova que cada função reproduz, byte a byte, o que está publicado; o passo a passo do porte
// está em tests/_src/PORTAR-PR25.md.
// O gerador não foi encontrado (18/10/2026): o HTML do repositório é a fonte oficial e a regra do lastmod (seção 7)
// é aplicada por tests/manutencao/lastmod.mjs.
import { card, icone, COR_CAT } from './_visual.mjs';

export const SITE = 'https://contacertabr.com.br/';

// ---------- 1. Speculation Rules (todas as páginas fora de /licitacoes/, inclusive o 404)
// Só prefetch, eagerness moderate, só URLs do próprio site, sem /licitacoes/, sem .xml e sem links com ? ou #.
// A ordem das chaves é a do JSON publicado (JSON.stringify não reordena).
export const REGRAS_ESPECULACAO = Object.freeze({
  prefetch: [{
    where: { and: [
      { href_matches: '/*' },
      { not: { href_matches: '/licitacoes{/*}?' } },
      { not: { href_matches: '/*.xml' } },
      { not: { selector_matches: "[href*='?'],[href*='#']" } },
    ] },
    eagerness: 'moderate',
  }],
});
export const LINHA_ESPECULACAO = `<script type="speculationrules">${JSON.stringify(REGRAS_ESPECULACAO)}</script>\n`;
// caminho: rota ('/licitacoes/', '/404.html', '/') ou arquivo de saída ('licitacoes/index.html', '404.html').
export const foraDaEspeculacao = (caminho) => /^licitacoes(\/|$)/.test(String(caminho).replace(/^\/+/, ''));
// Vai imediatamente antes de </head>, depois do bloco do GA4 (headGa4 termina em "\n").
export const speculationRules = (caminho) => (foraDaEspeculacao(caminho) ? '' : LINHA_ESPECULACAO);

// ---------- 2. Card de post (calculadoras e home)
// É o card() de _visual.mjs: slug = href do post sem as barras das pontas, ícone "documento" e a cor da categoria
// do post (COR_CAT). Nos 5 pares publicados a categoria do post é a mesma da calculadora.
const corDe = (categoria) => {
  const cor = COR_CAT[categoria];
  if (!cor) throw new Error(`categoria sem cor em COR_CAT: ${categoria}`);
  return cor;
};
const slugDoHref = (href) => {
  if (!/^\/blog\/[a-z0-9-]+\/$/.test(href)) throw new Error(`href de post inválido: ${href}`);
  return href.slice(1, -1);
};
export const cardPost = ({ href, titulo, categoria }, legenda) =>
  card({ slug: slugDoHref(href), nome: titulo, resumo: legenda, cor: corDe(categoria), iconeNome: 'documento' });

// ---------- 3. "Guia completo" nas calculadoras
// Calculadora -> post do blog. Cada par foi conferido lendo os dois lados (o post também linka a calculadora).
export const GUIA_DA_CALCULADORA = Object.freeze({
  rescisao: '/blog/como-calcular-rescisao-2026/',
  'decimo-terceiro': '/blog/decimo-terceiro-2026/',
  'salario-liquido': '/blog/salario-liquido-2026/',
  'nr1-riscos-psicossociais': '/blog/nr1-riscos-psicossociais-2026/',
  'simples-hibrido': '/blog/simples-hibrido-ou-puro-2027/',
});
// post = { href, titulo, resumo, categoria }: titulo é o h1 do post, resumo é o texto do card do índice do blog
// (no 13º ele difere da meta description) e categoria é a do card do índice. Sem post (calculadora sem guia ou
// post fora do portão), devolve ''. Vai imediatamente antes de <section class="relacionadas" aria-labelledby="rel-t">.
// Markup literal na moldura: _visual.mjs não tem helper de seção; a moldura repete a das relacionadas do build
// (h2 e <ul> separados por "\n"), com a classe extra guia-completo e o id guia-t.
export function secaoGuiaCompleto(post) {
  if (!post) return '';
  return `<section class="relacionadas guia-completo" aria-labelledby="guia-t"><h2 id="guia-t">Guia completo</h2>\n<ul class="cards">${cardPost(post, post.resumo)}</ul>\n</section>\n`;
}
// Atalho para o build: acha o post da calculadora entre os publicados.
export const guiaDaCalculadora = (slug, posts) => {
  const href = GUIA_DA_CALCULADORA[slug];
  return href ? posts.find((p) => p.href === href) : undefined;
};

// ---------- 4. "Guias recentes" na home (depois da seção das tabelas, antes de "Por que usar estas calculadoras")
export const RECENTES = 6;
// posts = [{ href, titulo, categoria }] na ordem do índice do blog; só os RECENTES primeiros entram.
// O card mostra a categoria no lugar do resumo. Título da seção literal: tituloSecao() tira o ícone de
// ICONE_CAT[cor] ("tabela" para a cor tabelas), e o bloco publicado usa o ícone "documento" com a cor tabelas.
// A moldura é a das outras seções da home (sem "\n" entre o título e a lista).
export function blocoGuiasRecentes(posts) {
  const lista = posts.slice(0, RECENTES);
  if (!lista.length) return '';
  return `<section class="secao" aria-labelledby="guias"><div class="sec-titulo"><span class="tile t-tabelas">${icone('documento')}</span><h2 id="guias">Guias recentes</h2></div><ul class="cards">${lista.map((p) => cardPost(p, p.categoria)).join('')}</ul></section>\n`;
}

// ---------- 5. JSON-LD da home: LCM Global Services dona da marca
// Dados já publicados em /sobre/ e /privacidade/ (o teste confere). CNPJ e razão social só neste nó; sem sameAs.
export const LCM = Object.freeze({ nome: 'LCM Global Services', razaoSocial: 'RODRIGO DE SIMONE MATIOLI LTDA', cnpj: '61.193.879/0001-20' });
export const idMarca = (site = SITE) => `${site}#organizacao`;
export const idLcm = (site = SITE) => `${site}#lcm`;
export const noLcm = (site = SITE) => ({
  '@context': 'https://schema.org', '@type': 'Organization', '@id': idLcm(site),
  name: LCM.nome, legalName: LCM.razaoSocial, taxID: LCM.cnpj, subOrganization: { '@id': idMarca(site) },
});
// parentOrganization entra como ÚLTIMA chave do nó da marca (depois de email), como está publicado.
export const comParentOrganization = (org, site = SITE) => ({ ...org, parentOrganization: { '@id': idLcm(site) } });
// nos = nós JSON-LD da home, na ordem dos <script>. Devolve a lista com parentOrganization no nó da marca e o nó da
// LCM logo depois dele (antes do WebSite). Única mudança do PR no JSON-LD do site.
export function nosJsonLdHome(nos, site = SITE) {
  const i = nos.findIndex((n) => n['@id'] === idMarca(site));
  if (i < 0) throw new Error(`nó ${idMarca(site)} ausente`);
  if (nos.some((n) => n['@id'] === idLcm(site))) throw new Error(`nó ${idLcm(site)} já presente`);
  return [...nos.slice(0, i), comParentOrganization(nos[i], site), noLcm(site), ...nos.slice(i + 1)];
}
// Serialização usada na home: um <script> por nó, JSON.stringify sem espaços.
export const scriptLdJson = (no) => `<script type="application/ld+json">${JSON.stringify(no)}</script>`;

// ---------- 6. CSS (fim de src/css/style.css, com a linha em branco antes do comentário)
export const CSS_GUIA_COMPLETO = '\n/* Guia completo nas calculadoras: um card só (post do blog), na largura do texto. */\n.relacionadas.guia-completo .cards{grid-template-columns:1fr;max-width:780px}\n';

// ---------- 7. sitemap.xml: lastmod
// Regra: maior entre a data do último commit sem merge que mudou o arquivo com mudança significativa e as datas
// do próprio documento (dateModified/datePublished, article:*_time). Não é significativo o commit que só troca ?v=,
// só acrescenta a linha do speculationrules ou só reordena os <symbol> do sprite (o porte reordena o sprite de 5
// páginas: ver PORTAR-PR25.md). mudancaSignificativa(antes, depois) compara as duas versões do arquivo.
export const LASTMOD_PR25 = '2026-10-18';
export const PAGINAS_PR25 = Object.freeze(['/', '/salario-liquido/', '/rescisao/', '/decimo-terceiro/', '/ferias/', '/seguro-desemprego/', '/nr1-riscos-psicossociais/', '/simples-hibrido/']);
// sprite() de _visual.mjs põe os <symbol> na ordem do primeiro uso no HTML. O PR #25 acrescentou os símbolos novos
// no fim do sprite, à mão. Nestas 5 páginas o card novo antecipa o primeiro uso de "seta" (Guia completo antes das
// relacionadas) ou de "calendario" (aviso prévio no meio das relacionadas), então o build portado sai com os mesmos
// símbolos em outra ordem. É a única diferença esperada entre o build e a main.
// Nelas o teste aceita as duas ordens. Depois que a saída do build for publicada, esvazie a lista (aqui e em
// src/content/_seo.mjs) para o teste voltar a exigir a ordem exata também nelas.
export const SPRITE_FORA_DE_ORDEM = Object.freeze(['nr1-riscos-psicossociais/index.html', 'rescisao/index.html', 'salario-liquido/index.html', 'seguro-desemprego/index.html', 'simples-hibrido/index.html']);
// Sprite com os <symbol> em ordem alfabética de id (a ordem não muda nada na página).
export function ordenaSprite(html) {
  return String(html).replace(/(<svg class="sprite"[^>]*>)((?:<symbol\b[^]*?<\/symbol>)*)(<\/svg>)/g, (_, a, simbolos, z) =>
    a + (simbolos.match(/<symbol\b[^]*?<\/symbol>/g) || []).sort((x, y) => (x.match(/id="([^"]+)"/)[1] < y.match(/id="([^"]+)"/)[1] ? -1 : 1)).join('') + z);
}
export const normalizaLastmod = (html) => ordenaSprite(html).replace(/\?v=[0-9a-f]{10}\b/g, '?v=').split(LINHA_ESPECULACAO).join('');
export const mudancaSignificativa = (antes, depois) => normalizaLastmod(antes) !== normalizaLastmod(depois);
// Datas do próprio documento: dateModified/datePublished dos objetos-raiz do JSON-LD (o objeto, os itens da lista ou
// os do @graph; os blogPost aninhados no índice e nas categorias do blog não contam) e article:*_time, em AAAA-MM-DD.
// Mesma leitura do teste do sitemap em integridade-site.test.mjs. JSON-LD inválido lança erro (não some com a data).
export function datasDoDocumento(html) {
  const datas = [];
  for (const m of String(html).matchAll(/<script type="application\/ld\+json">([^]*?)<\/script>/g)) {
    const j = JSON.parse(m[1]);
    const raizes = Array.isArray(j) ? j : Array.isArray(j?.['@graph']) ? j['@graph'] : [j];
    for (const r of raizes) for (const k of ['dateModified', 'datePublished']) if (typeof r?.[k] === 'string') datas.push(r[k].slice(0, 10));
  }
  for (const m of String(html).matchAll(/<meta\b[^>]*property="article:(?:modified|published)_time"[^>]*content="([^"]+)"/g)) datas.push(m[1].slice(0, 10));
  return datas;
}
// lastmod pela regra: a maior entre a data do commit (AAAA-MM-DD do último commit com mudança significativa) e as
// datas do documento. Sem data nenhuma, undefined.
export const lastmodPelaRegra = (dataCommit, html) => [dataCommit, ...datasDoDocumento(html)].filter(Boolean).sort().at(-1);
