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

// Termos e Política v2.0 (Advogado, DE ACORDO 31/10/2026, nota ced6a5c5): texto publicado idêntico aos arquivos com
// estes sha256. As fixtures são cópias byte a byte; a página tem de conter o mesmo texto, sem tirar nem pôr.
import { createHash } from 'node:crypto';
const DOCS = [
  ['TERMOS_CONTRATOS_PUBLICOS_v2_FINAL_20261031-1825.md', 'termos.html', 'd1b611031e1888800e10d8a376d6e06050b4ce4d7de0be0d819ddd680dedbdfc'],
  ['POLITICA_CONTRATOS_PUBLICOS_v2_FINAL_20261031-1825.md', 'privacidade.html', 'f8becdcba07d66e2af6afc45c84695e526a6989f34cd8606fa42b3bb27e41ce7'],
];
const ent = (s) => s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'");
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const doMd = (md) => norm(md.replace(/^#+ /gm, '').replace(/\*\*/g, '').replace(/^\|[-| ]+\|$/gm, '').replace(/\|/g, ' '));
for (const [md, pag, sha] of DOCS) {
  test(`contratos: ${pag} = ${md} (sha256 ${sha.slice(0, 8)})`, () => {
    const fonte = readFileSync(new URL(`./fixtures/contratos-publicos/${md}`, import.meta.url));
    assert.equal(createHash('sha256').update(fonte).digest('hex'), sha);
    const h = readFileSync(new URL(`../licitacoes/contratos/${pag}`, import.meta.url), 'utf8');
    const corpo = h.slice(h.indexOf('<main class="doc">') + 18, h.indexOf('<p class="snote">'));
    assert.equal(norm(ent(corpo.replace(/<[^>]+>/g, ' '))), doMd(fonte.toString('utf8')));
    assert.doesNotMatch(h, /ACM|SUSEP|<form|<script|cloudflareinsights/i);
  });
}
test('contratos: landing linka termos.html e privacidade.html', () => {
  assert.match(html, /href="termos\.html"/);
  assert.match(html, /href="privacidade\.html"/);
});
