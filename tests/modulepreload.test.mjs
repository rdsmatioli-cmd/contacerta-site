// modulepreload das calculadoras: todo <link rel="modulepreload"> aponta para um módulo do grafo de imports do ui.js
// com o mesmo ?v= do import. Um ?v= diferente (ao trocar o ?v= de um módulo e esquecer o modulepreload) faria o
// navegador baixar o módulo duas vezes.
// Medido em 18/10/2026 (4G lento e CPU 4x emulados, cache desligado, 11 a 15 carregamentos por variante): pré-carregar
// também tabelas.js e valida.js deixa a calculadora pronta ~150 ms antes, mas atrasa o FCP e o LCP em ~90 ms (disputa
// banda com o CSS, a fonte e o lcm-consent.js); por isso só o calc.js tem modulepreload.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, sep, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const ler = (p) => readFileSync(join(raiz, p), 'utf8');
const listar = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  if (d.name === '.git' || d.name === 'node_modules') return [];
  const p = join(dir, d.name);
  if (d.isDirectory()) return listar(p);
  return d.name.endsWith('.html') && !d.name.startsWith('google') ? [relative(raiz, p).split(sep).join('/')] : [];
});
const paginas = listar(raiz).sort();

// Grafo de imports estáticos a partir de uma URL do site, com o ?v= exato de cada import.
function importsDe(url, vistos = new Set()) {
  for (const m of ler(url.slice(1).replace(/\?.*$/, '')).matchAll(/^import\b[^'"]*from\s+['"](\.\/[^'"]+)['"]/gm)) {
    const alvo = posix.join(posix.dirname(url.replace(/\?.*$/, '')), m[1]);
    if (!vistos.has(alvo)) { vistos.add(alvo); importsDe(alvo, vistos); }
  }
  return vistos;
}

const comUi = paginas.filter((p) => /<script type="module" src="\/assets\/js\/ui\.js\?v=[0-9a-f]+"><\/script>/.test(ler(p)));
test('as 29 calculadoras carregam o ui.js como módulo e pré-carregam o calc.js', () => {
  assert.equal(comUi.length, 29);
  for (const p of comUi) assert.match(ler(p), /<link rel="modulepreload" href="\/assets\/js\/calc\.js\?v=[0-9a-f]+">/, p);
});

for (const p of paginas) {
  test(`${p}: modulepreload só de imports do ui.js, com o mesmo ?v=`, () => {
    const html = ler(p);
    const pre = [...html.matchAll(/<link rel="modulepreload" href="([^"]+)">/g)].map((m) => m[1]);
    if (!comUi.includes(p)) { assert.deepEqual(pre, []); return; }
    const ui = html.match(/<script type="module" src="(\/assets\/js\/ui\.js\?v=[0-9a-f]+)"><\/script>/)[1];
    const grafo = importsDe(ui);
    for (const u of pre) {
      assert.ok(grafo.has(u), `${u} não é import do ui.js (ou o ?v= difere do import)`);
      assert.ok(existsSync(join(raiz, u.slice(1).replace(/\?.*$/, ''))), u);
    }
  });
}
