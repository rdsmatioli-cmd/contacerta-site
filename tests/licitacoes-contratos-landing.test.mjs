// Landing estática de Contratos Públicos (/licitacoes/contratos/), DEC do CEO via CPO, 31/10/2026: só página estática,
// com "Dados de exemplo", "preço a definir", copy C5 literal, sem checkout, sem formulário, sem nome/número da corretora.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../licitacoes/contratos/index.html', import.meta.url), 'utf8');
const texto = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const C5 = 'Quem faz a cotação e a emissão é uma corretora de seguros parceira devidamente autorizada pela SUSEP. A Conta Certa não vende seguro.';

test('contratos: copy C5 literal, uma vez', () => {
  assert.equal(texto.split(C5).length - 1, 1);
});
test('contratos: dados de exemplo rotulados e preço a definir', () => {
  assert.match(texto, /Dados de exemplo\./);
  assert.match(html, /<caption>Dados de exemplo/);
  assert.match(texto, /Preço a definir\./);
});
test('contratos: proibidos ACM, "Corretora" como marca e número SUSEP', () => {
  assert.doesNotMatch(html, /ACM/i);
  assert.doesNotMatch(html, /Corretora/);
  assert.doesNotMatch(html, /SUSEP\s*(n[ºo°.]*|nº|número|:)?\s*\d/i);
  assert.doesNotMatch(html, /\b\d{5}\.\d{6}\/\d{2}-\d{2}\b|\b\d{9,}\b/);
});
test('contratos: sem checkout, formulário, script ou chamada ao Worker', () => {
  assert.doesNotMatch(html, /<form|<script|workers\.dev|checkout|stripe/i);
  assert.match(html, /form-action 'none'/);
});
