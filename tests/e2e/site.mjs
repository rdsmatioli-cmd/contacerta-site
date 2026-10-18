// Descobre as páginas pelo HTML publicado, sem lista fixa: calculadora nova entra no teste sozinha.
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = resolve(process.env.E2E_RAIZ || fileURLToPath(new URL('../../', import.meta.url)));
export const PORTA = Number(process.env.E2E_PORTA || 8191);
export const BASE = `http://127.0.0.1:${PORTA}`;

const listar = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  if (d.name === '.git' || d.name === 'node_modules') return [];
  const p = join(dir, d.name);
  if (d.isDirectory()) return dir === RAIZ && d.name === 'tests' ? [] : listar(p);
  return d.name.endsWith('.html') && !d.name.startsWith('google') ? [relative(RAIZ, p).split(sep).join('/')] : [];
});
export const ler = (arquivo) => readFileSync(join(RAIZ, arquivo), 'utf8');
// blog/pro-labore/index.html -> /blog/pro-labore/; licitacoes/politica.html -> /licitacoes/politica.html
export const urlDe = (arquivo) => `/${arquivo.replace(/(^|\/)index\.html$/, '$1')}`;

export const ARQUIVOS = listar(RAIZ).sort();
const formsDe = (html) => html.match(/<form\b[^>]*>[^]*?<\/form>/gi) || [];
const ehCalc = (form) => /^<form\b[^>]*\bclass="[^"]*\bcalc-form\b/i.test(form);

// Calculadora ativa: <form class="calc-form" data-calc="...">, ligada pelo assets/js/ui.js.
// Calculadora desligada (hoje IMC e idade): <form class="calc-form"> sem data-calc e com o botão de envio desabilitado
// no HTML. Formulário de calculadora que não se encaixa em nenhum dos dois vai para SEM_CLASSIFICACAO e falha.
export const CALCULADORAS = [];
export const DESLIGADAS = [];
export const SEM_CLASSIFICACAO = [];
for (const arquivo of ARQUIVOS) {
  for (const form of formsDe(ler(arquivo)).filter(ehCalc)) {
    const id = (form.match(/^<form\b[^>]*\bdata-calc="([^"]+)"/i) || [])[1];
    if (id) CALCULADORAS.push({ arquivo, url: urlDe(arquivo), id });
    else if (/<button type="submit" disabled[ >]/.test(form)) DESLIGADAS.push({ arquivo, url: urlDe(arquivo) });
    else SEM_CLASSIFICACAO.push(arquivo);
  }
}

// Blog: índice, categorias e posts (blog/<slug>/index.html).
export const BLOG = ARQUIVOS.filter((a) => /^blog\/(.+\/)?index\.html$/.test(a)).map(urlDe);
export const POSTS = ARQUIVOS.filter((a) => /^blog\/(?!categoria\/)[^/]+\/index\.html$/.test(a)).map(urlDe);

// /licitacoes/ é outra marca, sem analytics: nem banner de cookies nem lcm-consent.
export const LICITACOES = ARQUIVOS.filter((a) => a.startsWith('licitacoes/')).map(urlDe);
