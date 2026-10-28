// M-PR33-01 (Advogado): a "Última atualização" da política de privacidade é um literal fixo e precisa ser a data do
// deploy. Como o GitHub Pages publica a main sem workflow de deploy, a trava fica no CI do PR: falha se a data da
// política for diferente de hoje em America/Sao_Paulo (= TZ=America/Sao_Paulo date +%d/%m/%Y).
// Obrigatória só com REQUIRE_POLICY_DATE_TODAY=1 (passo do ci.yml em PR que altera privacidade/index.html, e pages.yml);
// fora disso é pulada (para a main e os PRs sem relação com a política não quebrarem no dia seguinte). Antes do merge, reexecute o CI do PR no próprio dia e ajuste a data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const obrigatoria = process.env.REQUIRE_POLICY_DATE_TODAY === '1';

export function hojeSaoPaulo(agora = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' })
    .formatToParts(agora).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year}`;
}

test('privacidade: "Última atualização" é a data de hoje em America/Sao_Paulo (M-PR33-01)', {
  skip: obrigatoria ? false : 'trava da data da política pulada: só é obrigatória com REQUIRE_POLICY_DATE_TODAY=1 (PR que altera privacidade/index.html e publicação)',
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
