// Links internos para os guias do blog (auditoria SEO de 17/10/2026): cada post recebia só 2 links internos
// (índice e categoria do blog) e nenhum das calculadoras nem da home.
// - Calculadora com post aprovado correspondente: card "Guia completo" antes das relacionadas, com o título (h1) do
//   post e o resumo do card do índice do blog, copiados literalmente. Os pares foram conferidos lendo os dois lados:
//   o post também linka a calculadora.
// - Home: bloco estático "Guias recentes" com os RECENTES primeiros posts do índice do blog, na mesma ordem, título
//   literal e a categoria do card do índice.
// - /aviso-previo/ nas relacionadas de rescisão, férias e seguro-desemprego, com o mesmo card da home.
// - Todo <use href="#..."> tem o <symbol> correspondente na própria página (os cards novos usam ícones do sprite).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import rescisaoFonte from './_src/content/rescisao.mjs';
import feriasFonte from './_src/content/ferias.mjs';
import decimoFonte from './_src/content/decimo-terceiro.mjs';
import dasMeiFonte from './_src/content/das-mei.mjs';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const ler = (p) => readFileSync(join(raiz, p), 'utf8');
const existe = (href) => existsSync(join(raiz, href.replace(/^\//, ''), 'index.html'));
const listar = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  if (d.name === '.git' || d.name === 'node_modules') return [];
  const p = join(dir, d.name);
  if (d.isDirectory()) return listar(p);
  return d.name.endsWith('.html') && !d.name.startsWith('google') ? [relative(raiz, p).split(sep).join('/')] : [];
});
const paginas = listar(raiz).sort();
const hrefs = (html) => [...html.matchAll(/<a\b[^>]*\shref="([^"]*)"/g)].map((m) => m[1]);
const secao = (html, rotulo) => (html.match(new RegExp(`<section\\b[^>]*aria-labelledby="${rotulo}"[^>]*>[^]*?</section>`)) || [])[0];
const cards = (html) => [...html.matchAll(/<li><a class="card" href="([^"]+)">[^]*?<strong>([^<]+)<\/strong><span>([^<]+)<\/span><\/span>[^]*?<\/a><\/li>/g)]
  .map((m) => ({ href: m[1], titulo: m[2], resumo: m[3] }));

// Posts publicados, na ordem do índice do blog: título (= h1 do post), categoria e resumo do card.
const indice = [...ler('blog/index.html').matchAll(/<li><a class="post-card" href="(\/blog\/[^"]+\/)"><small>([^<]+)<\/small><strong>([^<]+)<\/strong><span>([^<]+)<\/span>/g)]
  .map((m) => ({ href: m[1], categoria: m[2], titulo: m[3], resumo: m[4] }));
const posts = readdirSync(join(raiz, 'blog'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'categoria' && existsSync(join(raiz, 'blog', d.name, 'index.html')))
  .map((d) => `/blog/${d.name}/`);

const RECENTES = 6; // posts no bloco da home; com mais posts no índice, a home mostra só os primeiros
const recentes = indice.slice(0, RECENTES);

const PARES = {
  'rescisao': '/blog/como-calcular-rescisao-2026/',
  'decimo-terceiro': '/blog/decimo-terceiro-2026/',
  'salario-liquido': '/blog/salario-liquido-2026/',
  'nr1-riscos-psicossociais': '/blog/nr1-riscos-psicossociais-2026/',
  'simples-hibrido': '/blog/simples-hibrido-ou-puro-2027/',
};

test('o índice do blog lista todos os posts publicados e o título do card é o h1 do post', () => {
  assert.ok(indice.length >= 1, 'índice do blog sem posts');
  assert.deepEqual([...indice.map((p) => p.href)].sort(), [...posts].sort());
  for (const p of indice) assert.equal((ler(`${p.href.slice(1)}index.html`).match(/<h1>([^<]+)<\/h1>/) || [])[1], p.titulo, p.href);
});

for (const [calc, href] of Object.entries(PARES)) {
  test(`${calc}: card "Guia completo" com o post ${href}`, () => {
    const html = ler(`${calc}/index.html`);
    const s = secao(html, 'guia-t');
    assert.ok(s, 'seção do guia ausente');
    assert.match(s, /<h2 id="guia-t">Guia completo<\/h2>/);
    assert.deepEqual(hrefs(s), [href]);
    assert.ok(existe(href), `${href} não existe`);
    const p = indice.find((x) => x.href === href);
    assert.deepEqual(cards(s), [{ href, titulo: p.titulo, resumo: p.resumo }]);
    assert.ok(html.indexOf(s) < html.indexOf('aria-labelledby="rel-t"'), 'o guia vem antes das calculadoras relacionadas');
    assert.ok(ler(`${href.slice(1)}index.html`).includes(`href="/${calc}/"`), `o post não cita /${calc}/: par não conferido`);
  });
}

test('home: bloco "Guias recentes" com os primeiros posts do índice, na mesma ordem e com o título literal', () => {
  const s = secao(ler('index.html'), 'guias');
  assert.ok(s, 'bloco ausente');
  assert.match(s, /<h2 id="guias">Guias recentes<\/h2>/);
  assert.deepEqual(cards(s), recentes.map((p) => ({ href: p.href, titulo: p.titulo, resumo: p.categoria })));
  for (const p of recentes) assert.ok(existe(p.href), p.href);
});

test('post recente recebe link da home e, quando há calculadora correspondente, também dela', () => {
  const fora = paginas.filter((p) => !p.startsWith('blog/') && !p.startsWith('licitacoes/'));
  for (const post of posts) {
    const origens = fora.filter((p) => hrefs(ler(p)).includes(post));
    if (recentes.some((p) => p.href === post)) assert.ok(origens.includes('index.html'), `${post} sem link da home`);
    const calc = Object.keys(PARES).find((c) => PARES[c] === post);
    if (calc) assert.ok(origens.includes(`${calc}/index.html`), `${post} sem link de /${calc}/`);
  }
});

const CARD_AVISO = (ler('index.html').match(/<li><a class="card" href="\/aviso-previo\/">.*?<\/a><\/li>/) || [])[0];
for (const calc of ['rescisao', 'ferias', 'seguro-desemprego']) {
  test(`${calc}: /aviso-previo/ nas calculadoras relacionadas, com o card da home`, () => {
    assert.ok(CARD_AVISO && existe('/aviso-previo/'));
    const s = secao(ler(`${calc}/index.html`), 'rel-t');
    assert.ok(s.includes(CARD_AVISO));
    assert.equal(hrefs(s).filter((h) => h === '/aviso-previo/').length, 1);
  });
}

test('relacionadas do HTML seguem as fontes em tests/_src/content', () => {
  for (const f of [rescisaoFonte, feriasFonte, decimoFonte, dasMeiFonte]) {
    const s = secao(ler(`${f.slug}/index.html`), 'rel-t');
    assert.deepEqual(hrefs(s), f.relacionadas.map((x) => `/${x}/`), f.slug);
  }
  assert.ok(rescisaoFonte.relacionadas.includes('aviso-previo') && feriasFonte.relacionadas.includes('aviso-previo'));
});

for (const p of paginas) {
  test(`${p}: todo <use href="#..."> tem o <symbol> na página`, () => {
    const html = ler(p);
    const simbolos = new Set([...html.matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1]));
    const faltam = [...new Set([...html.matchAll(/<use href="#([^"]+)"/g)].map((m) => m[1]))].filter((id) => !simbolos.has(id));
    assert.deepEqual(faltam, []);
  });
}
