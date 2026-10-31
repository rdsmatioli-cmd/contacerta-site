// CC-05 (17/10/2026): a regra "nada do Google antes do aceite" vale para TODAS as páginas publicadas,
// não só para a NR-1 (nr1-m01.test.mjs). Varre recursivamente todo *.html (fora .git e a verificação
// google*.html, o mesmo escopo do html-validate no CI):
// - nenhuma página carrega o Google por conta própria (gtag(, googletagmanager, google-analytics, dataLayer, anonymize_ip);
// - fora de /licitacoes/, o GA4 só entra pelo componente lcm-consent (ac527630), uma única vez, e a página
//   tem o botão para rever a escolha;
// - /licitacoes/ promete "sem ferramentas de análise": nada de lcm-consent, data-ga4, ID de medição nem
//   script de outro domínio, e a CSP da página só aceita script do próprio site.
// - nenhum script publicado (*.js e *.mjs fora de tests/, .git e node_modules) carrega o Google por conta própria nem
//   traz o ID de medição; a exceção é o próprio assets/lcm-consent.js, que só liga o GA4 depois do aceite.
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
const listarJs = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  if (['.git', 'node_modules', 'tests'].includes(d.name)) return [];
  const p = join(dir, d.name);
  if (d.isDirectory()) return listarJs(p);
  return /\.m?js$/.test(d.name) ? [relative(raiz, p).split(sep).join('/')] : [];
});
const scripts = listarJs(raiz).filter((p) => p !== 'assets/lcm-consent.js').sort();
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

test('a varredura de scripts é recursiva e só deixa de fora o lcm-consent', () => {
  for (const p of ['assets/js/ui.js', 'assets/js/calc.js', 'assets/js/medicao.js', 'licitacoes/assets/app.js']) assert.ok(scripts.includes(p), p);
  assert.ok(!scripts.includes('assets/lcm-consent.js'));
  assert.ok(!scripts.some((p) => p.startsWith('tests/')));
});

for (const p of scripts) {
  test(`${p}: nenhum Google direto nem ID de medição`, () => {
    const js = ler(p);
    assert.doesNotMatch(js, PROIBIDO);
    assert.equal((js.match(ID_MEDICAO) || []).length, 0);
  });
}

// Stub estático do post movido (M-02 162a9503) fica sem GA4: coberto em retarget-simples-hibrido.test.mjs.
for (const p of paginas.filter((x) => !ehLicitacoes(x) && x !== 'blog/simples-hibrido-ou-puro-2027/index.html')) {
  test(`${p}: GA4 só pelo lcm-consent, uma vez, e nenhum Google direto`, () => {
    const html = ler(p);
    assert.doesNotMatch(html, PROIBIDO);
    assert.equal((html.match(TAG_LCM) || []).length, 1, 'tag do lcm-consent com data-ga4');
    assert.equal((html.match(/lcm-consent\.js/g) || []).length, 1, 'o componente é carregado uma única vez');
    assert.equal((html.match(ID_MEDICAO) || []).length, 1, 'o ID de medição só aparece no data-ga4');
    assert.match(html, /data-lcm-consent-abrir>Preferências de cookies</);
  });
}

// Lista fechada (decisão do CPO, 22/10/2026): só este caminho exato usa a CSP de redirecionamento. Nenhuma regra
// genérica (meta refresh, noindex): qualquer outra página de /licitacoes/ com CSP diferente continua falhando.
const EXCECOES_REDIR = new Set(['licitacoes/privacidade/index.html']);
const CSP_REDIR = /<meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; form-action 'none'">/;
const CSP_LICITACOES = /<meta http-equiv="Content-Security-Policy" content="[^"]*script-src 'self';/;
const CSP_LICITACOES_CF = /<meta http-equiv="Content-Security-Policy" content="[^"]*script-src 'self' https:\/\/static\.cloudflareinsights\.com;[^"]*connect-src 'self' https:\/\/cloudflareinsights\.com;/;
const BEACON_CF = `<script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "9a5bd8768086479c83a179a8a53f6122"}'></script>`;
const SEM_BEACON = new Set(['licitacoes/privacidade/index.html', 'licitacoes/politica.html']);
const COM_BEACON = (p) => !SEM_BEACON.has(p);
function checarLicitacoes(p, html) {
  assert.doesNotMatch(html, PROIBIDO);
  assert.doesNotMatch(html, /lcm-consent|data-ga4/);
  assert.equal((html.match(ID_MEDICAO) || []).length, 0);
  for (const s of html.match(/<script\b[^>]*\ssrc="[^"]*"/g) || []) assert.doesNotMatch(s, /\ssrc="(https?:)?\/\//, s);
  // Único script de terceiros permitido: o beacon do Cloudflare Web Analytics (sem cookies), DEC do CEO 31/10/2026,
  // exatamente uma vez e só nas páginas com beacon (politica.html entra quando o Advogado arquivar o texto do aviso).
  const beacons = html.match(/<script\b[^>]*\ssrc='[^']*'[^>]*><\/script>/g) || [];
  if (COM_BEACON(p)) { assert.equal(beacons.length, 1); assert.equal(beacons[0], BEACON_CF); } else assert.equal(beacons.length, 0);
  assert.match(html, EXCECOES_REDIR.has(p) ? CSP_REDIR : COM_BEACON(p) ? CSP_LICITACOES_CF : CSP_LICITACOES);
}
for (const p of paginas.filter(ehLicitacoes)) {
  test(`${p}: sem GA, sem lcm-consent e sem script de terceiros`, () => checarLicitacoes(p, ler(p)));
}

const REDIR_HTML = ler('licitacoes/privacidade/index.html');
const OUTRA = 'licitacoes/outra-redirect/index.html';
// Fixture só em memória: o mesmo HTML de redirecionamento (meta refresh, noindex, CSP de redirecionamento) em outro caminho.
const FIXTURE_OUTRA = REDIR_HTML.replaceAll('/licitacoes/politica.html', '/licitacoes/index.html');
test('negativo: página de redirecionamento fora da lista (licitacoes/outra-redirect/index.html) falha', () => {
  assert.throws(() => checarLicitacoes(OUTRA, FIXTURE_OUTRA), assert.AssertionError);
  assert.doesNotThrow(() => checarLicitacoes('licitacoes/privacidade/index.html', REDIR_HTML));
});
