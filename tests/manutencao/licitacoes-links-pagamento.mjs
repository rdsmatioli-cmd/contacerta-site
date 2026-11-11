// DEC CEO 06/11 20h50 (S-PL1 = só a constante): aplica tests/config-pagamento-links.mjs em licitacoes/assinar/index.html.
// Uso no build do Pages: node tests/manutencao/licitacoes-links-pagamento.mjs <pasta do _site>. Sem argumento, não grava nada.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LINKS_PAGAMENTO, ROTULOS, EM_BREVE, NA_PAGINA, PAGINA_ASSINAR } from '../config-pagamento-links.mjs';

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
if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv[2]) {
  const p = join(process.argv[2], PAGINA_ASSINAR);
  writeFileSync(p, render(readFileSync(p, 'utf8')));
  console.log(`${PAGINA_ASSINAR}: ${NA_PAGINA.filter((k) => LINKS_PAGAMENTO[k]).length} link(s) LIVE`);
}
