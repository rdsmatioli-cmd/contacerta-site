// Varredura de 31/10/2026 (textos financeiros e trabalhistas):
// - rotativo e parcelamento da fatura do cartão: juros e encargos limitados ao valor original da dívida (Lei 14.690/2023,
//   art. 28, § 1º, DOU de 03/10/2023); cheque especial: juros de até 8% ao mês (Resolução CMN nº 4.765/2019, art. 3º).
//   Parágrafo que fala do rotativo ou da fatura do cartão e tem uma frase com a dívida crescendo em reais precisa citar o
//   teto no mesmo parágrafo (a frase do crescimento não precisa dizer "rotativo"). O teto não inclui o IOF (Resolução CMN
//   nº 4.549/2017, art. 2º-A, na redação da Resolução CMN nº 5.112/2023), e o do cheque especial vale para pessoa física
//   e MEI (Resolução CMN nº 4.765/2019, art. 1º).
// - valores de 2026 do llms.txt = tabelas.js (salário mínimo, INSS, IRRF e redução da Lei 15.270/2025, MEI e
//   seguro-desemprego), conferidos nas fontes primárias em 31/10/2026.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SALARIO_MINIMO, INSS, IRRF, MEI, SEGURO_DESEMPREGO } from '../assets/js/tabelas.js';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const ler = (p) => readFileSync(join(raiz, p), 'utf8');
const listar = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  if (['.git', 'node_modules', 'tests'].includes(d.name)) return [];
  const p = join(dir, d.name);
  return d.isDirectory() ? listar(p) : d.name.endsWith('.html') ? [relative(raiz, p).split(sep).join('/')] : [];
});
const paragrafos = (h) => [...h.matchAll(/<p>([^]*?)<\/p>/g)].map((m) => m[1].replace(/<[^>]+>/g, ''));
const frases = (t) => t.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/);
const BR = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CRESCE = /\b(?:vira|viram|virou|passa de|passaria|passam de|cresce|crescem|chega a|chegam a|dobra|triplica)\b/i;
const CARTAO = /rotativo|fatura do cartão|cartão de crédito/i;
// Devolve os parágrafos em falta: falam do cartão, têm frase com a dívida crescendo em reais e não citam a Lei 14.690.
const semTeto = (paragrafos) => paragrafos.filter((t) => CARTAO.test(t) && frases(t).some((f) => CRESCE.test(f) && /R\$\s?\d/.test(f)) && !/14\.690/.test(t));
const chequeAcima8 = (t) => frases(t).filter((x) => /cheque especial/i.test(x)).flatMap((f) => [...f.matchAll(/(\d+(?:,\d+)?)% ao mês/g)]).some((m) => Number(m[1].replace(',', '.')) > 8);

test('rotativo: regra por parágrafo pega o crescimento sem a palavra "rotativo" na mesma frase', () => {
  assert.equal(semTeto(['A 10% ao mês, R$ 1.000,00 viram cerca de R$ 3.138,43 em 12 meses. É o que acontece no rotativo do cartão.']).length, 1);
  assert.equal(semTeto(['Uma dívida de R$ 1.000,00 no rotativo passa de R$ 3.000,00 em um ano.']).length, 1);
  assert.equal(semTeto(['A 10% ao mês, R$ 1.000,00 viram R$ 3.138,43. No rotativo, a Lei 14.690/2023 limita juros e encargos.']).length, 0);
  assert.equal(semTeto(['O investimento de R$ 1.000,00 vira R$ 1.126,83 em um ano.']).length, 0);
  assert.ok(chequeAcima8('No cheque especial, a taxa de 10% ao mês dobra a dívida.'));
});

test('rotativo: parágrafo com a dívida crescendo cita o teto da Lei 14.690/2023; cheque especial sem taxa acima de 8% ao mês', () => {
  const falhas = [];
  for (const p of listar(raiz)) {
    const ps = paragrafos(ler(p));
    for (const t of semTeto(ps)) falhas.push(`${p}: ${t.slice(0, 90)}`);
    for (const t of ps) if (chequeAcima8(t)) falhas.push(`${p}: cheque especial acima de 8% ao mês`);
  }
  assert.deepEqual(falhas, []);
  const jc = ler('juros-compostos/index.html');
  assert.match(jc, /numa fatura de R\$\s1\.000,00, os juros e encargos nessas linhas não passam de R\$\s1\.000,00, sem contar o IOF, que é imposto e fica fora do teto/);
  assert.match(jc, /No cheque especial de pessoa física e de MEI, os juros são limitados a 8% ao mês \(Resolução CMN nº 4\.765\/2019, arts\. 1º e 3º\)/);
  const post = ler('blog/juros-compostos-exemplo/index.html');
  assert.match(post, /nos R\$\s2\.000, juros e encargos ficariam limitados a R\$\s2\.000, e a dívida, a R\$\s4\.000, o dobro, sem contar o IOF/);
  assert.match(post, /<th>Pela conta dos juros compostos<\/th>/);
  assert.doesNotMatch(post, /<th>Saldo devedor<\/th>/);
  // teto de 8% do cheque especial sempre com o alcance (pessoa física e MEI) nas páginas que o citam
  for (const h of [jc, post]) for (const f of frases(paragrafos(h).join(' ')).filter((x) => /cheque especial[^.]*8% ao mês/.test(x))) assert.match(f, /pessoa física/, f);
  for (const h of [jc, post]) assert.ok(h.includes('exibenormativo?tipo=Resolu%C3%A7%C3%A3o%20CMN&numero=5112'), 'fonte da Resolução CMN 5.112/2023');
});

test('llms.txt: valores de 2026 iguais aos de tabelas.js', () => {
  const l = ler('llms.txt');
  for (const v of [SALARIO_MINIMO.valor, INSS.teto, IRRF.descontoSimplificado, IRRF.deducaoDependente, IRRF.reducao.isencaoAte, IRRF.reducao.faixaAte, MEI.inss, SEGURO_DESEMPREGO.teto ?? 2518.65])
    assert.ok(l.includes(`R$ ${BR(v)}`), `llms.txt sem R$ ${BR(v)}`);
  assert.match(l, /Decreto nº 12\.797, de 23\/12\/2025/);
  assert.match(l, /Portaria Interministerial MPS\/MF nº 13, de 09\/01\/2026/);
  assert.deepEqual(INSS.faixas.map((f) => [f.ate, f.aliquota]), [[1621, 0.075], [2902.84, 0.09], [4354.27, 0.12], [8475.55, 0.14]]);
  assert.deepEqual(IRRF.reducao, { isencaoAte: 5000, limiteIsencao: 312.89, faixaAte: 7350, a: 978.62, b: 0.133145 });
});
