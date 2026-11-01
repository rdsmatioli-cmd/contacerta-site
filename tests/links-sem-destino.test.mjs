// Links e chamadas que levam a lugar nenhum não voltam (lote 1 da auditoria de 30-31/10/2026).
// CC-SITE-02: o afiliado da Hotmart (go.hotmart.com/E107964934J) terminava em 404 e saiu das 3 páginas, sem substituto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { listarPaginas } from './links/conferir-links.mjs';

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
