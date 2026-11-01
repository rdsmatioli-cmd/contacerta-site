// Resultado das calculadoras para o leitor de tela (lote 4 da linha cc-calc, auditoria de 30-31/10/2026:
// CC-CALC-A11Y-01). O #resultado é reescrito a cada pausa da digitação e não pode ser região aria-live (o leitor de tela
// relia a tabela inteira a cada tecla); o anúncio é a frase curta do #resultado-anuncio (role="status"), logo depois
// dele. O comportamento (quando anuncia e quantas vezes) está em tests/e2e/datas-e-anuncio.spec.mjs.
// Rode: node --test 'tests/*.test.mjs'
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirCalculadora } from './_formulario-minimo.mjs';

const RAIZ = fileURLToPath(new URL('../', import.meta.url));
const paginas = (dir = RAIZ) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  if (['.git', 'node_modules', 'tests'].includes(d.name)) return [];
  const p = join(dir, d.name);
  return d.isDirectory() ? paginas(p) : d.name.endsWith('.html') ? [p] : [];
});

test('todo #resultado tem aria-live="off" e, logo depois, o #resultado-anuncio (role="status", só para leitor de tela)', () => {
  const comResultado = paginas().map((p) => [p.slice(RAIZ.length), readFileSync(p, 'utf8')]).filter(([p, h]) => h.includes('id="resultado"') && !p.startsWith('irpf/'));
  // /irpf/ tem motor próprio (data-motor="proprio", PR #55) e fica fora deste lote (IRPF separado).
  // piso de sanidade: 27 calculadoras ligadas + idade e IMC desligadas
  assert.ok(comResultado.length >= 29, `${comResultado.length} páginas com #resultado`);
  for (const [p, html] of comResultado) {
    const abre = html.match(/<div id="resultado"[^>]*>/);
    assert.ok(abre, `${p}: #resultado é um div`);
    assert.match(abre[0], /\saria-live="off"/, p);
    assert.match(abre[0], /\stabindex="-1"/, p);
    // o conteúdo publicado do #resultado não tem div aninhada: o primeiro </div> fecha o #resultado
    const fim = html.indexOf('</div>', abre.index) + '</div>'.length;
    assert.ok(html.slice(fim).startsWith('\n<p id="resultado-anuncio" class="vh" role="status"></p>'), `${p}: #resultado-anuncio logo depois do #resultado`);
    assert.equal(html.split('id="resultado-anuncio"').length, 2, `${p}: um #resultado-anuncio`);
    assert.doesNotMatch(html.slice(abre.index, fim), /aria-live="(polite|assertive)"/, p);
  }
});

test('ui.js: anuncia no #resultado-anuncio e mantém o role="alert" da lista de erros', () => {
  const js = readFileSync(new URL('../assets/js/ui.js', import.meta.url), 'utf8');
  assert.match(js, /getElementById\('resultado-anuncio'\)/);
  assert.match(js, /const listaErros = \(erros\) => `<div class="erro" role="alert">/);
  // o ui.js não devolve o aria-live ao #resultado
  assert.doesNotMatch(js, /setAttribute\('aria-live'/);
});

// CC-SITE-12: o role="alert" (anúncio assertivo, que interrompe o leitor de tela) só vai na lista de erros do Calcular.
// Na carga e ao digitar (evento input, atraso de 250 ms), a mesma lista sai sem ele; o campo continua com aria-invalid e
// a mensagem. O comportamento no navegador está em tests/e2e/datas-e-anuncio.spec.mjs.
test('ui.js: lista de erros com role="alert" só no Calcular; na carga e ao digitar, sem alerta e com o campo marcado', async () => {
  const f = await abrirCalculadora('salario-liquido', { bruto: '' });
  assert.match(f.out.innerHTML, /^<div class="erro"><p><strong>Confira o campo antes de calcular:<\/strong><\/p><ul><li><a href="#f-bruto">Salário bruto mensal<\/a>: Preencha este campo\.<\/li><\/ul><\/div>$/);
  assert.equal(f.el('f-bruto').getAttribute('aria-invalid'), 'true');
  assert.equal(f.el('f-bruto-msg').textContent, 'Preencha este campo.');
  assert.match(f.calcular(), /^<div class="erro" role="alert"><p><strong>Confira o campo antes de calcular:/);
  // digitação com outro erro: a lista muda, sem role="alert"
  f.campo('bruto').value = 'abc';
  globalThis.document = { getElementById: (id) => f.el(id) || null, querySelector: (sel) => (sel === 'form[data-calc]' ? f.form : null) };
  try {
    f.form.disparar('input');
    await new Promise((ok) => setTimeout(ok, 300));
  } finally {
    delete globalThis.document;
  }
  assert.match(f.out.innerHTML, /^<div class="erro"><p>[^]*: Digite só números\.<\/li>/);
  assert.doesNotMatch(f.out.innerHTML, /role="alert"/);
  assert.equal(f.el('f-bruto').getAttribute('aria-invalid'), 'true');
  assert.match(f.calcular(), /^<div class="erro" role="alert">[^]*: Digite só números\.<\/li>/);
});
