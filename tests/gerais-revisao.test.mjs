// Revisão das calculadoras gerais (CC-PRECO-01, CC-NUM-01, CC-POUP-01, CC-SELIC-01, CC-IDADE-01, CC-IMC-01, CC-PARC-01, CC-PCT-01).
// Rode: node --test 'tests/*.test.mjs'
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as C from '../assets/js/calc.js';
import { lerNumeroBR, validarNumero, porExtenso } from '../assets/js/valida.js';

const ler = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const ui = ler('assets/js/ui.js');
const inputs = (html) => html.match(/<input\b[^>]*>/g) || [];
const inputDe = (html, id) => inputs(html).find((t) => t.includes(`id="${id}"`));
const BRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} esperado ${b}, obtido ${a}`);

// ---------- CC-PRECO-01
test('CC-PRECO-01: CBS e IBS sugeridos por ano seguem a regra da transição', () => {
  const s = (ano) => C.aliquotasPadraoPreco(ano);
  assert.deepEqual(s(2027), { cbsPct: 9.11, ibsPct: 0.1 });
  assert.deepEqual(s(2028), { cbsPct: 9.11, ibsPct: 0.1 });
  assert.deepEqual(s(2029), { cbsPct: 9.21, ibsPct: 1.87 });
  assert.deepEqual(s('2030'), { cbsPct: 9.21, ibsPct: 3.74 });
  assert.deepEqual(s(2031), { cbsPct: 9.21, ibsPct: 5.61 });
  assert.deepEqual(s(2032), { cbsPct: 9.21, ibsPct: 7.48 });
  assert.deepEqual(s(2033), { cbsPct: 9.21, ibsPct: 18.7 });
  assert.equal(s(2040), null);
  // Com as alíquotas do ano, o preço bate com a calculadora da transição em todos os anos (mesmas premissas).
  const t = C.transicaoCbsIbs({ precoAtual: 1000, cbsRefPct: 9.21, ibsRefPct: 18.7 });
  for (const ano of [2027, 2028, 2029, 2030, 2031, 2032, 2033]) {
    const a = s(ano);
    const p = C.precoReforma({ precoAtual: 1000, tributosAtuaisPct: 8.65, issPct: 5, ano, cbsPct: a.cbsPct, ibsPct: a.ibsPct });
    assert.equal(p.total, t.anos.find((x) => x.ano === ano).totalCliente, String(ano));
  }
  // O caso do achado: 2033 com os campos de 2027 dava R$ 997,63; com os do ano, R$ 1.168,46.
  assert.equal(C.precoReforma({ precoAtual: 1000, tributosAtuaisPct: 8.65, issPct: 5, ano: 2033, cbsPct: 9.11, ibsPct: 0.1 }).total, 997.63);
  assert.equal(C.precoReforma({ precoAtual: 1000, tributosAtuaisPct: 8.65, issPct: 5, ano: 2033, cbsPct: s(2033).cbsPct, ibsPct: s(2033).ibsPct }).total, 1168.46);
});

test('CC-PRECO-01: ui.js preenche por ano só sem edição, avisa IBS de 0,1% a partir de 2029 e mostra as alíquotas usadas', () => {
  assert.match(ui, /C\.aliquotasPadraoPreco\(form\.elements\.ano\.value\)/);
  assert.match(ui, /el\.dataset\.padrao = el\.defaultValue/);
  assert.match(ui, /if \(el\.value\.trim\(\) !== el\.dataset\.padrao\) return; \/\/ editado pelo usuário: mantém/);
  assert.match(ui, /Number\(d\.ano\) >= 2029 && d\.ibs <= 0\.1/);
  assert.match(ui, /CBS \$\{n6\.format\(d\.cbs\)\}% e IBS \$\{n6\.format\(d\.ibs\)\}% nesta simulação/);
  const html = ler('preco-reforma-tributaria/index.html');
  // os valores padrão do HTML são os de 2027 (ano selecionado), e a página explica o preenchimento
  assert.match(inputDe(html, 'f-cbs'), /value="9,11"/);
  assert.match(inputDe(html, 'f-ibs'), /value="0,1"/);
  assert.match(html, /<option value="2027" selected>/);
  assert.match(html, /ao trocar o ano, a calculadora preenche a estimativa do ano/);
});

// ---------- CC-NUM-01
test('CC-NUM-01: campo decimal aceita "1,125" e avisa quando "1.125" é lido como milhar', () => {
  assert.deepEqual(lerNumeroBR('1,125', { decimal: true }), { n: 1.125 });
  assert.deepEqual(lerNumeroBR('1,609', { decimal: true }), { n: 1.609 });
  assert.deepEqual(lerNumeroBR('2,375', { decimal: true }), { n: 2.375 });
  assert.deepEqual(lerNumeroBR('1.000,125', { decimal: true }), { n: 1000.125 });
  const r = lerNumeroBR('1.125', { decimal: true });
  assert.equal(r.n, 1125);
  assert.equal(r.alerta, 'Lido como 1125 (mil cento e vinte e cinco): o ponto separa os milhares. Se era decimal, digite com vírgula: 1,125.');
  assert.equal(lerNumeroBR('-1.609', { decimal: true }).alerta, 'Lido como -1609 (menos mil seiscentos e nove): o ponto separa os milhares. Se era decimal, digite com vírgula: -1,609.');
  // sem alerta quando não há ambiguidade
  for (const s of ['1.5', '0.125', '1.125.000', '1.234,5', '1125', '12,5']) assert.equal(lerNumeroBR(s, { decimal: true }).alerta, undefined, s);
  // via validação completa (o que o ui.js usa)
  assert.deepEqual(validarNumero({ raw: '1,125', decimal: true, obrig: true }), { valor: 1.125 });
  const v = validarNumero({ raw: '1.125', decimal: true, obrig: true });
  assert.equal(v.valor, 1125); assert.match(v.alerta, /mil cento e vinte e cinco/); assert.equal(v.erro, undefined);
});

test('CC-NUM-01: campos monetários (sem data-decimal) mantêm a leitura e o erro; a mensagem diz como digitar 3 casas', () => {
  assert.deepEqual(lerNumeroBR('1.125'), { n: 1125 });
  assert.deepEqual(lerNumeroBR('1,125'), { erro: 'Formato ambíguo: use 1.000,00 ou 1000' });
  assert.deepEqual(validarNumero({ raw: '3.500', min: 0, obrig: true }), { valor: 3500 });
  const e = validarNumero({ raw: '1,125', min: 0 });
  assert.equal(e.valor, null);
  assert.equal(e.erro, 'Formato ambíguo: use 1.000,00 ou 1000. Se for decimal com 3 casas, acrescente um zero no fim: 1,1250.');
  assert.match(validarNumero({ raw: 'R$ 2,375' }).erro, /acrescente um zero no fim: 2,3750\.$/);
  // a dica funciona: "1,1250" é aceito como 1,125
  assert.deepEqual(validarNumero({ raw: '1,1250', min: 0 }), { valor: 1.125 });
});

test('CC-NUM-01: número por extenso do alerta', () => {
  const casos = { 0: 'zero', 21: 'vinte e um', 100: 'cem', 101: 'cento e um', 1000: 'mil', 1001: 'mil e um', 1100: 'mil e cem', 1125: 'mil cento e vinte e cinco', 1500: 'mil e quinhentos', 1609: 'mil seiscentos e nove', 2375: 'dois mil trezentos e setenta e cinco', 12500: 'doze mil e quinhentos', 101000: 'cento e um mil', 999999: 'novecentos e noventa e nove mil novecentos e noventa e nove' };
  for (const [n, t] of Object.entries(casos)) assert.equal(porExtenso(Number(n)), t, n);
  assert.equal(porExtenso(-1125), 'menos mil cento e vinte e cinco');
});

test('CC-NUM-01: data-decimal só nos campos não monetários de regra de três, conversor e porcentagem', () => {
  const regra = ler('regra-de-tres/index.html');
  for (const id of ['f-a', 'f-b', 'f-c']) assert.match(inputDe(regra, id), /\sdata-decimal\s/, id);
  assert.match(inputDe(ler('conversor-de-medidas/index.html'), 'f-valor'), /\sdata-decimal\s/);
  const pct = ler('porcentagem/index.html');
  for (const id of ['f-p1', 'f-v1', 'f-x2', 'f-v2', 'f-a3', 'f-b3', 'f-v4', 'f-p4']) assert.match(inputDe(pct, id), /\sdata-decimal\s/, id);
  // nenhuma outra página ganhou o atributo (campos monetários continuam com a regra estrita)
  for (const p of ['investimentos', 'parcelado-ou-a-vista', 'preco-reforma-tributaria', 'salario-liquido', 'rescisao', 'markup']) {
    assert.doesNotMatch(ler(`${p}/index.html`), /data-decimal/, p);
  }
  assert.match(ui, /decimal: 'decimal' in ds/);
  assert.match(ui, /if \(r\.alerta\) \{ marca\(el, \[r\.aviso, r\.alerta\]\.filter\(Boolean\)\.join\(' '\), false\); alertas\.push\(\[rotulo\(el\), r\.alerta\]\); \}/);
});

test('CC-NUM-01: FAQ da regra de três descreve a regra real (HTML e JSON-LD iguais)', () => {
  const html = ler('regra-de-tres/index.html');
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(\{"@context":"https:\/\/schema\.org","@type":"FAQPage".*?)<\/script>/)[1]);
  const q = ld.mainEntity.find((x) => x.name === 'Posso usar números decimais?');
  const resp = q.acceptedAnswer.text;
  assert.ok(html.includes(`<details><summary>Posso usar números decimais?</summary><div><p>${resp}</p></div></details>`));
  assert.doesNotMatch(html, /Use ponto ou vírgula conforme o teclado/);
  assert.match(resp, /Use vírgula para os decimais, como 1,5 ou 1,125/);
  assert.match(resp, /1\.125 \(mil cento e vinte e cinco\)/);
  // os exemplos do texto valem na calculadora
  assert.equal(lerNumeroBR('1,5', { decimal: true }).n, 1.5);
  assert.equal(lerNumeroBR('1,125', { decimal: true }).n, 1.125);
  assert.equal(lerNumeroBR('1.125', { decimal: true }).n, 1125);
  assert.equal(lerNumeroBR('12.500', { decimal: true }).n, 12500);
  assert.equal(lerNumeroBR('1.5', { decimal: true }).n, 1.5);
  assert.equal(lerNumeroBR('0.125', { decimal: true }).n, 0.125);
  assert.equal(lerNumeroBR('-2,5', { decimal: true }).n, -2.5);
});

// ---------- CC-POUP-01 e CC-SELIC-01
test('CC-POUP-01: poupança credita só os aniversários completos (dias × 12 ÷ 365)', () => {
  const poup = (dias) => C.investimentos({ valor: 10000, dias, cdi: 13.65, selic: 13.75, trMensal: 0 }).resultados[3].rendimentoBruto;
  const meses = { 360: 11, 364: 11, 365: 12, 730: 24, 2190: 72, 3650: 120 };
  for (const [d, m] of Object.entries(meses)) assert.equal(poup(Number(d)), C.r2(10000 * (Math.pow(1.005, m) - 1)), d);
  assert.match(ler('investimentos/index.html'), /a calculadora conta os meses completos como dias × 12 ÷ 365 \(365 dias = 12 meses; 360 dias = 11\)/);
});

test('CC-SELIC-01: Tesouro Selic usa o CDI (Selic efetiva); a meta fica só na regra da poupança', () => {
  for (const cdi of [8, 10.4, 13.65]) {
    const [cdb, , tesouro] = C.investimentos({ valor: 10000, dias: 500, cdi, pctCdb: 100, selic: 13.75 }).resultados;
    assert.equal(tesouro.final, cdb.final, String(cdi));
  }
  // Selic meta muda a poupança, não o Tesouro Selic
  const a = C.investimentos({ valor: 10000, dias: 365, cdi: 8, selic: 8.5 }).resultados;
  const b = C.investimentos({ valor: 10000, dias: 365, cdi: 8, selic: 9 }).resultados;
  assert.equal(a[2].final, b[2].final);
  assert.notEqual(a[3].final, b[3].final);
  assert.match(ui, /O Tesouro Selic é calculado com o CDI informado/);
});

test('CC-SELIC-01/CC-POUP-01: exemplos da página de investimentos batem com o cálculo', () => {
  const html = ler('investimentos/index.html').replace(/ /g, ' ');
  const R = (v) => BRL(v).replace(/ /g, ' ');
  const nome = (x) => x.nome.replace(/ \(.*\)$/, '');
  const p730 = C.investimentos({ valor: 10000, dias: 730, cdi: 13.65, pctCdb: 100, pctLci: 90, selic: 13.75, trMensal: 0.17 }).resultados;
  const tabela = Object.fromEntries([...html.matchAll(/<tr><td>([^<]+)<\/td><td>(R\$ [\d.,]+)<\/td><\/tr>/g)].map((m) => [m[1], m[2]]));
  const esperado = { 'LCI/LCA 90% do CDI': p730[1].final, 'Tesouro Selic': p730[2].final, 'CDB 100% do CDI': p730[0].final, 'Poupança': p730[3].final };
  for (const [k, v] of Object.entries(esperado)) assert.equal(tabela[k], R(v), k);
  assert.equal(tabela['Tesouro Selic'], 'R$ 12.478,87');
  assert.equal(nome(p730[2]), 'Tesouro Selic');
  const p365 = C.investimentos({ valor: 10000, dias: 365, cdi: 13.65, pctCdb: 100, pctLci: 90, selic: 13.75, trMensal: 0.17 }).resultados;
  assert.ok(html.includes(`CDB 100% do CDI termina com ${R(p365[0].final)}, LCI/LCA 90% do CDI com ${R(p365[1].final)}`));
  assert.ok(html.includes(`e poupança com ${R(p365[3].final)}.`));
  assert.match(html, /<label for="f-selic">Selic meta ao ano<\/label>/);
  assert.match(inputDe(html, 'f-selic'), /aria-describedby="f-selic-ajuda f-selic-msg"/);
});

// ---------- CC-IDADE-01
test('CC-IDADE-01: dias nunca negativos quando fevereiro não basta', () => {
  const t = (a, b) => { const i = C.idade(a, b); return [i.anos, i.meses, i.dias]; };
  assert.deepEqual(t('2000-01-31', '2010-03-01'), [10, 0, 29]);
  assert.deepEqual(t('2000-01-30', '2001-03-01'), [1, 0, 30]);
  assert.deepEqual(t('2000-01-31', '2026-03-02'), [26, 0, 30]);
  assert.deepEqual(t('2000-03-31', '2010-03-01'), [9, 10, 29]);
  assert.deepEqual(t('2000-01-29', '2004-03-01'), [4, 1, 1]); // fevereiro bissexto basta
  // varredura: dias e meses sempre no intervalo e anos completos iguais à regra do aniversário
  const iso = (d) => d.toISOString().slice(0, 10);
  for (const nasc of ['1999-01-31', '1999-01-30', '1999-01-29', '1999-03-31', '1999-05-31', '2000-02-29', '1999-12-31']) {
    const n = C.parseData(nasc);
    for (let k = 0; k < 800; k++) {
      const r = new Date(Date.UTC(2011, 0, 1) + k * 864e5);
      const i = C.idade(nasc, iso(r));
      assert.ok(i.dias >= 0 && i.dias <= 30, `${nasc} → ${iso(r)}: dias ${i.dias}`);
      assert.ok(i.meses >= 0 && i.meses <= 11, `${nasc} → ${iso(r)}: meses ${i.meses}`);
      const antes = r.getUTCMonth() < n.getUTCMonth() || (r.getUTCMonth() === n.getUTCMonth() && r.getUTCDate() < n.getUTCDate());
      assert.equal(i.anos, r.getUTCFullYear() - n.getUTCFullYear() - (antes ? 1 : 0), `${nasc} → ${iso(r)}`);
    }
  }
});

// ---------- CC-IMC-01
test('CC-IMC-01: classificação pelo IMC exibido e teto da faixa normal com o mesmo limite', () => {
  const r = C.imc({ peso: 79.2, altura: 1.78 });
  assert.equal(r.imc, 25); assert.equal(r.classe, 'Sobrepeso');
  assert.equal(r.pesoMax, 79.19);
  assert.equal(C.imc({ peso: 79.19, altura: 1.78 }).classe, 'Peso normal');
  for (let cm = 140; cm <= 210; cm++) {
    const { pesoMax } = C.imc({ peso: 70, altura: cm });
    const no = C.imc({ peso: pesoMax, altura: cm });
    const acima = C.imc({ peso: C.r2(pesoMax + 0.01), altura: cm });
    assert.equal(no.classe, 'Peso normal', `${cm} cm, ${pesoMax} kg`);
    assert.ok(no.imc <= 24.99, `${cm} cm: IMC ${no.imc}`);
    assert.equal(acima.classe, 'Sobrepeso', `${cm} cm, ${pesoMax + 0.01} kg`);
  }
  // exemplos da página: teto arredondado para baixo, para continuar dentro da faixa
  const html = ler('imc/index.html').replace(/ /g, ' ');
  const teto = (h) => (Math.floor(C.imc({ peso: 70, altura: h }).pesoMax * 10) / 10).toLocaleString('pt-BR', { minimumFractionDigits: 1 });
  assert.ok(html.includes(`para essa altura vai de 56,7 kg a ${teto(1.75)} kg.`));
  assert.ok(html.includes(`vai de cerca de 58,6 kg a ${teto(1.78)} kg.`));
  assert.ok(html.includes(`nessa altura vai de 50,4 kg a ${teto(1.65)} kg.`));
});

// ---------- CC-PARC-01
test('CC-PARC-01: juros embutidos acima de 100% a.m. e "não se aplica" sem prazo', () => {
  const a = C.parceladoOuVista({ vista: 500, parcelas: 3, valorParcela: 1000 });
  assert.ok(a.taxaImplicita > 1.9 && a.taxaImplicita < 1.93, String(a.taxaImplicita));
  near(C.valorPresenteParcelas(1000, 3, a.taxaImplicita), 500, 1e-6);
  const b = C.parceladoOuVista({ vista: 100, parcelas: 1, valorParcela: 120, comEntrada: true });
  assert.equal(b.taxaImplicita, null); assert.equal(b.taxaImplicitaAnual, null); assert.equal(b.melhor, 'vista');
  // parcela no ato igual ao preço à vista, com mais parcelas depois: nenhuma taxa explica a diferença
  assert.equal(C.parceladoOuVista({ vista: 100, parcelas: 3, valorParcela: 100, comEntrada: true }).taxaImplicita, null);
  // casos comuns inalterados
  near(C.parceladoOuVista({ vista: 1000, parcelas: 10, valorParcela: 110 }).taxaImplicita, 0.017715, 0.000002);
  assert.equal(C.parceladoOuVista({ vista: 100, parcelas: 1, valorParcela: 100, comEntrada: true }).taxaImplicita, 0);
  assert.equal(C.parceladoOuVista({ vista: 1000, parcelas: 4, valorParcela: 250, comEntrada: true }).taxaImplicita, 0);
  assert.match(ui, /semTaxa \? 'não se aplica' : pct\(r\.taxaImplicita\)/);
  assert.match(ui, /semTaxa \? 'não se aplica' : pct\(r\.taxaImplicitaAnual\)/);
});

// ---------- CC-PCT-01
test('CC-PCT-01: porcentagem sem campos obrigatórios; bloco vazio ou inválido mostra "—" e não bloqueia os outros', () => {
  const html = ler('porcentagem/index.html');
  const blocos = { 'f-p1': 1, 'f-v1': 1, 'f-x2': 2, 'f-v2': 2, 'f-a3': 3, 'f-b3': 3, 'f-v4': 4, 'f-p4': 4 };
  for (const [id, b] of Object.entries(blocos)) {
    const tag = inputDe(html, id);
    assert.doesNotMatch(tag, /data-obrig/, id);
    assert.match(tag, new RegExp(`data-bloco="${b}"`), id);
  }
  assert.match(html, /<li>Preencha os dois campos desse bloco; os outros blocos podem ficar em branco\.<\/li>/);
  // ler(): vazio vira ausência marcada; erro de campo de bloco não entra na lista que bloqueia o cálculo
  assert.match(ui, /const d = \{ _orig: \{\}, _vazio: \{\}, _invalidos: \{\} \};/);
  assert.match(ui, /if \('bloco' in ds\) d\._invalidos\[el\.name\] = \[rotulo\(el\), r\.erro, el\.id\]; else erros\.push/);
  assert.match(ui, /if \(!r\.erro && !el\.value\.trim\(\)\) d\._vazio\[el\.name\] = true;/);
  assert.match(ui, /const falta = \(nomes\) => nomes\.some\(\(n\) => d\._vazio\[n\] \|\| d\._invalidos\[n\]\);/);
  // campo vazio não obrigatório continua valendo 0 na validação (a ausência é marcada no ui.js)
  assert.deepEqual(validarNumero({ raw: '', decimal: true }), { valor: 0 });
});
