// Indexação e GEO (lote 4 da auditoria de 30-31/10/2026).
// CC-SITE-17: o 404.html é servido pelo GitHub Pages, com status 404, em qualquer caminho inexistente; canonical e
// og:url para /404.html, numa página noindex, mandavam ao buscador sinais contraditórios. Saíram os dois.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (p) => readFileSync(new URL(p, new URL('../', import.meta.url)), 'utf8');
const tagsLink = (html) => html.match(/<link\b[^>]*>/gi) || [];

test('404.html: noindex, sem rel=canonical e sem og:url', () => {
  const html = ler('404.html');
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.deepEqual(tagsLink(html).filter((t) => /\srel\s*=\s*["']?canonical\b/i.test(t)), []);
  assert.doesNotMatch(html, /property="og:url"/);
});
