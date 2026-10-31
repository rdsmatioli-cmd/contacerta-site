// CC-CALC-TRABALHISTA-01 (31/10/2026): EC 141/2026 (DOU de 16/10/2026, Edição Extra A). Jornada normal de até 42 h
// semanais 2 meses após a publicação (16/12/2026) e 40 h 1 ano depois (16/12/2027); 2 repousos semanais remunerados a
// partir de 16/12/2026; sem redução salarial. Divisor padrão das calculadoras de horas extras e adicional noturno por
// data (220, 210, 200), preenchido só quando o campo não foi editado. Mesmas datas do simulador do Empregador em Dia.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as C from '../assets/js/calc.js';
import { JORNADA } from '../assets/js/empregador/config.js';

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
});

test('mesmas datas e divisores do Empregador em Dia (config.js, JORNADA)', () => {
  assert.equal(JORNADA.atual, C.JORNADA_CLT[0].horas);
  assert.deepEqual(JORNADA.etapas.map((e) => [e.desde, e.horas, e.divisor]), C.JORNADA_CLT.slice(1).map((j) => [j.desde, j.horas, j.divisor]));
});

test('ui.js preenche o divisor pela data só se o campo não foi editado, e explica no resultado', () => {
  const ui = ler('assets/js/ui.js');
  assert.match(ui, /if \(\(id === 'horas-extras' \|\| id === 'adicional-noturno'\) && form\.elements\.jornada && typeof C\.jornadaPadrao === 'function'\) \{/);
  assert.match(ui, /if \(el\.value\.trim\(\) === el\.defaultValue\) el\.value = String\(C\.jornadaPadrao\(hoje\(\)\)\.divisor\);/);
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
    const ld = JSON.parse(h.match(/<script type="application\/ld\+json">(\{"@context":"https:\/\/schema\.org","@type":"FAQPage".*?)<\/script>/)[1]).mainEntity;
    const vis = [...h.matchAll(/<details><summary>(.*?)<\/summary><div>(.*?)<\/div><\/details>/g)];
    assert.equal(ld.length, vis.length, p);
    ld.forEach((q, i) => { assert.equal(tira(vis[i][1]), q.name); assert.equal(tira(vis[i][2]), tira(q.acceptedAnswer.text)); });
    const ec = ld.find((q) => q.name === 'O que muda com a Emenda Constitucional 141/2026?');
    assert.ok(ec, p);
    assert.match(ec.acceptedAnswer.text, /42 horas semanais a partir de 16\/12\/2026 e para 40 horas a partir de 16\/12\/2027, sem redução do salário/);
    assert.ok(h.includes(`href="${EC_URL}"`) && h.includes(`"url":"${EC_URL}"`), `${p}: fonte da EC 141`);
  }
  assert.ok(ler('horas-extras/index.html').includes(`R$ 3.300,00 ÷ 210 = ${BRL(C.horasExtras({ salario: 3300, jornadaMensal: 210 }).valorHora)}`.replace(/R\$ /g, 'R$ ')));
  assert.ok(ler('adicional-noturno/index.html').includes(`R$ 2.200,00 ÷ 210 = ${BRL(C.adicionalNoturno({ salario: 2200, jornadaMensal: 210 }).valorHora)}`.replace(/R\$ /g, 'R$ ')));
  assert.match(ler('horas-extras/index.html'), /<summary>Qual o divisor para quem trabalha 44 horas por semana\?<\/summary><div><p>220\. A conta é 44 horas ÷ 6 dias × 30 dias\. Com a Emenda Constitucional 141\/2026/);
});

test('stub M-02 do simulador de 42 h segue fora do índice', () => {
  const h = ler('empregador-em-dia/jornada-42h/index.html');
  assert.match(h, /<meta name="robots" content="noindex, nofollow">/);
  assert.ok(!ler('sitemap.xml').includes('/empregador-em-dia/jornada-42h/'));
});
