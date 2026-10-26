// A-02: os preços publicados nas páginas de compra têm de bater com a DEC-CFO (ver config-checkout.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEC_CFO_PRECOS, PAGINAS_COMPRA } from './config-checkout.mjs';

test('A-02: preços das páginas de compra conforme DEC-CFO 4b6e3baa', () => {
  assert.match(DEC_CFO_PRECOS.sha256, /^4b6e3baa[0-9a-f]{56}$/);
  for (const pagina of PAGINAS_COMPRA) {
    const html = readFileSync(new URL(`../${pagina}`, import.meta.url), 'utf8');
    for (const chave of ['radarMensal', 'radarAnual', 'proposta', 'parcelaProposta']) {
      assert.ok(html.includes(DEC_CFO_PRECOS[chave]), `${pagina}: falta "${DEC_CFO_PRECOS[chave]}" (DEC-CFO)`);
    }
    assert.ok(html.includes('por CNPJ'), `${pagina}: Radar tem de ser por CNPJ (DEC-CFO)`);
    const reais = [...html.matchAll(/R\$ ?(\d[\d.]*\d|\d)/g)].map((m) => m[1]);
    // 1.500: "licitação complexa a partir de R$ 1.500" (DEC-CFO); 1.000: teto de responsabilidade do item 8.2, não é preço.
    const permitidos = new Set(['197', '1.970', '990', '495', '1.500', '1.000']);
    for (const v of reais) assert.ok(permitidos.has(v), `${pagina}: valor R$ ${v} fora da DEC-CFO`);
  }
});
