#!/usr/bin/env node
// Checagem dos links externos do site (Node 22, sem dependências). Roda toda semana pelo
// .github/workflows/links.yml e à mão: `node tests/links/conferir-links.mjs` na raiz do repositório.
//
// - Extrai os links externos de todo .html publicado (fora de .git, node_modules e tests/): atributos href, src,
//   poster e cite, e as URLs dos blocos JSON-LD. O próprio domínio (contacertabr.com.br) fica de fora; o fragmento
//   (#...) é descartado, porque não vai ao servidor. Cada URL é conferida uma vez. Formulário não é link navegável:
//   action e formaction ficam de fora (um GET no destino do envio pode abrir sessão de pagamento ou gravar resposta).
// - Hosts de outros produtos da empresa (NAO_BUSCAR: creditrilha.com.br e licitacoes-checkout.*.workers.dev) nunca
//   recebem requisição, nem quando outro link redireciona para eles: cada acesso ao Creditrilha grava no banco dele e
//   o checkout do Licitações abriria sessão de pagamento. Saem no resumo como "não conferido (próprio)".
// - GET com user-agent de navegador, seguindo até 15 redirecionamentos com os cookies da cadeia (como o navegador),
//   com tempo-limite por tentativa, no máximo --concorrencia requisições ao mesmo tempo e 2 por host. O que não der
//   OK nem bloqueio ganha uma nova tentativa numa segunda passada, --pausa depois do fim da primeira (60 s) e com a
//   mesma fila por host: uma queda curta de um host com muitos links (www.planalto.gov.br) não vira dezenas de
//   QUEBRADO.
// - Links de afiliado: o parâmetro do afiliado (tag= da Amazon, indicacao=) sai da URL conferida, para a checagem não
//   contar como clique de robô; a página existe ou não sem ele, e o resumo mostra a URL publicada. Afiliado no caminho
//   (go.hotmart.com/<código>, bling.com.br/planos-e-precos/<código>) não tem como sair: é conferido como está, com 1
//   GET por semana (2 se não der OK).
// - Classes: OK (2xx); BLOQUEIO_DE_ROBO (401, 403, 405, 406, 418, 429, 451, 999 ou desafio do Cloudflare: aviso, não
//   falha); NAO_CONFERIDO (cadeia TLS incompleta, que o navegador completa e o Node não: aviso); QUEBRADO (404, 410
//   e demais 4xx, 5xx nas duas tentativas, erro de DNS ou de rede, tempo esgotado duas vezes; também quando um
//   redirecionamento termina em 404); PROPRIO (host da NAO_BUSCAR, sem requisição nem nova tentativa: informativo).
// - Escreve o resumo em $GITHUB_STEP_SUMMARY (cada link quebrado com as páginas onde aparece) e sai com 1 se houver
//   link quebrado.
//
// Opções: --raiz <dir> (padrão: a raiz do repositório), --concorrencia <n> (8), --tempo-limite <ms> (15000),
// --pausa <ms> antes da nova tentativa (60000), --listar (só lista os links e as páginas, sem rede).
// Atrás de proxy (Node >= 22.21): NODE_USE_ENV_PROXY=1 node tests/links/conferir-links.mjs
import { appendFileSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const PROPRIO = /(^|\.)contacertabr\.com\.br$/i;
const ROBO = new Set([401, 403, 405, 406, 418, 429, 451, 999]);
const TLS_INCOMPLETO = new Set(['UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'UNABLE_TO_GET_ISSUER_CERT', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY']);
const DNS = new Set(['ENOTFOUND', 'EAI_AGAIN', 'EAI_NONAME', 'EAI_NODATA']);
const PAUSA = 60000;
// Hosts de outros produtos da empresa: o conferidor não faz nenhuma requisição a eles (ver o cabeçalho).
export const NAO_BUSCAR = [/(^|\.)creditrilha\.com\.br$/i, /^licitacoes-checkout\.[^.]+\.workers\.dev$/i];
export function naoBuscar(url, lista = NAO_BUSCAR) {
  let host;
  try { host = new URL(url).hostname; } catch { return false; }
  return lista.some((r) => r.test(host));
}
// [host, parâmetros que identificam o afiliado]
const AFILIADO = [[/(^|\.)amazon\.[a-z.]+$/i, ['tag']], [/./, ['indicacao']]];

// ---------- páginas e links ----------
export function listarPaginas(raiz) {
  const andar = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    if (d.name === '.git' || d.name === 'node_modules') return [];
    const p = join(dir, d.name);
    if (d.isDirectory()) return dir === raiz && d.name === 'tests' ? [] : andar(p);
    return d.name.endsWith('.html') ? [relative(raiz, p).split(sep).join('/')] : [];
  });
  return andar(raiz).sort();
}
// blog/pro-labore/index.html -> /blog/pro-labore/
export const caminhoDe = (arquivo) => `/${arquivo.replace(/(^|\/)index\.html$/, '$1')}`;

const ENTIDADES = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
export const decodificar = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  return ENTIDADES[e.toLowerCase()] ?? m;
});

// URL externa normalizada (sem fragmento) ou null.
export function externa(bruta) {
  let u;
  try { u = new URL(decodificar(bruta.trim())); } catch { return null; }
  if ((u.protocol !== 'http:' && u.protocol !== 'https:') || PROPRIO.test(u.hostname)) return null;
  u.hash = '';
  return u.href;
}

export function extrairLinks(html) {
  const links = new Set();
  for (const m of html.matchAll(/<[a-z][^>]*>/gi)) {
    for (const a of m[0].matchAll(/\s(?:href|src|poster|cite)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
      const u = externa(a[1] ?? a[2]);
      if (u) links.add(u);
    }
  }
  for (const m of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([^]*?)<\/script>/gi)) {
    let dados;
    try { dados = JSON.parse(m[1]); } catch { continue; }
    const andar = (v, chave) => {
      if (typeof v === 'string') { if (chave !== '@context' && /^https?:\/\//i.test(v)) { const u = externa(v); if (u) links.add(u); } }
      else if (Array.isArray(v)) v.forEach((x) => andar(x, chave));
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) andar(x, k);
    };
    andar(dados, '');
  }
  return [...links];
}

// Map URL -> páginas (caminhos do site) onde aparece: `mapa` com os links a conferir e `proprios` com os de host da
// NAO_BUSCAR, que não vão à rede.
export function mapearLinks(raiz, { naoBuscar: lista = NAO_BUSCAR } = {}) {
  const mapa = new Map(), proprios = new Map();
  const paginas = listarPaginas(raiz);
  for (const arquivo of paginas) {
    for (const url of extrairLinks(readFileSync(join(raiz, arquivo), 'utf8'))) {
      const alvo = naoBuscar(url, lista) ? proprios : mapa;
      if (!alvo.has(url)) alvo.set(url, new Set());
      alvo.get(url).add(caminhoDe(arquivo));
    }
  }
  return { paginas, mapa, proprios };
}

// ---------- conferência ----------
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// URL a conferir: a publicada sem o parâmetro de afiliado (ver o cabeçalho). Sem parâmetro a tirar, a mesma string.
export function semAfiliado(url) {
  const u = new URL(url);
  const tirar = AFILIADO.filter(([host]) => host.test(u.hostname)).flatMap(([, ps]) => ps).filter((p) => u.searchParams.has(p));
  if (!tirar.length) return url;
  for (const p of tirar) u.searchParams.delete(p);
  return u.href;
}

// Cookies da cadeia de redirecionamentos, como o navegador guarda. Sem isso, sites que gravam um cookie e
// redirecionam para a mesma URL (caixa.gov.br, nfe.fazenda.gov.br) entram em laço e pareceriam quebrados.
// Só nome=valor e domínio: caminho, expiração e Secure não importam para conferir um link.
function guardarCookies(pote, res, url) {
  const host = new URL(url).hostname.toLowerCase();
  for (const linha of res.headers.getSetCookie ? res.headers.getSetCookie() : []) {
    const [par, ...atributos] = linha.split(';');
    const i = par.indexOf('=');
    if (i < 1) continue;
    const nome = par.slice(0, i).trim(), valor = par.slice(i + 1).trim();
    const dom = atributos.map((a) => a.trim().match(/^domain=\.?(.+)$/i)).find(Boolean);
    const dominio = dom ? dom[1].toLowerCase() : host;
    if (dom && host !== dominio && !host.endsWith(`.${dominio}`)) continue; // domínio alheio: o navegador recusa
    const resto = pote.filter((c) => !(c.nome === nome && c.dominio === dominio));
    pote.length = 0;
    pote.push(...resto, { nome, valor, dominio, soHost: !dom });
  }
}
function cookiesPara(pote, url) {
  const host = new URL(url).hostname.toLowerCase();
  return pote.filter((c) => (c.soHost ? host === c.dominio : host === c.dominio || host.endsWith(`.${c.dominio}`)))
    .map((c) => `${c.nome}=${c.valor}`).join('; ');
}

const MAX_REDIRECIONAMENTOS = 15;

// Uma tentativa, seguindo os redirecionamentos à mão (com os cookies da cadeia) dentro do mesmo tempo-limite:
// { status, urlFinal, cloudflare }, { erro: { tipo: 'timeout'|'dns'|'tls'|'rede', codigo, mensagem }, urlFinal } ou
// { proprio: true, urlFinal } quando a URL, ou um salto da cadeia, é de host da NAO_BUSCAR (sem requisição a ele).
export async function tentar(url, { tempoLimite = 15000, fetch: buscar = globalThis.fetch, naoBuscar: lista = NAO_BUSCAR } = {}) {
  const sinal = AbortSignal.timeout(tempoLimite);
  const pote = [];
  let atual = url;
  try {
    for (let saltos = 0; ; saltos++) {
      if (naoBuscar(atual, lista)) return { proprio: true, urlFinal: atual };
      const cookie = cookiesPara(pote, atual);
      const res = await buscar(atual, {
        redirect: 'manual',
        signal: sinal,
        headers: {
          'user-agent': UA,
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8',
          ...(cookie ? { cookie } : {}),
        },
      });
      try { await res.body?.cancel(); } catch { /* corpo já fechado */ }
      guardarCookies(pote, res, atual);
      const destino = res.headers.get('location');
      if ([301, 302, 303, 307, 308].includes(res.status) && destino) {
        if (saltos >= MAX_REDIRECIONAMENTOS) return { erro: { tipo: 'rede', mensagem: `mais de ${MAX_REDIRECIONAMENTOS} redirecionamentos` }, urlFinal: atual };
        atual = new URL(destino, atual).href;
        continue;
      }
      return { status: res.status, urlFinal: atual, cloudflare: res.headers.get('cf-mitigated') === 'challenge' };
    }
  } catch (e) {
    if (e && (e.name === 'TimeoutError' || e.name === 'AbortError')) return { erro: { tipo: 'timeout', mensagem: `${tempoLimite} ms` }, urlFinal: atual };
    const causa = (e && e.cause) || {};
    const codigo = causa.code || (causa.cause && causa.cause.code) || '';
    const mensagem = [e && e.message, causa.message].filter(Boolean).join(': ');
    const tipo = DNS.has(codigo) ? 'dns' : TLS_INCOMPLETO.has(codigo) ? 'tls' : 'rede';
    return { erro: { tipo, codigo, mensagem }, urlFinal: atual };
  }
}

// Classe de uma tentativa: PROPRIO, OK, BLOQUEIO_DE_ROBO, NAO_CONFERIDO ou QUEBRADO, com o motivo legível.
export function classificar(t, url) {
  const via = t.urlFinal && t.urlFinal !== url ? ` depois de redirecionar para ${t.urlFinal}` : '';
  if (t.proprio) return { classe: 'PROPRIO', motivo: `não conferido (próprio)${via}: outro produto da empresa, sem nenhuma requisição a ele` };
  if (t.erro) {
    if (t.erro.tipo === 'tls') return { classe: 'NAO_CONFERIDO', motivo: `cadeia TLS incompleta (${t.erro.codigo})${via}: o navegador costuma completar, conferir à mão` };
    const tipo = { timeout: 'tempo esgotado', dns: 'erro de DNS', rede: 'erro de rede' }[t.erro.tipo];
    return { classe: 'QUEBRADO', motivo: `${tipo}${t.erro.codigo ? ` (${t.erro.codigo})` : ''}${via}: ${t.erro.mensagem}` };
  }
  if (t.status >= 200 && t.status < 300) return { classe: 'OK', motivo: `HTTP ${t.status}${via}` };
  if (ROBO.has(t.status) || t.cloudflare) return { classe: 'BLOQUEIO_DE_ROBO', motivo: `HTTP ${t.status}${t.cloudflare ? ' (desafio do Cloudflare)' : ''}${via}` };
  return { classe: 'QUEBRADO', motivo: `HTTP ${t.status}${via}` };
}

const refazer = (r) => r.classe === 'QUEBRADO' || r.classe === 'NAO_CONFERIDO';
// Vale o resultado da segunda tentativa (404 ou 5xx duas vezes, tempo esgotado duas vezes etc.).
const segunda = (primeira, nova) => ({ ...nova, tentativas: 2, primeira: primeira.motivo });

// Uma tentativa classificada: `url` é a publicada; `conferida`, a URL pedida quando o parâmetro de afiliado saiu.
async function umaTentativa(url, { tempoLimite = 15000, fetch, naoBuscar: lista } = {}) {
  const alvo = semAfiliado(url);
  const r = classificar(await tentar(alvo, { tempoLimite, fetch, naoBuscar: lista }), alvo);
  return alvo === url ? { url, ...r } : { url, conferida: alvo, ...r, motivo: `${r.motivo} (conferido sem o parâmetro de afiliado)` };
}

// Confere um link sozinho: uma tentativa e, se não der OK nem bloqueio, mais uma depois da pausa.
export async function conferir(url, { pausa = PAUSA, ...opcoes } = {}) {
  const r = await umaTentativa(url, opcoes);
  if (!refazer(r)) return r;
  await esperar(pausa);
  return segunda(r, await umaTentativa(url, opcoes));
}

// Todos os links: primeira passada inteira e, para o que não deu OK nem bloqueio, uma segunda passada depois da
// pausa, com a mesma fila. `aoRefazer(n, pausa)` avisa antes da espera.
export async function conferirTodos(urls, { concorrencia = 8, porHost = 2, pausa = PAUSA, aoRefazer, ...opcoes } = {}) {
  const fila = { concorrencia, porHost };
  const primeira = await emFila(urls, (u) => umaTentativa(u, opcoes), fila);
  const deNovo = primeira.filter(refazer).map((r) => r.url);
  if (!deNovo.length) return primeira;
  if (aoRefazer) aoRefazer(deNovo.length, pausa);
  await esperar(pausa);
  const novas = new Map((await emFila(deNovo, (u) => umaTentativa(u, opcoes), fila)).map((r) => [r.url, r]));
  return primeira.map((r) => (novas.has(r.url) ? segunda(r, novas.get(r.url)) : r));
}

// Fila com limite global e por host; devolve os resultados na ordem de `urls`.
async function emFila(urls, fazer, { concorrencia, porHost }) {
  const fila = [...urls];
  const ativosPorHost = new Map();
  const resultados = new Map();
  await new Promise((fim) => {
    let ativos = 0;
    const proximo = () => {
      if (!fila.length && !ativos) return fim();
      for (let i = 0; i < fila.length && ativos < concorrencia; i++) {
        const url = fila[i];
        const host = new URL(url).host;
        if ((ativosPorHost.get(host) || 0) >= porHost) continue;
        fila.splice(i--, 1);
        ativos++;
        ativosPorHost.set(host, (ativosPorHost.get(host) || 0) + 1);
        fazer(url).then((r) => {
          resultados.set(url, r);
          ativos--;
          ativosPorHost.set(host, ativosPorHost.get(host) - 1);
          proximo();
        });
      }
    };
    proximo();
  });
  return urls.map((u) => resultados.get(u));
}

// ---------- resumo ----------
const celula = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
export function resumoMarkdown({ paginas, mapa, resultados }) {
  const por = (c) => resultados.filter((r) => r.classe === c);
  const quebrados = por('QUEBRADO'), robo = por('BLOQUEIO_DE_ROBO'), nao = por('NAO_CONFERIDO'), proprios = por('PROPRIO');
  const onde = (r) => [...mapa.get(r.url)].sort().join(', ');
  const tabela = (lista) => ['| Link | Resultado | Páginas |', '|---|---|---|',
    ...lista.map((r) => `| ${celula(r.url)} | ${celula(r.motivo)} | ${celula(onde(r))} |`)].join('\n');
  const n = resultados.length - proprios.length;
  const linhas = [
    '## Links externos',
    '',
    `${n} ${n === 1 ? 'link externo único' : 'links externos únicos'} em ${paginas.length} páginas: ${por('OK').length} OK, `
      + `${quebrados.length} ${quebrados.length === 1 ? 'quebrado' : 'quebrados'}, ${robo.length} com bloqueio de robô e `
      + `${nao.length} ${nao.length === 1 ? 'não conferido' : 'não conferidos'} (os dois últimos são aviso, não falha).`
      + (proprios.length ? ` Fora da conta: ${proprios.length} ${proprios.length === 1 ? 'link de outro produto da empresa, não conferido' : 'links de outros produtos da empresa, não conferidos'} (próprio), sem nenhuma requisição.` : ''),
    '',
  ];
  if (quebrados.length) linhas.push('### Quebrados', '', tabela(quebrados), '');
  if (robo.length) linhas.push('### Bloqueio de robô (aviso, não falha)', '', 'O servidor recusou o robô; no navegador o link pode estar normal. Confira à mão se ficar assim por semanas.', '', tabela(robo), '');
  if (nao.length) linhas.push('### Não conferidos (aviso, não falha)', '', tabela(nao), '');
  if (proprios.length) linhas.push('### Não conferidos (próprio)', '', 'Outros produtos da empresa: o conferidor não faz requisição a eles, porque cada acesso tem efeito (registro de visita, sessão de pagamento). Confira no navegador, se preciso.', '', tabela(proprios), '');
  return linhas.join('\n');
}

// ---------- linha de comando ----------
function opcoes(argv) {
  const o = { raiz: fileURLToPath(new URL('../../', import.meta.url)), concorrencia: 8, tempoLimite: 15000, pausa: PAUSA, listar: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], v = () => { const x = argv[++i]; if (x === undefined) throw new Error(`${a} pede um valor`); return x; };
    if (a === '--raiz') o.raiz = resolve(v());
    else if (a === '--concorrencia') o.concorrencia = Number(v());
    else if (a === '--tempo-limite') o.tempoLimite = Number(v());
    else if (a === '--pausa') o.pausa = Number(v());
    else if (a === '--listar') o.listar = true;
    else throw new Error(`opção desconhecida: ${a}`);
  }
  if (!(o.concorrencia >= 1) || !(o.tempoLimite >= 1) || !(o.pausa >= 0)) throw new Error('--concorrencia, --tempo-limite e --pausa precisam ser números positivos');
  return o;
}

async function main() {
  const o = opcoes(process.argv.slice(2));
  const { paginas, mapa, proprios } = mapearLinks(o.raiz);
  const urls = [...mapa.keys()].sort(), deFora = [...proprios.keys()].sort();
  const ondeAparece = (u) => [...(mapa.get(u) || proprios.get(u))].sort().join(', ');
  if (o.listar) {
    for (const u of urls) console.log(`${u}\t${ondeAparece(u)}`);
    for (const u of deFora) console.log(`${u}\t${ondeAparece(u)}\t(não conferido: próprio)`);
    console.log(`${urls.length} links externos únicos em ${paginas.length} páginas`
      + `${deFora.length ? `, mais ${deFora.length} de ${deFora.length === 1 ? 'outro produto' : 'outros produtos'} da empresa, sem requisição` : ''}.`);
    return 0;
  }
  console.log(`Conferindo ${urls.length} links externos únicos de ${paginas.length} páginas...`);
  const inicio = Date.now();
  const aoRefazer = (n, ms) => console.log(`Nova tentativa de ${n} ${n === 1 ? 'link' : 'links'} daqui a ${Math.round(ms / 1000)} s...`);
  const proprio = (url) => ({ url, ...classificar({ proprio: true, urlFinal: url }, url) });
  const resultados = [...await conferirTodos(urls, { ...o, aoRefazer }), ...deFora.map(proprio)];
  const todos = new Map([...mapa, ...proprios]);
  for (const r of resultados) if (r.classe !== 'OK') console.log(`${r.classe.padEnd(16)} ${r.url}\n${' '.repeat(17)}${r.motivo}\n${' '.repeat(17)}em ${ondeAparece(r.url)}`);
  const md = resumoMarkdown({ paginas, mapa: todos, resultados });
  console.log(`\n${md.split('\n')[2]}\nTempo: ${Math.round((Date.now() - inicio) / 1000)} s.`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`);
  return resultados.some((r) => r.classe === 'QUEBRADO') ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((codigo) => { process.exitCode = codigo; }, (e) => { console.error(e.message || e); process.exitCode = 2; });
}
