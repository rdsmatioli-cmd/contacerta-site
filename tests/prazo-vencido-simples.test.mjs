// CC-CALC-FINANCEIRO-02 (31/10/2026): depois do retarget do Simples híbrido, nada pode prometer o prazo vencido de
// 30/10/2026 (opção pelo regime regular de IBS/CBS para jan-jun/2027). O cancelamento da opção, de 03/11 a 20/12/2026
// (Resolução CGSN nº 194/2026), aparece no simulador e no calendário. Datas ficam fora das FAQs do simulador (retarget).
// Qualquer "30/10", "30 de outubro" ou "fim de outubro" fora das fontes precisa estar na lista de exceções (datas de
// publicação e marcos históricos). Travas: depois de 20/12/2026, nenhum texto oferece o cancelamento como aberto; a partir
// de 01/04/2027, a "próxima janela" deixa de ser março de 2027.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const ler = (p) => readFileSync(join(raiz, p), 'utf8');
const listar = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  if (['.git', 'node_modules', 'tests'].includes(d.name)) return [];
  const p = join(dir, d.name);
  return d.isDirectory() ? listar(p) : d.name.endsWith('.html') ? [relative(raiz, p).split(sep).join('/')] : [];
});
// Títulos das fontes citadas (lista de fontes e "citation" do JSON-LD) descrevem o ato como foi publicado: ficam de fora.
const semFontes = (h) => h.replace(/<section class="fontes"[^]*?<\/section>/g, '').replace(/"citation":\[[^\]]*\]/g, '');
const DATA = /30\/10|30 de outubro|(?:fim|final) de outubro/gi;
// Usos permitidos: datas de publicação e de atualização, e marcos que já passaram, descritos como passados.
const EXCECOES = [
  /<time datetime="2026-10-30">[^<]*<\/time>/g,
  /Última atualização: 30\/10\/2026/g,
  /<td>30\/10\/2026<\/td>/g, // linha da tabela do calendário (marco histórico)
  /30\/10\/2026 para o envio do cálculo pelo TCU/g, // prazo legal do TCU (art. 353, § 2º), já cumprido
  /foi feita de 01\/09 a 30\/10\/2026/g,
  /encerrado em 30\/10\/2026/g, // comentário do ui.js
];
const achados = (texto) => {
  let t = texto;
  for (const e of EXCECOES) t = t.replace(e, '');
  return [...t.matchAll(DATA)].map((m) => t.slice(Math.max(0, m.index - 60), m.index + m[0].length + 20).replace(/\s+/g, ' '));
};

test('regra de 30/10: pega formas comuns de prometer o prazo vencido e aceita as exceções', () => {
  for (const f of ['Prazo da opção: 30/10/2026', 'O prazo termina em 30/10/2026.', 'Faça a opção até o fim de outubro.', 'Vence em 30/10.', 'até 30 de outubro'])
    assert.equal(achados(f).length, 1, f);
  for (const f of ['Publicado em <time datetime="2026-10-30">30/10/2026</time>', '<tr><td>30/10/2026</td><td>Fim do prazo</td></tr>', 'A opção foi feita de 01/09 a 30/10/2026; quem optou'])
    assert.deepEqual(achados(f), [], f);
});

test('nenhuma página, o feed, o llms.txt ou o ui.js promete o prazo de 30/10/2026', () => {
  const falhas = [];
  // licitacoes/: versões e datas de publicação dos documentos do Licitações, sem relação com o Simples
  for (const p of listar(raiz).filter((x) => !x.startsWith('licitacoes/'))) for (const a of achados(semFontes(ler(p)))) falhas.push(`${p}: ${a}`);
  for (const p of ['blog/feed.xml', 'llms.txt', 'assets/js/ui.js', 'assets/js/calc.js']) for (const a of achados(ler(p))) falhas.push(`${p}: ${a}`);
  assert.deepEqual(falhas, []);
  assert.doesNotMatch(ler('assets/js/ui.js'), /posPrazo/);
});

test('cancelamento de 03/11 a 20/12/2026: simulador, resultado (só até 20/12/2026) e calendário', () => {
  const sh = ler('simples-hibrido/index.html');
  assert.match(sh, /<p id="cancelar">Quem fez a opção para o 1º semestre de 2027 pode cancelá-la de 03\/11 a 20\/12\/2026, em caráter irretratável/);
  const ui = ler('assets/js/ui.js');
  assert.ok(ui.includes("(hoje() <= '2026-12-20' ? 'Quem optou para janeiro a junho de 2027 pode cancelar a opção até 20/12/2026, em caráter irretratável"));
  assert.match(ui, /Próxima janela de opção: março de 2027, para valer de julho a dezembro de 2027/);
  assert.match(ler('calendario-reforma-tributaria/index.html'), /pode cancelá-la de 03\/11 a 20\/12\/2026, em caráter irretratável/);
});

test('cancelamento e empresas novas: FAQ do simulador e do calendário, llms.txt, marcos e resultado', () => {
  const sh = ler('simples-hibrido/index.html');
  assert.equal(sh.split('Quem optou para o 1º semestre de 2027 pode cancelar a opção antes do início do semestre, em caráter irretratável, no prazo fixado pelo CGSN.').length - 1, 2);
  assert.equal(sh.split('empresas em início de atividade seguem regra própria (art. 13, § 11)').length - 1, 2);
  const cal = ler('calendario-reforma-tributaria/index.html');
  assert.equal(cal.split('Quem optou para o 1º semestre de 2027 pode cancelar a opção de 03/11 a 20/12/2026, em caráter irretratável').length - 1, 2);
  assert.match(cal, /quem pediu a opção pelo Simples Nacional para 2027 também pode cancelar o pedido/);
  assert.match(ler('llms.txt'), /pode cancelar a opção de 03\/11 a 20\/12\/2026/);
  assert.match(ler('assets/js/ui.js'), /Empresas em início de atividade seguem regra própria \(LC 123\/2006, art\. 13, § 11\)/);
});

test('cancelamento: a partir de 21/12/2026, nenhum texto oferece o prazo de 03/11 a 20/12/2026 como aberto', () => {
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  if (hoje <= '2026-12-20') return;
  const textos = ['simples-hibrido/index.html', 'calendario-reforma-tributaria/index.html', 'llms.txt'].filter((p) => /pode cancel[^.]{0,120}20\/12\/2026/.test(semFontes(ler(p))));
  assert.deepEqual(textos, [], 'O prazo de cancelamento acabou em 20/12/2026: passe esses textos para o passado ou retire-os (o parágrafo #cancelar do simulador tem o aviso REVISAR/REMOVER).');
});

test('FAQ do simulador do Simples sem datas (FAQPage e visível)', () => {
  const sh = ler('simples-hibrido/index.html');
  const faq = sh.match(/"@type":"FAQPage"[^]*?<\/script>/)[0];
  const vis = sh.match(/<section class="faq"[^]*?<\/section>/)[0];
  assert.doesNotMatch(faq + vis, /\d{2}\/\d{2}\/\d{4}/);
});

test('janela de março de 2027: a partir de 01/04/2027, atualizar a "próxima janela" (setembro de 2027)', () => {
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  if (hoje < '2027-04-01') return;
  const textos = ['simples-hibrido/index.html', 'calendario-reforma-tributaria/index.html', 'assets/js/ui.js'].filter((p) => /[Pp]róxima janela (?:é|de opção:) março de 2027/.test(ler(p)));
  assert.deepEqual(textos, [], 'A janela de março de 2027 já passou: troque a "próxima janela" (e o calendário) pela de setembro de 2027, conferindo a regulamentação do CGSN.');
});
