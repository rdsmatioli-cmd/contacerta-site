// B-CC60-J02 / parecer 7b078e76: trava da data da política. Só a troca do hex de ?v= não é alteração; todo o resto é.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { alterada, normalizar, politicaAlterada } from './manutencao/politica-alterada.mjs';

const BASE = '<link rel="stylesheet" href="/assets/style.css?v=3ed109e95e">\n<p>Compartilhamos com o operador A.</p>\n';

test('só ?v= mudou: não alterada', () => {
  assert.equal(alterada(BASE, BASE.replace('3ed109e95e', '0123abcdef')), false);
});
test('texto mudou: alterada', () => {
  assert.equal(alterada(BASE, BASE.replace('operador A.', 'operadores A e B.')), true);
});
test('texto mudou na MESMA linha do ?v= (com ?v= também trocado): alterada', () => {
  const a = '<link rel="stylesheet" href="/assets/style.css?v=3ed109e95e"><p>Compartilhamos com o operador A.</p>\n';
  const b = '<link rel="stylesheet" href="/assets/style.css?v=0123abcdef"><p>Compartilhamos com os operadores A e B.</p>\n';
  assert.equal(alterada(a, b), true);
});
test('outro atributo ou link mudou: alterada', () => {
  assert.equal(alterada(BASE, BASE.replace('/assets/style.css', '/assets/outro.css')), true);
  assert.equal(alterada(BASE, BASE.replace('rel="stylesheet"', 'rel="preload"')), true);
  assert.equal(alterada(BASE, BASE.replace('?v=3ed109e95e', '?x=3ed109e95e')), true);
  assert.equal(alterada(BASE, BASE.replace('?v=3ed109e95e', '?v=NAOHEX')), true, 'só hex é normalizado');
});
test('base ausente ou ilegível: ramo estrito (alterada)', () => {
  assert.equal(alterada(null, BASE), true);
  assert.equal(alterada(BASE, null), true);
  assert.equal(politicaAlterada('ref-que-nao-existe-xyz', undefined), true);
  assert.equal(politicaAlterada('', undefined), true);
  assert.equal(politicaAlterada(undefined, undefined), true);
});
test('normalização limitada a ?v=[0-9a-f]+', () => {
  assert.equal(normalizar('a?v=abc123 b?v=ZZ c?w=abc'), 'a?v= b?v=ZZ c?w=abc');
});

test('CLI em repositório git temporário: cache-only false, texto mesma linha true, base sem arquivo true', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pol-'));
  const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  const cli = fileURLToPath(new URL('./manutencao/politica-alterada.mjs', import.meta.url));
  const rodar = (...a) => execFileSync(process.execPath, [cli, ...a], { cwd: dir, encoding: 'utf8' }).trim();
  try {
    git('init', '-q'); git('config', 'user.email', 't@t'); git('config', 'user.name', 't');
    writeFileSync(join(dir, 'x.txt'), 'x'); git('add', '.'); git('commit', '-qm', 'sem politica');
    const semArquivo = git('rev-parse', 'HEAD');
    mkdirSync(join(dir, 'privacidade'));
    const f = join(dir, 'privacidade/index.html');
    writeFileSync(f, BASE); git('add', '.'); git('commit', '-qm', 'base');
    const base = git('rev-parse', 'HEAD');
    assert.equal(rodar(semArquivo), 'true');
    writeFileSync(f, BASE.replace('3ed109e95e', 'aaaaaaaaaa'));
    assert.equal(rodar(base), 'false');
    git('commit', '-qam', 'cache'); const cache = git('rev-parse', 'HEAD');
    assert.equal(rodar(base, cache), 'false');
    writeFileSync(f, readFileSync(f, 'utf8').replace('operador A.', 'operadores A e B.'));
    assert.equal(rodar(base), 'true');
    const umaLinha = (v, t) => `<link href="/s.css?v=${v}"><p>${t}</p>\n`;
    writeFileSync(f, umaLinha('1111111111', 'A')); git('commit', '-qam', 'l1'); const l1 = git('rev-parse', 'HEAD');
    writeFileSync(f, umaLinha('2222222222', 'A e B'));
    assert.equal(rodar(l1), 'true');
    assert.equal(rodar('0000000000000000000000000000000000000000'), 'true');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
