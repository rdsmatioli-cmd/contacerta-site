// lastmod do sitemap.xml pela regra de tests/_src/content/_seo.mjs (seção 7), calculado do histórico git por
// tests/manutencao/lastmod.mjs, que também corrige: node tests/manutencao/lastmod.mjs (depois de commitar as páginas).
// Precisa do histórico: o job check do CI faz checkout com fetch-depth: 0. Num clone raso que não alcança o último
// commit significativo de alguma página (o checkout padrão traz um commit só), o teste falha dizendo isso, em vez de
// passar com uma data chutada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { LINHA_ESPECULACAO } from './_src/content/_seo.mjs';
import { VARIAVEIS_DE_REPOSITORIO, calcular, entradasDoSitemap, sitemapComLastmod } from './manutencao/lastmod.mjs';

// Rodado de um hook ou de `git rebase -x` num worktree, o processo herda GIT_DIR e GIT_INDEX_FILE absolutos: o git do
// repositório temporário do último teste gravaria os commits de teste no branch de quem chamou. Fora com elas.
for (const k of VARIAVEIS_DE_REPOSITORIO) delete process.env[k];

let r, falha;
try { r = calcular(); } catch (e) { falha = e; }

test('histórico git suficiente para calcular o lastmod de todas as URLs do sitemap', (t) => {
  if (falha) assert.fail(falha.message);
  assert.equal(r.erros.length, 0, r.erros.join('\n'));
  for (const a of r.avisos) t.diagnostic(`AVISO: ${a}`);
  if (r.raso) t.diagnostic('clone raso, mas o histórico disponível alcança o último commit significativo de todas as páginas');
});

test('todo lastmod do sitemap.xml confere com a regra', () => {
  assert.ok(r, falha?.message);
  const n = entradasDoSitemap(r.xml).length;
  assert.ok(n >= 50, `só ${n} URLs no sitemap`);
  assert.equal(r.itens.length, n, 'há URL sem lastmod calculado (ver o teste do histórico)');
  const div = r.itens.filter((i) => i.atual !== i.esperado).map((i) => `${i.loc}: sitemap ${i.atual ?? '(sem lastmod)'}, regra ${i.esperado} (${i.origem})`);
  assert.equal(div.length, 0, `${div.length} lastmod diferente(s) da regra; corrija com node tests/manutencao/lastmod.mjs:\n${div.join('\n')}`);
  assert.equal(sitemapComLastmod(r.xml, new Map(r.itens.map((i) => [i.loc, i.esperado]))), r.xml);
});

test('as URLs de /licitacoes/ (entraram à mão no sitemap) passam pela mesma regra, sem exceção', () => {
  assert.ok(r, falha?.message);
  const lic = entradasDoSitemap(r.xml).filter((e) => new URL(e.loc).pathname.startsWith('/licitacoes/'));
  assert.ok(lic.length >= 1);
  for (const e of lic) assert.ok(r.itens.some((i) => i.loc === e.loc), `${e.loc} fora da conferência`);
});

// Repositório git temporário: confere a regra ponta a ponta, sem depender do histórico deste site.
test('lastmod.mjs: ignora commit só de ?v=, speculationrules ou ordem do sprite; fuso do commit; hoje sem commit; erro em clone raso', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lastmod-'));
  const repo = join(dir, 'repo');
  const git = (cwd, args, data) => execFileSync('git', ['-c', 'user.name=Teste', '-c', 'user.email=teste@exemplo.invalid',
    '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', '-c', 'init.defaultBranch=main', '-C', cwd, ...args],
  { stdio: 'pipe', env: { ...process.env, ...(data && { GIT_AUTHOR_DATE: data, GIT_COMMITTER_DATE: data }) } });
  const w = (p, s) => { mkdirSync(dirname(join(repo, p)), { recursive: true }); writeFileSync(join(repo, p), s); };
  const commit = (data) => { git(repo, ['add', '-A']); git(repo, ['commit', '-q', '-m', data], data); };
  const sprite = (ids) => `<svg class="sprite" aria-hidden="true">${ids.map((id) => `<symbol id="${id}"><path d=""/></symbol>`).join('')}</svg>`;
  const pagina = ({ v = '0123456789', spec = '', ids = ['a', 'b'], texto = 'Conteúdo' } = {}) =>
    `<!doctype html><html><head><link rel="stylesheet" href="/assets/style.css?v=${v}">\n${spec}</head><body>${sprite(ids)}<p>${texto}</p></body></html>\n`;
  const lastmodDe = (raiz, opcoes) => {
    const c = calcular(raiz, opcoes);
    assert.deepEqual(c.erros, []);
    return c.itens[0].esperado;
  };
  try {
    mkdirSync(repo);
    git(repo, ['init', '-q']);
    w('sitemap.xml', '<urlset>\n  <url><loc>https://contacertabr.com.br/a/</loc><lastmod>2000-01-01</lastmod></url>\n</urlset>\n');
    w('a/index.html', pagina());
    commit('2026-01-10T12:00:00-03:00');
    assert.equal(lastmodDe(repo), '2026-01-10');
    w('a/index.html', pagina({ v: 'abcdef0123' }));
    commit('2026-02-01T12:00:00-03:00');
    w('a/index.html', pagina({ v: 'abcdef0123', spec: LINHA_ESPECULACAO }));
    commit('2026-03-01T12:00:00-03:00');
    w('a/index.html', pagina({ v: 'abcdef0123', spec: LINHA_ESPECULACAO, ids: ['b', 'a'] }));
    commit('2026-03-15T12:00:00-03:00');
    assert.equal(lastmodDe(repo), '2026-01-10', '?v=, speculationrules e ordem do sprite não contam');
    // 23h30 em -03:00 já é dia 6 em UTC: vale o dia no fuso do próprio commit.
    w('a/index.html', pagina({ v: 'abcdef0123', spec: LINHA_ESPECULACAO, ids: ['b', 'a'], texto: 'Conteúdo novo' }));
    commit('2026-04-05T23:30:00-03:00');
    assert.equal(lastmodDe(repo), '2026-04-05');
    // Data do documento maior que a do commit: vale a do documento.
    w('a/index.html', pagina({ texto: '<script type="application/ld+json">{"@type":"Article","dateModified":"2026-05-02"}</script>' }));
    commit('2026-04-20T10:00:00-03:00');
    assert.equal(lastmodDe(repo), '2026-05-02');
    // GIT_DIR/GIT_INDEX_FILE herdados de outro repositório (hook num worktree) não mudam o repositório lido.
    mkdirSync(join(dir, 'outro'));
    git(join(dir, 'outro'), ['init', '-q']);
    Object.assign(process.env, { GIT_DIR: join(dir, 'outro', '.git'), GIT_INDEX_FILE: join(dir, 'outro', '.git', 'index'), GIT_WORK_TREE: join(dir, 'outro') });
    try {
      assert.equal(lastmodDe(repo), '2026-05-02');
    } finally {
      for (const k of ['GIT_DIR', 'GIT_INDEX_FILE', 'GIT_WORK_TREE']) delete process.env[k];
    }
    // Mudança significativa ainda não commitada e arquivo novo: hoje, com aviso.
    w('a/index.html', pagina({ texto: 'Ainda não commitado' }));
    let c = calcular(repo, { hoje: '2030-01-01' });
    assert.equal(c.itens[0].esperado, '2030-01-01');
    assert.match(c.avisos.join('\n'), /a\/index\.html: mudança significativa ainda não commitada; lastmod = hoje \(2030-01-01, America\/Sao_Paulo\)/);
    w('b/index.html', pagina());
    w('sitemap.xml', '<urlset>\n  <url><loc>https://contacertabr.com.br/b/</loc><lastmod>2000-01-01</lastmod></url>\n</urlset>\n');
    c = calcular(repo, { hoje: '2030-01-01' });
    assert.equal(c.itens[0].esperado, '2030-01-01');
    assert.match(c.avisos.join('\n'), /b\/index\.html: arquivo ainda não commitado/);
    git(repo, ['checkout', '-q', '--', '.']);
    rmSync(join(repo, 'b'), { recursive: true });
    // Só ?v= mudado e não commitado: a data continua a do histórico.
    w('a/index.html', pagina({ v: '9999999999', texto: '<script type="application/ld+json">{"@type":"Article","dateModified":"2026-05-02"}</script>' }));
    assert.equal(lastmodDe(repo, { hoje: '2030-01-01' }), '2026-05-02');
    git(repo, ['checkout', '-q', '--', '.']);

    // Clone raso com um commit só (o checkout padrão do CI): erro claro, sem data.
    git(dir, ['clone', '-q', '--depth', '1', `file://${repo}`, 'raso1']);
    c = calcular(join(dir, 'raso1'));
    assert.equal(c.raso, true);
    assert.deepEqual(c.itens, []);
    assert.match(c.erros[0], /^clone raso: o histórico acaba antes do último commit significativo de 1 página\(s\).*fetch-depth: 0.*a\/index\.html \(borda [0-9a-f]{7}\)$/);
    // Clone raso que alcança o commit (o último mudou o conteúdo e o pai está no clone): calcula normalmente.
    git(dir, ['clone', '-q', '--depth', '2', `file://${repo}`, 'raso2']);
    c = calcular(join(dir, 'raso2'));
    assert.equal(c.raso, true);
    assert.deepEqual(c.erros, []);
    assert.equal(c.itens[0].esperado, '2026-05-02');
    // Sem git nenhum: erro, não passa.
    mkdirSync(join(dir, 'semgit'));
    writeFileSync(join(dir, 'semgit', 'sitemap.xml'), '<urlset></urlset>\n');
    assert.throws(() => calcular(join(dir, 'semgit')), /sem histórico git em .*semgit.* \(.+\): o lastmod vem do git log|não é a raiz do repositório git/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
