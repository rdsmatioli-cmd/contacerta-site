// Contenção GET (PR #17, 16/10): sem JS, nenhum formulário de calculadora nem a lista de espera envia campos pela URL.
// A busca da home (campo q, sem dado pessoal) fica fora do escopo, de propósito.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
const raiz = new URL('../', import.meta.url);
const ler = (p) => readFileSync(new URL(p, raiz), 'utf8');
const paginas = readdirSync(raiz, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(new URL(`${d.name}/index.html`, raiz)))
  .map((d) => d.name).filter((p) => /<form\b/.test(ler(`${p}/index.html`)));
const formsDe = (html) => html.match(/<form\b[^]*?<\/form>/gi) || [];
const botoes = (f) => f.match(/<button\b(?![^>]*type="button")[^>]*>/gi) || [];

test('31 páginas com formulário fora da home (32 com a busca)', () => {
  assert.equal(paginas.length, 32); // +tabelas-oficiais-2026 (PR #7), +irpf (IRPF R2)
  assert.equal(formsDe(ler('index.html')).length, 1); // busca q: sem alteração
});
for (const p of paginas) {
  test(`${p}: sem JS nenhum envio possível (todo botão de envio desabilitado no HTML)`, () => {
    for (const f of formsDe(ler(`${p}/index.html`))) {
      assert.doesNotMatch(f, /<input[^>]*type="(submit|image)"/i);
      const b = botoes(f);
      assert.ok(b.length >= 1);
      for (const x of b) assert.match(x, /^<button type="submit" disabled[ >]/);
    }
  });
}
test('nr1: action="#" e botão data-requer-js desabilitado', () => {
  const f = formsDe(ler('nr1-riscos-psicossociais/index.html'))[0];
  assert.match(f, /^<form [^>]*action="#"/);
  assert.match(f, /<button type="submit" disabled data-requer-js>/);
});
for (const p of ['imc', 'idade']) {
  test(`${p}: cálculo desligado (sem data-calc, sem data-requer-js) e aviso estático`, () => {
    const html = ler(`${p}/index.html`);
    const f = formsDe(html)[0];
    assert.doesNotMatch(html, /data-calc=|data-requer-js|data-name=/);
    assert.equal((f.match(/<(input|select|textarea)\b[^>]*\sname=/gi) || []).length, 0);
    assert.match(html, /<div id="resultado"[^>]*><p class="erro">Calculadora temporariamente indisponível\.<\/p><\/div>/);
  });
}
test('lista-de-espera: sem name, botão indisponível e sem o script mailto', () => {
  const html = ler('lista-de-espera/index.html');
  const f = formsDe(html)[0];
  assert.equal((f.match(/<(input|select|textarea)\b[^>]*\sname=/gi) || []).length, 0);
  assert.match(f, /<button type="submit" disabled>Temporariamente indisponível<\/button>/);
  assert.doesNotMatch(html, /location\.href\s*=\s*'mailto:/);
});
test('ui.js registra o preventDefault antes de habilitar [data-requer-js]', () => {
  const ui = ler('assets/js/ui.js');
  const a = ui.indexOf("form.addEventListener('submit', (e) => { e.preventDefault()"), b = ui.indexOf("querySelectorAll('[data-requer-js]')) el.disabled = false");
  assert.ok(a > 0 && b > a);
});
