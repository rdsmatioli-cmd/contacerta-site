// Pós-build do lote 1: cards das relacionadas via card(), sprite só com os símbolos usados (sprite()) e bloco
// "Guias recentes" da home via blocoGuiasRecentes() na ordem do índice do blog.
import { readFileSync as r, writeFileSync as w } from 'node:fs';
import { card, sprite, COR_CAT } from '../content/_visual.mjs';
import { blocoGuiasRecentes } from '../content/_seo.mjs';
const REL = {
  'como-calcular-markup': [['markup', 'Calculadora de markup', 'Preço de venda a partir do custo e dos percentuais.'], ['porcentagem', 'Porcentagem', 'Calcule aumentos, descontos e variações.'], ['custo-funcionario', 'Custo de funcionário', 'Quanto custa um empregado para a empresa.']],
  'juros-compostos-exemplo': [['juros-compostos', 'Calculadora de juros compostos', 'Simule aplicações com aportes e taxa mensal ou anual.'], ['investimentos', 'Investimentos', 'Compare rendimentos de aplicações.'], ['financiamento', 'Financiamento', 'Parcelas pela Tabela Price ou SAC.'], ['parcelado-ou-a-vista', 'Parcelado ou à vista', 'Veja qual opção sai mais barata.']],
};
const CAT = { markup: 'Impostos e MEI', porcentagem: 'Matemática', 'custo-funcionario': 'Trabalho e salário' };
for (const [s, rel] of Object.entries(REL)) {
  const f = `blog/${s}/index.html`; let h = r(f, 'utf8');
  const cards = rel.map(([slug, nome, resumo]) => card({ slug, nome, resumo, cor: COR_CAT[CAT[slug] || 'Finanças e investimentos'] })).join('');
  h = h.replace(/(<section class="relacionadas" aria-labelledby="rel-t"><h2 id="rel-t">Calculadoras relacionadas<\/h2><ul class="cards">).*?(<\/ul>)/s, `$1${cards}$2`);
  h = h.replace(/<svg class="sprite"[^]*?<\/svg>/, () => sprite(h.slice(h.indexOf('<body>'))));
  w(f, h);
}
const idx = r('blog/index.html', 'utf8');
const posts = [...idx.matchAll(/<li><a class="post-card" href="(\/blog\/[^"]+\/)"><small>([^<]+)<\/small><strong>([^<]+)<\/strong>/g)]
  .map((m) => ({ href: m[1], categoria: m[2].replace(/&amp;/g, '&'), titulo: m[3].replace(/&amp;/g, '&') }));
let home = r('index.html', 'utf8');
home = home.replace(/<section class="secao" aria-labelledby="guias">.*?<\/section>\n/s, () => blocoGuiasRecentes(posts));
home = home.replace(/<svg class="sprite"[^]*?<\/svg>/, () => sprite(home.slice(home.indexOf('<body>'))));
w('index.html', home);
console.log('ok', posts.length, 'posts');
