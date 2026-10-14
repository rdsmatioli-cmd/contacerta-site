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
  assert.match(html, /g\('config',ID,\{anonymize_ip:true,page_location:semQ\(\)\}\)/);
});

test('M01: listener de submit registrado antes de restaurar names e habilitar o botão', () => {
  const i = ui.indexOf('function iniciar(');
  const sub = ui.indexOf("form.addEventListener('submit'", i);
  const nome = ui.indexOf("querySelectorAll('[data-name]')", i);
  const btn = ui.indexOf("querySelectorAll('[data-requer-js]')", i);
  assert.ok(i > 0 && sub > i && nome > 0 && btn > 0);
  assert.ok(sub < nome && sub < btn, 'submit deve vir antes');
});
const GA_SRC = html;
const plDe = (src) => {
  const m = src.match(/function semQ\(\)\{.*?return location\.origin\+location\.pathname\+\(s\?'\?'\+s:''\)\}/);
  assert.ok(m, 'função pl() presente');
  return (href) => { const u = new URL(href); return new Function('location', `${m[0]};return semQ()`)({ origin: u.origin, pathname: u.pathname, search: u.search }); };
};
test('GA4 page_location: UTMs, gclid e fbclid preservados', () => {
  const pl = plDe(GA_SRC);
  assert.equal(pl('https://contacertabr.com.br/nr1-riscos-psicossociais/?utm_source=ig&utm_medium=social&utm_campaign=nr1&gclid=G1&fbclid=F1'),
    'https://contacertabr.com.br/nr1-riscos-psicossociais/?utm_source=ig&utm_medium=social&utm_campaign=nr1&gclid=G1&fbclid=F1');
  assert.equal(pl('https://contacertabr.com.br/nr1-riscos-psicossociais/'), 'https://contacertabr.com.br/nr1-riscos-psicossociais/');
});
test('GA4 page_location: respostas do formulário e outros parâmetros removidos', () => {
  const pl = plDe(GA_SRC);
  const campos = ['demanda','jornada','desconexao','apoio','assedio','autonomia','clareza','conflitos','isolamento','mudancas','publico','reconhecimento'];
  const q = campos.map((c) => `${c}=3`).join('&');
  assert.equal(pl(`https://contacertabr.com.br/nr1-riscos-psicossociais/?${q}`), 'https://contacertabr.com.br/nr1-riscos-psicossociais/');
  const out = pl(`https://contacertabr.com.br/nr1-riscos-psicossociais/?utm_source=x&${q}&email=a@b.c`);
  assert.equal(out, 'https://contacertabr.com.br/nr1-riscos-psicossociais/?utm_source=x');
  for (const c of campos) assert.ok(!out.includes(`${c}=`));
});
test('GA4: semQ() não é sombreada por outra variável do snippet', () => {
  const s = html.match(/<script>\(function\(\)\{var ID=[^]*?<\/script>/)[0];
  assert.equal((s.match(/\bsemQ\b/g) || []).length, 2);
  assert.doesNotMatch(s, /var semQ\b|,semQ=/);
});
