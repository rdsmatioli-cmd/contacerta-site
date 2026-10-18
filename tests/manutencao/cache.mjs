// Cache-busting do site. O gerador antigo fazia isto no build; ele não existe mais e o HTML do repositório é a fonte
// oficial (README, "Como editar o site").
// Regra: toda referência local a .js, .css ou .mjs que tem ?v= leva os 10 primeiros hex do sha256 do arquivo
// referenciado. Vale no HTML (script, link, modulepreload) e dentro dos próprios .js/.mjs/.css (ui.js importa
// './calc.js?v=...'). Trocar o ?v= de um import muda o sha256 do .js que o contém, então a atualização repete até
// nada mudar (ponto fixo). Referência sem ?v= não é tocada (as páginas de /licitacoes/ usam assets próprios sem ?v=).
// assets/lcm-consent.* vêm prontos do componente de consentimento (nr1-m01.test.mjs confere o sha256 do .js): o ?v=
// das referências a eles segue a regra, mas os dois arquivos são só lidos, nunca regravados.
// Varre a raiz inteira, menos .git, node_modules e tests/ (os shims de tests/_src/js importam sem ?v=).
// Uso, na raiz do repositório:
//   node tests/manutencao/cache.mjs             atualiza os ?v= e lista os arquivos regravados
//   node tests/manutencao/cache.mjs --conferir  só confere: sai com 1 e lista as divergências
// tests/cache-busting.test.mjs usa as funções exportadas daqui.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
export const SO_LEITURA = Object.freeze(['assets/lcm-consent.js', 'assets/lcm-consent.css']);
const PULAR = new Set(['.git', 'node_modules']);
const PULAR_NA_RAIZ = new Set(['tests']);
const COM_REFERENCIAS = /\.(?:html|js|mjs|css)$/;
// Referência local: começa por "/" (não "//"), "./", "../" ou por um nome, e termina em .js, .css ou .mjs seguido de
// ?v=. O caractere antes dela é aspa, parêntese, espaço, "=" ou vírgula (atributo, import, url(), srcset); assim
// URL absoluta (https://...) e protocolo-relativa (//...) ficam de fora.
export const REF = /(?<=["'(\s=,])((?:\/(?!\/)|\.\.?\/|(?=[\w-]))[\w\-./]*\.(?:js|css|mjs))\?v=([^"'&#)\s,]*)/g;
export const hash10 = (conteudo) => createHash('sha256').update(conteudo).digest('hex').slice(0, 10);

// Arquivos que podem conter referências, relativos à raiz, com "/".
export function listarArquivos(raiz = RAIZ) {
  const saida = [];
  const andar = (dir) => {
    for (const d of readdirSync(join(raiz, dir), { withFileTypes: true })) {
      if (PULAR.has(d.name) || (dir === '' && PULAR_NA_RAIZ.has(d.name))) continue;
      const p = dir ? `${dir}/${d.name}` : d.name;
      if (d.isDirectory()) andar(p);
      else if (d.isFile() && COM_REFERENCIAS.test(d.name)) saida.push(p);
    }
  };
  andar('');
  return saida.sort();
}

// Arquivo (relativo à raiz) para onde a referência aponta: "/x" a partir da raiz, o resto a partir da pasta de quem
// referencia (vale para a URL da página, para o import de módulo e para o url() do CSS). null se sair da raiz.
export function alvoDe(arquivo, ref) {
  const p = posix.normalize(ref.startsWith('/') ? ref.slice(1) : posix.join(posix.dirname(arquivo), ref));
  return p === '..' || p.startsWith('../') ? null : p;
}

// Conteúdo (Buffer) de cada arquivo, lido uma vez; o ponto fixo trabalha sobre esta cópia e só grava no fim.
function memoria(raiz) {
  const conteudo = new Map();
  return {
    ler(p) {
      if (!conteudo.has(p)) {
        let b = null;
        try { if (statSync(join(raiz, p)).isFile()) b = readFileSync(join(raiz, p)); } catch { /* não existe */ }
        conteudo.set(p, b);
      }
      return conteudo.get(p);
    },
    trocar(p, b) { conteudo.set(p, b); },
  };
}

const linhaDe = (texto, i) => texto.slice(0, i).split('\n').length;

// Toda referência com ?v=: { arquivo, linha, ref, v (o atual), alvo, esperado (sha256 do alvo; null se não existe) }.
export function referencias(raiz = RAIZ) {
  const m = memoria(raiz);
  const refs = [];
  for (const arquivo of listarArquivos(raiz)) {
    const texto = m.ler(arquivo).toString('utf8');
    for (const r of texto.matchAll(REF)) {
      const alvo = alvoDe(arquivo, r[1]);
      const b = alvo && m.ler(alvo);
      refs.push({ arquivo, linha: linhaDe(texto, r.index), ref: r[1], v: r[2], alvo, esperado: b ? hash10(b) : null });
    }
  }
  return refs;
}
export const divergencias = (raiz = RAIZ) => referencias(raiz).filter((r) => r.v !== r.esperado);

// Atualiza os ?v= até o ponto fixo e só então grava. Lança erro, sem gravar nada, se alguma referência estiver
// quebrada, se um arquivo só de leitura precisar mudar ou se não houver ponto fixo (ciclo de imports com ?v=).
export function atualizar(raiz = RAIZ, { maxPassadas = 20 } = {}) {
  const m = memoria(raiz);
  const arquivos = listarArquivos(raiz);
  const alterados = new Set();
  for (let passada = 1; passada <= maxPassadas; passada++) {
    let mudou = false;
    for (const arquivo of arquivos) {
      const atual = m.ler(arquivo);
      const texto = atual.toString('utf8');
      const novo = texto.replace(REF, (_, ref, v) => {
        const alvo = alvoDe(arquivo, ref);
        const b = alvo && m.ler(alvo);
        if (!b) throw new Error(`${arquivo}: referência quebrada ${ref}?v=${v} (arquivo não encontrado)`);
        return `${ref}?v=${hash10(b)}`;
      });
      if (novo === texto) continue;
      if (SO_LEITURA.includes(arquivo)) throw new Error(`${arquivo} precisaria de ?v= novo, mas é só leitura (componente lcm-consent)`);
      if (!Buffer.from(texto, 'utf8').equals(atual)) throw new Error(`${arquivo}: não é UTF-8 válido; não regravo`);
      m.trocar(arquivo, Buffer.from(novo, 'utf8'));
      alterados.add(arquivo);
      mudou = true;
    }
    if (!mudou) {
      for (const a of alterados) writeFileSync(join(raiz, a), m.ler(a));
      return { passadas: passada - 1, alterados: [...alterados].sort() };
    }
  }
  throw new Error(`sem ponto fixo em ${maxPassadas} passadas: há ciclo de imports com ?v= (um .js importa outro que importa o primeiro); nada foi gravado`);
}

const principal = (() => {
  try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
})();
if (principal) {
  const args = process.argv.slice(2);
  if (args.some((a) => a !== '--conferir')) {
    console.error('uso: node tests/manutencao/cache.mjs [--conferir]');
    process.exit(2);
  }
  if (args.includes('--conferir')) {
    const refs = referencias();
    const div = refs.filter((r) => r.v !== r.esperado);
    if (div.length) {
      console.error(`${div.length} referência(s) com ?v= diferente do sha256 do arquivo:`);
      for (const r of div) console.error(`  ${r.arquivo}:${r.linha}: ${r.ref}?v=${r.v} -> ${r.esperado ? `esperado ?v=${r.esperado}` : 'arquivo não encontrado'}`);
      console.error('Corrija com: node tests/manutencao/cache.mjs (ajusta também os ?v= em cascata).');
      process.exit(1);
    }
    console.log(`${refs.length} referências com ?v= em ${new Set(refs.map((r) => r.arquivo)).size} arquivos: todas batem com o sha256.`);
  } else {
    try {
      const { passadas, alterados } = atualizar();
      if (!alterados.length) console.log('Nada a mudar: todos os ?v= já batem com o sha256.');
      else {
        console.log(`${alterados.length} arquivo(s) regravado(s), estável após ${passadas} passada(s):`);
        for (const a of alterados) console.log(`  ${a}`);
      }
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
  }
}
