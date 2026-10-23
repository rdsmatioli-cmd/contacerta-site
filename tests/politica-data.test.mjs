// M-PR33-01 (Advogado): a "Última atualização" da política de privacidade é um literal fixo e precisa ser a data do
// deploy. Como o GitHub Pages publica a main sem workflow de deploy, a trava fica no CI do PR: falha se a data da
// política for diferente de hoje em America/Sao_Paulo (= TZ=America/Sao_Paulo date +%d/%m/%Y).
// Obrigatória quando GITHUB_EVENT_NAME=pull_request ou REQUIRE_POLICY_DATE_TODAY=1; fora disso é pulada (para a main
// não quebrar no dia seguinte ao merge). Antes do merge, reexecute o CI do PR no próprio dia e ajuste a data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const obrigatoria = process.env.GITHUB_EVENT_NAME === 'pull_request' || process.env.REQUIRE_POLICY_DATE_TODAY === '1';

export function hojeSaoPaulo(agora = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' })
    .formatToParts(agora).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year}`;
}

test('privacidade: "Última atualização" é a data de hoje em America/Sao_Paulo (M-PR33-01)', {
  skip: obrigatoria ? false : 'trava da data da política pulada: só é obrigatória em pull_request (GITHUB_EVENT_NAME=pull_request) ou com REQUIRE_POLICY_DATE_TODAY=1',
}, () => {
  const html = readFileSync(new URL('../privacidade/index.html', import.meta.url), 'utf8');
  const datas = [...html.matchAll(/Última atualização: (\d{2}\/\d{2}\/\d{4})\./g)].map((m) => m[1]);
  assert.equal(datas.length, 1, 'esperada exatamente uma "Última atualização: dd/mm/aaaa." na política');
  const hoje = hojeSaoPaulo();
  assert.equal(datas[0], hoje, `a política diz ${datas[0]}, mas hoje em America/Sao_Paulo é ${hoje}: ajuste a data para o dia do merge/deploy e reexecute o CI`);
});

test('hojeSaoPaulo equivale a TZ=America/Sao_Paulo date +%d/%m/%Y', () => {
  assert.equal(hojeSaoPaulo(new Date('2026-10-24T02:59:00Z')), '23/10/2026');
  assert.equal(hojeSaoPaulo(new Date('2026-10-24T03:00:00Z')), '24/10/2026');
});

// Mesma trava para o aviso do Licitações (AVISO-LICITACOES-1.10, item 12 e pílula do cabeçalho) e para os Termos de
// Venda em /licitacoes/cobranca/ ("Data: dd/mm/aaaa"): as datas exibidas têm de ser a do dia da publicação.
test('licitações: data do aviso e dos Termos de Venda é a de hoje em America/Sao_Paulo', {
  skip: obrigatoria ? false : 'trava da data pulada: só é obrigatória em pull_request ou com REQUIRE_POLICY_DATE_TODAY=1',
}, () => {
  const hoje = hojeSaoPaulo();
  const aviso = readFileSync(new URL('../licitacoes/politica.html', import.meta.url), 'utf8');
  const itens = [...aviso.matchAll(/Versão AVISO-LICITACOES-[\d.]+, de (\d{2}\/\d{2}\/\d{4})\./g)].map((m) => m[1]);
  const pilula = [...aviso.matchAll(/Versão AVISO-LICITACOES-[\d.]+<\/span><span class="pill n">(\d{2}\/\d{2}\/\d{4})</g)].map((m) => m[1]);
  assert.equal(itens.length, 1, 'esperada uma "Versão AVISO-LICITACOES-x, de dd/mm/aaaa." no aviso');
  assert.equal(pilula.length, 1, 'esperada uma data na pílula de versão do aviso');
  const termos = readFileSync(new URL('../licitacoes/cobranca/index.html', import.meta.url), 'utf8');
  const dt = [...termos.matchAll(/ · Data: (\d{2}\/\d{2}\/\d{4})/g)].map((m) => m[1]);
  // Termos congelados (v1.3, ordem do CEO): o placeholder literal "Data: [DATA DE PUBLICAÇÃO]" é aceito; data preenchida tem de ser a de hoje.
  const ph = (termos.match(/ · Data: \[DATA DE PUBLICAÇÃO\]/g) || []).length;
  assert.equal(dt.length + ph, 1, 'esperada uma "Data: dd/mm/aaaa" (ou o placeholder literal) nos Termos de Venda');
  const datas = [['aviso (item 12)', itens[0]], ['aviso (pílula)', pilula[0]]];
  if (dt.length) datas.push(['Termos de Venda', dt[0]]);
  for (const [nome, d] of datas) {
    assert.equal(d, hoje, `${nome} diz ${d}, mas hoje em America/Sao_Paulo é ${hoje}: ajuste a data para o dia da publicação e reexecute o CI`);
  }
});
