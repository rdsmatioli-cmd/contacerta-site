// M-PR33-01 (Advogado): a "Última atualização" da política de privacidade é um literal fixo e precisa ser a data do
// deploy. Como o GitHub Pages publica a main sem workflow de deploy, a trava fica no CI do PR: falha se a data da
// política for diferente de hoje em America/Sao_Paulo (= TZ=America/Sao_Paulo date +%d/%m/%Y).
// Obrigatória só com REQUIRE_POLICY_DATE_TODAY=1 (passo do ci.yml em PR que altera privacidade/index.html, e pages.yml);
// fora disso é pulada (para a main e os PRs sem relação com a política não quebrarem no dia seguinte). Antes do merge, reexecute o CI do PR no próprio dia e ajuste a data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PUBLICACAO_LICITACOES } from './publicacao-licitacoes.mjs';

// DEC CPO (a) (A-PR35-14, 26/10/2026): as 3 datas (política, pílula e item 12 do aviso) e a dos Termos ficam como
// [DATA DE PUBLICAÇÃO] até o commit do deploy; vermelho só por esse placeholder é aceito antes do deploy, sem bump diário.
// DEC CPO (Bugbot PR #48, 30/10/2026): "data = hoje" vale só para a política de privacidade e só quando o arquivo
// legal muda (REQUIRE_POLICY_DATE_TODAY=1: ci.yml em PR que altera privacidade/index.html; pages.yml em push que a altera).
// Termos e aviso do Licitações comparam com a constante PUBLICACAO_LICITACOES, nunca com o dia do build ou do deploy.
const PH = '[DATA DE PUBLICAÇÃO]';
const DATA_OU_PH = '(\\d{2}\\/\\d{2}\\/\\d{4}|\\[DATA DE PUBLICAÇÃO\\])';
const obrigatoria = () => process.env.REQUIRE_POLICY_DATE_TODAY === '1';
// Decisão do CPO (28/10): na publicação (pages.yml) basta a data não estar no futuro (<= hoje), salvo quando o push
// altera privacidade/index.html, que volta a exigir = hoje (REQUIRE_POLICY_DATE_TODAY=1).
const naoFutura = () => !obrigatoria() && process.env.REQUIRE_POLICY_DATE_NOT_FUTURE === '1';
const ordem = (d) => d.split('/').reverse().join('');
// B-PR34-06 (Advogado 123a5499): só datas que existem no calendário (31/02, 00/10, 29/02 fora de ano bissexto falham).
export function dataValida(d) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d);
  if (!m) return false;
  const [dia, mes, ano] = [+m[1], +m[2], +m[3]];
  const x = new Date(Date.UTC(ano, mes - 1, dia));
  return x.getUTCFullYear() === ano && x.getUTCMonth() === mes - 1 && x.getUTCDate() === dia;
}
// Devolve a lista de erros para um conjunto [nome, valor] de datas: placeholder sempre é erro; data != hoje só se exigida.
export function errosDatas(pares, { exigeHoje, hoje }) {
  const e = [];
  for (const [nome, d] of pares) {
    if (d === PH) e.push(`${nome}: placeholder ${PH} pendente (preencher no commit do deploy, DEC CPO (a))`);
    else if (!dataValida(d)) e.push(`${nome} diz ${d}, que não é uma data válida`);
    else if (exigeHoje && d !== hoje) e.push(`${nome} diz ${d}, mas hoje em America/Sao_Paulo é ${hoje}`);
  }
  return e;
}

export function hojeSaoPaulo(agora = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' })
    .formatToParts(agora).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year}`;
}

test('privacidade: "Última atualização" válida; = hoje só quando privacidade/index.html muda (M-PR33-01)', () => {
  const html = readFileSync(new URL('../privacidade/index.html', import.meta.url), 'utf8');
  const datas = [...html.matchAll(new RegExp(`Última atualização: ${DATA_OU_PH}\\.`, 'g'))].map((m) => m[1]);
  assert.equal(datas.length, 1, 'esperada exatamente uma "Última atualização: dd/mm/aaaa." na política');
  const erros = errosDatas([['política', datas[0]]], { exigeHoje: obrigatoria(), hoje: hojeSaoPaulo() });
  assert.deepEqual(erros, [], erros.join('\n'));
});

test('privacidade: "Última atualização" não está no futuro (publicação sem mudança na política)', {
  skip: naoFutura() ? false : 'só com REQUIRE_POLICY_DATE_NOT_FUTURE=1 (pages.yml, push que não altera privacidade/index.html)',
}, () => {
  const html = readFileSync(new URL('../privacidade/index.html', import.meta.url), 'utf8');
  const datas = [...html.matchAll(new RegExp(`Última atualização: ${DATA_OU_PH}\\.`, 'g'))].map((m) => m[1]);
  assert.equal(datas.length, 1, 'esperada exatamente uma "Última atualização: dd/mm/aaaa." na política');
  const erros = errosDatas([['política', datas[0]]], { exigeHoje: false, hoje: hojeSaoPaulo() });
  assert.deepEqual(erros, [], erros.join('\n'));
  const hoje = hojeSaoPaulo();
  assert.ok(ordem(datas[0]) <= ordem(hoje), `a política diz ${datas[0]}, depois de hoje em America/Sao_Paulo (${hoje})`);
});

test('hojeSaoPaulo equivale a TZ=America/Sao_Paulo date +%d/%m/%Y', () => {
  assert.equal(hojeSaoPaulo(new Date('2026-10-24T02:59:00Z')), '23/10/2026');
  assert.equal(hojeSaoPaulo(new Date('2026-10-24T03:00:00Z')), '24/10/2026');
});

// Mesma trava para o aviso do Licitações (AVISO-LICITACOES-1.11, item 12 e pílula do cabeçalho) e para os Termos de
// Venda em /licitacoes/cobranca/ ("Data: dd/mm/aaaa"): as datas exibidas têm de ser PUBLICACAO_LICITACOES (constante).
// Decisão do CPO (r11, 23/10/2026 19h17): o placeholder [DATA DE PUBLICAÇÃO] dos Termos fica no PR e só é preenchido
// no commit do deploy, depois do OK do CEO. DEC CPO 19h33 (QA A-PR35-01): a trava de placeholder roda em todo CI e
// fica vermelha SÓ por [DATA DE PUBLICAÇÃO] até o commit do deploy (aceito). A comparação "Data = hoje" dos Termos
// só vale no deploy (workflow Pages na main), para a main não quebrar no dia seguinte ao deploy (Bugbot 4364730719).
// Checkboxes "[ ]" não são placeholder.
export const PAGINAS_TRAVADAS = ['licitacoes/cobranca/index.html', 'licitacoes/politica.html'];
export const PLACEHOLDER = /\[[A-ZÀ-Ý][A-ZÀ-Ý0-9 _,.\/-]*\]/g;
export function placeholders(texto) {
  return texto.split('\n').flatMap((l, i) => [...l.matchAll(PLACEHOLDER)].map((m) => `${i + 1}: ${m[0]}`));
}
const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

// Devolve { erros }. Placeholder: erro sempre. Data dos Termos diferente da constante de publicação: erro sempre.
export function travaLicitacoes({ publicacao, paginas }) {
  const erros = [];
  const achados = Object.entries(paginas).flatMap(([p, t]) => placeholders(t).map((x) => `${p}:${x}`));
  if (achados.length) erros.push(`placeholder pendente de deploy (preencher no commit do deploy, após OK do CEO):\n${achados.join('\n')}`);
  const termos = paginas['licitacoes/cobranca/index.html'];
  const dt = [...termos.matchAll(/ · Data: (\d{2}\/\d{2}\/\d{4})/g)].map((m) => m[1]);
  if (dt.length !== 1) { if (!achados.length) erros.push('esperada uma "Data: dd/mm/aaaa" nos Termos de Venda'); }
  else if (dt[0] !== publicacao) erros.push(`Termos de Venda dizem ${dt[0]}, mas PUBLICACAO_LICITACOES é ${publicacao}`);
  return { erros };
}

test('licitações: datas do aviso (item 12 e pílula) = PUBLICACAO_LICITACOES', () => {
  const aviso = ler('licitacoes/politica.html');
  const itens = [...aviso.matchAll(new RegExp(`Versão AVISO-LICITACOES-[\\d.]+, de ${DATA_OU_PH}\\.`, 'g'))].map((m) => m[1]);
  const pilula = [...aviso.matchAll(new RegExp(`Versão AVISO-LICITACOES-[\\d.]+<\\/span><span class="pill n">${DATA_OU_PH}<`, 'g'))].map((m) => m[1]);
  assert.equal(itens.length, 1, 'esperada uma "Versão AVISO-LICITACOES-x, de dd/mm/aaaa." no aviso');
  assert.equal(pilula.length, 1, 'esperada uma data na pílula de versão do aviso');
  const erros = errosDatas([['aviso (item 12)', itens[0]], ['aviso (pílula)', pilula[0]]], { exigeHoje: true, hoje: PUBLICACAO_LICITACOES });
  assert.deepEqual(erros, [], erros.join('\n'));
});

test('errosDatas: placeholder falha sempre; data != hoje só quando exigida', () => {
  assert.equal(errosDatas([['x', PH]], { exigeHoje: false, hoje: '27/10/2026' }).length, 1);
  assert.deepEqual(errosDatas([['x', '20/10/2026']], { exigeHoje: false, hoje: '27/10/2026' }), []);
  assert.equal(errosDatas([['x', '20/10/2026']], { exigeHoje: true, hoje: '27/10/2026' }).length, 1);
  assert.deepEqual(errosDatas([['x', '27/10/2026']], { exigeHoje: true, hoje: '27/10/2026' }), []);
});

test('licitações: Termos = PUBLICACAO_LICITACOES, sem placeholder', () => {
  const paginas = Object.fromEntries(PAGINAS_TRAVADAS.map((p) => [p, ler(p)]));
  const { erros } = travaLicitacoes({ publicacao: PUBLICACAO_LICITACOES, paginas });
  assert.deepEqual(erros, [], erros.join('\n'));
});

test('trava dos Termos: compara com a constante, nunca com o dia do build (Bugbot PR #48)', () => {
  assert.match(PUBLICACAO_LICITACOES, /^\d{2}\/\d{2}\/\d{4}$/);
  assert.ok(dataValida(PUBLICACAO_LICITACOES));
  const termos = '<p>Versão: TERMOS-VENDA-LICITACOES-1.3 · Data: [DATA DE PUBLICAÇÃO]</p>';
  const pag = (tx) => ({ 'licitacoes/cobranca/index.html': tx, 'licitacoes/politica.html': '' });
  const ph = travaLicitacoes({ publicacao: '24/10/2026', paginas: pag(termos) });
  assert.equal(ph.erros.length, 1);
  assert.ok(ph.erros[0].includes('[DATA DE PUBLICAÇÃO]'));
  const preenchido = termos.replace('[DATA DE PUBLICAÇÃO]', '24/10/2026');
  assert.deepEqual(travaLicitacoes({ publicacao: '24/10/2026', paginas: pag(preenchido) }).erros, []);
  assert.equal(travaLicitacoes({ publicacao: '25/10/2026', paginas: pag(preenchido) }).erros.length, 1);
});

test('detector de placeholder: acusa [MAIÚSCULAS], ignora checkbox e minúsculas', () => {
  assert.deepEqual(placeholders('a [PREÇO] b [ ] c [x] d\n[PRAZO, NO MÁXIMO 5 DIAS ÚTEIS]'), ['1: [PREÇO]', '2: [PRAZO, NO MÁXIMO 5 DIAS ÚTEIS]']);
  assert.deepEqual(placeholders('action="[ORIGEM_CHECKOUT]/checkout"'), ['1: [ORIGEM_CHECKOUT]']);
});

test('dataValida rejeita datas impossíveis (B-PR34-06)', () => {
  for (const d of ['28/10/2026', '29/02/2028', '31/12/2026', '01/01/2027']) assert.ok(dataValida(d), d);
  for (const d of ['31/02/2026', '29/02/2026', '00/10/2026', '32/01/2026', '15/13/2026', '31/04/2026', '1/10/2026']) assert.ok(!dataValida(d), d);
});
