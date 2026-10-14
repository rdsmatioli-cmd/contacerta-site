// NR1-M01: sem JS, o formulário não pode enviar respostas (URL/GA4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../nr1-riscos-psicossociais/index.html', import.meta.url), 'utf8');
const form = html.slice(html.indexOf('<form'), html.indexOf('</form>'));
const ui = readFileSync(new URL('../assets/js/ui.js', import.meta.url), 'utf8');

test('form sem method POST e nenhum campo com name (sem envio nativo)', () => {
  assert.doesNotMatch(form.match(/<form[^>]*>/)[0], /method=/i);
  assert.equal((form.match(/<(select|input|textarea)\b[^>]*\sname=/gi) || []).length, 0);
  assert.equal((form.match(/<select\b[^>]*data-name="/g) || []).length, 12);
});
test('botão de envio desabilitado sem JS e noscript avisa que nada é enviado', () => {
  assert.match(form, /<button type="submit" disabled data-requer-js>/);
  assert.match(html, /<noscript>[^]*nada é enviado[^]*<\/noscript>/);
});
test('ui.js restaura os nomes, habilita o botão e impede o envio nativo', () => {
  assert.match(ui, /\[data-name\]/);
  assert.match(ui, /\[data-requer-js\]/);
  assert.match(ui, /addEventListener\('submit', \(e\) => \{ e\.preventDefault\(\)/);
});
test('GA4 config com page_location sem query string', () => {
  assert.match(html, /g\('config',ID,\{anonymize_ip:true,page_location:location\.origin\+location\.pathname\}\)/);
});
