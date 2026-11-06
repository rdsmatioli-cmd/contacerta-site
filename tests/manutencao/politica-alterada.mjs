// B-CC60-J02 / parecer 7b078e76 (DE ACORDO 31/10): a política de privacidade (privacidade/index.html) só conta como
// alterada quando o conteúdo muda. A ÚNICA normalização permitida é trocar /\?v=[0-9a-f]+/ por '?v=' (cache-busting do
// cache.mjs); depois disso a comparação é do arquivo inteiro, byte a byte. Qualquer outra diferença (texto, inclusive na
// mesma linha do ?v=, atributos, links, <head>) conta como alteração. Base ausente, ref ilegível ou arquivo ausente na
// base: ramo estrito (alterada). Ampliar o padrão exige novo parecer.
// Uso: node tests/manutencao/politica-alterada.mjs <base> [head]  -> imprime true|false
//   <head> omitido = arquivo da árvore de trabalho (checkout do CI).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const ARQUIVO = 'privacidade/index.html';
export const normalizar = (texto) => texto.replace(/\?v=[0-9a-f]+/g, '?v=');

// antes/depois: string com o conteúdo, ou null quando ausente/ilegível.
export function alterada(antes, depois) {
  if (typeof antes !== 'string' || typeof depois !== 'string') return true;
  return normalizar(antes) !== normalizar(depois);
}

function lerNoGit(ref, cwd) {
  if (!ref || !/^[\w./~^-]+$/.test(ref)) return null;
  try {
    return execFileSync('git', ['show', `${ref}:${ARQUIVO}`], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch { return null; }
}

export function politicaAlterada(base, head, cwd = process.cwd()) {
  const antes = lerNoGit(base, cwd);
  let depois;
  if (head) depois = lerNoGit(head, cwd);
  else { try { depois = readFileSync(`${cwd}/${ARQUIVO}`, 'utf8'); } catch { depois = null; } }
  return alterada(antes, depois);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stdout.write(String(politicaAlterada(process.argv[2], process.argv[3])) + '\n');
}
