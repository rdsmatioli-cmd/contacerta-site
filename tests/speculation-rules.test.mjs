// Speculation Rules (auditoria SEO de 17/10/2026).
// - Toda página fora de /licitacoes/ tem as mesmas regras: só prefetch (nunca prerender: nada de JS, lcm-consent ou
//   GA4 rodando em página não visitada), eagerness moderate (hover ou toque), só URLs do próprio site (/*), sem
//   /licitacoes/ (CSP própria, seção separada), sem .xml e sem links com query (?) ou âncora (#).
// - Nenhuma dessas páginas tem CSP; se passar a ter, a CSP precisa liberar 'inline-speculation-rules'.
// - /licitacoes/ não recebe regras (a CSP de lá só aceita script do próprio site e não muda).
import { PAGINAS_COMPRA, FORM_ACTION_COMPRA } from './config-checkout.mjs';
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

const fora = paginas.filter((p) => !ehLicitacoes(p) && p !== 'blog/simples-hibrido-ou-puro-2027/index.html'); // stub M-02 162a9503
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

// Lista fechada (decisão do CPO, 22/10/2026): só este caminho exato usa a CSP de redirecionamento. Nenhuma regra
// genérica (meta refresh, noindex): qualquer outra página de /licitacoes/ com CSP diferente continua falhando.
const EXCECOES_REDIR = new Set(['licitacoes/privacidade/index.html']);
const CSP_REDIR = /<meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; form-action 'none'">/;
const CSP_LICITACOES = /<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'none'">/;
function checarLicitacoes(p, html) {
  assert.equal(regrasDe(html).length, 0);
  assert.doesNotMatch(html, /speculationrules/);
  // A-08: nas páginas de compra a form-action é a origem do checkout (coberta por checkout-botao.test.mjs).
  const h = PAGINAS_COMPRA.includes(p) ? html.replace(`form-action ${FORM_ACTION_COMPRA}"`, "form-action 'none'\"") : html;
  assert.match(h, EXCECOES_REDIR.has(p) ? CSP_REDIR : CSP_LICITACOES);
}
for (const p of paginas.filter(ehLicitacoes)) {
  test(`${p}: /licitacoes/ sem speculationrules e com a CSP intacta`, () => checarLicitacoes(p, ler(p)));
}

const REDIR_HTML = ler('licitacoes/privacidade/index.html');
const OUTRA = 'licitacoes/outra-redirect/index.html';
// Fixture só em memória: o mesmo HTML de redirecionamento (meta refresh, noindex, CSP de redirecionamento) em outro caminho.
const FIXTURE_OUTRA = REDIR_HTML.replaceAll('/licitacoes/politica.html', '/licitacoes/index.html');
test('negativo: página de redirecionamento fora da lista (licitacoes/outra-redirect/index.html) falha', () => {
  assert.throws(() => checarLicitacoes(OUTRA, FIXTURE_OUTRA), assert.AssertionError);
  assert.doesNotThrow(() => checarLicitacoes('licitacoes/privacidade/index.html', REDIR_HTML));
});
