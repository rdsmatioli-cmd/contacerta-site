// CH-08: a miniatura do hero usa a saída real da calculadora de salário líquido (sem valores fixos).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heroHome } from './_src/content/_visual.mjs';
import { salarioLiquido } from './_src/js/calc.js';

const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\u00a0/g, ' ');

test('miniatura do hero mostra os valores calculados por salarioLiquido', () => {
  const ex = salarioLiquido({ bruto: 3500 });
  const html = heroHome({ h1: 'x', lead: 'y', calcs: [], guias: [], dataBR: '10/10/2026', iso: '2026-10-10' });
  assert.match(html, new RegExp(`class="mini-valor">${brl(ex.liquido).replace(/[$.]/g, '\\$&')}<`));
  for (const v of [ex.bruto, ex.inss, ex.irrf]) assert.ok(html.includes(brl(v)), `faltou ${brl(v)}`);
  assert.ok(!/captura-salario-liquido/.test(html), 'não deve haver imagem estática');
});
