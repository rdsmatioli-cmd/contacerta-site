// CC-CALC-FINANCEIRO-02 (31/10/2026): depois do retarget do Simples híbrido, nada pode prometer o prazo vencido de
// 30/10/2026 (opção pelo regime regular de IBS/CBS para jan-jun/2027). O cancelamento da opção, de 03/11 a 20/12/2026
// (Resolução CGSN nº 194/2026), aparece no simulador e no calendário. Datas ficam fora das FAQs do simulador (retarget).
// O último teste vence em 01/04/2027: a "próxima janela" deixa de ser março de 2027.
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
const PROMESSA = /até (?:o dia )?30\/10(?:\/2026)?\b|até 30 de outubro|prazo (?:da opção )?(?:é|vai) até 30\/10|Prazo da opção para jan-jun\/2027/i;

test('nenhuma página, o feed, o llms.txt ou o ui.js promete o prazo de 30/10/2026', () => {
  const falhas = [];
  for (const p of listar(raiz)) if (PROMESSA.test(semFontes(ler(p)))) falhas.push(p);
  for (const p of ['blog/feed.xml', 'llms.txt', 'assets/js/ui.js', 'assets/js/calc.js']) if (PROMESSA.test(ler(p))) falhas.push(p);
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
