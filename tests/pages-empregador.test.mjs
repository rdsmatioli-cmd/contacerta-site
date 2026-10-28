// B-06 (CPO, 28/10/2026): /empregador-em-dia/ fica fora do artefato do Pages até o OK de deploy do CEO.
// Monta o _site com o mesmo passo do pages.yml (bash + rsync) e confere que não há /empregador-em-dia/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const raiz = new URL('..', import.meta.url).pathname;
const yml = readFileSync(join(raiz, '.github/workflows/pages.yml'), 'utf8');
const passo = yml.match(/- name: Montar _site\n {8}env:\n {10}DEPLOY_EMPREGADOR: '(\d)'\n {8}run: \|\n((?: {10}.*\n)+)/);

test('pages.yml: chave DEPLOY_EMPREGADOR existe e está em 0 (sem OK de deploy do CEO)', () => {
  assert.ok(passo, 'passo "Montar _site" com env DEPLOY_EMPREGADOR');
  assert.equal(passo[1], '0');
});

let rsync = true;
try { execFileSync('rsync', ['--version'], { stdio: 'ignore' }); } catch { rsync = false; }
test('artefato montado pelo pages.yml não tem /empregador-em-dia/ (e tem o resto do site)', { skip: !rsync && !process.env.CI && 'rsync ausente (no CI é obrigatório)' }, () => {
  const tmp = mkdtempSync(join(tmpdir(), 'pages-'));
  try {
    const script = passo[2].replace(/^ {10}/gm, '');
    execFileSync('bash', ['-euo', 'pipefail', '-c', script], { cwd: raiz, env: { ...process.env, RUNNER_TEMP: tmp, DEPLOY_EMPREGADOR: passo[1] }, stdio: 'pipe' });
    assert.ok(!existsSync(join(tmp, '_site/empregador-em-dia')), '/empregador-em-dia/ no artefato');
    for (const f of ['index.html', 'privacidade/index.html', 'sitemap.xml', 'CNAME']) assert.ok(existsSync(join(tmp, '_site', f)), f);
    assert.ok(!existsSync(join(tmp, '_site/tests')));
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});
