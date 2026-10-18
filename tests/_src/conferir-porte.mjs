// Conferência do porte do PR #25 para o gerador (passo 9 de tests/_src/PORTAR-PR25.md).
// Uso: node tests/_src/conferir-porte.mjs <checkout>
//   <checkout>: clone ou worktree do contacerta-site na main, com `git status` limpo ANTES do build e a saída do
//   build gravada por cima. Compara a árvore de trabalho com o HEAD do próprio checkout.
// Saída 0 só quando a única diferença é a ordem dos <symbol> do sprite nas páginas de SPRITE_FORA_DE_ORDEM.
// Qualquer outro arquivo modificado, novo ou apagado é listado e a saída é 1. Não altera nada.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SPRITE_FORA_DE_ORDEM, ordenaSprite } from './content/_seo.mjs';

const dir = resolve(process.argv[2] || '.');
const git = (...a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 });
const IGNORAR = /(^|\/)\.DS_Store$/; // criado pelo Finder do macOS, não vem do build

console.log(`checkout: ${dir}\nHEAD: ${git('log', '-1', '--format=%h %s').trim()}`);
const entradas = git('status', '--porcelain=v1', '-z', '--untracked-files=all').split('\0').filter(Boolean)
  .map((e) => ({ xy: e.slice(0, 2), arq: e.slice(3) })).filter(({ arq }) => !IGNORAR.test(arq));

const esperadas = [];
const inesperadas = [];
for (const { xy, arq } of entradas) {
  if (xy === ' M' && SPRITE_FORA_DE_ORDEM.includes(arq)
    && ordenaSprite(readFileSync(join(dir, arq), 'utf8')) === ordenaSprite(git('show', `HEAD:${arq}`))) esperadas.push(arq);
  else inesperadas.push(`${xy} ${arq}`);
}
console.log(`\nSó a ordem do sprite (esperado): ${esperadas.length}`);
for (const a of esperadas) console.log(`  ${a}`);
console.log(`\nDiferenças inesperadas: ${inesperadas.length}`);
for (const a of inesperadas) console.log(`  ${a}`);
if (inesperadas.length) {
  console.log('\nVeja cada uma com: git -C <checkout> diff --word-diff=color -- <arquivo>');
  process.exitCode = 1;
} else console.log('\nOK: o build reproduz a main (fora a ordem do sprite listada acima).');
