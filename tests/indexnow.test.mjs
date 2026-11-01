// CC-SITE-16: IndexNow para o Bing (e os outros buscadores do protocolo). Nada no código bloqueava o Bing, mas não
// havia chave IndexNow nem rotina de envio. A chave fica em /<32 hex>.txt, com a própria chave como conteúdo, e
// tests/manutencao/indexnow.mjs monta o payload com as URLs do sitemap; o envio (--enviar) é do Rodrigo, não do CI.
// Tudo aqui roda sem rede: o fetch é sempre substituído.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { HOST, ENDPOINT, acharChave, lerSitemap, montarPayload, opcoes, enviar } from './manutencao/indexnow.mjs';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const ler = (p) => readFileSync(new URL(p, new URL('../', import.meta.url)), 'utf8');
const sitemap = lerSitemap(ler('sitemap.xml'));
const locs = new Set(sitemap.map((e) => e.loc));

test('arquivo de chave: um só <32 hex>.txt na raiz, com a própria chave como conteúdo (sem quebra de linha)', () => {
  const arquivos = readdirSync(raiz).filter((n) => /^[0-9a-f]{32}\.txt$/.test(n));
  assert.equal(arquivos.length, 1, `arquivos de chave: ${arquivos.join(', ')}`);
  const chave = arquivos[0].slice(0, -4);
  assert.equal(ler(arquivos[0]), chave);
  assert.equal(acharChave(raiz), chave);
});

test('acharChave recusa conteúdo que não bate com o nome e mais de uma chave', () => {
  const ls = (nomes, conteudo) => ({ listar: () => nomes, lerArquivo: (n) => conteudo[n] });
  const a = 'a'.repeat(32);
  const b = 'b'.repeat(32);
  assert.equal(acharChave('/x', ls([`${a}.txt`, 'robots.txt'], { [`${a}.txt`]: a })), a);
  assert.throws(() => acharChave('/x', ls([`${a}.txt`], { [`${a}.txt`]: `${a}\n` })), /não bate/);
  assert.throws(() => acharChave('/x', ls([`${a}.txt`], { [`${a}.txt`]: b })), /não bate/);
  assert.throws(() => acharChave('/x', ls([`${a}.txt`, `${b}.txt`], { [`${a}.txt`]: a, [`${b}.txt`]: b })), /mais de um/);
  assert.throws(() => acharChave('/x', ls(['robots.txt'], {})), /nenhum arquivo de chave/);
});

test('payload sem --desde: todas as URLs do sitemap, e só elas, com host, key e keyLocation', () => {
  const chave = acharChave(raiz);
  const p = montarPayload({ entradas: sitemap, chave });
  assert.deepEqual(Object.keys(p), ['host', 'key', 'keyLocation', 'urlList']);
  assert.equal(p.host, HOST);
  assert.equal(HOST, 'contacertabr.com.br');
  assert.equal(p.key, chave);
  assert.equal(p.keyLocation, `https://contacertabr.com.br/${chave}.txt`);
  assert.ok(sitemap.length >= 50);
  assert.deepEqual(p.urlList, sitemap.map((e) => e.loc));
  for (const u of p.urlList) assert.ok(locs.has(u), u);
});

test('payload com --desde: só as URLs do sitemap com lastmod >= a data', () => {
  const chave = acharChave(raiz);
  const datas = [...new Set(sitemap.map((e) => e.lastmod))].sort();
  const desde = datas.at(-1);
  const p = montarPayload({ entradas: sitemap, chave, desde });
  assert.ok(p.urlList.length >= 1 && p.urlList.length < sitemap.length);
  assert.deepEqual(p.urlList, sitemap.filter((e) => e.lastmod >= desde).map((e) => e.loc));
  for (const u of p.urlList) assert.ok(locs.has(u), u);
  assert.deepEqual(montarPayload({ entradas: sitemap, chave, desde: '2999-01-01' }).urlList, []);
});

test('montarPayload recusa data fora de AAAA-MM-DD, URL de outro host ou sem https e mais de 10.000 URLs', () => {
  const chave = 'c'.repeat(32);
  const e = (loc, lastmod = '2026-11-01') => ({ loc, lastmod });
  assert.throws(() => montarPayload({ entradas: [e('https://contacertabr.com.br/')], chave, desde: '01/11/2026' }), /AAAA-MM-DD/);
  assert.throws(() => montarPayload({ entradas: [e('https://outro.exemplo/')], chave }), /outro host/);
  assert.throws(() => montarPayload({ entradas: [e('http://contacertabr.com.br/')], chave }), /outro host|https/);
  const muitas = Array.from({ length: 10001 }, (_, i) => e(`https://contacertabr.com.br/p${i}/`));
  assert.throws(() => montarPayload({ entradas: muitas, chave }), /10\.000/);
});

test('lerSitemap lê loc e lastmod de cada <url>', () => {
  const xml = '<urlset><url><loc>https://contacertabr.com.br/</loc><lastmod>2026-10-30</lastmod></url>\n<url>\n  <loc> https://contacertabr.com.br/x/ </loc>\n</url></urlset>';
  assert.deepEqual(lerSitemap(xml), [{ loc: 'https://contacertabr.com.br/', lastmod: '2026-10-30' }, { loc: 'https://contacertabr.com.br/x/', lastmod: undefined }]);
  assert.equal(sitemap.length, (ler('sitemap.xml').match(/<url>/g) || []).length);
});

test('opcoes: por padrão só imprime; --enviar liga o POST; opção desconhecida ou --desde sem data é erro', () => {
  assert.deepEqual(opcoes([]), { desde: undefined, enviar: false });
  assert.deepEqual(opcoes(['--desde', '2026-11-01']), { desde: '2026-11-01', enviar: false });
  assert.deepEqual(opcoes(['--enviar', '--desde=2026-11-01']), { desde: '2026-11-01', enviar: true });
  assert.throws(() => opcoes(['--envia']), /desconhecida/);
  assert.throws(() => opcoes(['--desde']), /--desde/);
});

const payload = { host: HOST, key: 'd'.repeat(32), keyLocation: `https://${HOST}/${'d'.repeat(32)}.txt`, urlList: ['https://contacertabr.com.br/'] };
const falso = (respostas) => {
  const chamadas = [];
  const f = async (url, init = {}) => {
    chamadas.push({ url, init });
    const r = respostas.shift();
    return { status: r.status, ok: r.status >= 200 && r.status < 300, text: async () => r.corpo ?? '' };
  };
  return { f, chamadas };
};

test('enviar: confere a chave publicada antes e não faz o POST se ela não bate', async () => {
  const { f, chamadas } = falso([{ status: 404, corpo: 'não encontrado' }]);
  await assert.rejects(enviar(payload, { fetch: f }), /chave/);
  assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0].url, payload.keyLocation);
  assert.equal(chamadas[0].init.method ?? 'GET', 'GET');
});

test('enviar: com a chave no ar, faz um POST em api.indexnow.org com o payload em JSON', async () => {
  const { f, chamadas } = falso([{ status: 200, corpo: payload.key }, { status: 202 }]);
  const r = await enviar(payload, { fetch: f });
  assert.equal(r.status, 202);
  assert.match(r.mensagem, /aceito/i);
  assert.equal(chamadas.length, 2);
  assert.equal(ENDPOINT, 'https://api.indexnow.org/indexnow');
  assert.equal(chamadas[1].url, ENDPOINT);
  assert.equal(chamadas[1].init.method, 'POST');
  assert.equal(chamadas[1].init.headers['Content-Type'], 'application/json; charset=utf-8');
  assert.deepEqual(JSON.parse(chamadas[1].init.body), payload);
});

test('enviar: resposta de erro do IndexNow vira exceção com o significado', async () => {
  for (const [status, re] of [[400, /formato/], [403, /chave/], [422, /host/], [429, /muitas/]]) {
    const { f } = falso([{ status: 200, corpo: payload.key }, { status }]);
    await assert.rejects(enviar(payload, { fetch: f }), re, String(status));
  }
});

test('lista vazia: enviar não chama a rede', async () => {
  const { f, chamadas } = falso([]);
  const r = await enviar({ ...payload, urlList: [] }, { fetch: f });
  assert.equal(chamadas.length, 0);
  assert.match(r.mensagem, /nada a enviar/i);
});

test('o script, sem --enviar, imprime o payload e não usa a rede', () => {
  // fetch trocado por um que falha: se o script tentasse a rede, sairia com erro.
  const semRede = 'data:text/javascript,globalThis.fetch=()=>{throw new Error("rede usada")}';
  const saida = execFileSync(process.execPath, ['--import', semRede, 'tests/manutencao/indexnow.mjs'], { cwd: raiz, encoding: 'utf8' });
  const p = JSON.parse(saida);
  assert.equal(p.key, acharChave(raiz));
  assert.deepEqual(p.urlList, sitemap.map((e) => e.loc));
});
