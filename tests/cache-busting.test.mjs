// Cache-busting (o gerador antigo fazia isto no build): todo ?v= de referência local a .js, .css ou .mjs é o sha256
// do arquivo referenciado (10 primeiros hex), no HTML e nos imports dentro dos .js. A regra e a varredura moram em
// tests/manutencao/cache.mjs, que também corrige: node tests/manutencao/cache.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { RAIZ, SO_LEITURA, atualizar, hash10, referencias } from './manutencao/cache.mjs';

const refs = referencias();

test('a varredura acha os ?v= das páginas, do modulepreload, dos imports entre módulos e do lcm-consent', () => {
  const de = (arquivo, alvo) => refs.some((r) => r.arquivo === arquivo && r.alvo === alvo);
  assert.ok(refs.length >= 250, `só ${refs.length} referências com ?v=`);
  for (const [arquivo, alvo] of [['assets/js/ui.js', 'assets/js/calc.js'], ['assets/js/ui.js', 'assets/js/tabelas.js'],
    ['assets/js/ui.js', 'assets/js/valida.js'], ['assets/js/calc.js', 'assets/js/tabelas.js'], ['assets/js/valida.js', 'assets/js/calc.js'],
    ['index.html', 'assets/style.css'], ['404.html', 'assets/style.css'], ['rescisao/index.html', 'assets/js/ui.js']]) assert.ok(de(arquivo, alvo), `${arquivo} -> ${alvo}`);
  const calc = refs.find((r) => r.arquivo === 'rescisao/index.html' && r.alvo === 'assets/js/calc.js');
  assert.ok(calc && readFileSync(join(RAIZ, 'rescisao/index.html'), 'utf8').includes(`<link rel="modulepreload" href="/assets/js/calc.js?v=${calc.v}">`), 'modulepreload fora da varredura');
  for (const a of SO_LEITURA) assert.ok(refs.filter((r) => r.alvo === a).length >= 50, a);
  assert.ok(!refs.some((r) => r.arquivo.startsWith('tests/')));
});

test('todo ?v= é o sha256 do arquivo referenciado (inclusive assets/lcm-consent.*)', () => {
  const div = refs.filter((r) => r.v !== r.esperado)
    .map((r) => `${r.arquivo}:${r.linha}: ${r.ref}?v=${r.v} -> ${r.esperado ? `esperado ?v=${r.esperado}` : 'arquivo não encontrado'}`);
  assert.equal(div.length, 0, `${div.length} ?v= divergente(s); corrija com node tests/manutencao/cache.mjs:\n${div.join('\n')}`);
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
