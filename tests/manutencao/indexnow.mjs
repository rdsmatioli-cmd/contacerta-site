#!/usr/bin/env node
// IndexNow: avisa o Bing (e os outros buscadores do protocolo: Yandex, Seznam, Naver, Yep) das URLs novas ou
// alteradas do sitemap.xml. O Google não usa IndexNow. Node 22, sem dependências.
//
// A chave é o arquivo <32 hex>.txt na raiz do site, com a própria chave como conteúdo (sem quebra de linha). Ela é
// pública por desenho: o buscador baixa https://contacertabr.com.br/<chave>.txt para conferir que o envio veio do dono
// do site. Não apague nem renomeie o arquivo; para trocar a chave, publique a nova e só depois tire a antiga.
//
// Uso, na raiz do repositório, DEPOIS que o deploy da main (Actions > Pages) publicou as páginas alteradas:
//   node tests/manutencao/indexnow.mjs                          imprime o payload com todas as URLs do sitemap
//   node tests/manutencao/indexnow.mjs --desde 2026-11-01       só as URLs com lastmod >= a data (AAAA-MM-DD)
//   node tests/manutencao/indexnow.mjs --desde 2026-11-01 --enviar
// Por padrão só imprime o JSON e não usa a rede. Com --enviar, confere que a chave publicada no ar bate com a do
// repositório (GET em keyLocation) e só então faz o POST em https://api.indexnow.org/indexnow. O envio é do operador
// (Rodrigo), nunca do CI. Atrás de proxy (Node >= 22.21): NODE_USE_ENV_PROXY=1.
// tests/indexnow.test.mjs usa as funções exportadas daqui, sem rede.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
export const HOST = 'contacertabr.com.br';
export const ENDPOINT = 'https://api.indexnow.org/indexnow';
// Limite do protocolo por POST.
const MAX_URLS = 10000;
const ARQUIVO_CHAVE = /^([0-9a-f]{32})\.txt$/;

// Chave do site: o único <32 hex>.txt da raiz, cujo conteúdo é exatamente o próprio nome sem a extensão.
export function acharChave(raiz = RAIZ, { listar = () => readdirSync(raiz), lerArquivo = (n) => readFileSync(join(raiz, n), 'utf8') } = {}) {
  const arquivos = listar().filter((n) => ARQUIVO_CHAVE.test(n));
  if (arquivos.length === 0) throw new Error(`nenhum arquivo de chave (<32 hex>.txt) na raiz ${raiz}`);
  if (arquivos.length > 1) throw new Error(`mais de um arquivo de chave na raiz: ${arquivos.join(', ')}`);
  const chave = arquivos[0].match(ARQUIVO_CHAVE)[1];
  if (lerArquivo(arquivos[0]) !== chave) throw new Error(`o conteúdo de ${arquivos[0]} não bate com o nome (tem de ser só a chave, sem quebra de linha)`);
  return chave;
}

// [{ loc, lastmod }] de cada <url> do sitemap, na ordem do arquivo.
export const lerSitemap = (xml) => [...xml.matchAll(/<url>([^]*?)<\/url>/g)].map((m) => ({
  loc: (m[1].match(/<loc>([^<]+)<\/loc>/) || [])[1]?.trim(),
  lastmod: (m[1].match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1]?.trim(),
}));

// Payload do IndexNow. Com `desde`, só entram as URLs com lastmod >= desde (URL sem lastmod entra sempre).
export function montarPayload({ entradas, chave, desde, host = HOST }) {
  if (desde !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(desde)) throw new Error(`--desde ${desde}: use AAAA-MM-DD`);
  for (const { loc } of entradas) {
    let u;
    try { u = new URL(loc); } catch { throw new Error(`URL inválida no sitemap: ${loc}`); }
    if (u.protocol !== 'https:' || u.host !== host) throw new Error(`URL de outro host ou sem https no sitemap: ${loc} (o IndexNow recusa com 422)`);
  }
  const urlList = entradas.filter((e) => desde === undefined || !e.lastmod || e.lastmod >= desde).map((e) => e.loc);
  if (urlList.length > MAX_URLS) throw new Error(`${urlList.length} URLs: o IndexNow aceita até 10.000 por envio; use --desde`);
  return { host, key: chave, keyLocation: `https://${host}/${chave}.txt`, urlList };
}

export function opcoes(argv) {
  const r = { desde: undefined, enviar: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--enviar') r.enviar = true;
    else if (a === '--desde' || a.startsWith('--desde=')) {
      const v = a === '--desde' ? argv[++i] : a.slice('--desde='.length);
      if (!v || v.startsWith('--')) throw new Error('--desde pede uma data AAAA-MM-DD');
      r.desde = v;
    } else throw new Error(`opção desconhecida: ${a} (use --desde AAAA-MM-DD e --enviar)`);
  }
  return r;
}

const SIGNIFICADO = {
  200: 'aceito (200)',
  202: 'aceito (202): a chave ainda vai ser conferida pelo buscador',
  400: 'pedido em formato inválido (400)',
  403: 'chave não encontrada ou inválida no keyLocation (403)',
  422: 'URLs de outro host ou que não batem com o host/chave (422)',
  429: 'muitas requisições (429): espere antes de repetir',
};

// Confere a chave no ar e faz o POST. Devolve { status, mensagem }; erro do IndexNow vira exceção.
export async function enviar(payload, { fetch: buscar = globalThis.fetch, endpoint = ENDPOINT } = {}) {
  if (payload.urlList.length === 0) return { status: 0, mensagem: 'nada a enviar: nenhuma URL com lastmod na janela pedida' };
  const r = await buscar(payload.keyLocation, { method: 'GET', redirect: 'follow' });
  const publicada = r.ok ? (await r.text()).trim() : null;
  if (publicada !== payload.key) {
    throw new Error(`a chave publicada em ${payload.keyLocation} não bate com a do repositório (HTTP ${r.status}): o deploy da main já rodou?`);
  }
  const p = await buscar(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });
  const mensagem = SIGNIFICADO[p.status] || `resposta inesperada (HTTP ${p.status})`;
  if (p.status !== 200 && p.status !== 202) throw new Error(`IndexNow: ${mensagem}`);
  return { status: p.status, mensagem: `IndexNow: ${mensagem}; ${payload.urlList.length} URL(s)` };
}

async function principal() {
  const o = opcoes(process.argv.slice(2));
  const payload = montarPayload({ entradas: lerSitemap(readFileSync(join(RAIZ, 'sitemap.xml'), 'utf8')), chave: acharChave(RAIZ), desde: o.desde });
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  if (!o.enviar) {
    process.stderr.write(`${payload.urlList.length} URL(s). Só impresso; para enviar, repita com --enviar.\n`);
    return;
  }
  const r = await enviar(payload);
  process.stderr.write(`${r.mensagem}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal().catch((e) => { process.stderr.write(`erro: ${e.message}\n`); process.exit(1); });
}
