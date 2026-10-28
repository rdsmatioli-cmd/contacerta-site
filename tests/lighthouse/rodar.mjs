// Roda o Lighthouse 13.5.0 (npx, versão fixa) nas URLs de metas.mjs contra o site servido localmente
// e falha (saída 1) se alguma meta for violada ou se faltar algum relatório. Sem dependências.
//
//   python3 -m http.server 8080 --bind 127.0.0.1 &
//   node tests/lighthouse/rodar.mjs --base http://127.0.0.1:8080 --saida /tmp/lighthouse
//
// Opções: --saida (padrão: pasta temporária do sistema, fora do site servido), --perfis mobile,desktop (padrão: os
// dois) e --so-verificar (não roda o Lighthouse; só confere os JSON que já estão em --saida). CHROME_PATH escolhe o
// Chrome; sem ele, o Lighthouse usa o do sistema.
// O banner de cookies nunca é aceito e as URLs do Google Analytics ficam bloqueadas por garantia.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { LIGHTHOUSE, TODAS_URLS as URLS, ehNoindex, PERFIS, METAS, avaliar, nomeRelatorio, resumo } from './metas.mjs';

const args = process.argv.slice(2);
const opcao = (nome, padrao) => {
  const i = args.indexOf(nome);
  return i >= 0 && args[i + 1] ? args[i + 1] : padrao;
};
const base = opcao('--base', 'http://127.0.0.1:8080').replace(/\/+$/, '');
const saida = resolve(opcao('--saida', join(tmpdir(), 'lighthouse-contacerta')));
const perfis = opcao('--perfis', PERFIS.join(',')).split(',').filter(Boolean);
const soVerificar = args.includes('--so-verificar');
for (const p of perfis) if (!PERFIS.includes(p)) { console.error(`perfil desconhecido: ${p}`); process.exit(2); }

const lerJson = (arq) => {
  try { return JSON.parse(readFileSync(arq, 'utf8')); } catch { return null; }
};

function rodar(url, perfil, arq) {
  rmSync(arq, { force: true });
  const r = spawnSync('npx', [
    '--yes', `lighthouse@${LIGHTHOUSE}`, `${base}${url}`,
    ...(perfil === 'desktop' ? ['--preset=desktop'] : []),
    '--output=json', `--output-path=${arq}`, '--quiet',
    '--chrome-flags=--headless=new --no-sandbox',
    '--max-wait-for-load=45000',
    '--blocked-url-patterns=*googletagmanager.com*',
    '--blocked-url-patterns=*google-analytics.com*',
  ], { stdio: 'inherit' });
  return r.status === 0 && existsSync(arq) && !lerJson(arq)?.runtimeError;
}

if (!soVerificar) {
  mkdirSync(saida, { recursive: true });
  for (const perfil of perfis) {
    for (const url of URLS) {
      const arq = join(saida, nomeRelatorio(url, perfil));
      console.log(`Lighthouse ${LIGHTHOUSE}: ${url} (${perfil})`);
      // Uma nova tentativa só quando o próprio Lighthouse falha (Chrome que não abre, NO_FCP etc.).
      if (!rodar(url, perfil, arq)) {
        console.log(`  nova tentativa: ${url} (${perfil})`);
        rodar(url, perfil, arq);
      }
    }
  }
}

let falhou = false;
const br = (n) => String(n).replace('.', ',');
console.log(`\nMetas: SEO >= ${br(METAS.seo)} | Acessibilidade >= ${br(METAS.acessibilidade)} | CLS < ${br(METAS.clsMax)} | ${METAS.auditLlms} (agentic-browsing) = 1`);
for (const perfil of perfis) {
  for (const url of URLS) {
    const arq = join(saida, nomeRelatorio(url, perfil));
    const lhr = lerJson(arq);
    const falhas = lhr ? avaliar(lhr, undefined, { noindex: ehNoindex(url) }) : [`relatório ausente ou ilegível: ${arq}`];
    console.log(`${falhas.length ? 'FALHA' : 'ok   '} ${url} (${perfil}) ${lhr ? resumo(lhr) : ''}`);
    for (const f of falhas) console.log(`      - ${f}`);
    if (falhas.length) falhou = true;
  }
}
if (falhou) {
  console.error('\nLighthouse: há metas violadas (veja as linhas FALHA acima). Os JSON completos ficam em ' + saida);
  process.exit(1);
}
console.log(`\nLighthouse: ${URLS.length * perfis.length} relatórios dentro das metas.`);
