// Indexação e GEO (lote 4 da auditoria de 30-31/10/2026).
// CC-SITE-17: o 404.html é servido pelo GitHub Pages, com status 404, em qualquer caminho inexistente; canonical e
// og:url para /404.html, numa página noindex, mandavam ao buscador sinais contraditórios. Saíram os dois.
// CC-SITE-14: o /irpf/ estava no sitemap desde 31/10 sem nenhum link interno. Agora toda URL do sitemap fora de
// /licitacoes/ precisa ser alcançável a partir da home seguindo <a href> internos (o caminho que o robô faz), salvo
// as exceções comentadas em SEM_LINK_INTERNO.
// CC-SITE-15: o teste antigo só conferia que as URLs citadas no llms.txt e no feed existem; por isso o llms.txt
// ficou sem /irpf/, /tabelas-oficiais-2026/ e as categorias do blog. Agora toda URL do sitemap fora de /licitacoes/
// está no llms.txt ou em FORA_DO_LLMS (com o motivo), e todo post indexável de blog/<slug>/ está no feed.xml.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { listarPaginas, caminhoDe, decodificar } from './links/conferir-links.mjs';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const ORIGEM = 'https://contacertabr.com.br';
const DOMINIO = /^(www\.)?contacertabr\.com\.br$/i;
const cache = new Map();
const ler = (p) => {
  if (!cache.has(p)) cache.set(p, readFileSync(new URL(p, new URL('../', import.meta.url)), 'utf8'));
  return cache.get(p);
};
const tagsLink = (html) => html.match(/<link\b[^>]*>/gi) || [];
const paginas = listarPaginas(raiz);
const ehArquivo = (p) => {
  try { return statSync(new URL(p, new URL('../', import.meta.url))).isFile(); } catch { return false; }
};
// Caminho de URL -> arquivo do repositório, como o GitHub Pages serve (igual ao integridade-site.test.mjs).
const arquivoDe = (caminho) => {
  const p = caminho.replace(/^\/+/, '');
  if (p === '' || p.endsWith('/')) return ehArquivo(`${p}index.html`) ? `${p}index.html` : null;
  for (const c of [p, `${p}.html`, `${p}/index.html`]) if (ehArquivo(c)) return c;
  return null;
};
const robots = (html) => ((html.match(/<meta\b[^>]*name="robots"[^>]*content="([^"]*)"/i) || [])[1] || '').toLowerCase();
// <a href> internos fora de comentários, <script> e <style>, sem rel=nofollow, resolvidos para o arquivo servido.
const linksDe = (bruto, caminho) => {
  const html = bruto.replace(/<!--[^]*?-->/g, '').replace(/<script\b[^>]*>[^]*?<\/script>/gi, '').replace(/<style\b[^>]*>[^]*?<\/style>/gi, '');
  const alvos = new Set();
  for (const m of html.matchAll(/<a\b[^>]*>/gi)) {
    const href = (m[0].match(/\shref\s*=\s*(?:"([^"]*)"|'([^']*)')/i) || []).slice(1).find((x) => x !== undefined);
    if (href === undefined || /\srel\s*=\s*(?:"[^"]*|')?\bnofollow\b/i.test(m[0])) continue;
    let u;
    try { u = new URL(decodificar(href.trim()), `${ORIGEM}${caminho}`); } catch { continue; }
    if (!/^https?:$/.test(u.protocol) || !DOMINIO.test(u.hostname)) continue;
    let alvo;
    try { alvo = arquivoDe(decodeURIComponent(u.pathname)); } catch { continue; }
    if (alvo && alvo.endsWith('.html')) alvos.add(alvo);
  }
  return alvos;
};
const linksInternos = (arq) => new Set([...linksDe(ler(arq), caminhoDe(arq))].filter((a) => a !== arq));
// Busca em largura a partir da home; página com nofollow não passa adiante os links dela.
const alcancaveis = (() => {
  const vistos = new Set(['index.html']);
  const fila = ['index.html'];
  while (fila.length) {
    const arq = fila.shift();
    if (robots(ler(arq)).includes('nofollow')) continue;
    for (const alvo of linksInternos(arq)) if (!vistos.has(alvo)) { vistos.add(alvo); fila.push(alvo); }
  }
  return vistos;
})();
const sitemap = [...ler('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
const foraDeLicitacoes = sitemap.filter((u) => !new URL(u).pathname.startsWith('/licitacoes/'));

test('404.html: noindex, sem rel=canonical e sem og:url', () => {
  const html = ler('404.html');
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.deepEqual(tagsLink(html).filter((t) => /\srel\s*=\s*["']?canonical\b/i.test(t)), []);
  assert.doesNotMatch(html, /property="og:url"/);
});

// URLs do sitemap que hoje não recebem link de nenhuma página alcançável pela home. Cada uma com o motivo; quando
// o motivo deixar de valer, a URL sai daqui (o teste avisa se a exceção ficou sobrando).
const SEM_LINK_INTERNO = new Map([
  // Empregador em Dia (go-live 03/11, DEC CPO 31/10): só as páginas da própria seção levam a ela. Ligar o produto à
  // home, ao menu ou às calculadoras é decisão pendente do Rodrigo (lote 4 da auditoria de 30-31/10/2026).
  [`${ORIGEM}/empregador-em-dia/`, 'Empregador em Dia, até a decisão'],
  [`${ORIGEM}/empregador-em-dia/avaliacao-rapida-nr1/`, 'Empregador em Dia, até a decisão'],
  [`${ORIGEM}/empregador-em-dia/jornada-42h/`, 'Empregador em Dia, até a decisão'],
  // Lista de espera com o envio desligado desde 16/10: links-sem-destino.test.mjs (CC-SITE-03) proíbe link para ela
  // fora dela, de /privacidade/ e de /sobre/. Continuar indexável e no sitemap é decisão à parte.
  [`${ORIGEM}/lista-de-espera/`, 'lista de espera desligada (CC-SITE-03)'],
]);

test('malha interna: toda URL do sitemap fora de /licitacoes/ é alcançável pela home seguindo links', () => {
  assert.ok(foraDeLicitacoes.length >= 50 && alcancaveis.size >= 50);
  const orfas = foraDeLicitacoes.filter((u) => !alcancaveis.has(arquivoDe(new URL(u).pathname)) && !SEM_LINK_INTERNO.has(u));
  assert.deepEqual(orfas, []);
});

test('malha interna: as exceções estão no sitemap e continuam sem link (senão saem da lista)', () => {
  for (const u of SEM_LINK_INTERNO.keys()) {
    assert.ok(sitemap.includes(u), `${u}: fora do sitemap, tire de SEM_LINK_INTERNO`);
    assert.ok(!alcancaveis.has(arquivoDe(new URL(u).pathname)), `${u}: já recebe link, tire de SEM_LINK_INTERNO`);
  }
});

test('malha interna: o detector segue links relativos e absolutos e ignora nofollow, script, comentário e outro host', () => {
  const html = `<a href="../rescisao/">r</a><a class='x' href='/ferias/index.html'>f</a><a href="https://www.contacertabr.com.br/fgts/#topo">g</a>
<a rel="nofollow" href="/inss/">i</a><!-- <a href="/markup/">m</a> --><script>'<a href="/porcentagem/">'</script>
<a href="https://outro.exemplo/imc/">o</a><a href="mailto:x@y.z">e</a><a href="/nao-existe/">n</a><a>sem href</a>`;
  assert.deepEqual([...linksDe(html, '/blog/')].sort(), ['ferias/index.html', 'fgts/index.html', 'rescisao/index.html']);
  assert.ok(alcancaveis.has('blog/pro-labore/index.html') && alcancaveis.has('salario-liquido/index.html'));
});

const secao = (html, id) => (html.match(new RegExp(`<section\\b[^>]*aria-labelledby="${id}"[^>]*>[^]*?</section>`)) || [''])[0];
const CARD_IRPF = (ler('index.html').match(/<li><a class="card" href="\/irpf\/">.*?<\/a><\/li>/) || [])[0];

test('/irpf/: card no grid "Impostos e MEI" da home, com a marcação dos outros cards, logo depois do IRRF', () => {
  assert.ok(CARD_IRPF, 'home sem card do /irpf/');
  assert.equal(CARD_IRPF, '<li><a class="card" href="/irpf/"><span class="tile t-impostos"><svg class="ic" aria-hidden="true" focusable="false"><use href="#i-recibo"/></svg></span><span class="card-txt"><strong>Simulador IRPF 2027</strong><span>Restituição estimada nos modelos completo e simplificado.</span></span><svg class="ic seta" aria-hidden="true" focusable="false"><use href="#i-seta"/></svg></a></li>');
  const s = secao(ler('index.html'), 'impostos');
  assert.ok(s.includes(CARD_IRPF));
  const hrefs = [...s.matchAll(/<a class="card" href="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(hrefs.slice(0, 2), ['/imposto-de-renda/', '/irpf/']);
});

test('/irpf/: na busca da home (busca-dados)', () => {
  const dados = JSON.parse(ler('index.html').match(/<script type="application\/json" id="busca-dados">([^<]*)<\/script>/)[1]);
  assert.deepEqual(dados.find((x) => x[0] === 'irpf'), ['irpf', 'Simulador IRPF 2027', 'declaração imposto de renda restituição']);
  assert.equal(dados.findIndex((x) => x[0] === 'irpf'), dados.findIndex((x) => x[0] === 'imposto-de-renda') + 1);
  for (const [slug] of dados) assert.ok(ehArquivo(`${slug}/index.html`), slug);
});

for (const p of ['imposto-de-renda', 'tabela-ir-2026']) {
  test(`/${p}/: card do /irpf/ nas relacionadas, igual ao da home`, () => {
    const s = secao(ler(`${p}/index.html`), 'rel-t');
    assert.ok(CARD_IRPF && s.includes(CARD_IRPF));
    const html = ler(`${p}/index.html`);
    assert.ok(new Set([...html.matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1])).has('i-recibo'));
  });
}

test('/irpf/: linha no llms.txt em "Impostos e MEI", com a meta description da página', () => {
  const desc = ler('irpf/index.html').match(/<meta name="description" content="([^"]+)">/)[1];
  const bloco = ler('llms.txt').split(/^## /m).find((b) => b.startsWith('Impostos e MEI\n'));
  assert.ok(bloco);
  assert.ok(bloco.includes(`- [Simulador IRPF 2027: estimativa da restituição](${ORIGEM}/irpf/): ${desc}\n`));
});

// URLs do sitemap (fora de /licitacoes/) que ficam fora do llms.txt, cada uma com o motivo. Exceção que entra no
// llms.txt ou sai do sitemap derruba o teste, para a lista não envelhecer.
const FORA_DO_LLMS = new Map([
  // Empregador em Dia: produto à parte, ainda sem link do resto do site (ver SEM_LINK_INTERNO). Entra no llms.txt
  // junto com a decisão de ligá-lo ao site.
  [`${ORIGEM}/empregador-em-dia/`, 'Empregador em Dia, até a decisão'],
  [`${ORIGEM}/empregador-em-dia/avaliacao-rapida-nr1/`, 'Empregador em Dia, até a decisão'],
  [`${ORIGEM}/empregador-em-dia/jornada-42h/`, 'Empregador em Dia, até a decisão'],
  // Lista de espera desligada desde 16/10: links-sem-destino.test.mjs (CC-SITE-03) exige que o llms.txt não a cite.
  [`${ORIGEM}/lista-de-espera/`, 'lista de espera desligada (CC-SITE-03)'],
]);
// Categoria do blog sem nenhum post (<ul class="posts"></ul>) fica fora do llms.txt: indicar a um modelo de linguagem
// uma página vazia não ajuda. Ao ganhar o primeiro post, a categoria passa a ser exigida no llms.txt.
const semPosts = (html) => /<ul class="posts">\s*<\/ul>/.test(html);
const categoriaVazia = (u) => {
  const arq = arquivoDe(new URL(u).pathname);
  return /^blog\/categoria\/[^/]+\/index\.html$/.test(arq || '') && semPosts(ler(arq));
};
const urlsDoTexto = (txt) => new Set([...txt.matchAll(/https?:\/\/(?:www\.)?contacertabr\.com\.br[^\s)<>"']*/g)].map((m) => {
  const u = new URL(m[0].replace(/[.,;:]+$/, ''));
  return `${ORIGEM}${u.pathname}`;
}));
const llms = ler('llms.txt');
const noLlms = urlsDoTexto(llms);

test('llms.txt: toda URL do sitemap fora de /licitacoes/ está nele ou em FORA_DO_LLMS', () => {
  const faltam = foraDeLicitacoes.filter((u) => !noLlms.has(u) && !FORA_DO_LLMS.has(u) && !categoriaVazia(u));
  assert.deepEqual(faltam, []);
});

test('llms.txt: as exceções estão no sitemap e continuam fora dele (senão saem da lista)', () => {
  for (const u of FORA_DO_LLMS.keys()) {
    assert.ok(sitemap.includes(u), `${u}: fora do sitemap, tire de FORA_DO_LLMS`);
    assert.ok(!noLlms.has(u), `${u}: já está no llms.txt, tire de FORA_DO_LLMS`);
  }
});

test('llms.txt: a leitura das URLs normaliza a home sem barra e corta pontuação do fim; categoria vazia detectada', () => {
  assert.deepEqual([...urlsDoTexto('Conta Certa (https://contacertabr.com.br) e https://www.contacertabr.com.br/irpf/#x.')],
    [`${ORIGEM}/`, `${ORIGEM}/irpf/`]);
  assert.ok(noLlms.has(`${ORIGEM}/`));
  assert.ok(semPosts('<ul class="posts"></ul>') && semPosts('<ul class="posts">\n</ul>'));
  assert.ok(!semPosts('<ul class="posts"><li><a class="post-card" href="/blog/x/">x</a></li></ul>'));
  assert.ok(!categoriaVazia(`${ORIGEM}/blog/categoria/trabalho-e-salario/`));
  assert.ok(!categoriaVazia(`${ORIGEM}/irpf/`));
});

test('llms.txt: planilha das tabelas oficiais em "Tabelas oficiais" e categorias do blog com post em "Blog"', () => {
  const blocos = Object.fromEntries(llms.split(/^## /m).slice(1).map((b) => [b.slice(0, b.indexOf('\n')), b]));
  const desc = ler('tabelas-oficiais-2026/index.html').match(/<meta name="description" content="([^"]+)">/)[1];
  assert.ok(blocos['Tabelas oficiais'].includes(`- [Planilha grátis: Tabelas oficiais 2026](${ORIGEM}/tabelas-oficiais-2026/): ${desc}\n`));
  const categorias = sitemap.filter((u) => /\/blog\/categoria\/[^/]+\/$/.test(u));
  assert.equal(categorias.length, 3);
  for (const u of categorias.filter((x) => !categoriaVazia(x))) {
    const h1 = ler(arquivoDe(new URL(u).pathname)).match(/<h1>([^<]+)<\/h1>/)[1];
    assert.match(blocos.Blog, new RegExp(`^- \\[${h1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\(${u.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}\\): .+$`, 'm'), u);
  }
});

// Posts do blog: pasta direta de blog/ (fora de categoria/) com index.html.
const posts = paginas.filter((p) => /^blog\/(?!categoria\/)[^/]+\/index\.html$/.test(p));
const feed = ler('blog/feed.xml');
const itensFeed = [...feed.matchAll(/<item>[^]*?<\/item>/g)].map((m) => ({
  link: (m[0].match(/<link>([^<]+)<\/link>/) || [])[1],
  guid: (m[0].match(/<guid isPermaLink="true">([^<]+)<\/guid>/) || [])[1],
}));

test('feed.xml: todo post indexável de blog/<slug>/ está no feed, e o feed só tem posts indexáveis', () => {
  assert.ok(posts.length >= 7 && itensFeed.length >= 7);
  const indexaveis = posts.filter((p) => !robots(ler(p)).includes('noindex')).map((p) => `${ORIGEM}${caminhoDe(p)}`);
  const noFeed = itensFeed.map((i) => i.link);
  assert.deepEqual(indexaveis.filter((u) => !noFeed.includes(u)), [], 'post indexável fora do feed');
  assert.deepEqual(noFeed.filter((u) => !indexaveis.includes(u)), [], 'item do feed que não é post indexável');
  assert.equal(new Set(noFeed).size, noFeed.length, 'item repetido no feed');
  for (const i of itensFeed) assert.equal(i.guid, i.link);
});
