#!/usr/bin/env node
// Diz se a política de privacidade (privacidade/index.html) mudou de conteúdo entre um commit e a árvore atual.
// Ignora só o `?v=` de cache: o cache.mjs troca esse hash em todas as páginas quando um CSS ou JS compartilhado muda,
// e isso não é mudança da política. Sem essa exceção, qualquer PR que mexe no style.css ligava a trava "data = hoje"
// (M-PR33-01) no CI e barrava a publicação no pages.yml, sem que a política tivesse mudado.
// Uso: node tests/manutencao/politica-alterada.mjs <commit>   (imprime true ou false)
// Arquivo ausente no commit, ou commit ilegível, conta como alterada (a regra mais rígida vale na dúvida).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const ARQUIVO = 'privacidade/index.html';

export function semCache(html) {
  return html.replace(/\?v=[0-9a-f]+/g, '?v=');
}

export function politicaAlterada(antes, depois) {
  return antes === null || semCache(antes) !== semCache(depois);
}

function noCommit(commit) {
  try {
    return execFileSync('git', ['show', `${commit}:${ARQUIVO}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const commit = process.argv[2];
  if (!commit) {
    console.error('uso: node tests/manutencao/politica-alterada.mjs <commit>');
    process.exit(2);
  }
  console.log(String(politicaAlterada(noCommit(commit), readFileSync(ARQUIVO, 'utf8'))));
}
