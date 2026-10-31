// Formulário (ui.js) com um document mínimo, para testar o comportamento do formulário no Node (usado por
// trabalhistas-revisao.test.mjs e rescisao-motivo-aviso.test.mjs). Monta o formulário publicado da página (inputs,
// selects com as opções e mensagens dos campos), instala um document mínimo e importa ui.js numa instância nova (query
// na URL), que roda iniciar() e o primeiro cálculo.
import { readFileSync } from 'node:fs';

export const atributos = (tag) => Object.fromEntries([...tag.replace(/^<\w+/, '').matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, v ?? '']));
export function elemento(tagName, at, value) {
  const attrs = new Map(Object.entries(at));
  const ouvintes = {};
  const dataset = {};
  for (const [k, v] of attrs) if (k.startsWith('data-')) dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
  return {
    tagName, id: at.id, name: at.name || '', type: tagName === 'SELECT' ? 'select-one' : at.type || 'text',
    value, defaultValue: value, checked: 'checked' in at, dataset, hidden: 'hidden' in at, textContent: '', className: at.class || '', disabled: 'disabled' in at,
    hasAttribute: (k) => attrs.has(k), getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
    setAttribute: (k, v) => attrs.set(k, String(v)), removeAttribute: (k) => attrs.delete(k),
    addEventListener: (t, f) => (ouvintes[t] ||= []).push(f),
    disparar(t) { for (const f of ouvintes[t] || []) f({ type: t, target: this, preventDefault() {} }); },
    closest: () => null, focus() {}, dispatchEvent() { return true; },
  };
}
let instancia = 0;
export async function abrirCalculadora(pag, valores = {}) {
  const html = readFileSync(new URL(`../${pag}/index.html`, import.meta.url), 'utf8');
  const ini = html.indexOf('<form class="calc-form"');
  const formHtml = html.slice(ini, html.indexOf('</form>', ini));
  const campos = [];
  const porId = {};
  for (const [tag] of formHtml.matchAll(/<input\b[^>]*>|<select\b[^>]*>[\s\S]*?<\/select>/g)) {
    const abre = tag.match(/^<\w+[^>]*>/)[0];
    const at = atributos(abre);
    let value = at.value ?? '';
    const ops = tag.startsWith('<select') ? [...tag.matchAll(/<option\b[^>]*>/g)].map(([o]) => atributos(o)) : null;
    if (ops) value = (ops.find((o) => 'selected' in o) || ops[0]).value;
    const el = elemento(ops ? 'SELECT' : 'INPUT', at, value);
    // select.options como no DOM: value e disabled de cada opção, na ordem do HTML.
    if (ops) el.options = ops.map((o) => ({ value: o.value, disabled: 'disabled' in o }));
    if (at.name in valores) el.value = valores[at.name];
    campos.push(el); porId[el.id] = el;
  }
  for (const [p] of formHtml.matchAll(/<p class="campo-msg"[^>]*>/g)) { const at = atributos(p); porId[at.id] = elemento('P', at, ''); }
  const out = elemento('DIV', { id: 'resultado' }, '');
  out.innerHTML = '';
  porId.resultado = out;
  const form = elemento('FORM', { 'data-calc': atributos(formHtml.match(/^<form[^>]*>/)[0])['data-calc'] }, '');
  form.elements = Object.assign([...campos], Object.fromEntries(campos.map((c) => [c.name, c])));
  form.querySelector = () => null;
  form.querySelectorAll = (sel) => { const m = sel.match(/^\[([\w-]+)\]$/); return m ? campos.filter((c) => c.hasAttribute(m[1])) : []; };
  globalThis.document = {
    readyState: 'complete',
    addEventListener() {},
    querySelector: (sel) => (sel === 'form[data-calc]' ? form : null),
    getElementById: (id) => porId[id] || null,
  };
  try {
    await import(new URL(`../assets/js/ui.js?cenario=${++instancia}`, import.meta.url));
  } finally {
    delete globalThis.document;
  }
  // Envio pelo botão Calcular (cálculo imediato, sem o atraso do evento input).
  const calcular = () => { globalThis.document = { getElementById: (id) => porId[id] || null, querySelector: () => null }; try { form.disparar('submit'); } finally { delete globalThis.document; } return out.innerHTML; };
  return { form, campo: (n) => form.elements[n], el: (id) => porId[id], out, calcular };
}
