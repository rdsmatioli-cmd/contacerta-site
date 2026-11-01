// Links e chamadas que levam a lugar nenhum não voltam (lote 1 da auditoria de 30-31/10/2026).
// CC-SITE-02: o afiliado da Hotmart (go.hotmart.com/E107964934J) terminava em 404 e saiu das 3 páginas, sem substituto.
// CC-SITE-03: a lista de espera está desligada desde 16/10 (botão "Temporariamente indisponível", campos sem name);
// os 5 blocos "Quer automatizar isso?" das páginas da Reforma, que levavam a ela, saíram, e o llms.txt não a cita.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { listarPaginas, caminhoDe, decodificar } from './links/conferir-links.mjs';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const ler = (p) => readFileSync(new URL(p, new URL('../', import.meta.url)), 'utf8');
// Tudo o que é publicado e cita URLs: as páginas .html (fora de tests/, .git e node_modules) e os índices de texto.
const paginas = listarPaginas(raiz);
const textos = ['llms.txt', 'robots.txt', 'sitemap.xml', 'blog/feed.xml'];

test('nenhuma página publicada cita go.hotmart.com nem tem o bloco do curso recomendado', () => {
  assert.ok(paginas.length >= 50);
  for (const p of [...paginas, ...textos]) {
    const html = ler(p);
    assert.doesNotMatch(html, /hotmart\.com/i, p);
    assert.doesNotMatch(html, /parceiro-curso/, p);
  }
});

test('os outros parceiros das 3 páginas continuam (Amazon, ClickNotas e Bling)', () => {
  assert.match(ler('das-mei/index.html'), /href="https:\/\/www\.bling\.com\.br\/planos-e-precos\/CONTACERTABR"/);
  assert.match(ler('das-mei/index.html'), /href="https:\/\/clicknotas\.com\/emissor\/cadastro\?indicacao=1423287"/);
  assert.match(ler('markup/index.html'), /href="https:\/\/www\.bling\.com\.br\/planos-e-precos\/CONTACERTABR"/);
  assert.match(ler('parcelado-ou-a-vista/index.html'), /href="https:\/\/www\.amazon\.com\.br\/dp\/B0HCDZSGB7\?tag=contacerta-20"/);
});

// Enquanto o envio da lista estiver desligado, só a própria página e os textos legais (privacidade, sobre) podem
// apontar para ela. Religar o formulário é decisão à parte; aí este teste deixa de valer e sai com o motivo.
const lista = ler('lista-de-espera/index.html');
const listaDesligada = /<button type="submit" disabled>Temporariamente indisponível<\/button>/.test(lista);
const PODEM_CITAR = new Set(['/lista-de-espera/', '/privacidade/', '/sobre/']);
const leva = (pagina, html) => [...html.matchAll(/\s(?:href|action|formaction)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].some((m) => {
  let u;
  try { u = new URL(decodificar((m[1] ?? m[2]).trim()), `https://contacertabr.com.br${pagina}`); } catch { return false; }
  return /(^|\.)contacertabr\.com\.br$/i.test(u.hostname) && /^\/lista-de-espera(\/(index\.html)?)?$/.test(u.pathname);
});

test('lista de espera desligada: nenhuma página além dela, de /privacidade/ e de /sobre/ leva a ela', { skip: !listaDesligada && 'lista de espera religada' }, () => {
  const levam = paginas.map((p) => [caminhoDe(p), ler(p)]).filter(([c, html]) => !PODEM_CITAR.has(c) && leva(c, html)).map(([c]) => c);
  assert.deepEqual(levam, []);
  for (const p of paginas) assert.doesNotMatch(ler(p), /class="(?:[^"]*\s)?(?:lista-espera|le-botao)(?:\s[^"]*)?"/, p);
});

test('lista de espera desligada: o llms.txt não a cita', { skip: !listaDesligada && 'lista de espera religada' }, () => {
  assert.doesNotMatch(ler('llms.txt'), /lista-de-espera|lista de espera/i);
});

test('o detector de link para a lista pega caminho relativo, absoluto e com index.html, e ignora a âncora da política', () => {
  assert.equal(leva('/x/', '<a href="/lista-de-espera/">'), true);
  assert.equal(leva('/x/', '<a class="b" href="https://contacertabr.com.br/lista-de-espera/?utm=1#topo">'), true);
  assert.equal(leva('/x/', "<a href='../lista-de-espera/index.html'>"), true);
  assert.equal(leva('/x/', '<a href="/lista-de-espera">'), true);
  assert.equal(leva('/x/', '<a href="/privacidade/#lista-de-espera">'), false);
  assert.equal(leva('/x/', '<a href="https://outro.exemplo/lista-de-espera/">'), false);
});
