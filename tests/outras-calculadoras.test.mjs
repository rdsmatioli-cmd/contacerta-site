// Outras calculadoras: entradas sem sentido e valores que não acompanham o formulário (lote 3 da linha cc-calc,
// auditoria de 30-31/10/2026: CC-CALC-SEGURO-01, CC-CALC-IR-01, CC-CALC-FERIAS-01, CC-CALC-PARCELADO-01 e
// CC-CALC-INVEST-01). Fórmulas pelo calc.js e formulário publicado pelo document mínimo (_formulario-minimo.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as C from '../assets/js/calc.js';
import { validarDiasFerias } from '../assets/js/valida.js';
import { abrirCalculadora } from './_formulario-minimo.mjs';

const pagina = (p) => readFileSync(new URL(`../${p}/index.html`, import.meta.url), 'utf8');
const inputDe = (html, id) => html.match(new RegExp(`<input[^>]*id="${id}"[^>]*>`))[0];
// "R$ 1.234,56" como o Intl escreve (espaço não separável)
const R = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ---------------------------------------------------------------- CC-CALC-SEGURO-01
test('CC-CALC-SEGURO-01: sem salário maior que zero não há média nem parcela (antes: 4 parcelas do piso)', () => {
  for (const salarios of [[0, 0, 0], [], ['0', '', 'x'], [-100, 0, 0]]) {
    const r = C.seguroDesemprego({ salarios, mesesTrabalhados: 20 });
    assert.equal(r.semSalario, true, JSON.stringify(salarios));
    assert.equal(r.temDireito, false); assert.equal(r.parcela, 0); assert.equal(r.parcelas, 0); assert.equal(r.total, 0);
  }
  // com salário: sem a marca, e quantos salários entraram na média (os zeros ficam fora)
  const um = C.seguroDesemprego({ salarios: [3000, 0, 0], mesesTrabalhados: 20 });
  assert.equal(um.semSalario, undefined); assert.equal(um.salariosUsados, 1); assert.equal(um.media, 3000); assert.equal(um.parcela, 2166.66);
  const dois = C.seguroDesemprego({ salarios: [3000, 0, 2000], mesesTrabalhados: 20 });
  assert.equal(dois.salariosUsados, 2); assert.equal(dois.media, 2500);
  assert.equal(C.seguroDesemprego({ salarios: [2800, 2900, 3000], mesesTrabalhados: 20 }).salariosUsados, 3);
});

test('CC-CALC-SEGURO-01: salário do último mês exige valor maior que zero; os outros aceitam 0', () => {
  const html = pagina('seguro-desemprego');
  assert.match(inputDe(html, 'f-s1'), /data-positivo/);
  for (const id of ['f-s2', 'f-s3']) assert.doesNotMatch(inputDe(html, id), /data-positivo/, id);
});

test('CC-CALC-SEGURO-01: formulário com os três salários em 0: erro no campo do último mês e nenhum resultado', async () => {
  const f = await abrirCalculadora('seguro-desemprego', { s1: '0', s2: '0', s3: '0' });
  const out = f.calcular();
  assert.equal(f.campo('s1').getAttribute('aria-invalid'), 'true');
  assert.equal(f.el('f-s1-msg').textContent, 'Informe um valor maior que zero.');
  assert.equal(f.el('f-s1-msg').hidden, false);
  assert.match(out, /<a href="#f-s1">/);
  assert.doesNotMatch(out, /parcelas de|1\.621,00/);
});

test('CC-CALC-SEGURO-01: média com menos de 3 salários ganha nota e rótulo próprios; com 3, nada muda', async () => {
  const f = await abrirCalculadora('seguro-desemprego', { s2: '0', s3: '0' });
  let out = f.calcular();
  assert.match(out, /Média dos salários informados \(1 de 3\)/);
  assert.match(out, /A média usou só 1 salário: os meses com salário 0 ficam fora da conta\./);
  f.campo('s3').value = '3000';
  out = f.calcular();
  assert.match(out, /Média dos salários informados \(2 de 3\)/);
  assert.match(out, /A média usou 2 salários/);
  const p = await abrirCalculadora('seguro-desemprego');
  out = p.calcular();
  assert.match(out, /Média dos últimos 3 salários/);
  assert.doesNotMatch(out, /A média usou/);
  // sem direito (carência), a nota continua valendo
  const s = await abrirCalculadora('seguro-desemprego', { s3: '0', meses: '5' });
  out = s.calcular();
  assert.match(out, /ainda não há direito/);
  assert.match(out, /A média usou 2 salários/);
});

// ---------------------------------------------------------------- CC-CALC-IR-01
test('CC-CALC-IR-01: o INSS acompanha o rendimento enquanto não for editado', async () => {
  const html = pagina('imposto-de-renda');
  assert.match(html, /<div id="f-inss-ajuda" class="ajuda"><small>Calculado pela tabela do INSS de 2026 a partir do rendimento; edite se o desconto for outro\.<\/small><\/div>/);
  // o padrão da página (R$ 571,51) é o INSS de R$ 5.500 pela tabela de 2026
  assert.match(inputDe(html, 'f-inss'), /value="571,51"/);
  assert.match(inputDe(html, 'f-rendimentos'), /value="5500"/);
  assert.equal(C.inssEmpregado(5500).inss, 571.51);
  const f = await abrirCalculadora('imposto-de-renda');
  assert.equal(f.campo('inss').value, '571,51');
  f.campo('rendimentos').value = '8000';
  const out = f.calcular();
  assert.equal(f.campo('inss').value, '921,51');
  const ir = C.irrfMensal({ rendimentos: 8000, inss: 921.51 }).irrf;
  assert.equal(ir, 1037.85); // antes, com o INSS de R$ 571,51 parado no campo: R$ 1.124,29
  assert.ok(out.includes(R(ir)), 'IR com o INSS da tabela');
  // acima do teto do INSS, e de volta a um valor baixo
  f.campo('rendimentos').value = '20.000,00';
  f.calcular();
  assert.equal(f.campo('inss').value, C.inssEmpregado(20000).inss.toFixed(2).replace('.', ','));
  f.campo('rendimentos').value = '0';
  f.calcular();
  assert.equal(f.campo('inss').value, '0,00');
});

test('CC-CALC-IR-01: valor digitado no INSS nunca é sobrescrito; rendimento com erro não mexe no INSS', async () => {
  const f = await abrirCalculadora('imposto-de-renda');
  const inss = f.campo('inss');
  inss.value = '1000';
  inss.disparar('input');
  f.campo('rendimentos').value = '9000';
  let out = f.calcular();
  assert.equal(inss.value, '1000');
  assert.ok(out.includes(R(C.irrfMensal({ rendimentos: 9000, inss: 1000 }).irrf)));
  // digitado de volta igual ao valor automático: continua sendo do usuário
  inss.value = '571,51';
  inss.disparar('input');
  f.campo('rendimentos').value = '8000';
  f.calcular();
  assert.equal(inss.value, '571,51');
  // rendimento inválido: o INSS automático fica como está
  const g = await abrirCalculadora('imposto-de-renda');
  g.campo('rendimentos').value = 'abc';
  out = g.calcular();
  assert.equal(g.campo('inss').value, '571,51');
  assert.match(out, /<a href="#f-rendimentos">/);
  // valor restaurado pelo navegador (diferente do HTML na abertura) conta como digitado
  const h = await abrirCalculadora('imposto-de-renda', { inss: '700', rendimentos: '8000' });
  h.calcular();
  assert.equal(h.campo('inss').value, '700');
});

// ---------------------------------------------------------------- CC-CALC-FERIAS-01
test('CC-CALC-FERIAS-01: abono pelos dias vendidos informados, sem derivar do período (15 de gozo + 10 vendidos)', () => {
  // achado: 25 dias com "Vender 1/3" davam 17 de férias (R$ 1.700) e 8 de abono (R$ 800)
  const r = C.ferias({ salario: 3000, diasGozo: 15, diasAbono: 10 });
  assert.equal(r.diasGozo, 15); assert.equal(r.valorFerias, 1500); assert.equal(r.terco, 500);
  assert.equal(r.diasAbono, 10); assert.equal(r.abono, 1000); assert.equal(r.tercoAbono, 333.33);
  // 20 + 10 dá o mesmo valor do antigo "30 dias com venda"
  const v = C.ferias({ salario: 3000, diasGozo: 20, diasAbono: 10 });
  assert.equal(v.valorFerias, 2000); assert.equal(v.abono, 1000); assert.equal(v.bruto, 4000); assert.equal(v.liquido, 3784.31);
  // sem venda, inalterado
  assert.equal(C.ferias({ salario: 3000 }).liquido, 3631.4);
  // limites: abono de 0 a 10 dias, gozo de 1 a 30
  assert.equal(C.ferias({ salario: 3000, diasAbono: 15 }).diasAbono, 10);
  assert.equal(C.ferias({ salario: 3000, diasAbono: -2 }).diasAbono, 0);
  assert.equal(C.ferias({ salario: 3000, diasGozo: 40 }).diasGozo, 30);
});

test('CC-CALC-FERIAS-01: gozo e abono são independentes (um não muda o outro) e cada dia vale 1/30 da remuneração', () => {
  for (let g = 5; g <= 30; g++) {
    for (let a = 0; a <= 10; a++) {
      const r = C.ferias({ salario: 3000, mediaVariaveis: 600, diasGozo: g, diasAbono: a });
      assert.equal(r.diasGozo, g); assert.equal(r.diasAbono, a);
      assert.equal(r.valorFerias, C.r2(120 * g)); assert.equal(r.abono, C.r2(120 * a));
      // o abono e o 1/3 dele não mudam o INSS nem o IR
      const sem = C.ferias({ salario: 3000, mediaVariaveis: 600, diasGozo: g });
      assert.equal(r.inss, sem.inss); assert.equal(r.irrf, sem.irrf);
    }
  }
});

test('CC-CALC-FERIAS-01: gozo + dias vendidos acima de 30 é erro no campo dos dias vendidos', () => {
  assert.equal(validarDiasFerias({ diasGozo: 20, diasAbono: 10 }), null);
  assert.equal(validarDiasFerias({ diasGozo: 30, diasAbono: 0 }), null);
  assert.equal(validarDiasFerias({ diasGozo: 15, diasAbono: 10 }), null);
  assert.deepEqual(validarDiasFerias({ diasGozo: 30, diasAbono: 10 }), { campo: 'diasAbono', erro: 'Dias de gozo (30) e dias vendidos (10) somam 40: as férias de um período aquisitivo têm no máximo 30 dias. Para tirar 20 e vender 10, informe 20 de gozo e 10 vendidos.' });
  assert.equal(validarDiasFerias({ diasGozo: 21, diasAbono: 10 }).campo, 'diasAbono');
});

test('CC-CALC-FERIAS-01: formulário com dias de gozo e dias vendidos (0 a 10), sem o checkbox de venda', () => {
  const html = pagina('ferias');
  assert.doesNotMatch(html, /type="checkbox"[^>]*id="f-vender"/);
  const gozo = inputDe(html, 'f-diasGozo');
  for (const a of ['name="diasGozo"', 'data-min="5"', 'data-max="30"', 'value="30"', 'data-obrig', 'data-inteiro']) assert.ok(gozo.includes(a), a);
  const abono = inputDe(html, 'f-diasAbono');
  for (const a of ['name="diasAbono"', 'data-min="0"', 'data-max="10"', 'value="0"', 'data-inteiro', 'data-aviso-max="O abono é de até 1/3 das férias, no máximo 10 dias; o cálculo usou 10."', 'aria-describedby="f-diasAbono-ajuda f-diasAbono-msg"']) assert.ok(abono.includes(a), a);
  assert.ok(html.includes('<div id="f-diasAbono-ajuda" class="ajuda"><small>Até 1/3 das férias a que você tem direito: 30 dias dão 10; 24 dão 8; 18 dão 6; 12 dão 4 (as faltas reduzem o direito). Use 0 se não vender.</small></div>'));
});

test('CC-CALC-FERIAS-01: formulário: soma acima de 30 bloqueia com erro no campo; 20 + 10 calcula a venda', async () => {
  const f = await abrirCalculadora('ferias', { diasAbono: '10' });
  let out = f.calcular();
  assert.equal(f.campo('diasAbono').getAttribute('aria-invalid'), 'true');
  assert.match(f.el('f-diasAbono-msg').textContent, /somam 40/);
  assert.match(out, /<a href="#f-diasAbono">/);
  assert.doesNotMatch(out, /Férias líquidas/);
  f.campo('diasGozo').value = '20';
  out = f.calcular();
  assert.equal(f.campo('diasAbono').getAttribute('aria-invalid'), null);
  assert.equal(f.el('f-diasAbono-msg').hidden, true);
  // salário padrão R$ 4.000: o exemplo "Vendendo 10 dias" da página
  const r = C.ferias({ salario: 4000, diasGozo: 20, diasAbono: 10 });
  assert.equal(r.liquido, 5018.06);
  assert.ok(out.includes(R(r.liquido)));
  assert.match(out, /Férias \(20 dias\)/);
  assert.match(out, /Abono pecuniário \(10 dias vendidos\)/);
  // 15 de gozo + 10 vendidos, o caso do achado
  f.campo('diasGozo').value = '15';
  out = f.calcular();
  assert.match(out, /Férias \(15 dias\)/);
  assert.ok(out.includes(R(C.ferias({ salario: 4000, diasGozo: 15, diasAbono: 10 }).abono)));
  // acima de 10 vendidos: limitado a 10, com aviso
  f.campo('diasAbono').value = '12';
  f.campo('diasGozo').value = '20';
  out = f.calcular();
  assert.match(out, /O abono é de até 1\/3 das férias, no máximo 10 dias; o cálculo usou 10\./);
  assert.match(out, /Abono pecuniário \(10 dias vendidos\)/);
  // padrão da página: 30 de gozo, sem venda
  const p = await abrirCalculadora('ferias');
  out = p.calcular();
  assert.ok(out.includes(R(C.ferias({ salario: 4000 }).liquido)));
  assert.doesNotMatch(out, /Abono pecuniário/);
});

// ---------------------------------------------------------------- CC-CALC-PARCELADO-01
test('CC-CALC-PARCELADO-01: parcelado mais barato que à vista não tem juros (null) nem desconto à vista negativo', () => {
  const r = C.parceladoOuVista({ vista: 1000, parcelas: 10, valorParcela: 90 });
  assert.equal(r.taxaImplicita, null); assert.equal(r.taxaImplicitaAnual, null);
  assert.equal(r.parceladoMaisBarato, true);
  assert.ok(Math.abs(r.economiaParcelado - 0.1) < 1e-12, String(r.economiaParcelado));
  assert.equal(r.descontoVista, 0);
  assert.equal(r.melhor, 'parcelado');
  // total igual ao preço à vista: 0% de juros, sem desconto e sem economia
  const ig = C.parceladoOuVista({ vista: 1000, parcelas: 10, valorParcela: 100 });
  assert.equal(ig.taxaImplicita, 0); assert.equal(ig.parceladoMaisBarato, false); assert.equal(ig.economiaParcelado, 0); assert.equal(ig.descontoVista, 0);
  // parcelado mais caro: inalterado
  const caro = C.parceladoOuVista({ vista: 1000, parcelas: 10, valorParcela: 110 });
  assert.ok(caro.taxaImplicita > 0.0177 && caro.taxaImplicita < 0.0178);
  assert.equal(caro.parceladoMaisBarato, false); assert.ok(Math.abs(caro.descontoVista - (1 - 1000 / 1100)) < 1e-12);
  // parcela única no ato menor que o preço à vista: também é "parcelado mais barato"
  assert.equal(C.parceladoOuVista({ vista: 100, parcelas: 1, valorParcela: 90, comEntrada: true }).parceladoMaisBarato, true);
});

test('CC-CALC-PARCELADO-01: preço à vista ou parcela zero (ou negativo) não calcula', () => {
  for (const o of [{ vista: 0 }, { valorParcela: 0 }, { vista: -1 }, { valorParcela: -90 }, { vista: '' }]) {
    assert.equal(C.parceladoOuVista({ vista: 1000, parcelas: 10, valorParcela: 90, ...o }), null, JSON.stringify(o));
  }
  const html = pagina('parcelado-ou-a-vista');
  assert.match(inputDe(html, 'f-vista'), /data-positivo/);
  assert.match(inputDe(html, 'f-parcela'), /data-positivo/);
});

test('CC-CALC-PARCELADO-01: formulário: 10 × R$ 90 contra R$ 1.000 mostra "não há juros" e "Parcelado custa 10,0% menos"', async () => {
  const f = await abrirCalculadora('parcelado-ou-a-vista', { parcela: '90' });
  let out = f.calcular();
  assert.match(out, /<th scope="row">Juros embutidos<\/th><td>não há juros: o parcelado custa menos que à vista<\/td>/);
  assert.match(out, /<th scope="row">Comparação com o preço à vista<\/th><td>Parcelado custa 10,0% menos<\/td>/);
  assert.match(out, /Parcelar sai mais barato: o total das parcelas é menor que o preço à vista/);
  assert.doesNotMatch(out, /0,00%<\/td>|−11,1%|-11,1%|Desconto à vista|Juros embutidos \(ao ano\)/);
  assert.doesNotMatch(out, /compare só os juros embutidos|Juros embutidos não se aplicam/);
  // padrão da página (10 × R$ 110): inalterado
  const p = await abrirCalculadora('parcelado-ou-a-vista');
  out = p.calcular();
  assert.match(out, /Desconto à vista em relação ao total<\/th><td>9,1%/);
  assert.match(out, /Juros embutidos \(ao mês\)<\/th><td>1,77%/);
  assert.match(out, /compare só os juros embutidos/);
  // preço à vista 0: erro no campo, sem resultado (antes: "Desconto à vista 100%")
  for (const [nome, id] of [['vista', 'f-vista'], ['parcela', 'f-parcela']]) {
    const z = await abrirCalculadora('parcelado-ou-a-vista', { [nome]: '0' });
    out = z.calcular();
    assert.equal(z.campo(nome).getAttribute('aria-invalid'), 'true', nome);
    assert.equal(z.el(`${id}-msg`).textContent, 'Informe um valor maior que zero.');
    assert.doesNotMatch(out, /Melhor opção|100,0%/);
  }
});

// ---------------------------------------------------------------- CC-CALC-INVEST-01
const TAXAS_INVEST = ['f-cdi', 'f-selic', 'f-pctCdb', 'f-pctLci', 'f-tr'];
test('CC-CALC-INVEST-01: CDI, Selic, percentuais e TR não aceitam negativo (teclado decimal no celular)', () => {
  const html = pagina('investimentos');
  for (const id of TAXAS_INVEST) {
    const tag = inputDe(html, id);
    assert.match(tag, /data-min="0"/, id);
    assert.match(tag, /inputmode="decimal"/, id);
  }
});

test('CC-CALC-INVEST-01: formulário: taxa negativa é erro no campo e não há resultado; TR 0 calcula', async () => {
  for (const id of TAXAS_INVEST) {
    const nome = id.slice(2);
    const f = await abrirCalculadora('investimentos', { [nome]: '-5' });
    const out = f.calcular();
    assert.equal(f.campo(nome).getAttribute('aria-invalid'), 'true', id);
    assert.equal(f.el(`${id}-msg`).textContent, 'O valor não pode ser negativo.', id);
    assert.match(out, new RegExp(`<a href="#${id}">`));
    assert.doesNotMatch(out, /Melhor resultado|−R\$|-R\$/, id);
  }
  const t = await abrirCalculadora('investimentos', { tr: '0' });
  const out = t.calcular();
  assert.match(out, /Melhor resultado líquido/);
  assert.doesNotMatch(out, /−R\$|-R\$/);
});
