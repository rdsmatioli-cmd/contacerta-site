// Retarget simples híbrido (DEC CEO 151b6c2a, SEO v8, Advogado M-01/M-02, Tributário 11d554e7).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const ler = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const STUB = 'blog/simples-hibrido-ou-puro-2027/index.html';

test('stub M-02: estático, noindex follow, aviso M-01 e link no topo; sem refresh, canonical, GA4 ou speculationrules', () => {
  const h = ler(STUB);
  assert.match(h, /<meta name="robots" content="noindex, follow">/);
  assert.doesNotMatch(h, /http-equiv="refresh"|rel="canonical"|speculationrules|lcm-consent|gtag/i);
  assert.match(h, /guia do Creditrilha \(www\.creditrilha\.com\.br\), outro site da mesma empresa/);
  assert.ok(h.indexOf('href="https://www.creditrilha.com.br/blog/simples-hibrido/"') < h.indexOf('<footer>'));
  assert.match(h, /href="\/privacidade\/"/);
});

test('post movido fora de sitemap, feed, /blog/, categoria, home e llms.txt', () => {
  for (const p of ['sitemap.xml', 'blog/feed.xml', 'blog/index.html', 'blog/categoria/reforma-tributaria/index.html', 'index.html', 'llms.txt'])
    assert.ok(!ler(p).includes('/blog/simples-hibrido-ou-puro-2027/'), p);
});

test('/simples-hibrido/: title, H1, meta e um único H1; #guia-t único com card Creditrilha', () => {
  const h = ler('simples-hibrido/index.html');
  assert.match(h, /<title>Simulador opção CBS e IBS no Simples Nacional \| Conta Certa<\/title>/);
  assert.equal((h.match(/<h1[\s>]/g) || []).length, 1);
  assert.match(h, /<h1>Simulador da opção de CBS e IBS no Simples Nacional<\/h1>/);
  assert.equal((h.match(/id="guia-t"/g) || []).length, 1);
  assert.equal((h.match(/creditrilha\.com\.br/g) || []).length, 1);
  // Datas só nos títulos das fontes citadas (Res. CGSN 194/2026, Serpro), mantidos pelo Tributário; fora das FAQs.
  const faq = h.match(/"@type":"FAQPage"[^]*?<\/script>/)[0];
  assert.doesNotMatch(faq, /30\/10\/2026|15\/10\/2026/);
  assert.equal((h.match(/"@type":"Question"/g) || []).length, 3);
});

test('ui.js: S-05/S-06 no resultado, título em p.rec-tit (sem h3)', () => {
  const js = ler('assets/js/ui.js');
  assert.match(js, /ficar com CBS e IBS fora do DAS tende a render mais/);
  assert.match(js, /ficar no DAS rende mais nesta simulação/);
  assert.doesNotMatch(js, /o puro rende mais|<h3 class="rec-tit"/);
});

test('preço reforma: link mantém "calculadora" (SEO LOCK v5)', () => {
  assert.doesNotMatch(ler('simples-hibrido/index.html') + ler('calendario-reforma-tributaria/index.html'), /simulador de preço na reforma/i);
});
