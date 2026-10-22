// Speculation Rules (auditoria SEO de 17/10/2026).
// - Toda página fora de /licitacoes/ tem as mesmas regras: só prefetch (nunca prerender: nada de JS, lcm-consent ou
//   GA4 rodando em página não visitada), eagerness moderate (hover ou toque), só URLs do próprio site (/*), sem
//   /licitacoes/ (CSP própria, seção separada), sem .xml e sem links com query (?) ou âncora (#).
// - Nenhuma dessas páginas tem CSP; se passar a ter, a CSP precisa liberar 'inline-speculation-rules'.
// - /licitacoes/ não recebe regras (a CSP de lá só aceita script do próprio site e não muda).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

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
const regrasDe = (html) => [...html.matchAll(/<script type="speculationrules">([^]*?)<\/script>/g)].map((m) => m[1]);

test('a varredura acha páginas da raiz, do blog e de /licitacoes/', () => {
  for (const p of ['index.html', '404.html', 'rescisao/index.html', 'blog/pro-labore/index.html', 'licitacoes/index.html']) assert.ok(paginas.includes(p), p);
  assert.ok(paginas.filter((p) => !ehLicitacoes(p)).length >= 50);
});

const fora = paginas.filter((p) => !ehLicitacoes(p));
const primeira = regrasDe(ler('index.html'))[0];
for (const p of fora) {
  test(`${p}: speculationrules só com prefetch moderate de URLs internas`, () => {
    const html = ler(p);
    const blocos = regrasDe(html);
    assert.equal(blocos.length, 1, 'um bloco de regras');
    assert.equal(blocos[0], primeira, 'as mesmas regras do site inteiro');
    const r = JSON.parse(blocos[0]);
    assert.deepEqual(Object.keys(r), ['prefetch']);
    for (const regra of r.prefetch) {
      assert.equal(regra.eagerness, 'moderate');
      assert.equal(regra.urls, undefined, 'sem lista de URLs (só regras de documento)');
      assert.ok(regra.source === undefined || regra.source === 'document');
      const e = regra.where.and;
      assert.deepEqual(e[0], { href_matches: '/*' }, 'só URLs relativas à origem do próprio site');
      assert.ok(e.some((c) => c.not?.href_matches === '/licitacoes{/*}?'), 'exclui /licitacoes/');
      assert.ok(e.some((c) => c.not?.href_matches === '/*.xml'), 'exclui sitemap e feed');
      const sel = e.find((c) => c.not?.selector_matches)?.not.selector_matches || '';
      assert.ok(sel.includes("[href*='?']") && sel.includes("[href*='#']"), 'exclui links com query e âncora');
    }
    assert.doesNotMatch(html, /prerender/i);
    const csp = (html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)"/i) || [])[1];
    if (csp) assert.match(csp, /'inline-speculation-rules'/);
  });
}

const CSP_REDIR = /<meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; form-action 'none'">/;
const ehRedir = (h) => /<meta http-equiv="refresh"/.test(h) && /<meta name="robots" content="noindex,follow">/.test(h) && !/<script\b/i.test(h);
for (const p of paginas.filter(ehLicitacoes)) {
  test(`${p}: /licitacoes/ sem speculationrules e com a CSP intacta`, () => {
    const html = ler(p);
    assert.equal(regrasDe(html).length, 0);
    assert.doesNotMatch(html, /speculationrules/);
    if (ehRedir(html)) assert.match(html, CSP_REDIR); else assert.match(html, /<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'none'">/);
  });
}
