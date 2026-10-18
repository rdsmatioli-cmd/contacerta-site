// Conferência da saída do build do gerador (passos 1 e 11 de tests/_src/PORTAR-PR25.md). Não altera conteúdo.
// Uso, num worktree destacado do contacerta-site (git worktree add --detach <tmp> <commit>):
//   node tests/_src/conferir-porte.mjs <tmp> --marcar    ANTES do build, com `git status` limpo
//   node tests/_src/conferir-porte.mjs <tmp> [--exato]   DEPOIS do build, com a saída gravada por cima de <tmp>
// --marcar põe a data de modificação dos arquivos que o build tem de regravar (ehGerado) em 01/01/2001, sem mudar o
// conteúdo, e grava a lista em <git-dir do worktree>/conferir-porte.json (fora da árvore de trabalho: não aparece no
// git status e sai junto com `git worktree remove`).
// Depois do build, conta como diferença inesperada:
//   - arquivo da lista que continua com a data de 2001: o build não o regravou. Conteúdo igual ao do HEAD não prova
//     nada nesse caso (404 fora do template, post barrado no portão, cópia incompleta da saída);
//   - qualquer arquivo modificado, novo ou apagado no git status, salvo a ordem dos <symbol> do sprite nas páginas de
//     SPRITE_FORA_DE_ORDEM. Com --exato (linha de base do passo 1) nem essa diferença é aceita.
// Saída: 0 sem diferença inesperada; 1 com diferença; 2 uso errado (sem --marcar antes; --marcar com checkout sujo ou
// num branch, como o clone principal; HEAD mudou depois do --marcar).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SPRITE_FORA_DE_ORDEM, ordenaSprite } from './content/_seo.mjs';

const args = process.argv.slice(2);
const opcoes = args.filter((a) => a.startsWith('--'));
const posicionais = args.filter((a) => !a.startsWith('--'));
const marcar = opcoes.includes('--marcar');
const exato = opcoes.includes('--exato');
if (posicionais.length !== 1 || opcoes.some((o) => o !== '--marcar' && o !== '--exato') || (marcar && exato)) {
  console.error('Uso: node tests/_src/conferir-porte.mjs <checkout> --marcar   (antes do build)\n'
    + '     node tests/_src/conferir-porte.mjs <checkout> [--exato]  (depois do build)');
  process.exit(2);
}
const dir = resolve(posicionais[0]);
const git = (...a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 });
const IGNORAR = /(^|\/)\.DS_Store$/; // criado pelo Finder do macOS, não vem do build
const falhaDeUso = (msg) => { console.error(`\n${msg}`); process.exit(2); };

// Arquivos versionados que o build do gerador tem de regravar: as páginas (fora de /licitacoes/, que tem template e
// assets próprios, e da verificação do Google), o sitemap, o RSS, o llms.txt, o CSS e os scripts de src/js.
const ehGerado = (arq) => (arq.endsWith('.html') && !arq.startsWith('licitacoes/') && !/(^|\/)google[^/]*\.html$/.test(arq))
  || ['sitemap.xml', 'llms.txt', 'blog/feed.xml', 'assets/style.css'].includes(arq) || /^assets\/js\/[^/]+\.js$/.test(arq);
const MARCA = new Date('2001-01-01T00:00:00Z');
// Folga de 1 dia para sistemas de arquivos que arredondam a data; o build grava com a data de hoje.
const naoRegravado = (arq) => statSync(join(dir, arq)).mtimeMs < MARCA.getTime() + 86400000;

const status = () => git('status', '--porcelain=v1', '-z', '--untracked-files=all').split('\0').filter(Boolean)
  .map((e) => ({ xy: e.slice(0, 2), arq: e.slice(3) })).filter(({ arq }) => !IGNORAR.test(arq));
const head = git('rev-parse', 'HEAD').trim();
const arqMarca = resolve(dir, git('rev-parse', '--git-path', 'conferir-porte.json').trim());
console.log(`checkout: ${dir}\nHEAD: ${git('log', '-1', '--format=%h %s').trim()}`);

if (marcar) {
  // HEAD num branch indica o clone principal (ou um worktree com branch): o guia só usa worktree destacado.
  let branch = '';
  try { branch = git('symbolic-ref', '-q', '--short', 'HEAD').trim(); } catch { /* HEAD destacado */ }
  if (branch) falhaDeUso(`HEAD no branch ${branch}: use um worktree destacado (git worktree add --detach), nunca o clone principal.`);
  const sujo = status();
  if (sujo.length) falhaDeUso(`git status não está limpo (${sujo.length} entradas, ex.: ${sujo[0].xy} ${sujo[0].arq}). Marque antes do build, num worktree recém-criado.`);
  const arquivos = git('ls-files', '-z').split('\0').filter(Boolean).filter(ehGerado);
  for (const a of arquivos) utimesSync(join(dir, a), MARCA, MARCA);
  writeFileSync(arqMarca, `${JSON.stringify({ head, marca: MARCA.toISOString(), arquivos }, null, 1)}\n`);
  console.log(`\nMarcados ${arquivos.length} arquivos que o build tem de regravar (data ${MARCA.toISOString().slice(0, 10)}).`);
  console.log(`Lista em ${arqMarca}\nAgora rode o build com a saída em ${dir} e depois este script sem --marcar.`);
  process.exit(0);
}

if (!existsSync(arqMarca)) falhaDeUso(`Sem marca em ${arqMarca}: rode este script com --marcar ANTES do build.`);
const marca = JSON.parse(readFileSync(arqMarca, 'utf8'));
if (marca.head !== head) falhaDeUso(`O HEAD mudou desde o --marcar (${marca.head.slice(0, 7)} -> ${head.slice(0, 7)}): recomece num worktree novo.`);

const esperadas = [];
const inesperadas = [];
for (const { xy, arq } of status()) {
  if (!exato && xy === ' M' && SPRITE_FORA_DE_ORDEM.includes(arq)
    && ordenaSprite(readFileSync(join(dir, arq), 'utf8')) === ordenaSprite(git('show', `HEAD:${arq}`))) esperadas.push(arq);
  else inesperadas.push(`${xy} ${arq}`);
}
const naoRegravados = marca.arquivos.filter((a) => existsSync(join(dir, a)) && naoRegravado(a));
for (const a of naoRegravados) inesperadas.push(`${a}: não regravado pelo build`);

console.log(`\nArquivos que o build tinha de regravar: ${marca.arquivos.length}; não regravados: ${naoRegravados.length}`);
if (!exato) {
  console.log(`\nSó a ordem do sprite (esperado): ${esperadas.length}`);
  for (const a of esperadas) console.log(`  ${a}`);
}
console.log(`\nDiferenças inesperadas: ${inesperadas.length}`);
for (const a of inesperadas) console.log(`  ${a}`);
if (inesperadas.length) {
  console.log('\nVeja cada diferença com: git -C <checkout> diff --word-diff=color -- <arquivo>');
  if (naoRegravados.length) console.log('Arquivo não regravado: o build não o produziu (ou a saída não foi copiada inteira). Veja no build.mjs por quê.');
  process.exitCode = 1;
} else console.log(`\nOK: o build reproduz o HEAD${exato ? ', sem exceção' : ' (fora a ordem do sprite listada acima)'}.`);
