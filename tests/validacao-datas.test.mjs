// Datas com o mesmo padrão de erro dos campos numéricos (lote 4 da linha cc-calc, auditoria de 30-31/10/2026:
// CC-CALC-VALIDA-01): regras puras do valida.js, os atributos dos campos de data publicados e o formulário (ui.js) com o
// document mínimo. O comportamento no navegador está em tests/e2e/datas-e-anuncio.spec.mjs.
// Rode: node --test 'tests/*.test.mjs'
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validarData, validarOrdemDatas, DATA_MIN, DATA_MAX } from '../assets/js/valida.js';
import { abrirCalculadora, atributos } from './_formulario-minimo.mjs';

test('validarData: vazia, incompleta, inexistente e fora de 1900-2100', () => {
  assert.equal(DATA_MIN, '1900-01-01');
  assert.equal(DATA_MAX, '2100-12-31');
  assert.deepEqual(validarData({ raw: '2026-09-15', obrig: true }), { valor: '2026-09-15' });
  // vazia: obrigatória é erro, opcional vale vazia
  assert.deepEqual(validarData({ raw: '', obrig: true }), { valor: '', erro: 'Preencha a data.' });
  assert.deepEqual(validarData({ raw: '' }), { valor: '' });
  assert.deepEqual(validarData({ raw: '   ' }), { valor: '' });
  // data incompleta ou inexistente digitada (o navegador deixa o value vazio e marca validity.badInput)
  const incompleta = 'Data incompleta ou inexistente: confira dia, mês e ano.';
  assert.deepEqual(validarData({ raw: '', badInput: true, obrig: true }), { valor: '', erro: incompleta });
  assert.deepEqual(validarData({ raw: '', badInput: true }), { valor: '', erro: incompleta });
  for (const raw of ['2026-02-30', '2025-02-29', '2026-13-01', '2026-00-10', '2026-04-31', '15/09/2026', '2026-9-15', 'abc']) {
    assert.deepEqual(validarData({ raw, obrig: true }), { valor: '', erro: incompleta }, raw);
  }
  assert.deepEqual(validarData({ raw: '2024-02-29' }), { valor: '2024-02-29' });
  assert.deepEqual(validarData({ raw: '2000-02-29' }), { valor: '2000-02-29' });
  // fora do intervalo (inclusive o ano de 6 dígitos que o Chromium aceita)
  const fora = 'Informe uma data entre 01/01/1900 e 31/12/2100.';
  for (const raw of ['1899-12-31', '2101-01-01', '0002-09-15', '202612-01-01', '275760-09-13']) {
    assert.deepEqual(validarData({ raw, obrig: true }), { valor: '', erro: fora }, raw);
  }
  assert.deepEqual(validarData({ raw: '1900-01-01' }), { valor: '1900-01-01' });
  assert.deepEqual(validarData({ raw: '2100-12-31' }), { valor: '2100-12-31' });
  // min e max do campo, quando informados
  assert.deepEqual(validarData({ raw: '2019-12-31', min: '2020-01-01', max: '2030-12-31' }), { valor: '', erro: 'Informe uma data entre 01/01/2020 e 31/12/2030.' });
  // min ou max inválido no campo: vale o padrão
  assert.deepEqual(validarData({ raw: '1899-12-31', min: 'x', max: '' }), { valor: '', erro: fora });
});

test('validarOrdemDatas: desligamento antes da admissão é erro; mesmo dia ou depois passa; data inválida fica para validarData', () => {
  const rot = 'Data de admissão';
  assert.deepEqual(validarOrdemDatas({ inicio: '2023-02-01', fim: '2023-01-31', rotuloInicio: rot }), { erro: 'A data não pode ser anterior à data de admissão (01/02/2023).' });
  assert.equal(validarOrdemDatas({ inicio: '2023-02-01', fim: '2023-02-01', rotuloInicio: rot }), null);
  assert.equal(validarOrdemDatas({ inicio: '2023-02-01', fim: '2026-09-15', rotuloInicio: rot }), null);
  assert.equal(validarOrdemDatas({ inicio: '', fim: '2026-09-15', rotuloInicio: rot }), null);
  assert.equal(validarOrdemDatas({ inicio: '2023-02-01', fim: '', rotuloInicio: rot }), null);
});

// Campos de data publicados: data-data, min e max, mensagem do campo ligada por aria-describedby (como os numéricos).
const PAGINAS = { rescisao: ['admissao', 'desligamento', 'dataPagamento'], 'aviso-previo': ['admissao', 'desligamento'], 'calendario-reforma-tributaria': ['data'] };
test('páginas: todo input date de calculadora ligada tem data-data, min, max e a mensagem do campo', () => {
  for (const [pag, nomes] of Object.entries(PAGINAS)) {
    const html = readFileSync(new URL(`../${pag}/index.html`, import.meta.url), 'utf8');
    const datas = [...html.matchAll(/<input\b[^>]*type="date"[^>]*>/g)].map(([t]) => atributos(t));
    assert.deepEqual(datas.map((a) => a.name), nomes, pag);
    for (const a of datas) {
      assert.ok('data-data' in a, `${pag} ${a.id}: data-data`);
      assert.equal(a.min, DATA_MIN, `${pag} ${a.id}: min`);
      assert.equal(a.max, DATA_MAX, `${pag} ${a.id}: max`);
      assert.ok((a['aria-describedby'] || '').split(' ').includes(`${a.id}-msg`), `${pag} ${a.id}: aria-describedby`);
      assert.ok(html.includes(`<p class="campo-msg" id="${a.id}-msg" hidden></p>`), `${pag} ${a.id}: mensagem do campo`);
    }
    // desligamento (rescisão e aviso prévio) confere a ordem contra a admissão
    if (nomes.includes('desligamento')) assert.equal(datas.find((a) => a.name === 'desligamento')['data-nao-antes-de'], 'admissao', pag);
  }
  // nenhuma outra calculadora ligada tem input date sem data-data
  const raiz = new URL('../', import.meta.url);
  const ligadas = readFileSync(new URL('../sitemap.xml', import.meta.url), 'utf8').match(/<loc>[^<]+<\/loc>/g).map((l) => l.replace(/<\/?loc>/g, '').replace('https://contacertabr.com.br/', ''));
  for (const p of ligadas) {
    let html;
    try { html = readFileSync(new URL(`${p}index.html`, raiz), 'utf8'); } catch { continue; }
    if (!/<form class="calc-form" data-calc=/.test(html)) continue;
    for (const [t] of html.matchAll(/<input\b[^>]*type="date"[^>]*>/g)) assert.ok('data-data' in atributos(t), `${p}: ${t}`);
  }
});

test('formulário da /rescisao/: admissão vazia e desligamento antes da admissão dão erro no campo, com link, sem resultado', async () => {
  const f = await abrirCalculadora('rescisao', { admissao: '' });
  let html = f.out.innerHTML;
  assert.equal(f.el('f-admissao').getAttribute('aria-invalid'), 'true');
  assert.equal(f.el('f-admissao-msg').textContent, 'Preencha a data.');
  assert.equal(f.el('f-admissao-msg').hidden, false);
  assert.match(html, /role="alert"/);
  assert.match(html, /<a href="#f-admissao">[^<]*<\/a>: Preencha a data\./);
  assert.doesNotMatch(html, /destaque|desligamento deve ser depois/);
  // desligamento antes da admissão: o erro fica no desligamento, a admissão sai do erro
  f.campo('admissao').value = '2026-10-01';
  html = f.calcular();
  assert.equal(f.el('f-admissao').getAttribute('aria-invalid'), null);
  assert.equal(f.el('f-admissao-msg').hidden, true);
  assert.equal(f.el('f-desligamento').getAttribute('aria-invalid'), 'true');
  assert.equal(f.el('f-desligamento-msg').textContent, 'A data não pode ser anterior à data de admissão (01/10/2026).');
  assert.match(html, /<a href="#f-desligamento">[^<]*<\/a>: A data não pode ser anterior à data de admissão \(01\/10\/2026\)\./);
  assert.doesNotMatch(html, /destaque/);
  // ano de 6 dígitos (Chromium aceita): fora do intervalo
  f.campo('admissao').value = '2023-02-01';
  f.campo('desligamento').value = '202612-01-01';
  html = f.calcular();
  assert.equal(f.el('f-desligamento-msg').textContent, 'Informe uma data entre 01/01/1900 e 31/12/2100.');
  assert.match(html, /<a href="#f-desligamento">/);
  // data de pagamento digitada pela metade: erro, não "não informada"
  f.campo('desligamento').value = '2026-09-15';
  f.campo('dataPagamento').validity = { badInput: true };
  html = f.calcular();
  assert.equal(f.el('f-dataPagamento').getAttribute('aria-invalid'), 'true');
  assert.equal(f.el('f-dataPagamento-msg').textContent, 'Data incompleta ou inexistente: confira dia, mês e ano.');
  assert.doesNotMatch(html, /destaque/);
  // tudo certo: resultado, nenhum campo de data marcado
  f.campo('dataPagamento').validity = { badInput: false };
  html = f.calcular();
  assert.match(html, /class="destaque"/);
  for (const id of ['f-admissao', 'f-desligamento', 'f-dataPagamento']) {
    assert.equal(f.el(id).getAttribute('aria-invalid'), null, id);
    assert.equal(f.el(`${id}-msg`).hidden, true, id);
  }
});

test('formulário da /rescisao/: data de pagamento antes do desligamento e acima de 10 dias aparecem no campo', async () => {
  const f = await abrirCalculadora('rescisao', { dataPagamento: '2026-09-10' });
  assert.equal(f.el('f-dataPagamento').getAttribute('aria-invalid'), 'true');
  assert.equal(f.el('f-dataPagamento-msg').textContent, 'A data de pagamento não pode ser anterior à data do desligamento.');
  assert.match(f.out.innerHTML, /<a href="#f-dataPagamento">/);
  f.campo('dataPagamento').value = '2026-09-30';
  const html = f.calcular();
  assert.equal(f.el('f-dataPagamento').getAttribute('aria-invalid'), null);
  assert.match(f.el('f-dataPagamento-msg').textContent, /^Pagamento 15 dias após o desligamento/);
  assert.equal(f.el('f-dataPagamento-msg').className, 'campo-msg');
  assert.match(html, /class="destaque"/);
});

test('formulário da /rescisao/: desligamento anterior às tabelas aparece no campo', async () => {
  const f = await abrirCalculadora('rescisao', { admissao: '2020-01-01', desligamento: '2023-06-10' });
  assert.equal(f.el('f-desligamento').getAttribute('aria-invalid'), 'true');
  assert.match(f.el('f-desligamento-msg').textContent, /^A calculadora tem as tabelas de INSS e de IR a partir de janeiro de 2024\./);
  assert.match(f.out.innerHTML, /<a href="#f-desligamento">/);
});

test('formulário do /aviso-previo/ e do /calendario-reforma-tributaria/: mesmas regras', async () => {
  const a = await abrirCalculadora('aviso-previo', { desligamento: '2019-05-05' });
  assert.equal(a.el('f-desligamento').getAttribute('aria-invalid'), 'true');
  assert.equal(a.el('f-desligamento-msg').textContent, 'A data não pode ser anterior à data de admissão (06/05/2019).');
  assert.doesNotMatch(a.out.innerHTML, /destaque|desligamento deve ser depois/);
  a.campo('desligamento').value = '';
  a.calcular();
  assert.equal(a.el('f-desligamento-msg').textContent, 'Preencha a data.');
  a.campo('desligamento').value = '2026-09-30';
  assert.match(a.calcular(), /class="destaque"/);
  assert.equal(a.el('f-desligamento').getAttribute('aria-invalid'), null);

  const c = await abrirCalculadora('calendario-reforma-tributaria', { data: '2026-10-31' });
  assert.match(c.out.innerHTML, /class="destaque"/);
  c.campo('data').value = '';
  let html = c.calcular();
  assert.equal(c.el('f-data').getAttribute('aria-invalid'), 'true');
  assert.equal(c.el('f-data-msg').textContent, 'Preencha a data.');
  assert.match(html, /<a href="#f-data">[^<]*<\/a>: Preencha a data\./);
  c.campo('data').value = '1899-12-31';
  html = c.calcular();
  assert.equal(c.el('f-data-msg').textContent, 'Informe uma data entre 01/01/1900 e 31/12/2100.');
});
