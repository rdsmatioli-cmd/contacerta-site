// lastmod do sitemap.xml. O gerador antigo fazia isto no build; ele não existe mais e o HTML do repositório é a fonte
// oficial (README, "Como editar o site").
// Regra (tests/_src/content/_seo.mjs, seção 7; daqui só se chama mudancaSignificativa e lastmodPelaRegra): a maior
// entre (a) a data do último commit sem merge que mudou o arquivo da página com mudança significativa (trocar só ?v=,
// só a linha <script type="speculationrules"> ou só a ordem dos <symbol> do sprite não conta) e (b) as datas do
// próprio documento (dateModified/datePublished, article:*_time). A data do commit é a que o git log --date=short
// mostra (data do autor, AAAA-MM-DD no fuso do próprio commit). Por isso rode DEPOIS de commitar a página: a data vem
// do histórico. Página sem commit (arquivo novo ou mudança significativa ainda não commitada) recebe a data de hoje em
// America/Sao_Paulo, com aviso; rode de novo depois do commit.
// Precisa do histórico: num clone raso (git clone --depth, actions/checkout sem fetch-depth: 0), se alguma página
// chegar à borda sem achar o commit, sai com erro em vez de chutar a data (git fetch --unshallow resolve).
// Só recalcula o lastmod das <url> que já estão no sitemap; página nova entra à mão (integridade-site.test.mjs acusa
// página indexável fora do sitemap). As URLs de /licitacoes/ entraram à mão (8b8f844) e seguem a mesma regra.
// Uso, na raiz do repositório:
//   node tests/manutencao/lastmod.mjs             regrava o lastmod de cada <url> do sitemap.xml
//   node tests/manutencao/lastmod.mjs --conferir  só confere: sai com 1 e lista as divergências
// tests/lastmod.test.mjs usa as funções exportadas daqui.
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE, mudancaSignificativa, lastmodPelaRegra } from '../_src/content/_seo.mjs';

export const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
export const FUSO = 'America/Sao_Paulo';

// AAAA-MM-DD de agora no fuso dado.
export function hojeEm(fuso = FUSO, agora = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(agora).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

// Sem input, devolve a saída como texto; com input (cat-file --batch), como Buffer, porque os tamanhos são em bytes.
const git = (raiz, args, input) => execFileSync('git', ['-C', raiz, ...args], {
  ...(input === undefined ? { encoding: 'utf8' } : { input }), maxBuffer: 1 << 28, stdio: ['pipe', 'pipe', 'pipe'],
});

// Conteúdo de cada "rev:caminho" (string UTF-8), ou null se o objeto não existe; um processo git para a lista toda.
function versoes(raiz, revs) {
  const out = git(raiz, ['cat-file', '--batch'], `${revs.join('\n')}\n`);
  const res = [];
  let i = 0;
  for (let k = 0; k < revs.length; k++) {
    const fim = out.indexOf(0x0a, i);
    const cab = out.subarray(i, fim).toString('utf8');
    if (/ (missing|ambiguous)$/.test(cab)) { res.push(null); i = fim + 1; continue; }
    const tam = Number(cab.split(' ')[2]);
    res.push(out.subarray(fim + 1, fim + 1 + tam).toString('utf8'));
    i = fim + 1 + tam + 1;
  }
  return res;
}

// Repositório git na raiz, se o clone é raso e quais commits são a borda do histórico.
export function historico(raiz = RAIZ) {
  let topo;
  try { topo = git(raiz, ['rev-parse', '--show-toplevel']).trim(); } catch {
    throw new Error(`sem histórico git em ${raiz}: o lastmod vem do git log (clone o repositório; não baixe o zip)`);
  }
  if (realpathSync(topo) !== realpathSync(raiz)) throw new Error(`${raiz} não é a raiz do repositório git (${topo})`);
  const raso = git(raiz, ['rev-parse', '--is-shallow-repository']).trim() === 'true';
  const bordas = new Set();
  if (raso) {
    const arq = resolve(raiz, git(raiz, ['rev-parse', '--git-path', 'shallow']).trim());
    for (const h of readFileSync(arq, 'utf8').split('\n')) if (h) bordas.add(h);
  }
  return { raso, bordas };
}

// Último commit sem merge com mudança significativa no arquivo: { commit, data }, { borda } se o clone raso acaba
// antes de achá-lo, ou null se nenhum commit mudou o arquivo.
export function commitDaPagina(raiz, arq, { bordas }) {
  const log = git(raiz, ['log', '--no-merges', '--format=%H %P%x09%ad', '--date=short', '--', arq]);
  for (const linha of log.split('\n').filter(Boolean)) {
    const [hp, data] = linha.split('\t');
    const [commit, ...pais] = hp.trim().split(' ');
    if (!pais.length && bordas.has(commit)) return { borda: commit };
    const [antes, depois] = pais.length ? versoes(raiz, [`${commit}^:${arq}`, `${commit}:${arq}`]) : [null, ...versoes(raiz, [`${commit}:${arq}`])];
    if (mudancaSignificativa(antes ?? '', depois ?? '')) return { commit, data };
  }
  return null;
}

// <url> do sitemap: { loc, lastmod } na ordem do arquivo.
export const entradasDoSitemap = (xml) => [...xml.matchAll(/<url>([^]*?)<\/url>/g)].map((m) => ({
  loc: (m[1].match(/<loc>\s*([^<]*?)\s*<\/loc>/) || [])[1],
  lastmod: (m[1].match(/<lastmod>\s*([^<]*?)\s*<\/lastmod>/) || [])[1],
}));

// Arquivo da página como o GitHub Pages serve a URL (pasta/ -> pasta/index.html; /x -> x, x.html ou x/index.html).
export function arquivoDaUrl(raiz, loc) {
  let u;
  try { u = new URL(loc); } catch { return null; }
  if (`${u.origin}/` !== SITE || u.search || u.hash) return null;
  const p = decodeURIComponent(u.pathname).replace(/^\/+/, '');
  const candidatos = p === '' || p.endsWith('/') ? [`${p}index.html`] : [p, `${p}.html`, `${p}/index.html`];
  return candidatos.find((c) => { try { return statSync(join(raiz, c)).isFile(); } catch { return false; } }) ?? null;
}

// Calcula o lastmod de cada <url> pela regra. Não grava nada.
// itens: { loc, arquivo, atual, esperado, origem }; avisos: páginas sem commit; erros: o que impede calcular.
export function calcular(raiz = RAIZ, { hoje = hojeEm() } = {}) {
  const hist = historico(raiz);
  const xml = readFileSync(join(raiz, 'sitemap.xml'), 'utf8');
  const itens = [], avisos = [], erros = [], rasas = [];
  for (const { loc, lastmod } of entradasDoSitemap(xml)) {
    const arquivo = loc && arquivoDaUrl(raiz, loc);
    if (!arquivo) { erros.push(`${loc}: não corresponde a um arquivo do site`); continue; }
    try {
      const html = readFileSync(join(raiz, arquivo), 'utf8');
      const [naHead] = versoes(raiz, [`HEAD:${arquivo}`]);
      let dataCommit, origem;
      if (naHead === null || mudancaSignificativa(naHead, html)) {
        dataCommit = hoje;
        origem = `sem commit, hoje em ${FUSO}`;
        avisos.push(`${arquivo}: ${naHead === null ? 'arquivo ainda não commitado' : 'mudança significativa ainda não commitada'}; lastmod = hoje (${hoje}, ${FUSO}). Rode de novo depois do commit.`);
      } else {
        const c = commitDaPagina(raiz, arquivo, hist);
        if (!c) { erros.push(`${loc}: nenhum commit mudou ${arquivo}`); continue; }
        if (c.borda) { rasas.push(`${arquivo} (borda ${c.borda.slice(0, 7)})`); continue; }
        dataCommit = c.data;
        origem = `commit ${c.commit.slice(0, 7)}`;
      }
      const esperado = lastmodPelaRegra(dataCommit, html);
      if (esperado !== dataCommit) origem = 'data do próprio documento';
      itens.push({ loc, arquivo, atual: lastmod, esperado, origem });
    } catch (e) {
      erros.push(`${loc}: ${e.message}`);
    }
  }
  if (rasas.length) {
    erros.unshift(`clone raso: o histórico acaba antes do último commit significativo de ${rasas.length} página(s), então o `
      + `lastmod delas não pode ser calculado. Busque o histórico completo (git fetch --unshallow; no CI, actions/checkout `
      + `com fetch-depth: 0). Páginas: ${rasas.join(', ')}`);
  }
  return { xml, itens, avisos, erros, raso: hist.raso };
}

// sitemap.xml com o lastmod de cada <url> trocado pelo de porLoc (Map loc -> data); o resto do arquivo fica igual.
export const sitemapComLastmod = (xml, porLoc) => xml.replace(/<url>([^]*?)<\/url>/g, (bloco, dentro) => {
  const loc = (dentro.match(/<loc>\s*([^<]*?)\s*<\/loc>/) || [])[1];
  const data = porLoc.get(loc);
  if (!data) return bloco;
  return /<lastmod>[^<]*<\/lastmod>/.test(bloco)
    ? bloco.replace(/<lastmod>[^<]*<\/lastmod>/, `<lastmod>${data}</lastmod>`)
    : bloco.replace('</loc>', `</loc><lastmod>${data}</lastmod>`);
});

const principal = (() => {
  try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
})();
if (principal) {
  const args = process.argv.slice(2);
  if (args.some((a) => a !== '--conferir')) {
    console.error('uso: node tests/manutencao/lastmod.mjs [--conferir]');
    process.exit(2);
  }
  const conferir = args.includes('--conferir');
  let r;
  try { r = calcular(); } catch (e) { console.error(e.message); process.exit(1); }
  for (const a of r.avisos) console.error(`AVISO: ${a}`);
  if (r.erros.length) {
    for (const e of r.erros) console.error(`ERRO: ${e}`);
    console.error(conferir ? 'Conferência incompleta.' : 'sitemap.xml não foi alterado.');
    process.exit(1);
  }
  const div = r.itens.filter((i) => i.atual !== i.esperado);
  if (conferir) {
    if (div.length) {
      console.error(`${div.length} lastmod diferente(s) da regra:`);
      for (const i of div) console.error(`  ${i.loc}: sitemap ${i.atual ?? '(sem lastmod)'}, regra ${i.esperado} (${i.origem})`);
      console.error('Corrija com: node tests/manutencao/lastmod.mjs (depois de commitar as páginas).');
      process.exit(1);
    }
    console.log(`${r.itens.length} URLs do sitemap.xml: todo lastmod confere com a regra.`);
  } else if (!div.length) {
    console.log(`${r.itens.length} URLs do sitemap.xml: nada a mudar.`);
  } else {
    writeFileSync(join(RAIZ, 'sitemap.xml'), sitemapComLastmod(r.xml, new Map(r.itens.map((i) => [i.loc, i.esperado]))));
    console.log(`${div.length} lastmod atualizado(s) no sitemap.xml:`);
    for (const i of div) console.log(`  ${i.loc}: ${i.atual ?? '(sem lastmod)'} -> ${i.esperado} (${i.origem})`);
  }
}
