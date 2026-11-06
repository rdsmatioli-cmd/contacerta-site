// Escolhe a regra da trava M-PR33-01 na publicação (pages.yml).
// Push com github.event.before legível: essa base, como antes.
// workflow_dispatch, ou push cuja base não existe ou não dá para ler: SHA do deployment mais recente do ambiente
// github-pages que tenha um status success (o mais novo pode estar inactive; o success antigo ainda conta).
// Base irresolúvel (API, token, paginação fora do GitHub) ou SHA que o clone raso não consegue buscar: ramo estrito.
// "Mudou" é só tests/manutencao/politica-alterada.mjs (parecer 7b078e76): arquivo inteiro, normalizando só ?v=[0-9a-f]+.
// licitacoes/politica.html fica de fora: a data do aviso é PUBLICACAO_LICITACOES, não "hoje se o arquivo mudou".
// Uso: node tests/manutencao/regra-data-politica.mjs  -> imprime NOT_FUTURE ou TODAY; o log vai para o stderr.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { politicaAlterada } from './politica-alterada.mjs';

export const NAO_FUTURA = 'NOT_FUTURE';
export const HOJE = 'TODAY';
export const AMBIENTE = 'github-pages';

const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export function shaValido(s) {
  return typeof s === 'string' && /^[0-9a-f]{40}$/i.test(s) && !/^0{40}$/i.test(s);
}

export function repoValido(repo) {
  if (typeof repo !== 'string' || !REPO.test(repo)) return false;
  return repo.split('/').every((p) => p !== '.' && p !== '..');
}

export function redigir(s) {
  return String(s || '')
    .replace(/\/\/[^/\s@]+@/g, '//***@')
    .replace(/Bearer\s+\S+/gi, 'Bearer ***')
    .replace(/\b(ghp_|gho_|ghs_|github_pat_)[A-Za-z0-9_]+/g, '$1***')
    .slice(0, 300);
}

function baseUsavel(b) {
  return !!(b && b.legivel === true && shaValido(b.sha));
}

// antes/deploy: { sha, legivel } já resolvidos pelo chamador. alterada(sha) é a comparação de conteúdo.
export function decidirRegra({ evento, antes, deploy, alterada }) {
  let sha = null;
  let origem = 'ausente';
  if (evento === 'push' && baseUsavel(antes)) {
    sha = antes.sha.toLowerCase();
    origem = 'before';
  } else if (baseUsavel(deploy)) {
    sha = deploy.sha.toLowerCase();
    origem = 'deployment';
  }
  if (!sha) {
    return { regra: HOJE, origem, base: null, motivo: 'base ausente ou ilegível: ramo estrito (data = hoje).' };
  }
  let mudou = true;
  try {
    mudou = alterada(sha);
  } catch {
    mudou = true;
  }
  if (mudou === false) {
    const motivo = origem === 'before'
      ? 'push: conteúdo de privacidade/index.html não mudou desde github.event.before (data <= hoje).'
      : 'conteúdo de privacidade/index.html não mudou desde o último deploy com sucesso (data <= hoje).';
    return { regra: NAO_FUTURA, origem, base: sha, motivo };
  }
  const motivo = origem === 'before'
    ? 'push: conteúdo de privacidade/index.html mudou desde github.event.before (data = hoje).'
    : 'conteúdo de privacidade/index.html mudou, ou a comparação falhou (data = hoje).';
  return { regra: HOJE, origem, base: sha, motivo };
}

// O Link rel=next da API de deployments usa /repositories/<id>/deployments (não /repos/<owner>/<repo>/...).
// Os dois caminhos, só em https://api.github.com, podem ser seguidos. Qualquer outro host interrompe a paginação
// sem apagar o que já foi lido: a lista vem do mais novo para o mais antigo.
export function proximaPagina(link, repo) {
  if (!link) return { url: null };
  for (const parte of String(link).split(',')) {
    if (!/rel="next"/.test(parte)) continue;
    const m = parte.match(/<([^>]+)>/);
    if (!m) return { url: null, erro: 'paginação da API sem URL; seguimos com o que já foi lido.' };
    let u;
    try { u = new URL(m[1]); } catch { return { url: null, erro: 'paginação da API com URL inválida; seguimos com o que já foi lido.' }; }
    const noRepo = u.pathname === `/repos/${repo}/deployments` || u.pathname.startsWith(`/repos/${repo}/deployments/`);
    const porId = /^\/repositories\/\d+\/deployments\/?$/.test(u.pathname);
    if (u.origin !== 'https://api.github.com' || (!noRepo && !porId)) {
      return { url: null, erro: 'paginação da API apontou para fora do GitHub; seguimos com o que já foi lido.' };
    }
    return { url: u.toString() };
  }
  return { url: null };
}

function opcoes(token) {
  return {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'contacerta-site-policy-gate',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    redirect: 'error',
    signal: AbortSignal.timeout(20000),
  };
}

// Deployment mais novo do ambiente github-pages que tenha algum status success. Erro de API: { sha: null, erro }.
export async function ultimoDeployComSucesso({ repo, token, fetchImpl }) {
  if (!repoValido(repo)) return { sha: null, erro: 'repositório ausente ou inválido; base do deploy não resolvida.' };
  if (!token) return { sha: null, erro: 'token ausente; base do deploy não resolvida.' };
  if (typeof fetchImpl !== 'function') return { sha: null, erro: 'cliente HTTP ausente; base do deploy não resolvida.' };

  const lista = [];
  let falhaPaginacao = '';
  let url = `https://api.github.com/repos/${repo}/deployments?environment=${encodeURIComponent(AMBIENTE)}&per_page=100`;
  const guardarFalha = (msg) => {
    if (!lista.length) return { sha: null, erro: msg };
    falhaPaginacao = msg;
    return null;
  };
  try {
    for (let pagina = 0; pagina < 5 && url; pagina++) {
      const res = await fetchImpl(url, opcoes(token));
      if (!res || res.ok !== true) {
        const parado = guardarFalha(`API de deployments respondeu HTTP ${res && res.status != null ? res.status : 'sem resposta'}.`);
        if (parado) return parado;
        break;
      }
      const body = await res.json();
      if (!Array.isArray(body)) {
        const parado = guardarFalha('API de deployments devolveu um corpo inválido.');
        if (parado) return parado;
        break;
      }
      lista.push(...body);
      const link = res.headers && typeof res.headers.get === 'function' ? res.headers.get('link') : null;
      const prox = proximaPagina(link, repo);
      if (prox.erro) { falhaPaginacao = prox.erro; break; }
      url = prox.url;
      if (!url || body.length === 0) break;
    }
  } catch (e) {
    const parado = guardarFalha(`falha ao consultar deployments (${redigir(e.message)}).`);
    if (parado) return parado;
  }

  lista.sort((a, b) => {
    const ta = Date.parse((a && a.created_at) || '') || 0;
    const tb = Date.parse((b && b.created_at) || '') || 0;
    if (tb !== ta) return tb - ta;
    return (Number(b && b.id) || 0) - (Number(a && a.id) || 0);
  });

  try {
    for (const d of lista) {
      if (!d || d.environment !== AMBIENTE || !shaValido(d.sha)) continue;
      const id = Number(d.id);
      if (!Number.isSafeInteger(id) || id <= 0) continue;
      const statusUrl = `https://api.github.com/repos/${repo}/deployments/${id}/statuses?per_page=100`;
      const res = await fetchImpl(statusUrl, opcoes(token));
      if (!res || res.ok !== true) {
        return { sha: null, erro: `API de status do deployment ${id} respondeu HTTP ${res && res.status != null ? res.status : 'sem resposta'}.` };
      }
      const statuses = await res.json();
      if (!Array.isArray(statuses)) return { sha: null, erro: `API de status do deployment ${id} devolveu um corpo inválido.` };
      if (statuses.some((s) => s && s.state === 'success')) return { sha: d.sha.toLowerCase(), erro: '' };
    }
  } catch (e) {
    return { sha: null, erro: `falha ao consultar status de deployment (${redigir(e.message)}).` };
  }
  return { sha: null, erro: falhaPaginacao };
}

function gitPadrao(args, cwd) {
  try {
    const stdout = execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, stdout, stderr: '' };
  } catch (e) {
    return { ok: false, stdout: '', stderr: redigir(e.stderr || e.message) };
  }
}

function chamarGit(git, args, cwd) {
  try {
    const r = git(args, cwd);
    if (!r || r.ok !== true) return { ok: false, stdout: '', stderr: redigir(r && r.stderr) };
    return { ok: true, stdout: String(r.stdout || ''), stderr: '' };
  } catch (e) {
    return { ok: false, stdout: '', stderr: redigir(e.message) };
  }
}

function garantirCommit(git, cwd, sha, notas) {
  const s = sha.toLowerCase();
  if (!shaValido(s)) return false;
  if (chamarGit(git, ['cat-file', '-e', `${s}^{commit}`], cwd).ok) return true;
  notas.push(`commit ${s} ausente no clone raso; git fetch --depth=1.`);
  const f = chamarGit(git, ['fetch', '--no-tags', '--quiet', '--depth=1', 'origin', s], cwd);
  if (!f.ok) {
    notas.push(`git fetch de ${s} falhou${f.stderr ? `: ${redigir(f.stderr).split('\n')[0]}` : ''}.`);
    return false;
  }
  return chamarGit(git, ['cat-file', '-e', `${s}^{commit}`], cwd).ok;
}

function mostrarAntes(s) {
  if (!s) return 'nenhum';
  if (shaValido(s) || /^0{40}$/i.test(s)) return s.toLowerCase();
  return 'inválido';
}

function montarLog({ evento, ref, antes, head, decisao, notas }) {
  const regra = decisao.regra === NAO_FUTURA ? 'data da política <= hoje' : 'data da política = hoje';
  return [
    `Evento: ${evento || 'desconhecido'} | ref: ${ref || 'nenhuma'} | SHA anterior (before): ${mostrarAntes(antes)} | SHA publicado: ${head || 'desconhecido'}`,
    ...notas,
    `Base: ${decisao.base || 'nenhuma'} (${decisao.origem}). ${decisao.motivo}`,
    `Regra aplicada: ${regra}.`,
  ].join('\n');
}

// Compõe resolução da base (git + API) e decidirRegra. fetchImpl/git/alterada existem para o teste injetar a resolução.
export async function executar({ env, cwd, fetchImpl, git, alterada } = {}) {
  const ambiente = env || {};
  const evento = ambiente.GITHUB_EVENT_NAME || '';
  const ref = ambiente.GITHUB_REF || '';
  const antesInformado = String(ambiente.ANTES || '').trim();
  const gitFn = git || gitPadrao;
  const alteradaFn = alterada || ((sha) => politicaAlterada(sha, undefined, cwd));
  const fetchFn = fetchImpl || globalThis.fetch;
  const notas = [];
  const head = chamarGit(gitFn, ['rev-parse', 'HEAD'], cwd);
  const headSha = head.ok ? head.stdout.trim() : '';

  let antes = { sha: null, legivel: false };
  if (evento === 'push' && shaValido(antesInformado)) {
    const legivel = garantirCommit(gitFn, cwd, antesInformado, notas);
    antes = { sha: antesInformado.toLowerCase(), legivel };
  } else if (evento === 'push' && antesInformado) {
    notas.push('github.event.before não é um SHA de commit; base do push desconhecida.');
  }

  let deploy = { sha: null, legivel: false };
  if (!(evento === 'push' && antes.legivel)) {
    const achado = await ultimoDeployComSucesso({
      repo: ambiente.GITHUB_REPOSITORY || '',
      token: ambiente.GITHUB_TOKEN || '',
      fetchImpl: fetchFn,
    });
    if (achado.erro) notas.push(achado.erro);
    if (achado.sha) {
      const legivel = garantirCommit(gitFn, cwd, achado.sha, notas);
      deploy = { sha: achado.sha, legivel };
      if (!legivel) notas.push(`SHA do deploy ${achado.sha} não pôde ser lido; ramo estrito.`);
    } else if (!achado.erro) notas.push('nenhum deployment com sucesso no ambiente github-pages.');
  }

  const decisao = decidirRegra({ evento, antes, deploy, alterada: alteradaFn });
  return { ...decisao, log: montarLog({ evento, ref, antes: antesInformado, head: headSha, decisao, notas }) };
}

async function decidirOuEstrito() {
  try {
    return await executar({ env: process.env, cwd: process.cwd() });
  } catch (e) {
    const motivo = 'falha inesperada ao decidir a base: ramo estrito (data = hoje).';
    const decisao = { regra: HOJE, origem: 'ausente', base: null, motivo };
    const log = montarLog({
      evento: process.env.GITHUB_EVENT_NAME,
      ref: process.env.GITHUB_REF,
      antes: process.env.ANTES,
      head: '',
      decisao,
      notas: [redigir(e && e.message)],
    });
    return { ...decisao, log };
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const d = await decidirOuEstrito();
  console.error(d.log);
  process.stdout.write(`${d.regra}\n`);
}
