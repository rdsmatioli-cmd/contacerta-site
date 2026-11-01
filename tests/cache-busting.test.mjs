// Cache-busting (o gerador antigo fazia isto no build): todo ?v= de referência local a .js, .css ou .mjs é o sha256
// do arquivo referenciado (10 primeiros hex), no HTML e nos imports dentro dos .js. A regra e a varredura moram em
// tests/manutencao/cache.mjs, que também corrige: node tests/manutencao/cache.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { RAIZ, SO_LEITURA, atualizar, descreverFora, foraDaRegra, hash10, referencias } from './manutencao/cache.mjs';

const refs = referencias();

test('a varredura acha os ?v= das páginas, do modulepreload, dos imports entre módulos e do lcm-consent', () => {
  const de = (arquivo, alvo) => refs.some((r) => r.arquivo === arquivo && r.alvo === alvo);
  assert.ok(refs.length >= 250, `só ${refs.length} referências com ?v=`);
  for (const [arquivo, alvo] of [['assets/js/ui.js', 'assets/js/calc.js'], ['assets/js/ui.js', 'assets/js/tabelas.js'],
    ['assets/js/ui.js', 'assets/js/valida.js'], ['assets/js/calc.js', 'assets/js/tabelas.js'], ['assets/js/valida.js', 'assets/js/calc.js'],
    ['index.html', 'assets/style.css'], ['404.html', 'assets/style.css'], ['rescisao/index.html', 'assets/js/ui.js']]) assert.ok(de(arquivo, alvo), `${arquivo} -> ${alvo}`);
  const calc = refs.find((r) => r.arquivo === 'rescisao/index.html' && r.alvo === 'assets/js/calc.js');
  assert.ok(calc && readFileSync(join(RAIZ, 'rescisao/index.html'), 'utf8').includes(`<link rel="modulepreload" href="/assets/js/calc.js?v=${calc.v}" fetchpriority="low">`), 'modulepreload fora da varredura');
  for (const a of SO_LEITURA) assert.ok(refs.filter((r) => r.alvo === a).length >= 50, a);
  assert.ok(!refs.some((r) => r.arquivo.startsWith('tests/')));
});

test('todo ?v= é o sha256 do arquivo referenciado (inclusive assets/lcm-consent.*)', () => {
  const div = refs.filter((r) => r.v !== r.esperado)
    .map((r) => `${r.arquivo}:${r.linha}: ${r.ref}?v=${r.v} -> ${r.esperado ? `esperado ?v=${r.esperado}` : 'arquivo não encontrado'}`);
  assert.equal(div.length, 0, `${div.length} ?v= divergente(s); corrija com node tests/manutencao/cache.mjs:\n${div.join('\n')}`);
});

test('nenhuma referência fora da regra: ?v= em forma não reconhecida, URL absoluta do próprio site, .js/.css local sem ?v=', () => {
  const fora = foraDaRegra().map(descreverFora);
  assert.equal(fora.length, 0, `${fora.length} referência(s) que o cache.mjs não trata; corrija à mão:\n${fora.join('\n')}`);
});

test('cache.mjs: ponto fixo em cascata, idempotente, sem tocar URL externa, tests/ nem lcm-consent; recusa erro sem gravar', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cache-busting-'));
  const w = (p, s) => { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), s); };
  const ler = (p) => readFileSync(join(dir, p), 'utf8');
  try {
    w('assets/js/tabelas.js', 'export const T = 1;\n');
    w('assets/js/calc.js', "import { T } from './tabelas.js?v=0000000000'\nexport const c = T;\n");
    w('assets/js/ui.js', "import { c } from './calc.js?v=0000000000'\n");
    w('assets/lcm-consent.js', '/* componente */\n');
    w('pasta/index.html', '<link rel="modulepreload" href="/assets/js/calc.js?v=1"><script type="module" src="../assets/js/ui.js?v=1"></script>'
      + '<script src="/assets/lcm-consent.js?v=1" defer></script><script src="https://exemplo.invalid/x.js?v=1"></script><script src="//exemplo.invalid/y.js?v=1"></script>\n');
    w('a.html', '<script type="module" src="assets/js/ui.js?v=1"></script>\n');
    w('tests/shim.js', "export * from '../assets/js/calc.js?v=1'\n");
    const r = atualizar(dir);
    assert.deepEqual(r.alterados, ['a.html', 'assets/js/calc.js', 'assets/js/ui.js', 'pasta/index.html']);
    // a.html vem antes de assets/ na varredura e lê o ui.js ainda sem o ?v= novo do calc.js: precisa de 2 passadas.
    assert.equal(r.passadas, 2);
    const h = (p) => hash10(readFileSync(join(dir, p)));
    assert.equal(ler('assets/js/calc.js'), `import { T } from './tabelas.js?v=${h('assets/js/tabelas.js')}'\nexport const c = T;\n`);
    assert.equal(ler('assets/js/ui.js'), `import { c } from './calc.js?v=${h('assets/js/calc.js')}'\n`);
    assert.equal(ler('pasta/index.html'), `<link rel="modulepreload" href="/assets/js/calc.js?v=${h('assets/js/calc.js')}"><script type="module" src="../assets/js/ui.js?v=${h('assets/js/ui.js')}"></script>`
      + `<script src="/assets/lcm-consent.js?v=${h('assets/lcm-consent.js')}" defer></script><script src="https://exemplo.invalid/x.js?v=1"></script><script src="//exemplo.invalid/y.js?v=1"></script>\n`);
    assert.equal(ler('a.html'), `<script type="module" src="assets/js/ui.js?v=${h('assets/js/ui.js')}"></script>\n`);
    assert.equal(ler('tests/shim.js'), "export * from '../assets/js/calc.js?v=1'\n");
    assert.deepEqual(referencias(dir).filter((x) => x.v !== x.esperado), []);
    assert.deepEqual(atualizar(dir), { passadas: 0, alterados: [] });

    // Referência quebrada: erro e nada gravado (a página, que também mudaria, fica como estava).
    w('assets/js/tabelas.js', 'export const T = 2;\n');
    w('assets/js/ui.js', `import { c } from './calc.js?v=${h('assets/js/calc.js')}'\nimport './sumiu.js?v=1'\n`);
    const pagina = ler('pasta/index.html');
    const calc = ler('assets/js/calc.js');
    assert.throws(() => atualizar(dir), /assets\/js\/ui\.js: referência quebrada \.\/sumiu\.js\?v=1/);
    assert.equal(ler('pasta/index.html'), pagina);
    assert.equal(ler('assets/js/calc.js'), calc);
    assert.deepEqual(referencias(dir).filter((x) => x.v !== x.esperado).map((x) => `${x.arquivo} ${x.ref}`), [
      'a.html assets/js/ui.js', 'assets/js/calc.js ./tabelas.js', 'assets/js/ui.js ./sumiu.js', 'pasta/index.html ../assets/js/ui.js']);
    w('assets/js/ui.js', `import { c } from './calc.js?v=${h('assets/js/calc.js')}'\n`);

    // lcm-consent é só leitura: se ele mesmo tivesse um ?v= a mudar, erro em vez de regravar.
    w('assets/lcm-consent.css', "@import url('./base.css?v=1');\n");
    w('assets/base.css', 'a{}\n');
    assert.throws(() => atualizar(dir), /assets\/lcm-consent\.css precisaria de \?v= novo, mas é só leitura/);
    assert.equal(ler('assets/lcm-consent.css'), "@import url('./base.css?v=1');\n");
    w('assets/lcm-consent.css', 'a{}\n');

    // Ciclo de imports com ?v=: não há ponto fixo; erro, nada gravado.
    w('assets/js/a.js', "import './b.js?v=1'\n");
    w('assets/js/b.js', "import './a.js?v=1'\n");
    assert.throws(() => atualizar(dir), /sem ponto fixo/);
    assert.equal(ler('assets/js/a.js'), "import './b.js?v=1'\n");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Temporário: cada caso num diretório próprio; devolve o resultado (ou o erro) e o arquivo depois.
function caso(arquivos, alvo) {
  const dir = mkdtempSync(join(tmpdir(), 'cache-busting-'));
  try {
    for (const [p, s] of Object.entries(arquivos)) { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), s); }
    let r;
    try { r = atualizar(dir); } catch (e) { r = e; }
    const hashes = Object.fromEntries(Object.keys(arquivos).map((p) => [p, hash10(readFileSync(join(dir, p)))]));
    return { r, depois: readFileSync(join(dir, alvo), 'utf8'), fora: foraDaRegra(dir), h: (p) => hashes[p] };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const ASSETS = { 'assets/js/alvo.js': 'export const a = 1;\n', 'assets/js/lib@1.js': 'export const b = 1;\n', 'assets/js/ALVO.JS': 'x\n' };

test('cache.mjs troca só o valor do ?v=: atributo sem aspas, <code>, template literal, @ e extensão maiúscula; URL de outro site intacta', () => {
  const html = '<p>Arquivo: <code>/assets/js/alvo.js?v=1</code> ou <code> /assets/js/alvo.js?v=1</code> e mais texto.</p>\n<link rel=modulepreload href=/assets/js/alvo.js?v=1><p>fim</p>\n'
    + '<script src=/assets/js/alvo.js?v=1></script>\n<script src="/assets/js/lib@1.js?v=1"></script><script src="/assets/js/ALVO.JS?v=1"></script>\n'
    + '<script src="https://cdn.invalid/a,assets/js/alvo.js?v=1"></script><script src="https://cdn.invalid/x?u=/assets/js/alvo.js?v=1"></script>\n';
  const c = caso({ ...ASSETS, 'p.html': html, 'assets/js/d.js': 'const m = await import(`./alvo.js?v=1`);\n' }, 'p.html');
  assert.ok(!(c.r instanceof Error), c.r.message);
  assert.deepEqual(c.r.alterados, ['assets/js/d.js', 'p.html']);
  assert.deepEqual(c.fora, []);
  const a = c.h('assets/js/alvo.js');
  assert.equal(c.depois, html.replaceAll('/assets/js/alvo.js?v=1</code>', `/assets/js/alvo.js?v=${a}</code>`)
    .replaceAll('href=/assets/js/alvo.js?v=1>', `href=/assets/js/alvo.js?v=${a}>`).replaceAll('src=/assets/js/alvo.js?v=1>', `src=/assets/js/alvo.js?v=${a}>`)
    .replace('lib@1.js?v=1', `lib@1.js?v=${c.h('assets/js/lib@1.js')}`).replace('ALVO.JS?v=1', `ALVO.JS?v=${c.h('assets/js/ALVO.JS')}`));
});

test('foraDaRegra: forma de ?v= não reconhecida, URL absoluta do próprio site e referência sem ?v= barram a gravação', () => {
  const pagina = '<link rel="stylesheet" href="/assets/js/alvo.js?v=1">\n';
  for (const [nome, extra, motivo] of [
    ['query antes do v', '<script src="/assets/js/alvo.js?x=1&v=1"></script>', /alvo\.js\?x=1&v=1 \(forma de \?v= não reconhecida/],
    ['valor com ponto', '<script src="/assets/js/alvo.js?v=1.2"></script>', /alvo\.js\?v=1\.2 \(forma de \?v= não reconhecida/],
    ['template literal com ${}', '<script type="module">import(`/assets/js/alvo.js?v=${v}`)</script>', /alvo\.js\?v=\$\{v\} \(forma de \?v= não reconhecida/],
    ['URL absoluta do próprio site', '<script src="https://contacertabr.com.br/assets/js/alvo.js?v=1"></script>', /URL absoluta do próprio site/],
    ['<script> sem ?v=', '<script src="/assets/js/alvo.js" defer></script>', /p\.html:2: \/assets\/js\/alvo\.js \(sem \?v=/],
    ['<link> sem ?v=', '<link rel="modulepreload" href="assets/js/alvo.js">', /p\.html:2: assets\/js\/alvo\.js \(sem \?v=/],
    ['import sem ?v=', '<script type="module">import { a } from "./assets/js/alvo.js";</script>', /p\.html:2: \.\/assets\/js\/alvo\.js \(sem \?v=/],
  ]) {
    const c = caso({ ...ASSETS, 'p.html': pagina + extra + '\n' }, 'p.html');
    assert.ok(c.r instanceof Error, nome);
    assert.match(c.r.message, /^1 referência\(s\) fora da regra; nada foi gravado:/, nome);
    assert.match(c.r.message, motivo, nome);
    assert.equal(c.fora.length, 1, nome);
    assert.equal(c.depois, pagina + extra + '\n', `${nome}: arquivo regravado`);
  }
  // Exceções: assets próprios de /licitacoes/ sem ?v=, URL de outro site e texto corrido sem ?v= ("Node.js").
  const c = caso({ ...ASSETS, 'licitacoes/assets/site.css': 'a{}\n', 'licitacoes/index.html': '<link rel="stylesheet" href="assets/site.css">\n',
    'p.html': '<script src="https://cdn.invalid/x.js"></script><p>Feito com Node.js e um import "à mão".</p>\n' }, 'p.html');
  assert.deepEqual(c.fora, []);
  assert.deepEqual(c.r, { passadas: 0, alterados: [] });
});
