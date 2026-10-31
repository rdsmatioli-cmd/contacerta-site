// CC-CALC-FINANCEIRO-01 (31/10/2026): alíquota de referência da CBS de 2027 calculada pelo TCU em 28/10/2026
// (11,3%; TC 006.529/2026-7; LC 214/2025, art. 349, § 14) e cobrada 0,1 ponto abaixo em 2027-2028 (art. 347).
// Valores padrão, exemplos (recalculados pelo calc.js), FAQ visível x FAQPage e fontes das páginas da reforma.
// O último teste vence depois do prazo do Senado (15/12/2026): força a conferência da resolução.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as C from '../assets/js/calc.js';

const ler = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const BRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const n1 = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const valorDe = (html, id) => {
  const tag = (html.match(/<input\b[^>]*>/g) || []).find((t) => t.includes(`id="${id}"`));
  return Number(tag.match(/value="([^"]*)"/)[1].replace(/\./g, '').replace(',', '.'));
};
const REF = C.CBS_REFERENCIA_2027;
const COBRADA = Math.round((REF.pct - 0.1) * 100) / 100; // 2027-2028 (art. 347)
const TCU_URL = 'https://portal.tcu.gov.br/imprensa/noticias/tcu-calcula-aliquota-de-referencia-de-113-para-novo-tributo-sobre-consumo';
const PAGINAS = ['simples-hibrido', 'preco-reforma-tributaria', 'transicao-cbs-ibs', 'credito-travado', 'calendario-reforma-tributaria'];

test('constante: referência do TCU de 11,3% e CBS de 11,2% em 2027-2028 na sugestão por ano', () => {
  assert.equal(REF.pct, 11.3);
  assert.equal(REF.processo, 'TC 006.529/2026-7');
  assert.equal(REF.calculadaEm, '2026-10-28');
  assert.equal(REF.prazoSenado, '2026-12-15');
  assert.equal(COBRADA, 11.2);
  assert.deepEqual(C.aliquotasPadraoPreco(2027), { cbsPct: COBRADA, ibsPct: 0.1 });
  assert.equal(C.aliquotasPadraoPreco(2033).cbsPct, REF.pct);
});

test('valores padrão dos campos da CBS seguem a constante', () => {
  for (const p of ['simples-hibrido', 'preco-reforma-tributaria', 'credito-travado']) assert.equal(valorDe(ler(`${p}/index.html`), 'f-cbs'), COBRADA, p);
  assert.equal(valorDe(ler('transicao-cbs-ibs/index.html'), 'f-cbs'), REF.pct);
  assert.equal(valorDe(ler('transicao-cbs-ibs/index.html'), 'f-ibs'), C.IBS_REFERENCIA_PREMISSA_PCT);
});

test('nenhuma página da reforma usa mais a estimativa antiga da CBS (9,21% / 9,11%)', () => {
  const antigo = /\b9,(?:21|11)\s?%|value="9,(?:21|11)"/;
  for (const p of PAGINAS) assert.doesNotMatch(ler(`${p}/index.html`), antigo, p);
  assert.doesNotMatch(ler('assets/js/calc.js'), /cbsRefPct = 9\.21|CBS 9,21%/);
  assert.doesNotMatch(ler('llms.txt'), antigo);
});

test('exemplos das páginas batem com o calc.js nos valores padrão de cada página', () => {
  const sh = ler('simples-hibrido/index.html');
  const r = C.simplesHibridoOuPuro({ receitaMensal: valorDe(sh, 'f-receita'), pctB2B: valorDe(sh, 'f-b2b'), margemPct: valorDe(sh, 'f-margem'), dasPct: valorDe(sh, 'f-das'), parcelaCbsIbsDasPct: valorDe(sh, 'f-parcela'), cbsPct: valorDe(sh, 'f-cbs'), ibsPct: valorDe(sh, 'f-ibs'), comprasComCredito: valorDe(sh, 'f-compras') });
  assert.ok(sh.includes(`Ficando no DAS, o lucro é ${BRL(r.puro.lucro)} e o crédito dos clientes, ${BRL(r.puro.creditoClientes)}. No regime regular de CBS e IBS, ${BRL(r.hibrido.lucro)} e ${BRL(r.hibrido.creditoClientes)}.`), 'exemplo do simples-hibrido');
  const t = (CBS_IBS) => ((1 - 1 / (1 + CBS_IBS / 100)) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  assert.ok(sh.includes(`corte de cerca de ${t(valorDe(sh, 'f-cbs') + valorDe(sh, 'f-ibs'))}% no valor líquido`), 'ajuda do preço mantido');

  const pr = ler('preco-reforma-tributaria/index.html');
  const base = { precoAtual: valorDe(pr, 'f-preco'), tributosAtuaisPct: valorDe(pr, 'f-atuais'), issPct: valorDe(pr, 'f-iss'), ano: 2027, cbsPct: valorDe(pr, 'f-cbs'), ibsPct: valorDe(pr, 'f-ibs') };
  const p = C.precoReforma(base);
  const pf = C.precoReforma({ ...base, issPorDentro: false });
  for (const s of [`a CBS fica em ${BRL(p.cbs)} e o IBS em ${BRL(p.ibs)}`, `sobre o total (${BRL(p.iss)})`, `<strong>${BRL(p.total)}</strong> (${n1(p.variacaoTotal * 100)}% sobre o preço atual)`, `${BRL(p.custoClienteComCredito)} (${n1(p.variacaoComCredito * 100)}%)`, `o total seria ${BRL(pf.total)}.`])
    assert.ok(pr.includes(s), `preço reforma: ${s}`);

  const tr = ler('transicao-cbs-ibs/index.html');
  const x = C.transicaoCbsIbs({ precoAtual: 10000, pisCofinsPct: valorDe(tr, 'f-piscofins'), issPct: valorDe(tr, 'f-iss'), cbsRefPct: valorDe(tr, 'f-cbs'), ibsRefPct: valorDe(tr, 'f-ibs') });
  const ano = (a) => x.anos.find((l) => l.ano === a);
  assert.ok(tr.includes(`o cliente pagaria ${BRL(ano(2027).totalCliente)} em 2027 (carga de ${n1(ano(2027).carga * 100)}%) e ${BRL(ano(2033).totalCliente)} em 2033 (carga de ${n1(ano(2033).carga * 100)}%)`), 'exemplo da transição');
  assert.ok(tr.includes(`chegaria a ${n1(REF.pct + C.IBS_REFERENCIA_PREMISSA_PCT)}%`), 'soma CBS + IBS do texto');

  const ct = ler('credito-travado/index.html');
  const c = C.creditoTravado({ comprasMensais: 100000, cbsPct: valorDe(ct, 'f-cbs'), ibsPct: valorDe(ct, 'f-ibs'), pctInadimplente: 10, diasAtraso: 60, custoDinheiroMes: 1.5 });
  assert.ok(ct.includes(`geram ${BRL(c.credito)} de crédito. Se 10% vêm de fornecedores que atrasam 60 dias, ${BRL(c.travado)} ficam parados por mês (${BRL(c.travadoAno)} em um ano), com custo financeiro de ${BRL(c.custoFinanceiroAno)} por ano`), 'exemplo do crédito travado');
});

test('FAQ visível = FAQPage nas páginas da reforma; texto cita o TCU, os 11,3% e o prazo do Senado', () => {
  const tira = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+\./g, '.').replace(/\s+/g, ' ').trim();
  for (const p of PAGINAS) {
    const h = ler(`${p}/index.html`);
    const ld = JSON.parse(h.match(/<script type="application\/ld\+json">(\{"@context":"https:\/\/schema\.org","@type":"FAQPage".*?)<\/script>/)[1]).mainEntity;
    const vis = [...h.matchAll(/<details><summary>(.*?)<\/summary><div>(.*?)<\/div><\/details>/g)];
    assert.equal(ld.length, vis.length, p);
    ld.forEach((q, i) => {
      assert.equal(tira(vis[i][1]), q.name, `${p}: pergunta ${i + 1}`);
      assert.equal(tira(vis[i][2]), tira(q.acceptedAnswer.text), `${p}: resposta ${i + 1}`);
    });
    assert.match(h, /11,3%/, p);
    assert.match(h, /15\/12\/2026/, p);
    assert.ok(h.includes(`href="${TCU_URL}"`), `${p}: fonte do TCU na lista`);
    assert.ok(h.includes(`"url":"${TCU_URL}"`), `${p}: fonte do TCU no JSON-LD`);
  }
});

test('prazo do Senado (15/12/2026): depois dele, conferir a resolução e atualizar CBS_REFERENCIA_2027', () => {
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  if (hoje <= REF.prazoSenado) return;
  assert.equal(REF.situacao, 'fixada pelo Senado',
    `Hoje é ${hoje}, depois do prazo do Senado (${REF.prazoSenado}). Confira se a resolução do Senado fixou a alíquota de referência da CBS de 2027 `
    + '(ou se valeu o cálculo do TCU, sem fixação até 22/12/2026), atualize CBS_REFERENCIA_2027 em assets/js/calc.js e reveja os textos de '
    + `${PAGINAS.join(', ')}.`);
});
