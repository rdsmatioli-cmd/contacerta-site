// CC-08 + CC-09 (17/10/2026): integridade do site publicado, que o html-validate não confere.
// 1. Links internos: todo href/src/action e meta content do próprio domínio (relativo, absoluto ou com âncora)
//    aponta para um arquivo que existe, resolvido como o GitHub Pages serve (pasta/ -> pasta/index.html;
//    /x -> x, x.html ou x/index.html), e a âncora #id existe na página de destino.
//    Vale também para as URLs do site citadas em llms.txt, robots.txt e blog/feed.xml.
// 2. JSON-LD: todo <script type="application/ld+json"> faz JSON.parse, toda URL do domínio existe e todo
//    {"@id": ...} citado é definido em alguma página. O "author" tem @type e name na PRÓPRIA página, inline ou
//    num nó com o mesmo @id, porque o Google lê o JSON-LD de cada URL isoladamente.
// 3. sitemap.xml x canonical: toda página indexável tem canonical para si mesma e está no sitemap; toda URL do
//    sitemap é o canonical de uma página indexável; lastmod em AAAA-MM-DD, não futuro e >= dateModified/
//    datePublished do PRÓPRIO documento (objetos-raiz do JSON-LD e article:*_time). Os itens blogPost do índice
//    e das categorias do blog trazem datas dos posts filhos e por isso não entram na comparação.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const ORIGEM = 'https://contacertabr.com.br';
const DOMINIO = /^(www\.)?contacertabr\.com\.br$/;
const listar = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  if (d.name === '.git' || d.name === 'node_modules') return [];
  const p = join(dir, d.name);
  if (d.isDirectory()) return listar(p);
  return d.name.endsWith('.html') && !d.name.startsWith('google') ? [relative(raiz, p).split(sep).join('/')] : [];
});
const paginas = listar(raiz).sort();
const cache = new Map();
const ler = (p) => {
  if (!cache.has(p)) cache.set(p, readFileSync(join(raiz, p), 'utf8'));
  return cache.get(p);
};
const ehArquivo = (p) => {
  try { return statSync(join(raiz, p)).isFile(); } catch { return false; }
};
const decodifica = (s) => {
  try { return decodeURIComponent(s); } catch { return s; }
};

// Caminho de URL -> arquivo do repositório, como o GitHub Pages serve; null quando seria 404.
function arquivoDe(caminho) {
  const p = decodifica(caminho).replace(/^\/+/, '');
  if (p === '' || p.endsWith('/')) return ehArquivo(`${p}index.html`) ? `${p}index.html` : null;
  for (const c of [p, `${p}.html`, `${p}/index.html`]) if (ehArquivo(c)) return c;
  return null;
}
const idsCache = new Map();
const idsDe = (arq) => {
  if (!idsCache.has(arq)) {
    const h = ler(arq);
    idsCache.set(arq, new Set([...h.matchAll(/\sid="([^"]+)"/g), ...h.matchAll(/<a\b[^>]*\sname="([^"]+)"/g)].map((m) => m[1])));
  }
  return idsCache.get(arq);
};

// Confere uma referência; acrescenta a falha (texto) em `falhas`.
function checar(ref, base, origem, falhas, { ancora = true } = {}) {
  if (!ref || /^(mailto|tel|javascript|data|sms):/i.test(ref)) return;
  let u;
  try { u = new URL(ref, base); } catch { falhas.push(`${origem}: URL inválida ${ref}`); return; }
  if (!DOMINIO.test(u.host)) return;
  const alvo = arquivoDe(u.pathname);
  if (!alvo) { falhas.push(`${origem}: ${ref} não existe`); return; }
  const frag = decodifica(u.hash.slice(1));
  if (ancora && frag && frag !== 'top' && !frag.startsWith(':~:') && alvo.endsWith('.html') && !idsDe(alvo).has(frag)) {
    falhas.push(`${origem}: âncora ${ref} não existe em ${alvo}`);
  }
}

// href/src/action fora de <script> e <style> (o script da busca monta '<a href="'+u+'">' em texto), mais as URLs
// absolutas do domínio em <meta content> (og:url, og:image...).
const referencias = (html) => {
  const h = html.replace(/<!--[^]*?-->/g, '')
    .replace(/(<script\b[^>]*>)[^]*?<\/script>/gi, '$1</script>')
    .replace(/<style\b[^>]*>[^]*?<\/style>/gi, '');
  const refs = [...h.matchAll(/\s(?:href|src|action|poster)="([^"]*)"/gi)].map((m) => m[1]);
  for (const m of h.matchAll(/<meta\b[^>]*\scontent="(https?:\/\/(?:www\.)?contacertabr\.com\.br[^"]*)"/gi)) refs.push(m[1]);
  return refs.map((r) => r.replace(/&amp;/g, '&'));
};
const blocosLd = (html) => [...html.matchAll(/<script type="application\/ld\+json">([^]*?)<\/script>/g)].map((m) => m[1]);
const textos = (v) => (typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(textos) : v && typeof v === 'object' ? Object.values(v).flatMap(textos) : []);
const objetos = (v) => (Array.isArray(v) ? v.flatMap(objetos) : v && typeof v === 'object' ? [v, ...Object.values(v).flatMap(objetos)] : []);
const raizesLd = (j) => (Array.isArray(j) ? j : Array.isArray(j['@graph']) ? j['@graph'] : [j]);
const tagsLink = (html) => html.match(/<link\b[^>]*>/gi) || [];
const canonicalDe = (html) => {
  const t = tagsLink(html).find((x) => /\srel="canonical"/i.test(x));
  return t ? (t.match(/\shref="([^"]*)"/i) || [])[1] : undefined;
};
const noindex = (html) => /<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(html);
const urlDa = (arq) => `${ORIGEM}/${arq.replace(/(^|\/)index\.html$/, '$1')}`;

test('a varredura é recursiva e acha páginas de todos os níveis', () => {
  for (const p of ['index.html', '404.html', 'blog/categoria/impostos-e-mei/index.html', 'licitacoes/blog/como-encontrar-licitacoes.html']) {
    assert.ok(paginas.includes(p), p);
  }
  assert.ok(paginas.length >= 56);
});

for (const p of paginas) {
  test(`${p}: links internos e âncoras existem`, () => {
    const falhas = [];
    for (const r of referencias(ler(p))) checar(r, `${ORIGEM}/${p}`, p, falhas);
    assert.deepEqual(falhas, []);
  });
}

test('llms.txt, robots.txt e blog/feed.xml só citam URLs do site que existem', () => {
  const falhas = [];
  for (const arq of ['llms.txt', 'robots.txt', 'blog/feed.xml']) {
    for (const m of ler(arq).matchAll(/https?:\/\/(?:www\.)?contacertabr\.com\.br[^\s)<>"']*/g)) {
      checar(m[0].replace(/[.,;:]+$/, ''), `${ORIGEM}/`, arq, falhas);
    }
  }
  assert.deepEqual(falhas, []);
});

const definidos = new Set();
const citados = [];
for (const p of paginas) {
  test(`${p}: JSON-LD válido e URLs do domínio existentes`, () => {
    const falhas = [];
    const naPagina = new Map();
    const autores = [];
    for (const [k, bloco] of blocosLd(ler(p)).entries()) {
      let j;
      assert.doesNotThrow(() => { j = JSON.parse(bloco); }, `${p}: bloco ${k + 1} de JSON-LD não faz parse`);
      for (const s of textos(j)) {
        if (/^https?:\/\/(www\.)?contacertabr\.com\.br(\/|$|#)/.test(s)) checar(s, `${ORIGEM}/`, `${p} (JSON-LD)`, falhas, { ancora: false });
      }
      for (const o of objetos(j)) {
        if (o.author) autores.push(...[o.author].flat());
        if (typeof o['@id'] !== 'string') continue;
        if (Object.keys(o).length > 1) { definidos.add(o['@id']); naPagina.set(o['@id'], { ...naPagina.get(o['@id']), ...o }); }
        else citados.push([p, o['@id']]);
      }
    }
    for (const a of autores) {
      const r = a && typeof a === 'object' && typeof a['@id'] === 'string' ? { ...naPagina.get(a['@id']), ...a } : a;
      if (!r || typeof r !== 'object' || !r['@type'] || !r.name) falhas.push(`${p}: author ${JSON.stringify(a)} sem @type e name nesta página`);
    }
    assert.deepEqual(falhas, []);
  });
}
test('todo {"@id"} citado no JSON-LD é definido em alguma página', () => {
  assert.ok(citados.length > 0);
  assert.deepEqual(citados.filter(([, id]) => !definidos.has(id)), []);
});

const sitemap = ler('sitemap.xml');
const entradas = [...sitemap.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*(?:<lastmod>([^<]+)<\/lastmod>\s*)?<\/url>/g)]
  .map((m) => ({ loc: m[1].trim(), lastmod: m[2] && m[2].trim() }));
const indexaveis = paginas.filter((p) => !noindex(ler(p)));

test('sitemap.xml: todas as entradas lidas, sem repetição e cada uma é o canonical de uma página indexável', () => {
  assert.equal(entradas.length, (sitemap.match(/<url>/g) || []).length);
  assert.ok(entradas.length >= 50);
  assert.equal(new Set(entradas.map((e) => e.loc)).size, entradas.length);
  const falhas = [];
  for (const { loc } of entradas) {
    const u = new URL(loc);
    const arq = u.host === 'contacertabr.com.br' && u.protocol === 'https:' && !u.search && !u.hash ? arquivoDe(u.pathname) : null;
    if (!arq || !arq.endsWith('.html')) { falhas.push(`${loc}: não é página do site`); continue; }
    if (noindex(ler(arq))) falhas.push(`${loc}: página com noindex no sitemap`);
    if (canonicalDe(ler(arq)) !== loc) falhas.push(`${loc}: canonical de ${arq} é ${canonicalDe(ler(arq))}`);
  }
  assert.deepEqual(falhas, []);
});

test('toda página indexável tem canonical para si mesma e está no sitemap', () => {
  const locs = new Set(entradas.map((e) => e.loc));
  const falhas = [];
  for (const p of indexaveis) {
    const c = canonicalDe(ler(p));
    if (!c) { falhas.push(`${p}: sem canonical`); continue; }
    if (c !== urlDa(p)) falhas.push(`${p}: canonical ${c} não é ${urlDa(p)}`);
    if (!locs.has(c)) falhas.push(`${p}: ${c} fora do sitemap`);
  }
  assert.deepEqual(falhas, []);
});

test('sitemap.xml: lastmod válido, não futuro e >= as datas do próprio documento', () => {
  const amanha = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  const falhas = [];
  for (const { loc, lastmod } of entradas) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(lastmod || '')) { falhas.push(`${loc}: lastmod ${lastmod}`); continue; }
    if (lastmod > amanha) falhas.push(`${loc}: lastmod ${lastmod} no futuro`);
    const arq = arquivoDe(new URL(loc).pathname);
    if (!arq) continue; // já acusado no teste do canonical
    const html = ler(arq);
    const datas = [];
    for (const bloco of blocosLd(html)) {
      for (const r of raizesLd(JSON.parse(bloco))) {
        for (const k of ['dateModified', 'datePublished']) if (typeof r[k] === 'string') datas.push(r[k].slice(0, 10));
      }
    }
    for (const m of html.matchAll(/<meta\b[^>]*property="article:(?:modified|published)_time"[^>]*content="([^"]+)"/g)) datas.push(m[1].slice(0, 10));
    const maior = datas.sort().at(-1);
    if (maior && lastmod < maior) falhas.push(`${loc}: lastmod ${lastmod} < ${maior} do documento`);
  }
  assert.deepEqual(falhas, []);
});
