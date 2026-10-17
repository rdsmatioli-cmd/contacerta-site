// CC-05 (17/10/2026): a regra "nada do Google antes do aceite" vale para TODAS as páginas publicadas,
// não só para a NR-1 (nr1-m01.test.mjs). Varre recursivamente todo *.html (fora .git e a verificação
// google*.html, o mesmo escopo do html-validate no CI):
// - nenhuma página carrega o Google por conta própria (gtag(, googletagmanager, google-analytics, dataLayer, anonymize_ip);
// - fora de /licitacoes/, o GA4 só entra pelo componente lcm-consent (ac527630), uma única vez, e a página
//   tem o botão para rever a escolha;
// - /licitacoes/ promete "sem ferramentas de análise": nada de lcm-consent, data-ga4, ID de medição nem
//   script de outro domínio, e a CSP da página só aceita script do próprio site.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const listar = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  if (d.name === '.git' || d.name === 'node_modules') return [];
  const p = join(dir, d.name);
  if (d.isDirectory()) return listar(p);
  return d.name.endsWith('.html') && !d.name.startsWith('google') ? [relative(raiz, p).split(sep).join('/')] : [];
});
const paginas = listar(raiz).sort();
const ler = (p) => readFileSync(join(raiz, p), 'utf8');
const ehLicitacoes = (p) => p.startsWith('licitacoes/');

const PROIBIDO = /gtag\(|googletagmanager|google-analytics|dataLayer|anonymize_ip/i;
const TAG_LCM = /<script src="\/assets\/lcm-consent\.js\?v=[0-9a-f]+" defer data-ga4="G-D9PCMD9Q2H" data-marca="Conta Certa"[^>]*data-validade-dias="183" data-chaves-legadas="cc-consent-v1" data-eventos="calculo_concluido,cta_click" data-params="calculadora,destino"><\/script>/g;
const ID_MEDICAO = /\bG-[A-Z0-9]{8,}\b/g;

test('a varredura é recursiva: acha páginas da raiz, do blog e de /licitacoes/', () => {
  for (const p of ['index.html', '404.html', 'blog/index.html', 'blog/categoria/impostos-e-mei/index.html', 'blog/pro-labore/index.html',
    'licitacoes/index.html', 'licitacoes/politica.html', 'licitacoes/blog/como-encontrar-licitacoes.html', 'licitacoes/editais/material-de-limpeza.html']) {
    assert.ok(paginas.includes(p), p);
  }
  assert.ok(paginas.filter(ehLicitacoes).length >= 6);
  assert.ok(paginas.filter((p) => !ehLicitacoes(p)).length >= 50);
  assert.ok(!paginas.some((p) => /(^|\/)google[^/]*\.html$/.test(p)));
});

for (const p of paginas.filter((x) => !ehLicitacoes(x))) {
  test(`${p}: GA4 só pelo lcm-consent, uma vez, e nenhum Google direto`, () => {
    const html = ler(p);
    assert.doesNotMatch(html, PROIBIDO);
    assert.equal((html.match(TAG_LCM) || []).length, 1, 'tag do lcm-consent com data-ga4');
    assert.equal((html.match(/lcm-consent\.js/g) || []).length, 1, 'o componente é carregado uma única vez');
    assert.equal((html.match(ID_MEDICAO) || []).length, 1, 'o ID de medição só aparece no data-ga4');
    assert.match(html, /data-lcm-consent-abrir>Preferências de cookies</);
  });
}

for (const p of paginas.filter(ehLicitacoes)) {
  test(`${p}: sem GA, sem lcm-consent e sem script de terceiros`, () => {
    const html = ler(p);
    assert.doesNotMatch(html, PROIBIDO);
    assert.doesNotMatch(html, /lcm-consent|data-ga4/);
    assert.equal((html.match(ID_MEDICAO) || []).length, 0);
    for (const s of html.match(/<script\b[^>]*\ssrc="[^"]*"/g) || []) assert.doesNotMatch(s, /\ssrc="(https?:)?\/\//, s);
    assert.match(html, /<meta http-equiv="Content-Security-Policy" content="[^"]*script-src 'self';/);
  });
}
