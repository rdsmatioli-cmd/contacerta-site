// Fonte do PR #25 para o gerador: tests/_src/content/_seo.mjs reproduz, byte a byte, o que o PR editou direto no
// HTML publicado (speculationrules, "Guia completo", "Guias recentes", JSON-LD da LCM, CSS, aviso prévio nas
// relacionadas e lastmod do sitemap). Se este arquivo passa, copiar _seo.mjs para src/content/ e chamá-lo nos pontos
// de tests/_src/PORTAR-PR25.md faz o build gerar o mesmo HTML; a única diferença esperada é a ordem dos <symbol> do
// sprite nas páginas de SPRITE_FORA_DE_ORDEM.
// Os dados dos posts (href, título, resumo, categoria) vêm do índice do blog publicado, como no build vêm dos posts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as S from './_src/content/_seo.mjs';
import { card, sprite, COR_CAT } from './_src/content/_visual.mjs';
import rescisaoFonte from './_src/content/rescisao.mjs';
import feriasFonte from './_src/content/ferias.mjs';
import decimoFonte from './_src/content/decimo-terceiro.mjs';
import dasMeiFonte from './_src/content/das-mei.mjs';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const ler = (p) => readFileSync(join(raiz, p), 'utf8');
const listar = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  if (d.name === '.git' || d.name === 'node_modules') return [];
  const p = join(dir, d.name);
  if (d.isDirectory()) return listar(p);
  return d.name.endsWith('.html') && !d.name.startsWith('google') ? [relative(raiz, p).split(sep).join('/')] : [];
});
const paginas = listar(raiz).sort();
const ehLicitacoes = (p) => p.startsWith('licitacoes/');
const conta = (s, x) => s.split(x).length - 1;
// Texto do HTML publicado -> valor da fonte (card() escapa de novo &, <, > e ").
const texto = (s) => s.replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[e]);

// Posts na ordem do índice do blog: { href, categoria, titulo, resumo } (o título do card é o h1 do post).
const posts = [...ler('blog/index.html').matchAll(/<li><a class="post-card" href="(\/blog\/[^"]+\/)"><small>([^<]+)<\/small><strong>([^<]+)<\/strong><span>([^<]+)<\/span>/g)]
  .map((m) => ({ href: m[1], categoria: texto(m[2]), titulo: texto(m[3]), resumo: texto(m[4]) }));
const home = ler('index.html');
const REL_INI = '<section class="relacionadas" aria-labelledby="rel-t">';

test('índice do blog lido: posts com href, categoria, título e resumo', () => {
  assert.ok(posts.length >= 1, 'índice do blog sem posts');
  for (const p of posts) assert.ok(p.titulo && p.resumo && COR_CAT[p.categoria], p.href);
});

// ---------- 1. Speculation Rules
test('speculationrules: a linha do _seo.mjs, idêntica, logo antes de </head> em toda página fora de /licitacoes/', () => {
  const fora = paginas.filter((p) => !ehLicitacoes(p));
  assert.ok(fora.includes('404.html') && fora.includes('index.html') && fora.length >= 50);
  const falhas = [];
  for (const p of fora) {
    const html = ler(p);
    const linha = S.speculationRules(p);
    if (!linha || conta(html, 'speculationrules') !== 1 || !html.includes(`defer></script>\n${linha}</head>`)) falhas.push(p);
    if (S.speculationRules(`/${p.replace(/index\.html$/, '')}`) !== linha) falhas.push(`${p}: rota e arquivo divergem`);
  }
  assert.deepEqual(falhas, []);
  assert.deepEqual(JSON.parse(S.LINHA_ESPECULACAO.match(/^<script type="speculationrules">(.*)<\/script>\n$/)[1]), S.REGRAS_ESPECULACAO);
});

test('speculationrules: nada em /licitacoes/', () => {
  const lic = paginas.filter(ehLicitacoes);
  assert.ok(lic.length >= 1);
  for (const p of lic) {
    assert.equal(S.speculationRules(p), '', p);
    assert.equal(S.speculationRules(`/${p}`), '', p);
    assert.doesNotMatch(ler(p), /speculationrules/, p);
  }
  for (const r of ['/licitacoes/', '/licitacoes', 'licitacoes/blog/index.html']) assert.equal(S.speculationRules(r), '', r);
  for (const r of ['/', '/404.html', '404.html', '/licitacoes-x/', '/blog/']) assert.equal(S.speculationRules(r), S.LINHA_ESPECULACAO, r);
});

// ---------- 2. Guia completo
for (const [slug, href] of Object.entries(S.GUIA_DA_CALCULADORA)) {
  test(`${slug}: seção "Guia completo" idêntica e logo antes das relacionadas`, () => {
    const html = ler(`${slug}/index.html`);
    const post = S.guiaDaCalculadora(slug, posts);
    assert.equal(post?.href, href, 'post fora do índice do blog');
    const secao = S.secaoGuiaCompleto(post);
    assert.equal(conta(html, secao), 1);
    assert.ok(html.includes(`</section>\n${secao}${REL_INI}`), 'fora do lugar: depois das fontes, antes das relacionadas');
    assert.equal(conta(html, 'aria-labelledby="guia-t"'), 1);
    // Mesma cor da categoria da calculadora (cat-pill), nos 5 pares.
    assert.ok(html.includes(`<p class="cat-pill t-${COR_CAT[post.categoria]}">${post.categoria}</p>`), 'categoria do post difere da calculadora');
  });
}

test('GUIA_DA_CALCULADORA cobre exatamente as páginas com "Guia completo"; sem post, nada', () => {
  const com = paginas.filter((p) => ler(p).includes('aria-labelledby="guia-t"')).map((p) => p.replace(/\/index\.html$/, '')).sort();
  assert.deepEqual(com, Object.keys(S.GUIA_DA_CALCULADORA).sort());
  assert.equal(S.secaoGuiaCompleto(undefined), '');
  assert.equal(S.guiaDaCalculadora('fgts', posts), undefined);
  assert.equal(S.guiaDaCalculadora('rescisao', posts.filter((p) => p.href !== S.GUIA_DA_CALCULADORA.rescisao)), undefined, 'post fora do portão');
  assert.throws(() => S.cardPost({ href: '/blog/x/', titulo: 't', categoria: 'Sem cor' }, 'r'));
  assert.throws(() => S.cardPost({ href: 'blog/x', titulo: 't', categoria: 'Tabelas' }, 'r'));
});

// ---------- 3. Guias recentes na home
test('home: bloco "Guias recentes" idêntico, entre as tabelas oficiais e "Por que usar estas calculadoras"', () => {
  const bloco = S.blocoGuiasRecentes(posts);
  assert.equal(conta(home, bloco), 1);
  const ini = home.indexOf('<section class="secao" aria-labelledby="tabelas">');
  const fimTabelas = home.indexOf('</section>\n', ini) + '</section>\n'.length;
  assert.ok(ini > 0 && home.startsWith(bloco, fimTabelas), 'bloco logo depois da seção das tabelas');
  assert.ok(home.startsWith('<section class="texto porque">', fimTabelas + bloco.length), 'antes de "Por que usar"');
});

test('blocoGuiasRecentes: só os RECENTES primeiros, na ordem recebida; sem posts, nada', () => {
  const extras = [1, 2, 3].map((i) => ({ href: `/blog/extra-${i}/`, titulo: `Extra ${i}`, categoria: 'Impostos e MEI' }));
  const html = S.blocoGuiasRecentes([...posts, ...extras]);
  assert.equal(S.RECENTES, 6);
  assert.deepEqual([...html.matchAll(/<a class="card" href="([^"]+)"/g)].map((m) => m[1]), [...posts, ...extras].slice(0, 6).map((p) => p.href));
  assert.equal(S.blocoGuiasRecentes([]), '');
});

// ---------- 4. JSON-LD da home
const blocosLd = (html) => [...html.matchAll(/<script type="application\/ld\+json">([^]*?)<\/script>/g)].map((m) => m[1]);
test('JSON-LD da home: igual (deep-equal e byte a byte) ao que nosJsonLdHome monta', () => {
  const publicados = blocosLd(home);
  const nos = publicados.map((b) => JSON.parse(b));
  // Estado anterior ao PR: sem o nó da LCM e sem parentOrganization na marca (o resto vem do build como está).
  const antes = nos.filter((n) => n['@id'] !== S.idLcm()).map(({ parentOrganization, ...n }) => n);
  assert.equal(antes.length, nos.length - 1);
  const montados = S.nosJsonLdHome(antes);
  assert.deepEqual(montados, nos);
  assert.deepEqual(montados.map((n) => JSON.stringify(n)), publicados, 'mesmos bytes (ordem das chaves)');
  assert.equal(conta(home, montados.map(S.scriptLdJson).join('\n')), 1, 'blocos seguidos, separados por "\\n"');
  const i = montados.findIndex((n) => n['@id'] === S.idMarca());
  assert.deepEqual(montados[i + 1], S.noLcm(), 'nó da LCM logo depois do nó da marca');
  assert.deepEqual(Object.keys(montados[i]).at(-1), 'parentOrganization');
  assert.throws(() => S.nosJsonLdHome(nos), /já presente/);
  assert.throws(() => S.nosJsonLdHome(antes.filter((n) => n['@id'] !== S.idMarca())), /ausente/);
});

test('dados da LCM no _seo.mjs são os já publicados em /sobre/ e /privacidade/', () => {
  const visivel = (p) => ler(p).replace(/<script\b[^>]*>[^]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert.ok(visivel('sobre/index.html').includes(`${S.LCM.nome} (${S.LCM.razaoSocial}, CNPJ ${S.LCM.cnpj})`));
  assert.ok(visivel('privacidade/index.html').includes(`${S.LCM.razaoSocial} (${S.LCM.nome}), CNPJ ${S.LCM.cnpj}`));
});

test('fora da home, o PR não mexeu em JSON-LD: nenhum outro nó cita a LCM', () => {
  for (const p of paginas.filter((x) => x !== 'index.html')) assert.doesNotMatch(ler(p), /#lcm"/, p);
});

// ---------- 5. Relacionadas dos módulos espelhados (com o aviso prévio do PR)
// Cada card das relacionadas é o card() da calculadora com o nome, o resumo e a cor do card dela na home.
const cardHome = (slug) => {
  const m = home.match(new RegExp(`<li><a class="card" href="/${slug}/"><span class="tile t-([a-z]+)">[^]*?<strong>([^<]+)</strong><span>([^<]+)</span>`));
  assert.ok(m, `/${slug}/ sem card na home`);
  return card({ slug, nome: texto(m[2]), resumo: texto(m[3]), cor: m[1] });
};
for (const f of [rescisaoFonte, feriasFonte, decimoFonte, dasMeiFonte]) {
  test(`${f.slug}: relacionadas do módulo espelhado iguais ao HTML, byte a byte`, () => {
    const secao = `${REL_INI}<h2 id="rel-t">Calculadoras relacionadas</h2>\n<ul class="cards">${f.relacionadas.map(cardHome).join('')}</ul>\n</section>`;
    assert.equal(conta(ler(`${f.slug}/index.html`), secao), 1);
  });
}

test('aviso prévio nas relacionadas: 2º em rescisão e seguro-desemprego, último em férias', () => {
  const ordem = (slug) => {
    const s = ler(`${slug}/index.html`).match(/<section class="relacionadas" aria-labelledby="rel-t">[^]*?<\/section>/)[0];
    return [...s.matchAll(/<a class="card" href="\/([^"]+)\/"/g)].map((m) => m[1]);
  };
  assert.equal(ordem('rescisao').indexOf('aviso-previo'), 1);
  assert.equal(ordem('seguro-desemprego').indexOf('aviso-previo'), 1);
  assert.equal(ordem('ferias').indexOf('aviso-previo'), ordem('ferias').length - 1);
  assert.deepEqual(ordem('rescisao'), rescisaoFonte.relacionadas);
  assert.deepEqual(ordem('ferias'), feriasFonte.relacionadas);
  // seguro-desemprego.mjs não está espelhado: a lista esperada fica registrada aqui para o porte.
  assert.deepEqual(ordem('seguro-desemprego'), ['rescisao', 'aviso-previo', 'fgts', 'salario-liquido', 'das-mei', 'juros-compostos']);
});

// ---------- 6. CSS
// Regra nova entra no fim do style.css (convenção do arquivo), então aqui só se exige a regra do PR uma vez, em
// qualquer posição. A posição exata durante o porte é conferida pelo conferir-porte.mjs (passo 11 do guia).
test('style.css tem a regra do Guia completo (uma vez) e o ?v= das páginas é o sha256 do arquivo', () => {
  const css = readFileSync(join(raiz, 'assets/style.css'));
  assert.equal(conta(css.toString('utf8'), S.CSS_GUIA_COMPLETO), 1);
  const v = createHash('sha256').update(css).digest('hex').slice(0, 10);
  const usados = new Set(paginas.flatMap((p) => [...ler(p).matchAll(/href="\/assets\/style\.css\?v=([0-9a-f]+)"/g)].map((m) => m[1])));
  assert.deepEqual([...usados], [v]);
});

// ---------- 7. Sprite e sitemap
const SPRITE_RE = /<svg class="sprite"[^>]*>(?:<symbol\b[^]*?<\/symbol>)*<\/svg>/;
test('sprite: igual ao sprite() do gerador (ordem do primeiro uso); em SPRITE_FORA_DE_ORDEM, os mesmos símbolos', () => {
  const falhas = [];
  for (const p of paginas.filter((x) => !ehLicitacoes(x))) {
    const html = ler(p);
    const m = html.match(SPRITE_RE);
    if (!m) continue;
    const gerado = sprite(html.slice(m.index + m[0].length));
    // Nas páginas da lista vale a ordem publicada pelo PR ou a do build (a saída do build também passa aqui).
    if (S.SPRITE_FORA_DE_ORDEM.includes(p)) {
      if (S.ordenaSprite(gerado) !== S.ordenaSprite(m[0])) falhas.push(`${p}: símbolos diferentes, não só a ordem`);
    } else if (gerado !== m[0]) falhas.push(`${p}: sprite difere do sprite()`);
  }
  assert.deepEqual(falhas, []);
});

// Mudança significativa posterior nessas páginas move o lastmod para frente (a home muda a cada post novo, pelos
// "Guias recentes"), então aqui vale lastmod >= 2026-10-18. A data exata de todas as URLs, pela regra inteira (que
// também ignora a linha do speculationrules nas outras páginas), quem confere é o lastmod.test.mjs.
test('sitemap.xml: lastmod a partir de 2026-10-18 nas 8 páginas do PR, que são as que têm conteúdo do PR', () => {
  const lastmod = Object.fromEntries([...ler('sitemap.xml').matchAll(/<loc>https:\/\/contacertabr\.com\.br(\/[^<]*)<\/loc><lastmod>([^<]+)<\/lastmod>/g)].map((m) => [m[1], m[2]]));
  for (const u of S.PAGINAS_PR25) assert.ok(lastmod[u] >= S.LASTMOD_PR25, `${u}: lastmod ${lastmod[u]}`);
  const comConteudo = ['/', ...Object.keys(S.GUIA_DA_CALCULADORA).map((s) => `/${s}/`), '/rescisao/', '/ferias/', '/seguro-desemprego/'];
  assert.deepEqual([...new Set(comConteudo)].sort(), [...S.PAGINAS_PR25].sort());
});

test('mudancaSignificativa: ignora ?v=, a linha do speculationrules e a ordem do sprite; não ignora conteúdo', () => {
  const atual = ler('rescisao/index.html');
  const semLinha = atual.replace(S.LINHA_ESPECULACAO, '');
  const outroV = atual.replace(/style\.css\?v=[0-9a-f]{10}/, 'style.css?v=0123456789');
  const m = atual.match(SPRITE_RE)[0];
  const invertido = atual.replace(m, m.replace(/^(<svg[^>]*>)([^]*)(<\/svg>)$/, (_, a, s, z) => a + s.match(/<symbol\b[^]*?<\/symbol>/g).reverse().join('') + z));
  assert.notEqual(invertido, atual);
  for (const antes of [semLinha, outroV, invertido, semLinha.replace(/style\.css\?v=[0-9a-f]{10}/, 'style.css?v=0123456789')]) assert.equal(S.mudancaSignificativa(antes, atual), false);
  const semGuia = atual.replace(S.secaoGuiaCompleto(S.guiaDaCalculadora('rescisao', posts)), '');
  assert.notEqual(semGuia, atual);
  assert.equal(S.mudancaSignificativa(semGuia, atual), true);
  assert.equal(S.mudancaSignificativa(atual.replace('"@type":"WebApplication"', '"@type":"SoftwareApplication"'), atual), true);
});
