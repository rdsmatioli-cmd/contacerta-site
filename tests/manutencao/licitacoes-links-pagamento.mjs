// DEC CEO 06/11 20h50 (S-PL1 = só a constante): aplica tests/config-pagamento-links.mjs em licitacoes/assinar/index.html.
// Uso no build do Pages: node tests/manutencao/licitacoes-links-pagamento.mjs <pasta do _site>. Sem argumento, não grava nada.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LINKS_PAGAMENTO, ROTULOS, EM_BREVE, NA_PAGINA, PAGINA_ASSINAR, VENDA_LICITACOES } from '../config-pagamento-links.mjs';

export function render(html, links = LINKS_PAGAMENTO) {
  let out = html;
  for (const k of NA_PAGINA) {
    const re = new RegExp(`<p class="compra" data-produto="${k}">[\\s\\S]*?</p>`);
    if (!re.test(out)) throw new Error(`bloco do produto ${k} ausente`);
    const dentro = links[k] ? `<a class="btn" href="${links[k]}">${ROTULOS[k]}</a>` : `<span class="btn" aria-disabled="true">${EM_BREVE[k]}</span>`;
    out = out.replace(re, () => `<p class="compra" data-produto="${k}">${dentro}</p>`);
  }
  return out;
}
// PR-S0 (DEC CEO 11/11 19h17): arquivos .html sob <raiz>/licitacoes/ que citam buy.stripe.com.
export function paginasComStripe(raiz) {
  const achados = [];
  const andar = (d) => {
    for (const n of readdirSync(d)) {
      const f = join(d, n);
      if (statSync(f).isDirectory()) andar(f);
      else if (n.endsWith('.html') && readFileSync(f, 'utf8').includes('buy.stripe.com')) achados.push(f);
    }
  };
  andar(join(raiz, 'licitacoes'));
  return achados;
}
if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv[2]) {
  if (VENDA_LICITACOES === 'fechada' && Object.values(LINKS_PAGAMENTO).some(Boolean)) throw new Error('venda fechada com slot de link preenchido');
  const p = join(process.argv[2], PAGINA_ASSINAR);
  writeFileSync(p, render(readFileSync(p, 'utf8')));
  console.log(`${PAGINA_ASSINAR}: ${NA_PAGINA.filter((k) => LINKS_PAGAMENTO[k]).length} link(s) LIVE`);
  if (VENDA_LICITACOES === 'fechada') {
    const achados = paginasComStripe(process.argv[2]);
    if (achados.length) throw new Error(`venda fechada, mas há buy.stripe.com em: ${achados.join(', ')}`);
    console.log('venda fechada: nenhuma página de licitacoes/ com buy.stripe.com');
  }
}
