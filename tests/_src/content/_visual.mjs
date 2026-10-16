// Identidade visual do Conta Certa (redesign 09/10/2026): ícones SVG, cabeçalho, rodapé, hero e cards.
// Tudo é HTML/SVG gerado no build, sem imagens externas nem JavaScript de terceiros.
// O build (scripts/build.mjs) importa estas funções; mudanças de visual ficam concentradas aqui e em src/css/style.css.
// Começa com "_", então o build não trata este arquivo como página.
import { blocoGa4, linkPreferencias } from './_ga4.mjs';
import { salarioLiquido } from '../js/calc.js';

// ---------- Ícones (24x24, traço 1.8, desenhados para o projeto)
export const ICONES = {
  carteira: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H17v3"/><path d="M3 7.5V17a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H5.5A2.5 2.5 0 0 1 3 7.5"/><circle cx="16" cy="13.5" r="1.3"/>',
  saida: '<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="M15 16l4-4-4-4"/><path d="M19 12H9"/>',
  presente: '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7M12 8v12"/><path d="M12 8C10.5 4.5 7 4 7 6.2 7 8 12 8 12 8zM12 8c1.5-3.5 5-4 5-1.8C17 8 12 8 12 8z"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  cofre: '<rect x="3.5" y="4" width="17" height="15" rx="2"/><circle cx="12" cy="11.5" r="3.5"/><path d="M12 8v1M12 14v1M7 19v1.5M17 19v1.5"/>',
  relogio: '<circle cx="10.5" cy="13.5" r="7.5"/><path d="M10.5 10v3.5l2.5 1.8"/><path d="M19.5 2.5v5M17 5h5"/>',
  lua: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  guarda: '<path d="M3 12a9 9 0 0 1 18 0z"/><path d="M12 12v6.5a2 2 0 0 1-4 0"/><path d="M12 3v.01"/>',
  calendario: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h3M8 17h6"/>',
  alta: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  casa: '<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
  barras: '<path d="M4 20h16"/><rect x="5.5" y="12" width="3" height="6" rx=".8"/><rect x="10.5" y="8" width="3" height="10" rx=".8"/><rect x="15.5" y="4" width="3" height="14" rx=".8"/>',
  cartao: '<rect x="2.5" y="5.5" width="19" height="13" rx="2"/><path d="M2.5 10h19M6.5 15h4"/>',
  loja: '<path d="M4 10v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9"/><path d="M3 9.5 4.5 4h15L21 9.5a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M10 20v-5h4v5"/>',
  escudo: '<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6z"/><path d="M9 12l2 2 4-4"/>',
  recibo: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  pessoas: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  etiqueta: '<path d="M3 12.6V4a1 1 0 0 1 1-1h8.6a1 1 0 0 1 .7.3l7.4 7.4a1 1 0 0 1 0 1.4l-8.6 8.6a1 1 0 0 1-1.4 0l-7.4-7.4a1 1 0 0 1-.3-.7z"/><circle cx="8" cy="8" r="1.5"/>',
  porcento: '<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
  balanca: '<path d="M12 3v18M7 21h10M5 7h14"/><path d="M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
  regua: '<rect x="2.5" y="8" width="19" height="8" rx="1.5"/><path d="M6.5 8v3M10.5 8v4.5M14.5 8v3M18.5 8v4.5"/>',
  coracao: '<path d="M20.5 9.5c0 5-8.5 10.5-8.5 10.5S3.5 14.5 3.5 9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8.5 2.5z"/><path d="M7 12h2.5l1.5-2 2 4 1.5-2H17"/>',
  bolo: '<path d="M4 20h16v-7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z"/><path d="M4 15.5c1.3 1 2.7 1 4 0s2.7-1 4 0 2.7 1 4 0 2.7-1 4 0"/><path d="M12 11V7.5"/><path d="M12 3.5c.9 1 1 2 0 2.6-1-.6-.9-1.6 0-2.6z"/>',
  tabela: '<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M3.5 9.5h17M3.5 14.5h17M10 9.5V20"/>',
  busca: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  cadeado: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  moeda: '<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.2 0-2.1-.5-2.6-1.3M12 6.5V8M12 16v1.5"/>',
  semcadastro: '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20a6.5 6.5 0 0 1 11-4.7"/><path d="M16.5 15.5l4 4M20.5 15.5l-4 4"/>',
  documento: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M9.5 13.5l2 2 3.5-3.5"/>',
  seta: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  raio: '<path d="M13 2.5 4.5 13.5H12l-1 8 8.5-11H12z"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
  bussola: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  planilha: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 9v12"/>',
  // Reforma Tributária e NR-1 (10/10/2026): ícones próprios para não repetir os de juros, regra de três, markup, aviso prévio e IMC.
  escada: '<path d="M3 20h4.5v-4.5H12V11h4.5V6.5H21"/><path d="M3 20h18"/><path d="M17 3.5h4v4"/>',
  divisao: '<path d="M12 21v-8.5"/><path d="M12 12.5 6 6.5M12 12.5l6-6"/><path d="M6 11V6.5h4.5M18 11V6.5h-4.5"/>',
  etiquetapct: '<path d="M3 12.6V4a1 1 0 0 1 1-1h8.6a1 1 0 0 1 .7.3l7.4 7.4a1 1 0 0 1 0 1.4l-8.6 8.6a1 1 0 0 1-1.4 0l-7.4-7.4a1 1 0 0 1-.3-.7z"/><path d="M15.5 10l-5 5"/><circle cx="10.6" cy="10.4" r=".9"/><circle cx="15.4" cy="14.6" r=".9"/><circle cx="7.5" cy="7.5" r="1.3"/>',
  calprazo: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8.5 15l2.3 2.3 4.7-4.6"/>',
  mente: '<path d="M8.5 21v-3.2A7.5 7.5 0 1 1 19 10.5l1.6 3.3H19v2.7a2 2 0 0 1-2 2h-2V21"/><path d="M11.8 12.6s-2.6-1.5-2.6-3.1a1.4 1.4 0 0 1 2.6-.7 1.4 1.4 0 0 1 2.6.7c0 1.6-2.6 3.1-2.6 3.1z"/>',
};

// Ícone de cada calculadora (slug) e de cada categoria
export const ICONE_CALC = {
  'salario-liquido': 'carteira', rescisao: 'saida', 'decimo-terceiro': 'presente', ferias: 'sol', fgts: 'cofre',
  'horas-extras': 'relogio', 'adicional-noturno': 'lua', 'seguro-desemprego': 'guarda', 'aviso-previo': 'calendario',
  'juros-compostos': 'alta', financiamento: 'casa', investimentos: 'barras', 'parcelado-ou-a-vista': 'cartao',
  'das-mei': 'loja', inss: 'escudo', 'imposto-de-renda': 'recibo', 'custo-funcionario': 'pessoas', markup: 'etiqueta',
  porcentagem: 'porcento', 'regra-de-tres': 'balanca', 'conversor-de-medidas': 'regua', imc: 'coracao', idade: 'bolo',
  'transicao-cbs-ibs': 'escada', 'simples-hibrido': 'divisao', 'preco-reforma-tributaria': 'etiquetapct', 'credito-travado': 'cadeado',
  'calendario-reforma-tributaria': 'calprazo', 'nr1-riscos-psicossociais': 'mente', 'lista-de-espera': 'email',
  sobre: 'bussola', contato: 'email', privacidade: 'cadeado', termos: 'documento',
  'tabela-inss-2026': 'escudo', 'tabela-ir-2026': 'recibo', 'salario-minimo-2026': 'moeda', 'tabela-seguro-desemprego-2026': 'guarda',
};
// Categoria -> classe de cor (ver .t-* em style.css)
export const COR_CAT = {
  'Trabalho e salário': 'trabalho', 'Finanças e investimentos': 'financas', 'Impostos e MEI': 'impostos', 'Reforma Tributária': 'impostos',
  Matemática: 'matematica', 'Saúde e dia a dia': 'dia', Tabelas: 'tabelas',
};
export const ICONE_CAT = { trabalho: 'carteira', financas: 'alta', impostos: 'recibo', matematica: 'porcento', dia: 'coracao', tabelas: 'tabela', planilhas: 'planilha' };

// ---------- Sprite: cada página inclui só os símbolos que usou
const usados = new Set();
export function icone(nome, cls = 'ic') {
  if (!ICONES[nome]) nome = 'raio';
  usados.add(nome);
  return `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#i-${nome}"/></svg>`;
}
// sprite(html): inclui os símbolos referenciados no HTML da página (independe da ordem em que o conteúdo foi gerado).
export function sprite(html = '') {
  const nomes = new Set([...String(html).matchAll(/href="#i-([a-z0-9]+)"/g)].map((m) => m[1]).filter((n) => ICONES[n]));
  const s = [...nomes].map((n) => `<symbol id="i-${n}" viewBox="0 0 24 24">${ICONES[n]}</symbol>`).join('');
  usados.clear();
  return `<svg class="sprite" aria-hidden="true" focusable="false">${s}</svg>`;
}
export const iconeDe = (slug) => ICONE_CALC[slug] || (slug.startsWith('tabela') ? 'tabela' : 'raio');
const tile = (nome, cor) => `<span class="tile t-${cor}">${icone(nome)}</span>`;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---------- Logo (mesmo desenho do favicon.svg)
export const LOGO_SVG = '<svg class="logo" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><rect width="64" height="64" rx="16" fill="#0b2b20"/><path d="M16 24h32M16 40h14" stroke="#fff" stroke-width="6.5" stroke-linecap="round"/><path d="M37 39.5l4.5 4.5L50 35" fill="none" stroke="#c5f25c" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
export const marca = (nome) => {
  const [a, ...b] = String(nome).split(' ');
  return `<a class="marca" href="/" aria-label="${esc(nome)}: página inicial">${LOGO_SVG}<span>${esc(a)}${b.length ? ` <b>${esc(b.join(' '))}</b>` : ''}</span></a>`;
};

// ---------- Cabeçalho
// Menu mobile (laudo QA CC-06): sem JS a faixa de links continua visível; com JS vira botão "Menu" abaixo de 860px.
const MENU_JS = "(function(){var h=document.currentScript.previousElementSibling,b=h.querySelector('.menu-btn');if(!b)return;b.hidden=false;h.classList.add('menu-fechado');function f(x){h.classList.toggle('menu-fechado',x);b.setAttribute('aria-expanded',String(!x))}b.addEventListener('click',function(){f(!h.classList.contains('menu-fechado'))});h.addEventListener('click',function(e){if(e.target.closest('nav a'))f(true)});document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!h.classList.contains('menu-fechado')){f(true);b.focus()}})})();";
export function cabecalho(cfg) {
  return `<header class="topo"><div class="caixa">${marca(cfg.nome)}<button type="button" class="menu-btn" aria-expanded="false" aria-controls="nav-principal" hidden><span class="menu-ic" aria-hidden="true"></span>Menu</button><nav id="nav-principal" aria-label="Principal"><a href="/#trabalho">Trabalho</a><a href="/#financas">Finanças</a><a href="/#impostos">Impostos</a><a href="/#reforma">Reforma</a><a href="/#tabelas">Tabelas</a><a href="/#outras">Outras</a><a class="nav-cta" href="/salario-liquido/">Calcular salário líquido</a></nav><a class="topo-cta" href="/salario-liquido/" aria-label="Calculadora de salário líquido">${icone('carteira')}<span>Salário líquido</span></a></div></header><script>${MENU_JS}</script>`;
}

// ---------- Rodapé (os links institucionais e a data vêm do build)
export function rodape({ cfg, institucional, mini, calcs = [], guias = [] }) {
  const pop = ['salario-liquido', 'rescisao', 'decimo-terceiro', 'ferias', 'imposto-de-renda', 'das-mei'].map((s) => calcs.find((c) => c.slug === s)).filter(Boolean);
  return `<footer class="rodape"><div class="caixa">
<div class="rod-grade">
<div class="rod-marca">${marca(cfg.nome)}
<p><strong>${esc(cfg.nome)} (contacertabr.com.br)</strong> — ${esc(cfg.slogan)}. Resultados estimativos; não substituem orientação de contador, advogado ou profissional de saúde.</p></div>
<nav aria-label="Calculadoras mais usadas"><h2>Mais usadas</h2>${pop.map((c) => `<a href="/${c.slug}/">${esc(c.nomeCurto)}</a>`).join('')}</nav>
<nav aria-label="Tabelas oficiais 2026"><h2>Tabelas 2026</h2>${guias.map((g) => `<a href="/${g.slug}/">${esc(g.nomeCurto)}</a>`).join('')}</nav>
<nav aria-label="Institucional"><h2>Institucional</h2>${institucional}${linkPreferencias(cfg)}</nav>
</div>
<p class="mini">${mini}</p>
</div></footer>${blocoGa4(cfg)}`;
}

// ---------- Cards (home, relacionadas e tabelas)
export function card({ slug, nome, resumo, cor, iconeNome }) {
  return `<li><a class="card" href="/${slug}/">${tile(iconeNome || iconeDe(slug), cor)}<span class="card-txt"><strong>${esc(nome)}</strong><span>${esc(resumo)}</span></span>${icone('seta', 'ic seta')}</a></li>`;
}
export const cardCalc = (c) => card({ slug: c.slug, nome: c.nomeCurto, resumo: c.resumo, cor: COR_CAT[c.categoria] || 'trabalho' });
export const cardGuia = (g) => card({ slug: g.slug, nome: g.nomeCurto, resumo: g.resumo, cor: 'tabelas', iconeNome: 'tabela' });
export const tituloSecao = (id, texto, cor) => `<div class="sec-titulo">${tile(ICONE_CAT[cor] || 'raio', cor)}<h2 id="${id}">${esc(texto)}</h2></div>`;

// ---------- Hero da home
const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\u00a0/g, ' ');
// Ícones Lucide (ISC, lucide.dev), traço 2, grade 24px: conjunto único do hero (design system 10/10/2026).
export const LUCIDE = {
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  calculator: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M8 6h8M16 14v4M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01"/>',
  landmark: '<path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7"/><path d="M12 2 20 7H4z"/>',
  table: '<path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M3 15h18"/>',
  shieldCheck: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
};
export const lu = (n, cls = 'lu') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${LUCIDE[n]}</svg>`;

// Hero da home (design system Conta Certa, 10/10/2026): H1 curto, subtítulo, busca como CTA único,
// prova com números contados no build e captura real da calculadora de salário líquido.
export function heroHome({ h1, lead, calcs, guias, dataBR, iso }) {
  const atalhos = ['salario-liquido', 'rescisao', 'decimo-terceiro', 'ferias', 'das-mei', 'tabela-ir-2026']
    .map((s) => calcs.find((c) => c.slug === s) || guias.find((g) => g.slug === s)).filter(Boolean);
  // Miniatura do resultado (CH-08): valores calculados no build pela mesma função da calculadora (calc.js), nunca fixos.
  const ex = salarioLiquido({ bruto: 3500 });
  const pct = (v) => Math.round((v / ex.bruto) * 1000) / 10;
  const lista = [...calcs.map((c) => [c.slug, c.nomeCurto, c.keyword || '']), ...guias.map((g) => [g.slug, g.nomeCurto, g.keyword || ''])];
  return `<section class="hero" aria-labelledby="hero-t">
<div class="hero-txt">
<p class="hero-selo">${lu('check')}<span>Tabelas oficiais conferidas em <time datetime="${iso}">${dataBR}</time></span></p>
<h1 id="hero-t">${h1}</h1>
<p class="lead">${lead}</p>
<form class="busca" role="search" action="/" data-busca>
<label for="busca-campo" class="vh">Buscar calculadora</label>
${lu('search', 'lu busca-ic')}<input id="busca-campo" type="search" role="combobox" name="q" placeholder="Ex.: férias" autocomplete="off" enterkeyhint="go" aria-controls="busca-lista" aria-autocomplete="list" aria-expanded="false">
<button type="submit" class="busca-btn">Buscar</button>
<ul id="busca-lista" class="busca-lista" role="listbox" hidden></ul>
<script type="application/json" id="busca-dados">${JSON.stringify(lista).replace(/</g, '\\u003c')}</script>
</form>
<p class="atalhos"><span>Mais usadas:</span>${atalhos.map((a) => `<a href="/${a.slug}/">${esc(a.nomeCurto.replace(/ trabalhista$/, ''))}</a>`).join('')}</p>
</div>
<figure class="hero-captura hero-mini" aria-labelledby="hero-mini-leg">
<div class="mini-card">
<p class="mini-rot"><span class="mini-est">Salário líquido estimado</span><span class="mini-de">Líquido de ${brl(ex.bruto)}</span></p>
<p class="mini-valor">${brl(ex.liquido)}</p>
<div class="mini-barra" aria-hidden="true"><i style="width:${pct(ex.liquido)}%"></i><i style="width:${pct(ex.inss)}%"></i><i style="width:${pct(ex.irrf)}%"></i></div>
<dl class="mini-linhas"><div><dt>Salário bruto</dt><dd>${brl(ex.bruto)}</dd></div><div><dt>INSS</dt><dd>− ${brl(ex.inss)}</dd></div><div><dt>IRRF (isento até R$ 5 mil)</dt><dd>− ${brl(ex.irrf)}</dd></div></dl>
<p class="mini-nota">IRRF isento até R$ 5 mil</p>
</div>
<figcaption id="hero-mini-leg">Exemplo real da <a href="/salario-liquido/">calculadora de salário líquido</a>: ${brl(ex.bruto)} brutos<span class="leg-extra">, sem dependentes, tabelas de 2026</span>.</figcaption>
</figure>
</section>
<ul class="prova" aria-label="Por que confiar">
<li>${lu('calculator')}<span><strong>${calcs.length} calculadoras</strong> grátis, sem limite de uso</span></li>
<li>${lu('table')}<span><strong>${guias.length} tabelas oficiais</strong> de 2026: ${guias.map((g) => esc(g.nomeCurto.replace(/^Tabela (do |de )?/i, '').replace(/ 2026$/, '').replace(/^([A-ZÀ-Ú])([a-zà-ú])/, (m, a, b) => a.toLowerCase() + b))).join(', ')}</span></li>
<li>${lu('landmark')}<span><strong>Fontes oficiais</strong> citadas: Planalto, Receita Federal, Banco Central e Diário Oficial</span></li>
<li>${lu('shieldCheck')}<span><strong>Sem cadastro</strong> e sem envio dos valores digitados</span></li>
</ul>`;
}

// Busca da home: filtra a lista embutida (sem requisição) e leva à página escolhida.
export const SCRIPT_BUSCA = `<script>(function(){var f=document.querySelector('[data-busca]');if(!f)return;var i=f.querySelector('input'),l=document.getElementById('busca-lista'),d=JSON.parse(document.getElementById('busca-dados').textContent),n=function(s){return s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase()},a=-1,r=[];function m(){var q=n(i.value.trim());a=-1;if(!q){l.hidden=true;i.setAttribute('aria-expanded','false');return}var t=q.split(/\\s+/);r=d.filter(function(x){var h=n(x[1]+' '+x[2]+' '+x[0]);return t.every(function(p){return h.indexOf(p)>-1})}).slice(0,6);l.innerHTML=r.length?r.map(function(x,k){var u='/'+x[0]+'/';return '<li role="option" id="bo'+k+'"><a href="'+u+'">'+x[1].replace(/</g,'&lt;')+'</a></li>'}).join(''):'<li class="vazio">Nada encontrado. Veja a lista completa abaixo.</li>';l.hidden=false;i.setAttribute('aria-expanded','true')}function s(k){var o=l.querySelectorAll('[role=option]');if(!o.length)return;a=(k+o.length)%o.length;o.forEach(function(e,j){e.classList.toggle('ativo',j===a)});i.setAttribute('aria-activedescendant','bo'+a)}i.addEventListener('input',m);i.addEventListener('keydown',function(e){if(e.key==='ArrowDown'){e.preventDefault();s(a+1)}else if(e.key==='ArrowUp'){e.preventDefault();s(a-1)}else if(e.key==='Escape'){l.hidden=true}});f.addEventListener('submit',function(e){e.preventDefault();var x=r[a>-1?a:0];if(x)location.href='/'+x[0]+'/'});document.addEventListener('click',function(e){if(!f.contains(e.target))l.hidden=true})})();</script>`;

// ---------- Cabeça das calculadoras e das tabelas
export function cabecaPagina({ slug, categoria, cor, h1Html }) {
  return `<div class="cabeca">${tile(iconeDe(slug), cor)}<div><p class="cat-pill t-${cor}">${esc(categoria)}</p>${h1Html}</div></div>`;
}
export const metaLinha = ({ dataBR, iso, gratis = true }) => `<p class="meta">${gratis ? `<span>${icone('check')}<span>Grátis, sem cadastro</span></span> <span class="sep">·</span> ` : ''}<span>${icone('documento')}<span>Tabelas oficiais conferidas em <time datetime="${iso}">${dataBR}</time></span></span> <span class="sep">·</span> <a href="#fontes-t">Ver fontes</a></p>`;
