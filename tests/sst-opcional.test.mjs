// DEC CPO 30/10 + Jurídico 5a441f81 (T2, T6, T8): texto de SST para null e false; aviso antes do preço/pagamento.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ED_SST_INCLUIDO, SST_TEXTO_EM_DEFINICAO, SST_TEXTO_OPCIONAL } from '../assets/js/empregador/config.js';
const ler = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const T2 = 'SST: validação técnica opcional, não incluída no preço. Contratada e paga diretamente pela sua empresa.';
const T8 = 'O Conta Certa fornece questionário, inventário e plano de ação como apoio. O uso da ferramenta, sozinho, não garante a conformidade com a NR-1 nem substitui o PGR.';
test('T2: textos literais e flag false', () => {
  assert.equal(SST_TEXTO_OPCIONAL, T2);
  assert.equal(SST_TEXTO_EM_DEFINICAO, 'SST: em definição, não incluído no preço');
  assert.equal(ED_SST_INCLUIDO, false);
});
test('T2: ui.js mostra em definição para null e opcional para false', async () => {
  globalThis.document ??= { readyState: 'loading', addEventListener() {}, querySelector: () => ({}), querySelectorAll: () => [] };
  const { textoSst } = await import('../assets/js/empregador/ui.js');
  assert.equal(textoSst(null), SST_TEXTO_EM_DEFINICAO);
  assert.equal(textoSst(false), T2);
  assert.notEqual(textoSst(null), textoSst(false));
});
test('T6: linha do tempo do painel', () => {
  assert.ok(ler('empregador-em-dia/painel/index.html').includes('<li>Depois: relatório pronto; validação opcional pelo seu profissional de SST</li>'));
});
test('T8: aviso perto do preço e antes do pagamento', () => {
  for (const p of ['precos', 'pagamento', 'pagamento/2', 'avaliacao-rapida-nr1/resultado']) assert.ok(ler(`empregador-em-dia/${p}/index.html`).includes(T8), p);
});
test('termos vetados ausentes nas páginas do Empregador', () => {
  for (const p of ['', 'precos', 'pagamento', 'pagamento/2', 'pagamento/ok', 'painel', 'avaliacao-rapida-nr1/resultado']) {
    const h = ler(`empregador-em-dia/${p ? p + '/' : ''}index.html`);
    assert.ok(!/SST incluíd|assinado|garante a NR-1|100% em dia|diagnóstico psicológico|avaliação psicológica|laudo/i.test(h), p);
  }
});
