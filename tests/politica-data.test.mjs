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

// Mesma trava para o aviso do Licitações (AVISO-LICITACOES-1.11, item 12 e pílula do cabeçalho) e para os Termos de
// Venda em /licitacoes/cobranca/ ("Data: dd/mm/aaaa"): as datas exibidas têm de ser a do dia da publicação.
// Decisão do CPO (rodada 5): a trava também falha enquanto houver placeholder [MAIÚSCULAS] nas páginas publicadas
// abaixo (lista fechada). r11 (PMO/QA): a data dos Termos foi preenchida com a data de hoje do sha (mesmo mecanismo do
// aviso e da política). Se o merge/deploy for em outro dia, a trava volta a falhar: atualizar as 3 datas no commit do
// deploy, com aprovação, e reexecutar o CI no próprio dia. Checkboxes "[ ]" não são placeholder.
export const PAGINAS_TRAVADAS = ['licitacoes/cobranca/index.html', 'licitacoes/politica.html'];
export const PLACEHOLDER = /\[[A-ZÀ-Ý][A-ZÀ-Ý0-9 _,.\/-]*\]/g;
export function placeholders(texto) {
  return texto.split('\n').flatMap((l, i) => [...l.matchAll(PLACEHOLDER)].map((m) => `${i + 1}: ${m[0]}`));
}

test('licitações: trava de publicação (sem placeholder e data de hoje no aviso e nos Termos de Venda)', {
  skip: obrigatoria ? false : 'trava da data pulada: só é obrigatória em pull_request ou com REQUIRE_POLICY_DATE_TODAY=1',
}, () => {
  const achados = PAGINAS_TRAVADAS.flatMap((p) => placeholders(readFileSync(new URL('../' + p, import.meta.url), 'utf8')).map((x) => `${p}:${x}`));
  assert.deepEqual(achados, [], `placeholders ainda não preenchidos (preencher no deploy, com aprovação):\n${achados.join('\n')}`);
  const hoje = hojeSaoPaulo();
  const aviso = readFileSync(new URL('../licitacoes/politica.html', import.meta.url), 'utf8');
  const itens = [...aviso.matchAll(/Versão AVISO-LICITACOES-[\d.]+, de (\d{2}\/\d{2}\/\d{4})\./g)].map((m) => m[1]);
  const pilula = [...aviso.matchAll(/Versão AVISO-LICITACOES-[\d.]+<\/span><span class="pill n">(\d{2}\/\d{2}\/\d{4})</g)].map((m) => m[1]);
  assert.equal(itens.length, 1, 'esperada uma "Versão AVISO-LICITACOES-x, de dd/mm/aaaa." no aviso');
  assert.equal(pilula.length, 1, 'esperada uma data na pílula de versão do aviso');
  const termos = readFileSync(new URL('../licitacoes/cobranca/index.html', import.meta.url), 'utf8');
  const dt = [...termos.matchAll(/ · Data: (\d{2}\/\d{2}\/\d{4})/g)].map((m) => m[1]);
  assert.equal(dt.length, 1, 'esperada uma "Data: dd/mm/aaaa" nos Termos de Venda');
  for (const [nome, d] of [['aviso (item 12)', itens[0]], ['aviso (pílula)', pilula[0]], ['Termos de Venda', dt[0]]]) {
    assert.equal(d, hoje, `${nome} diz ${d}, mas hoje em America/Sao_Paulo é ${hoje}: ajuste a data para o dia da publicação e reexecute o CI`);
  }
});

test('detector de placeholder: acusa [MAIÚSCULAS], ignora checkbox e minúsculas', () => {
  assert.deepEqual(placeholders('a [PREÇO] b [ ] c [x] d\n[PRAZO, NO MÁXIMO 5 DIAS ÚTEIS]'), ['1: [PREÇO]', '2: [PRAZO, NO MÁXIMO 5 DIAS ÚTEIS]']);
  assert.deepEqual(placeholders('action="[ORIGEM_CHECKOUT]/checkout"'), ['1: [ORIGEM_CHECKOUT]']);
});
