// CC-CALC-TRABALHISTA-01 (31/10/2026): EC 141/2026 (DOU de 16/10/2026, Edição Extra A). Jornada normal de até 42 h
// semanais 2 meses após a publicação (16/12/2026) e 40 h 1 ano depois (16/12/2027); 2 repousos semanais remunerados a
// partir de 16/12/2026; sem redução salarial. Divisor padrão das calculadoras de horas extras e adicional noturno por
// data (220, 210, 200), preenchido só quando o campo não foi editado. Mesmas datas do simulador do Empregador em Dia.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as C from '../assets/js/calc.js';
import { JORNADA } from '../assets/js/empregador/config.js';
import { INSS } from '../assets/js/tabelas.js';

const ler = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const BRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const EC_URL = 'https://www.in.gov.br/web/dou/-/emenda-constitucional-n-141-738818165';

test('jornadaPadrao: 220 até 15/12/2026, 210 de 16/12/2026, 200 de 16/12/2027', () => {
  const div = (d) => C.jornadaPadrao(d).divisor;
  assert.equal(div('2026-10-31'), 220);
  assert.equal(div('2026-12-15'), 220);
  assert.equal(div('2026-12-16'), 210);
  assert.equal(div('2027-12-15'), 210);
  assert.equal(div('2027-12-16'), 200);
  assert.equal(div('2030-01-01'), 200);
  assert.equal(div(''), 220);
  assert.equal(C.jornadaPadrao('2026-12-16').repousosSemanais, 2);
  for (const j of C.JORNADA_CLT) assert.equal(j.divisor, j.horas * 5, `${j.horas} h`);
  // dias padrão num mês de 30 dias com 1 feriado: 1 repouso por semana -> 25 + 5; 2 repousos -> 21 + 9
  assert.deepEqual(C.JORNADA_CLT.map((j) => [j.repousosSemanais, j.diasUteis, j.diasRepouso]), [[1, 25, 5], [2, 21, 9], [2, 21, 9]]);
  for (const j of C.JORNADA_CLT) assert.equal(j.diasUteis + j.diasRepouso, 30);
});

test('mesmas datas e divisores do Empregador em Dia (config.js, JORNADA)', () => {
  assert.equal(JORNADA.atual, C.JORNADA_CLT[0].horas);
  assert.deepEqual(JORNADA.etapas.map((e) => [e.desde, e.horas, e.divisor]), C.JORNADA_CLT.slice(1).map((j) => [j.desde, j.horas, j.divisor]));
});

test('ui.js preenche o divisor pela data só se o campo não foi editado, e explica no resultado', () => {
  const ui = ler('assets/js/ui.js');
  assert.match(ui, /if \(\(id === 'horas-extras' \|\| id === 'adicional-noturno'\) && form\.elements\.jornada && typeof C\.jornadaPadrao === 'function'\) \{/);
  assert.match(ui, /const jp = C\.jornadaPadrao\(hoje\(\)\);\n\s*if \(el\.value\.trim\(\) === el\.defaultValue\) el\.value = String\(jp\.divisor\);/);
  // dias úteis e de repouso: mesma regra do campo não editado
  assert.match(ui, /for \(const \[nome, v\] of \[\['diasUteis', jp\.diasUteis\], \['domingos', jp\.diasRepouso\]\]\) \{\n\s*const campo = form\.elements\[nome\];\n\s*if \(campo && v != null && campo\.value\.trim\(\) === campo\.defaultValue\) campo\.value = String\(v\);/);
  assert.equal((ui.match(/Dias úteis e de repouso padrão pela data: 25 e 5 até 15\/12\/2026 \(1 repouso por semana\); 21 e 9 a partir de 16\/12\/2026 \(2 repousos por semana\)/g) || []).length, 2);
  assert.equal((ui.match(/Padrão pela EC 141\/2026: 220 \(44 horas semanais\) até 15\/12\/2026, 210 \(42 horas\) a partir de 16\/12\/2026 e 200 \(40 horas\) a partir de 16\/12\/2027/g) || []).length, 2);
});

test('páginas: ajuda do divisor, repousos, FAQ da EC 141 (FAQPage = visível), exemplos e fonte', () => {
  const tira = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+\./g, '.').replace(/\s+/g, ' ').trim();
  for (const p of ['horas-extras', 'adicional-noturno']) {
    const h = ler(`${p}/index.html`);
    assert.match(h, /id="f-jornada" name="jornada"[^>]*value="220"/, p); // HTML: valor do dia; o JS troca pela data
    assert.match(h, /220 para 44 h por semana até 15\/12\/2026, 210 para 42 h a partir de 16\/12\/2026 e 200 para 40 h a partir de 16\/12\/2027/, p);
    assert.match(h, /<label for="f-domingos">Dias de repouso e feriados no mês<\/label>/, p);
    assert.match(h, /aria-describedby="f-domingos-ajuda f-domingos-msg"><\/div><div id="f-domingos-ajuda" class="ajuda"><small>[^<]*2 dias de repouso semanal remunerado/, p);
    assert.doesNotMatch(h, /Domingos e feriados no mês/, p);
    // HTML com os dias da regra atual (o JS troca pela data); ajudas citam os dois padrões
    assert.match(h, /id="f-diasUteis" name="diasUteis"[^>]*value="25"/, p);
    assert.match(h, /id="f-domingos" name="domingos"[^>]*value="5"/, p);
    assert.match(h, /Padrão pela data de hoje: 25 até 15\/12\/2026; 21 a partir de 16\/12\/2026/, p);
    assert.match(h, /Padrão pela data de hoje: 5 até 15\/12\/2026; 9 a partir de 16\/12\/2026/, p);
    const ld = JSON.parse(h.match(/<script type="application\/ld\+json">(\{"@context":"https:\/\/schema\.org","@type":"FAQPage".*?)<\/script>/)[1]).mainEntity;
    const vis = [...h.matchAll(/<details><summary>(.*?)<\/summary><div>(.*?)<\/div><\/details>/g)];
    assert.equal(ld.length, vis.length, p);
    ld.forEach((q, i) => { assert.equal(tira(vis[i][1]), q.name); assert.equal(tira(vis[i][2]), tira(q.acceptedAnswer.text)); });
    const ec = ld.find((q) => q.name === 'O que muda com a Emenda Constitucional 141/2026?');
    assert.ok(ec, p);
    assert.match(ec.acceptedAnswer.text, /42 horas semanais a partir de 16\/12\/2026 e para 40 horas a partir de 16\/12\/2027, sem redução do salário/);
    // art. 8º (diploma de nível superior e 2,5 tetos do RGPS, desde a publicação) e art. 3º (cláusulas coletivas incompatíveis)
    const lim = Math.ceil(INSS.teto * 2.5 * 100) / 100;
    assert.ok(ec.acceptedAnswer.text.includes(`2,5 vezes o teto dos benefícios do INSS (${BRL(lim)} em 2026, com o teto de ${BRL(INSS.teto)})`), `${p}: art. 8º`);
    assert.match(ec.acceptedAnswer.text, /\(art\. 8º\)\. A partir de 16\/12\/2026, as cláusulas de convenções e acordos coletivos sobre jornada e repouso incompatíveis com a emenda ficam sem efeito \(art\. 3º\)/);
    assert.ok(h.includes(`href="${EC_URL}"`) && h.includes(`"url":"${EC_URL}"`), `${p}: fonte da EC 141`);
  }
  assert.ok(ler('horas-extras/index.html').includes(`R$ 3.300,00 ÷ 210 = ${BRL(C.horasExtras({ salario: 3300, jornadaMensal: 210 }).valorHora)}`.replace(/R\$ /g, 'R$ ')));
  assert.ok(ler('adicional-noturno/index.html').includes(`R$ 2.200,00 ÷ 210 = ${BRL(C.adicionalNoturno({ salario: 2200, jornadaMensal: 210 }).valorHora)}`.replace(/R\$ /g, 'R$ ')));
  // sábado: a lei não regulamentou o segundo dia de repouso; regra atual do repouso com fonte, sem "costuma"
  const he = ler('horas-extras/index.html');
  assert.equal(he.split('mas a lei ainda não regulamentou o segundo dia. Pela regra atual do repouso semanal (Lei 605/1949; Súmula 146 do TST), o trabalho em dia de repouso ou feriado não compensado com folga em outro dia é pago em dobro.').length - 1, 2);
  assert.doesNotMatch(he, /costuma ser pago a 100%/);
  // divisor: horas semanais × 5 (Súmula 431), não "÷ 6 dias × 30"; 8 h por dia e art. 7º da EC
  assert.doesNotMatch(he, /÷ 6 dias × 30/);
  assert.equal(he.split('horas semanais × 5, a mesma proporção da Súmula 431 do TST').length - 1, 2);
  assert.equal(he.split('as 42 horas só se completam com compensação de horários ou com a jornada diária ampliada por convenção ou acordo coletivo (EC 141/2026, art. 7º)').length - 1, 2);
});

test('stub M-02 do simulador de 42 h segue fora do índice', () => {
  const h = ler('empregador-em-dia/jornada-42h/index.html');
  assert.match(h, /<meta name="robots" content="noindex, nofollow">/);
  assert.ok(!ler('sitemap.xml').includes('/empregador-em-dia/jornada-42h/'));
});
