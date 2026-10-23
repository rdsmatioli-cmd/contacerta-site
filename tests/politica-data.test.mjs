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
// Decisão do CPO (r11, 23/10/2026 19h17): o placeholder [DATA DE PUBLICAÇÃO] dos Termos fica no PR e só é preenchido
// no commit do deploy, depois do OK do CEO. Por isso a trava de placeholder e da data dos Termos é aplicada só no
// deploy: workflow Pages na main (GITHUB_WORKFLOW=Pages e GITHUB_REF=refs/heads/main). No PR ela passa com aviso
// explícito "placeholder pendente de deploy". As datas do aviso seguem a regra de sempre (obrigatória no PR).
// Checkboxes "[ ]" não são placeholder.
export const PAGINAS_TRAVADAS = ['licitacoes/cobranca/index.html', 'licitacoes/politica.html'];
export const PLACEHOLDER = /\[[A-ZÀ-Ý][A-ZÀ-Ý0-9 _,.\/-]*\]/g;
export function placeholders(texto) {
  return texto.split('\n').flatMap((l, i) => [...l.matchAll(PLACEHOLDER)].map((m) => `${i + 1}: ${m[0]}`));
}
// Deploy = só o workflow Pages na main (GITHUB_WORKFLOW e GITHUB_REF são do próprio GitHub; nenhuma flag nossa).
// O CI de push na main não conta, para não quebrar a main no dia seguinte ao deploy (Bugbot 4364730719).
export function ehDeploy(e = process.env) {
  return e.GITHUB_WORKFLOW === 'Pages' && e.GITHUB_REF === 'refs/heads/main';
}
const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

// Devolve { erros, avisos }. deploy=true: qualquer placeholder ou data dos Termos diferente de hoje é erro.
// deploy=false: placeholders e data dos Termos viram aviso "placeholder pendente de deploy".
export function travaLicitacoes({ deploy, hoje, paginas }) {
  const erros = []; const avisos = [];
  const achados = Object.entries(paginas).flatMap(([p, t]) => placeholders(t).map((x) => `${p}:${x}`));
  if (achados.length) (deploy ? erros : avisos).push(`placeholder pendente de deploy (preencher no commit do deploy, após OK do CEO):\n${achados.join('\n')}`);
  const termos = paginas['licitacoes/cobranca/index.html'];
  const dt = [...termos.matchAll(/ · Data: (\d{2}\/\d{2}\/\d{4})/g)].map((m) => m[1]);
  if (dt.length !== 1) (deploy ? erros : avisos).push('Termos de Venda sem "Data: dd/mm/aaaa" (pendente de deploy)');
  else if (dt[0] !== hoje) (deploy ? erros : avisos).push(`Termos de Venda dizem ${dt[0]}, mas hoje em America/Sao_Paulo é ${hoje}`);
  return { erros, avisos };
}

test('licitações: datas do aviso (item 12 e pílula) são de hoje', {
  skip: obrigatoria ? false : 'trava da data pulada: só é obrigatória em pull_request ou com REQUIRE_POLICY_DATE_TODAY=1',
}, () => {
  const hoje = hojeSaoPaulo();
  const aviso = ler('licitacoes/politica.html');
  const itens = [...aviso.matchAll(/Versão AVISO-LICITACOES-[\d.]+, de (\d{2}\/\d{2}\/\d{4})\./g)].map((m) => m[1]);
  const pilula = [...aviso.matchAll(/Versão AVISO-LICITACOES-[\d.]+<\/span><span class="pill n">(\d{2}\/\d{2}\/\d{4})</g)].map((m) => m[1]);
  assert.equal(itens.length, 1, 'esperada uma "Versão AVISO-LICITACOES-x, de dd/mm/aaaa." no aviso');
  assert.equal(pilula.length, 1, 'esperada uma data na pílula de versão do aviso');
  for (const [nome, d] of [['aviso (item 12)', itens[0]], ['aviso (pílula)', pilula[0]]]) {
    assert.equal(d, hoje, `${nome} diz ${d}, mas hoje em America/Sao_Paulo é ${hoje}: ajuste a data para o dia da publicação e reexecute o CI`);
  }
});

test('licitações: trava de publicação dos Termos (placeholder e data) — aplicada só no deploy (workflow Pages na main)', (t) => {
  const paginas = Object.fromEntries(PAGINAS_TRAVADAS.map((p) => [p, ler(p)]));
  const { erros, avisos } = travaLicitacoes({ deploy: ehDeploy(), hoje: hojeSaoPaulo(), paginas });
  for (const a of avisos) { t.diagnostic('AVISO: ' + a); console.log('AVISO (esperado no PR): ' + a); }
  assert.deepEqual(erros, [], erros.join('\n'));
});

test('trava dos Termos: no deploy falha no placeholder; sem deploy passa com aviso; preenchida com hoje passa', () => {
  assert.equal(ehDeploy({ GITHUB_WORKFLOW: 'Pages', GITHUB_REF: 'refs/heads/main' }), true);
  assert.equal(ehDeploy({ GITHUB_WORKFLOW: 'CI', GITHUB_REF: 'refs/heads/main' }), false);
  assert.equal(ehDeploy({ GITHUB_WORKFLOW: 'CI', GITHUB_REF: 'refs/pull/35/merge' }), false);
  assert.equal(ehDeploy({ DEPLOY: '1' }), false);
  // Fixture (não o arquivo real), para o teste continuar válido depois que a data for preenchida no deploy.
  const termos = '<p>Versão: TERMOS-VENDA-LICITACOES-1.3 · Data: [DATA DE PUBLICAÇÃO]</p>';
  const pag = (tx) => ({ 'licitacoes/cobranca/index.html': tx, 'licitacoes/politica.html': '' });
  const emDeploy = travaLicitacoes({ deploy: true, hoje: '24/10/2026', paginas: pag(termos) });
  assert.ok(emDeploy.erros.some((e) => e.includes('[DATA DE PUBLICAÇÃO]')), 'DEPLOY=1 tem de falhar no placeholder');
  const noPr = travaLicitacoes({ deploy: false, hoje: '24/10/2026', paginas: pag(termos) });
  assert.deepEqual(noPr.erros, []);
  assert.ok(noPr.avisos.some((a) => a.startsWith('placeholder pendente de deploy')));
  const preenchido = termos.replace('[DATA DE PUBLICAÇÃO]', '24/10/2026');
  assert.deepEqual(travaLicitacoes({ deploy: true, hoje: '24/10/2026', paginas: pag(preenchido) }).erros, []);
  assert.equal(travaLicitacoes({ deploy: true, hoje: '25/10/2026', paginas: pag(preenchido) }).erros.length, 1);
});

test('detector de placeholder: acusa [MAIÚSCULAS], ignora checkbox e minúsculas', () => {
  assert.deepEqual(placeholders('a [PREÇO] b [ ] c [x] d\n[PRAZO, NO MÁXIMO 5 DIAS ÚTEIS]'), ['1: [PREÇO]', '2: [PRAZO, NO MÁXIMO 5 DIAS ÚTEIS]']);
  assert.deepEqual(placeholders('action="[ORIGEM_CHECKOUT]/checkout"'), ['1: [ORIGEM_CHECKOUT]']);
});
