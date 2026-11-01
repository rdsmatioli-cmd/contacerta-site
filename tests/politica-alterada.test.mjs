// A trava "data = hoje" da política (M-PR33-01) só liga quando o conteúdo de privacidade/index.html muda.
// A troca do ?v= feita pelo cache.mjs não é mudança da política (tests/manutencao/politica-alterada.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { politicaAlterada, semCache } from './manutencao/politica-alterada.mjs';

const script = fileURLToPath(new URL('./manutencao/politica-alterada.mjs', import.meta.url));

test('só o ?v= do cache mudou: política não alterada', () => {
  const antes = '<link rel="stylesheet" href="/assets/style.css?v=03383b6fea"><p>Última atualização: 30/10/2026</p>';
  const depois = '<link rel="stylesheet" href="/assets/style.css?v=2a691a6948"><p>Última atualização: 30/10/2026</p>';
  assert.equal(politicaAlterada(antes, depois), false);
});

test('texto da política mudou (junto ou não com o ?v=): alterada', () => {
  const antes = '<link href="/assets/style.css?v=03383b6fea"><p>Seção 10</p>';
  assert.equal(politicaAlterada(antes, '<link href="/assets/style.css?v=03383b6fea"><p>Seção 10 nova</p>'), true);
  assert.equal(politicaAlterada(antes, '<link href="/assets/style.css?v=2a691a6948"><p>Seção 10 nova</p>'), true);
  assert.equal(politicaAlterada(antes, '<link href="/assets/style.css?v=03383b6fea"><p>Seção 10</p><p>Seção 11</p>'), true);
});

test('arquivo ausente no commit de base conta como alterada', () => {
  assert.equal(politicaAlterada(null, '<p>x</p>'), true);
});

test('semCache só toca no hash hexadecimal do ?v=', () => {
  assert.equal(semCache('a.css?v=abc123 b?v=XYZ c?vv=abc'), 'a.css?v= b?v=XYZ c?vv=abc');
});

test('script num repositório temporário: ?v= novo = false; texto novo = true; commit inexistente = true', () => {
  const dir = mkdtempSync(join(tmpdir(), 'politica-alterada-'));
  try {
    const git = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
    const arq = join(dir, 'privacidade', 'index.html');
    mkdirSync(join(dir, 'privacidade'));
    git('init', '-q');
    writeFileSync(arq, '<link href="/assets/style.css?v=03383b6fea"><p>Última atualização: 30/10/2026</p>\n');
    git('add', '.');
    git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'base');
    const saida = (commit) => execFileSync(process.execPath, [script, commit], { cwd: dir, encoding: 'utf8' }).trim();
    writeFileSync(arq, '<link href="/assets/style.css?v=2a691a6948"><p>Última atualização: 30/10/2026</p>\n');
    assert.equal(saida('HEAD'), 'false');
    writeFileSync(arq, '<link href="/assets/style.css?v=2a691a6948"><p>Última atualização: 31/10/2026</p>\n');
    assert.equal(saida('HEAD'), 'true');
    assert.equal(saida('0000000000000000000000000000000000000000'), 'true');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
