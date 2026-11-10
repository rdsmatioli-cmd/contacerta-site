// Base da trava M-PR33-01 na publicação: push com before segue igual; dispatch e push sem base usam o último
// deploy com sucesso. A data do arquivo real (30/10/2026) passa com NOT_FUTURE e falha com TODAY.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  HOJE, NAO_FUTURA, decidirRegra, executar, repoValido, shaValido, ultimoDeployComSucesso,
} from './manutencao/regra-data-politica.mjs';

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const C = 'c'.repeat(40);
const ZERO = '0'.repeat(40);
const cli = fileURLToPath(new URL('./manutencao/regra-data-politica.mjs', import.meta.url));

function regra(parcial) {
  return decidirRegra({
    evento: 'push',
    antes: { sha: null, legivel: false },
    deploy: { sha: null, legivel: false },
    alterada: () => false,
    ...parcial,
  });
}

test('push com before legível e política igual: NOT_FUTURE, sem usar o deploy', () => {
  const d = regra({
    antes: { sha: A, legivel: true },
    deploy: { sha: B, legivel: true },
    alterada: (sha) => sha !== A,
  });
  assert.equal(d.regra, NAO_FUTURA);
  assert.equal(d.origem, 'before');
  assert.equal(d.base, A);
});

test('push com before legível e política alterada: TODAY, mesmo se o deploy estiver igual', () => {
  const d = regra({
    antes: { sha: A, legivel: true },
    deploy: { sha: B, legivel: true },
    alterada: (sha) => sha === A,
  });
  assert.equal(d.regra, HOJE);
  assert.equal(d.origem, 'before');
});

test('push com base desconhecida e sem deploy: estrito', () => {
  for (const sha of [null, '', ZERO, 'não-é-sha']) {
    const d = regra({ evento: 'push', antes: { sha, legivel: false }, deploy: { sha: null, legivel: false } });
    assert.equal(d.regra, HOJE, String(sha));
    assert.equal(d.origem, 'ausente');
  }
  const ilegivel = regra({ antes: { sha: A, legivel: false }, deploy: { sha: B, legivel: false } });
  assert.equal(ilegivel.regra, HOJE);
  assert.equal(ilegivel.origem, 'ausente');
});

test('push sem before legível usa o deploy: igual NOT_FUTURE, mudou TODAY', () => {
  const igual = regra({
    antes: { sha: ZERO, legivel: false },
    deploy: { sha: B, legivel: true },
    alterada: () => false,
  });
  assert.equal(igual.regra, NAO_FUTURA);
  assert.equal(igual.origem, 'deployment');
  assert.equal(igual.base, B);
  const mudou = regra({
    antes: { sha: null, legivel: false },
    deploy: { sha: B, legivel: true },
    alterada: () => true,
  });
  assert.equal(mudou.regra, HOJE);
  assert.equal(mudou.origem, 'deployment');
});

test('workflow_dispatch ignora o before e olha o deploy', () => {
  const igual = regra({
    evento: 'workflow_dispatch',
    antes: { sha: A, legivel: true },
    deploy: { sha: B, legivel: true },
    alterada: (sha) => sha !== B,
  });
  assert.equal(igual.regra, NAO_FUTURA);
  assert.equal(igual.origem, 'deployment');
  assert.equal(igual.base, B);
  const mudou = regra({
    evento: 'workflow_dispatch',
    deploy: { sha: B, legivel: true },
    alterada: () => true,
  });
  assert.equal(mudou.regra, HOJE);
  assert.equal(mudou.origem, 'deployment');
});

test('dispatch sem deploy, ou deploy ilegível, ou comparação que não devolve false: estrito', () => {
  assert.equal(regra({ evento: 'workflow_dispatch' }).regra, HOJE);
  assert.equal(regra({ evento: 'workflow_dispatch', deploy: { sha: B, legivel: false } }).regra, HOJE);
  assert.equal(regra({ evento: 'workflow_dispatch', deploy: { sha: 'curto', legivel: true } }).regra, HOJE);
  assert.equal(regra({
    evento: 'workflow_dispatch',
    deploy: { sha: B, legivel: true },
    alterada: () => { throw new Error('git show'); },
  }).regra, HOJE);
  assert.equal(regra({
    evento: 'workflow_dispatch',
    deploy: { sha: B, legivel: true },
    alterada: () => undefined,
  }).regra, HOJE);
});

function resposta(body, { status = 200, link = null } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (n) => (String(n).toLowerCase() === 'link' ? link : null) },
    json: async () => body,
  };
}

test('API: o success mais novo vale; inactive com success no histórico conta; failure sem success não', async () => {
  const status = {
    1: [{ state: 'inactive' }, { state: 'success' }],
    2: [{ state: 'inactive' }, { state: 'failure' }],
    3: [{ state: 'failure' }],
    4: [{ state: 'queued' }, { state: 'success' }],
  };
  const deps = [
    { id: 1, sha: A, environment: 'github-pages', created_at: '2026-11-01T04:09:21Z' },
    { id: 2, sha: B, environment: 'github-pages', created_at: '2026-11-06T17:59:11Z' },
    { id: 3, sha: B, environment: 'github-pages', created_at: '2026-11-06T18:09:52Z' },
    { id: 4, sha: C, environment: 'github-pages', created_at: '2026-11-06T18:31:27Z' },
  ];
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    if (url.includes('/deployments?')) return resposta(deps);
    const id = Number(url.match(/deployments\/(\d+)\/statuses/)[1]);
    return resposta(status[id]);
  };
  const r = await ultimoDeployComSucesso({ repo: 'rdsmatioli-cmd/contacerta-site', token: 't', fetchImpl });
  assert.deepEqual(r, { sha: C, erro: '' });
  assert.equal(urls.filter((u) => u.includes('/statuses')).length, 1);
});

test('API: paginação e ordem errada ainda escolhem o success mais novo', async () => {
  const pagina1 = [{ id: 1, sha: A, environment: 'github-pages', created_at: '2026-11-01T00:00:00Z' }];
  const pagina2 = [{ id: 2, sha: B, environment: 'github-pages', created_at: '2026-11-06T00:00:00Z' }];
  const link = '<https://api.github.com/repositories/1410982718/deployments?environment=github-pages&per_page=100&page=2>; rel="next", <https://api.github.com/repositories/1410982718/deployments?environment=github-pages&per_page=100&page=73>; rel="last"';
  const fetchImpl = async (url) => {
    if (url.includes('page=2')) return resposta(pagina2);
    if (url.includes('/deployments?')) return resposta(pagina1, { link });
    if (url.includes('/deployments/2/statuses')) return resposta([{ state: 'success' }]);
    if (url.includes('/deployments/1/statuses')) return resposta([{ state: 'success' }]);
    throw new Error(url);
  };
  const r = await ultimoDeployComSucesso({ repo: 'o/r', token: 't', fetchImpl });
  assert.equal(r.sha, B);
});

test('API: erro HTTP, status ilegível do mais novo, link externo ou entrada inválida não resolvem a base', async () => {
  const chamadas = [];
  const fetchQueRegistra = (fn) => async (url) => { chamadas.push(url); return fn(url); };
  const http = await ultimoDeployComSucesso({
    repo: 'o/r', token: 't', fetchImpl: async () => resposta({ message: 'no' }, { status: 500 }),
  });
  assert.equal(http.sha, null);
  assert.match(http.erro, /HTTP 500/);

  const statusRuim = await ultimoDeployComSucesso({
    repo: 'o/r',
    token: 't',
    fetchImpl: async (url) => {
      if (url.includes('/deployments?')) {
        return resposta([
          { id: 9, sha: C, environment: 'github-pages', created_at: '2026-11-06T00:00:00Z' },
          { id: 1, sha: A, environment: 'github-pages', created_at: '2026-11-01T00:00:00Z' },
        ]);
      }
      if (url.includes('/deployments/9/')) return resposta({}, { status: 502 });
      return resposta([{ state: 'success' }]);
    },
  });
  assert.equal(statusRuim.sha, null);
  assert.match(statusRuim.erro, /502/);

  chamadas.length = 0;
  const externo = await ultimoDeployComSucesso({
    repo: 'o/r',
    token: 'secreto',
    fetchImpl: fetchQueRegistra(async (url) => {
      if (url.includes('/statuses')) return resposta([{ state: 'success' }]);
      return resposta([{ id: 4, sha: C, environment: 'github-pages', created_at: '2026-11-06T18:31:27Z' }], {
        link: '<https://evil.example/repos/o/r/deployments?page=2>; rel="next"',
      });
    }),
  });
  assert.equal(externo.sha, C);
  assert.equal(externo.erro, '');
  assert.equal(chamadas.some((u) => u.includes('evil.example')), false);

  chamadas.length = 0;
  const vazio = await ultimoDeployComSucesso({
    repo: 'o/r',
    token: 'secreto',
    fetchImpl: fetchQueRegistra(async () => resposta([], {
      link: '<https://evil.example/repos/o/r/deployments?page=2>; rel="next"',
    })),
  });
  assert.equal(vazio.sha, null);
  assert.match(vazio.erro, /fora do GitHub/);
  assert.equal(chamadas.some((u) => u.includes('evil.example')), false);

  chamadas.length = 0;
  const repo = await ultimoDeployComSucesso({ repo: '../x', token: 't', fetchImpl: fetchQueRegistra(async () => { throw new Error('nao'); }) });
  assert.equal(repo.sha, null);
  assert.equal(chamadas.length, 0);
  const semToken = await ultimoDeployComSucesso({ repo: 'o/r', token: '', fetchImpl: fetchQueRegistra(async () => { throw new Error('nao'); }) });
  assert.equal(semToken.sha, null);
  assert.equal(chamadas.length, 0);
  assert.equal(repoValido('../x'), false);
  assert.equal(shaValido(ZERO), false);
  assert.equal(shaValido(A), true);
});

function gitEmMemoria(presentesInicial) {
  const tem = new Set(presentesInicial);
  const cmds = [];
  const git = (args) => {
    cmds.push(args.join(' '));
    if (args[0] === 'rev-parse') return { ok: true, stdout: `${C}\n` };
    if (args[0] === 'cat-file') return { ok: tem.has(args[2].replace('^{commit}', '')), stderr: 'missing' };
    if (args[0] === 'fetch') {
      if (args.at(-1) === B) { tem.add(B); return { ok: true, stdout: '' }; }
      return { ok: false, stderr: 'could not read' };
    }
    return { ok: false, stderr: 'cmd' };
  };
  return { git, cmds };
}

function apiSha(sha, { status = [{ state: 'success' }] } = {}) {
  return async (url) => {
    if (url.includes('/deployments?')) {
      return resposta([{ id: 7, sha, environment: 'github-pages', created_at: '2026-11-06T18:38:18Z' }]);
    }
    if (url.includes('/deployments/7/statuses')) return resposta(status);
    throw new Error(url);
  };
}

test('executar: push com before no clone não chama a API', async () => {
  let chamou = false;
  const { git } = gitEmMemoria([A]);
  const d = await executar({
    env: {
      GITHUB_EVENT_NAME: 'push', ANTES: A, GITHUB_REF: 'refs/heads/main',
      GITHUB_TOKEN: 'ghp_NAODEVEAPARECER', GITHUB_REPOSITORY: 'o/r',
    },
    cwd: '/tmp',
    git,
    fetchImpl: async () => { chamou = true; throw new Error('Bearer ghp_NAODEVEAPARECER'); },
    alterada: () => false,
  });
  assert.equal(d.regra, NAO_FUTURA);
  assert.equal(d.origem, 'before');
  assert.equal(chamou, false);
  assert.equal(d.log.includes('ghp_NAODEVEAPARECER'), false);
});

test('executar: dispatch busca o SHA no clone raso; falha de API ou de fetch fica estrita e sem segredo', async () => {
  const raso = gitEmMemoria([]);
  const igual = await executar({
    env: { GITHUB_EVENT_NAME: 'workflow_dispatch', ANTES: '', GITHUB_REF: 'refs/heads/main', GITHUB_TOKEN: 't', GITHUB_REPOSITORY: 'o/r' },
    cwd: '/tmp',
    git: raso.git,
    fetchImpl: apiSha(B),
    alterada: (sha) => { assert.equal(sha, B); return false; },
  });
  assert.equal(igual.regra, NAO_FUTURA);
  assert.equal(igual.origem, 'deployment');
  assert.ok(raso.cmds.some((c) => c.startsWith('fetch ')));

  const mudou = await executar({
    env: { GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_TOKEN: 't', GITHUB_REPOSITORY: 'o/r' },
    cwd: '/tmp',
    git: gitEmMemoria([B]).git,
    fetchImpl: apiSha(B),
    alterada: () => true,
  });
  assert.equal(mudou.regra, HOJE);
  assert.equal(mudou.origem, 'deployment');

  const semApi = await executar({
    env: { GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_TOKEN: 'ghp_SEGREDO', GITHUB_REPOSITORY: 'o/r' },
    cwd: '/tmp',
    git: gitEmMemoria([]).git,
    fetchImpl: async () => { throw new Error('connect Bearer ghp_SEGREDO'); },
    alterada: () => false,
  });
  assert.equal(semApi.regra, HOJE);
  assert.equal(semApi.origem, 'ausente');
  assert.equal(semApi.log.includes('ghp_SEGREDO'), false);
  assert.match(semApi.log, /Bearer \*\*\*/);

  const semFetch = await executar({
    env: { GITHUB_EVENT_NAME: 'push', ANTES: ZERO, GITHUB_TOKEN: 't', GITHUB_REPOSITORY: 'o/r', GITHUB_REF: 'refs/heads/main' },
    cwd: '/tmp',
    git: gitEmMemoria([]).git,
    fetchImpl: apiSha('d'.repeat(40)),
    alterada: () => false,
  });
  assert.equal(semFetch.regra, HOJE);
  assert.equal(semFetch.origem, 'ausente');
  assert.match(semFetch.log, /não pôde ser lido/);
});

test('clone raso real: ?v= não liga a trava; texto na mesma linha liga; SHA ilegível é estrito', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'regra-pol-'));
  const origin = join(dir, 'origin');
  const shallow = join(dir, 'shallow');
  const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const html = (v, texto) => `<link rel="stylesheet" href="/assets/style.css?v=${v}"><p>${texto}</p>\n`;
  try {
    git(dir, ['init', '-q', '-b', 'main', origin]);
    git(origin, ['config', 'user.email', 't@t']);
    git(origin, ['config', 'user.name', 't']);
    git(origin, ['config', 'uploadpack.allowReachableSHA1InWant', 'true']);
    mkdirSync(join(origin, 'privacidade'));
    const arquivo = join(origin, 'privacidade/index.html');
    writeFileSync(arquivo, html('1111111111', 'Texto estavel.'));
    git(origin, ['add', '.']);
    git(origin, ['commit', '-qm', 'base']);
    writeFileSync(arquivo, html('2222222222', 'Texto estavel.'));
    git(origin, ['commit', '-qam', 'cache']);
    const base = git(origin, ['rev-parse', 'HEAD^']).trim();
    git(dir, ['clone', '-q', '--depth', '1', `file://${origin}`, shallow]);
    const presente = spawnSync('git', ['cat-file', '-e', `${base}^{commit}`], { cwd: shallow, encoding: 'utf8' });
    assert.notEqual(presente.status, 0, 'o base não pode já estar no clone raso');

    const env = { GITHUB_EVENT_NAME: 'workflow_dispatch', ANTES: '', GITHUB_REF: 'refs/heads/main', GITHUB_TOKEN: 't', GITHUB_REPOSITORY: 'o/r' };
    const igual = await executar({ env, cwd: shallow, fetchImpl: apiSha(base) });
    assert.equal(igual.regra, NAO_FUTURA);
    assert.equal(igual.origem, 'deployment');
    assert.equal(igual.base, base);

    writeFileSync(join(shallow, 'privacidade/index.html'), html('3333333333', 'Texto mudou na mesma linha.'));
    const mudou = await executar({ env, cwd: shallow, fetchImpl: apiSha(base) });
    assert.equal(mudou.regra, HOJE);
    assert.equal(mudou.origem, 'deployment');

    const sumiu = await executar({ env, cwd: shallow, fetchImpl: apiSha('d'.repeat(40)) });
    assert.equal(sumiu.regra, HOJE);
    assert.equal(sumiu.origem, 'ausente');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('dispatch: a política publicada em 11/11/2026 segue a trava (hoje ou futuro)', () => {
  const igual = regra({ evento: 'workflow_dispatch', deploy: { sha: B, legivel: true }, alterada: () => false });
  const mudou = regra({ evento: 'workflow_dispatch', deploy: { sha: B, legivel: true }, alterada: () => true });
  assert.equal(igual.regra, NAO_FUTURA);
  assert.equal(mudou.regra, HOJE);
  const arquivo = fileURLToPath(new URL('./politica-data.test.mjs', import.meta.url));
  const rodar = (extra) => {
    const env = { ...process.env };
    delete env.NODE_TEST_CONTEXT;
    delete env.REQUIRE_POLICY_DATE_TODAY;
    delete env.REQUIRE_POLICY_DATE_NOT_FUTURE;
    Object.assign(env, extra);
    return spawnSync(process.execPath, ['--test', arquivo], { env, encoding: 'utf8' });
  };
  const hoje = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
  const publicada = '11/11/2026';
  const ordem = (d) => d.split('/').reverse().join('');
  const futura = ordem(publicada) > ordem(hoje);
  const passou = rodar({ REQUIRE_POLICY_DATE_NOT_FUTURE: '1' });
  if (futura) assert.notEqual(passou.status, 0, `${passou.stdout}\n${passou.stderr}`);
  else {
    assert.equal(passou.status, 0, `${passou.stdout}\n${passou.stderr}`);
    assert.match(passou.stdout, /ok \d+ - privacidade: "Última atualização" não está no futuro/);
  }
  const hojeExigido = rodar({ REQUIRE_POLICY_DATE_TODAY: '1' });
  if (hoje === publicada) assert.equal(hojeExigido.status, 0, `${hojeExigido.stdout}\n${hojeExigido.stderr}`);
  else {
    assert.notEqual(hojeExigido.status, 0);
    assert.match(`${hojeExigido.stdout}\n${hojeExigido.stderr}`, /política diz 11\/11\/2026/);
  }
});

test('pages.yml aplica o helper com deployments: read', () => {
  const yml = readFileSync(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8');
  assert.match(yml, /deployments: read/);
  assert.match(yml, /tests\/manutencao\/regra-data-politica\.mjs/);
  assert.match(yml, /REQUIRE_POLICY_DATE_NOT_FUTURE=1 node --test tests\/politica-data\.test\.mjs/);
  assert.match(yml, /REQUIRE_POLICY_DATE_TODAY=1 node --test tests\/politica-data\.test\.mjs/);
  assert.equal(yml.includes('github.token'), true);
});

test('CLI de um push com before legível imprime só a regra', () => {
  const dir = mkdtempSync(join(tmpdir(), 'regra-cli-'));
  try {
    const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    git('init', '-q');
    git('config', 'user.email', 't@t');
    git('config', 'user.name', 't');
    mkdirSync(join(dir, 'privacidade'));
    writeFileSync(join(dir, 'privacidade/index.html'), '<p>Última atualização: 30/10/2026.</p>\n');
    git('add', '.');
    git('commit', '-qm', 'base');
    const base = git('rev-parse', 'HEAD').trim();
    const r = spawnSync(process.execPath, [cli], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        PATH: process.env.PATH,
        GITHUB_EVENT_NAME: 'push',
        ANTES: base,
        GITHUB_REF: 'refs/heads/main',
        GITHUB_REPOSITORY: 'o/r',
        GITHUB_TOKEN: 'ghp_NAODEVEAPARECER',
      },
    });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, `${NAO_FUTURA}\n`);
    assert.equal(r.stderr.includes('ghp_NAODEVEAPARECER'), false);
    assert.match(r.stderr, /data da política <= hoje/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
