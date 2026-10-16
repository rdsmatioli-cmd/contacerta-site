import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { guias } from './_src/content/_guias.mjs';
import { INSS, IRRF, SALARIO_MINIMO, MEI, SEGURO_DESEMPREGO } from './_src/js/tabelas.js';
import * as C from './_src/js/calc.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const strip = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ');
const contar = (html) => strip(html).split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
const R = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\u00a0/g, ' ');

test('páginas de tabela usam só os dados do código e cabem no limite de palavras', () => {
  assert.deepEqual(guias.map((g) => g.slug), [
    'tabela-inss-2026',
    'tabela-ir-2026',
    'salario-minimo-2026',
    'tabela-seguro-desemprego-2026',
  ]);
  const slugsGuia = new Set(guias.map((g) => g.slug));
  const slugsCalc = new Set(
    // No repo publicado não há src/: as calculadoras são as pastas com index.html na raiz.
    readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(join(root, d.name, 'index.html')))
      .map((d) => d.name),
  );
  for (const g of guias) {
    assert.match(g.h1, /2026/, g.slug);
    assert.ok(g.title.length <= 65, `${g.slug} title ${g.title.length}: ${g.title}`);
    assert.ok(g.description.length >= 70 && g.description.length <= 165, `${g.slug} description ${g.description.length}`);
    assert.equal(new Set([g.title, g.description, g.h1]).size, 3);
    const palavras = contar(g.lead + g.resposta + g.artigo + g.faq.map((f) => f.q + ' ' + f.a).join(' '));
    assert.ok(palavras >= 600 && palavras <= 1200, `${g.slug}: ${palavras} palavras`);
    assert.ok(g.faq.length >= 4, g.slug);
    assert.ok(g.fontes.length >= 1 && g.fontes.every((f) => /^https:\/\//.test(f.url)), g.slug);
    assert.ok(g.artigo.includes(`href="/${g.calculadora}/"`), g.slug);
    assert.doesNotMatch(g.artigo + g.resposta + g.lead, /ca-pub-|data-ad-slot/);
    assert.doesNotMatch(g.artigo, /<h1/);
    for (const s of g.relacionadas) assert.ok(slugsGuia.has(s) || slugsCalc.has(s), `${g.slug} -> ${s}`);
    for (const s of g.apareceEm) assert.ok(slugsCalc.has(s), s);
  }

  const [inn, ir, sm, sd] = guias;
  assert.equal(inn.fontes[0].url, INSS.url);
  assert.ok(inn.artigo.includes(R(INSS.teto)));
  assert.ok(inn.artigo.includes(R(C.inssEmpregado(INSS.teto).inss)));
  assert.ok(inn.artigo.includes('10,03%'));

  assert.equal(ir.fontes[0].url, IRRF.url);
  assert.ok(ir.resposta.includes(R(IRRF.reducao.isencaoAte)));
  assert.ok(ir.artigo.includes(R(IRRF.deducaoDependente)));
  assert.ok(ir.artigo.includes(R(IRRF.descontoSimplificado)));
  const ir5 = C.irrfMensal({ rendimentos: 5000, inss: C.inssEmpregado(5000).inss });
  assert.equal(ir5.irrf, 0);
  assert.ok(ir.artigo.includes(R(ir5.irrf)));

  assert.equal(sm.fontes[0].url, SALARIO_MINIMO.url);
  assert.ok(sm.resposta.includes(R(SALARIO_MINIMO.valor)));
  assert.ok(sm.artigo.includes(R(MEI.inss)));
  assert.ok(sm.artigo.includes(R(C.salarioLiquido({ bruto: SALARIO_MINIMO.valor }).liquido)));

  assert.equal(sd.fontes[0].url, SEGURO_DESEMPREGO.url);
  assert.ok(sd.resposta.includes(R(SEGURO_DESEMPREGO.teto)));
  assert.ok(sd.resposta.includes(R(SEGURO_DESEMPREGO.piso)));
  const parcela = C.seguroDesemprego({ salarios: [3000, 3000, 3000], solicitacao: 1, mesesTrabalhados: 18 }).parcela;
  assert.ok(sd.artigo.includes(R(parcela)));
  assert.match(sd.artigo, /80%/);
  assert.match(sd.artigo, /50%/);
});
