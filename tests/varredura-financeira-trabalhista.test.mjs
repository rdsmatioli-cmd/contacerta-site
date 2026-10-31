// Varredura de 31/10/2026 (textos financeiros e trabalhistas):
// - rotativo e parcelamento da fatura do cartão: juros e encargos limitados ao valor original da dívida (Lei 14.690/2023,
//   art. 28, § 1º, DOU de 03/10/2023); cheque especial: juros de até 8% ao mês (Resolução CMN nº 4.765/2019, art. 3º).
//   Exemplo de dívida no rotativo que cresce além do dobro precisa citar o teto no mesmo parágrafo.
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

test('rotativo: parágrafo com a dívida crescendo cita o teto da Lei 14.690/2023; cheque especial sem taxa acima de 8% ao mês', () => {
  const falhas = [];
  for (const p of listar(raiz)) {
    for (const t of paragrafos(ler(p))) {
      // frase com o rotativo e a dívida crescendo em reais: o parágrafo precisa citar o teto
      if (frases(t).some((f) => /rotativo/i.test(f) && /\b(?:vira|viram|passa de|passaria|cresce)\b/i.test(f) && /R\$\s?\d/.test(f)) && !/14\.690/.test(t)) falhas.push(`${p}: ${t.slice(0, 90)}`);
      for (const f of frases(t).filter((x) => /cheque especial/i.test(x)))
        for (const m of f.matchAll(/(\d+(?:,\d+)?)% ao mês/g)) if (Number(m[1].replace(',', '.')) > 8) falhas.push(`${p}: cheque especial com ${m[0]}`);
    }
  }
  assert.deepEqual(falhas, []);
  assert.match(ler('juros-compostos/index.html'), /uma fatura de R\$ 1\.000,00 não passa de R\$ 2\.000,00 nessas linhas/);
  assert.match(ler('blog/juros-compostos-exemplo/index.html'), /os R\$ 2\.000 ficariam limitados a R\$ 4\.000, o dobro/);
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
