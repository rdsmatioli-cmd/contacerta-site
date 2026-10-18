// tests/links/conferir-links.mjs (checagem semanal dos links externos), sem internet: extração dos links do HTML e
// classificação contra um servidor local em 127.0.0.1 (404, redirecionamento que termina em 404, laço de cookie,
// bloqueio de robô, 5xx persistente e passageiro, tempo esgotado) e contra erros simulados de DNS e TLS; segunda
// passada no fim da rodada e parâmetro de afiliado fora da URL conferida.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { extrairLinks, mapearLinks, conferir, conferirTodos, resumoMarkdown, semAfiliado } from './links/conferir-links.mjs';

test('extrai só links externos, sem fragmento, com entidades decodificadas e sem repetir', () => {
  const html = `<!doctype html><head>
<link rel="canonical" href="https://contacertabr.com.br/markup/"><link rel="alternate" href="https://www.contacertabr.com.br/blog/feed.xml">
<script type="application/ld+json">{"@context":"https://schema.org","citation":[{"@type":"CreativeWork","url":"https://fonte.gov.br/lei#art1"},{"url":"https://contacertabr.com.br/x/"}]}</script>
</head><body>
<a href="https://exemplo.com/a?x=1&amp;y=2#parte">a</a> <a href='http://exemplo.org/b'>b</a> <a href="https://exemplo.com/a?x=1&amp;y=2">de novo</a>
<a href="/markup/">interno</a> <a href="mailto:contato@exemplo.com">e-mail</a> <a href="#topo">topo</a>
<img src="https://img.exemplo.net/i.png" alt=""> <div data-url="https://nao.conta/"></div> <p>https://texto.solto/</p>
</body>`;
  assert.deepEqual(extrairLinks(html).sort(), [
    'http://exemplo.org/b', 'https://exemplo.com/a?x=1&y=2', 'https://fonte.gov.br/lei', 'https://img.exemplo.net/i.png',
  ]);
});

test('o mapa do site ignora tests/ e o próprio domínio e guarda as páginas de cada link', () => {
  const { paginas, mapa } = mapearLinks(fileURLToPath(new URL('../', import.meta.url)));
  assert.ok(paginas.length >= 50);
  assert.ok(!paginas.some((p) => p.startsWith('tests/') || p.includes('node_modules')));
  assert.ok(mapa.size >= 1);
  for (const [url, onde] of mapa) {
    assert.doesNotMatch(new URL(url).hostname, /contacertabr\.com\.br$/);
    for (const p of onde) assert.match(p, /^\/(\S*\/|\S+\.html)?$/, p);
  }
});

// ---------- servidor local ----------
let servidor, base;
const visitas = new Map();
const ordem = [];
let simultaneos = 0, picoSimultaneos = 0;
before(async () => {
  servidor = createServer((req, res) => {
    const caminho = req.url.split('?')[0];
    visitas.set(caminho, (visitas.get(caminho) || 0) + 1);
    ordem.push(req.url);
    const ir = (status, location, extra = {}) => { res.writeHead(status, { location, ...extra }); res.end(); };
    switch (caminho) {
      case '/ok': return res.end('ok');
      case '/404': res.statusCode = 404; return res.end();
      case '/410': res.statusCode = 410; return res.end();
      case '/redir-ok': return ir(301, '/ok');
      case '/redir-404': return ir(302, `${base}/404`);
      case '/laco': return ir(302, '/laco');
      // Como caixa.gov.br: grava um cookie e redireciona para a mesma URL; só com o cookie responde 200.
      case '/laco-cookie': return /(^|;\s*)seguro=sim/.test(req.headers.cookie || '') ? res.end('ok') : ir(302, '/laco-cookie', { 'set-cookie': 'seguro=sim; path=/' });
      case '/403': res.statusCode = 403; return res.end();
      case '/429': res.statusCode = 429; return res.end();
      case '/cloudflare': res.writeHead(503, { 'cf-mitigated': 'challenge' }); return res.end();
      case '/500': res.statusCode = 500; return res.end();
      case '/instavel': res.statusCode = visitas.get(caminho) === 1 ? 503 : 200; return res.end();
      case '/instavel-passada': res.statusCode = visitas.get(caminho) === 1 ? 503 : 200; return res.end();
      case '/lento': return; // nunca responde
      case '/devagar':
        simultaneos++; picoSimultaneos = Math.max(picoSimultaneos, simultaneos);
        return setTimeout(() => { simultaneos--; res.end('ok'); }, 40);
      default: res.statusCode = 404; return res.end();
    }
  });
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${servidor.address().port}`;
});
after(() => { servidor.closeAllConnections(); servidor.close(); });

const rapido = { tempoLimite: 300, pausa: 10 };
// [caminho, classe, motivo, tentativas]: o que não dá OK nem bloqueio ganha uma segunda tentativa.
const casos = [
  ['/ok', 'OK', /^HTTP 200$/, 1],
  ['/redir-ok', 'OK', /HTTP 200 depois de redirecionar para .*\/ok$/, 1],
  ['/laco-cookie', 'OK', /^HTTP 200$/, 1],
  ['/404', 'QUEBRADO', /^HTTP 404$/, 2],
  ['/410', 'QUEBRADO', /^HTTP 410$/, 2],
  ['/redir-404', 'QUEBRADO', /^HTTP 404 depois de redirecionar para .*\/404$/, 2],
  ['/laco', 'QUEBRADO', /mais de 15 redirecionamentos/, 2],
  ['/403', 'BLOQUEIO_DE_ROBO', /^HTTP 403$/, 1],
  ['/429', 'BLOQUEIO_DE_ROBO', /^HTTP 429$/, 1],
  ['/cloudflare', 'BLOQUEIO_DE_ROBO', /desafio do Cloudflare/, 1],
  ['/500', 'QUEBRADO', /^HTTP 500$/, 2],
  ['/instavel', 'OK', /^HTTP 200$/, 2],
  ['/lento', 'QUEBRADO', /^tempo esgotado/, 2],
];
for (const [caminho, classe, motivo, tentativas] of casos) {
  test(`${caminho}: ${classe} em ${tentativas} ${tentativas === 1 ? 'tentativa' : 'tentativas'}`, async () => {
    const antes = visitas.get(caminho) || 0;
    const r = await conferir(`${base}${caminho}`, rapido);
    assert.equal(r.classe, classe, r.motivo);
    assert.match(r.motivo, motivo);
    // /laco e /laco-cookie visitam o próprio caminho a cada salto: conta-se a tentativa pelo campo do resultado.
    assert.equal(r.tentativas || 1, tentativas);
    if (!caminho.startsWith('/laco')) assert.equal(visitas.get(caminho) - antes, tentativas);
  });
}

const erroDe = (code) => async () => { throw new TypeError('fetch failed', { cause: Object.assign(new Error(code), { code }) }); };
test('DNS que não resolve: QUEBRADO; cadeia TLS incompleta: NAO_CONFERIDO (aviso)', async () => {
  const dns = await conferir('https://nao-existe.invalid/', { ...rapido, fetch: erroDe('ENOTFOUND') });
  assert.equal(dns.classe, 'QUEBRADO');
  assert.match(dns.motivo, /^erro de DNS \(ENOTFOUND\)/);
  assert.equal(dns.tentativas, 2);
  const tls = await conferir('https://cadeia.incompleta/', { ...rapido, fetch: erroDe('UNABLE_TO_VERIFY_LEAF_SIGNATURE') });
  assert.equal(tls.classe, 'NAO_CONFERIDO');
  const expirado = await conferir('https://expirado/', { ...rapido, fetch: erroDe('CERT_HAS_EXPIRED') });
  assert.equal(expirado.classe, 'QUEBRADO');
});

test('no máximo 2 requisições ao mesmo host ao mesmo tempo', async () => {
  const urls = Array.from({ length: 8 }, (_, i) => `${base}/devagar?i=${i}`);
  const r = await conferirTodos(urls, { ...rapido, concorrencia: 8 });
  assert.deepEqual(r.map((x) => x.classe), Array(8).fill('OK'));
  assert.equal(picoSimultaneos, 2);
});

test('segunda passada: a nova tentativa vem depois da primeira passada inteira, com a pausa', async () => {
  const urls = [`${base}/404?passada=1`, `${base}/ok?passada=2`, `${base}/instavel-passada?passada=3`];
  const avisos = [];
  const inicio = Date.now();
  const r = await conferirTodos(urls, { ...rapido, pausa: 200, concorrencia: 1, aoRefazer: (n, ms) => avisos.push([n, ms]) });
  assert.ok(Date.now() - inicio >= 200);
  assert.deepEqual(avisos, [[2, 200]]);
  assert.deepEqual(ordem.filter((u) => u.includes('passada=')), ['/404?passada=1', '/ok?passada=2', '/instavel-passada?passada=3', '/404?passada=1', '/instavel-passada?passada=3']);
  assert.deepEqual(r.map((x) => [x.classe, x.tentativas || 1]), [['QUEBRADO', 2], ['OK', 1], ['OK', 2]]);
  assert.equal(r[2].primeira, 'HTTP 503');
});

test('afiliado: o parâmetro do afiliado sai da URL conferida; o resultado guarda a URL publicada', async () => {
  assert.equal(semAfiliado('https://www.amazon.com.br/dp/B0HCCKLQLX?tag=contacerta-20'), 'https://www.amazon.com.br/dp/B0HCCKLQLX');
  assert.equal(semAfiliado('https://www.amazon.com.br/dp/X?th=1&tag=a-20&psc=1'), 'https://www.amazon.com.br/dp/X?th=1&psc=1');
  assert.equal(semAfiliado('https://clicknotas.com/emissor/cadastro?indicacao=1423287'), 'https://clicknotas.com/emissor/cadastro');
  for (const igual of ['https://go.hotmart.com/E107964934J', 'https://exemplo.com/?tag=x', 'https://a.gov.br/b?x=1%202']) assert.equal(semAfiliado(igual), igual);
  const publicada = `${base}/404?indicacao=99`;
  const r = await conferir(publicada, rapido);
  assert.equal(r.url, publicada);
  assert.equal(r.conferida, `${base}/404`);
  assert.match(r.motivo, /^HTTP 404 \(conferido sem o parâmetro de afiliado\)$/);
  assert.ok(!ordem.some((u) => u.includes('indicacao')), 'o servidor nunca recebe o parâmetro do afiliado');
});

test('resumo: link quebrado com as páginas onde aparece; aviso separado', () => {
  const mapa = new Map([['https://a.exemplo/x', new Set(['/markup/', '/das-mei/'])], ['https://b.exemplo/', new Set(['/'])], ['https://c.exemplo/|', new Set(['/sobre/'])]]);
  const resultados = [
    { url: 'https://a.exemplo/x', classe: 'QUEBRADO', motivo: 'HTTP 404 depois de redirecionar para https://a.exemplo/y' },
    { url: 'https://b.exemplo/', classe: 'BLOQUEIO_DE_ROBO', motivo: 'HTTP 403' },
    { url: 'https://c.exemplo/|', classe: 'OK', motivo: 'HTTP 200' },
  ];
  const md = resumoMarkdown({ paginas: ['index.html', 'markup/index.html', 'das-mei/index.html'], mapa, resultados });
  assert.match(md, /3 links externos únicos em 3 páginas: 1 OK, 1 quebrado, 1 com bloqueio de robô e 0 não conferidos/);
  assert.match(md, /### Quebrados\n\n\| Link \| Resultado \| Páginas \|\n\|---\|---\|---\|\n\| https:\/\/a\.exemplo\/x \| HTTP 404 depois de redirecionar para https:\/\/a\.exemplo\/y \| \/das-mei\/, \/markup\/ \|/);
  assert.match(md, /### Bloqueio de robô \(aviso, não falha\)[^]*\| https:\/\/b\.exemplo\/ \| HTTP 403 \| \/ \|/);
});
