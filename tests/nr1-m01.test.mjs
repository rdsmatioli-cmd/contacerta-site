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
// GA4 via componente consent/ (ac527630): CP-01, CP-04, CP-05, CP-06 (CONFERENCIA_GA4_PUBLICADO 1562e4ae).
import { createHash } from 'node:crypto';
const lcm = readFileSync(new URL('../assets/lcm-consent.js', import.meta.url));
const med = readFileSync(new URL('../assets/js/medicao.js', import.meta.url), 'utf8');
const priv = readFileSync(new URL('../privacidade/index.html', import.meta.url), 'utf8');
test('componente lcm-consent.js é o ac527630, sem alteração', () => {
  assert.equal(createHash('sha256').update(lcm).digest('hex'), 'ac527630b355304038715e0129d0e9e8adf1f10329862850cefff8933eab86d0');
});
test('página usa o componente; nenhum gtag inline nem anonymize_ip', () => {
  assert.match(html, /<script src="\/assets\/lcm-consent\.js\?v=[0-9a-f]+" defer data-ga4="G-D9PCMD9Q2H" data-marca="Conta Certa"[^>]*data-validade-dias="183" data-chaves-legadas="cc-consent-v1" data-eventos="calculo_concluido,cta_click" data-params="calculadora,destino"><\/script>/);
  assert.doesNotMatch(html, /gtag\(|googletagmanager|anonymize_ip|id="cc-banner"/);
  assert.match(html, /data-lcm-consent-abrir>Preferências de cookies</);
});
test('componente: signals desligados, URL sem query, escolha com data e versão (183 dias)', () => {
  const s = lcm.toString();
  assert.match(s, /allow_google_signals: false/); assert.match(s, /allow_ad_personalization_signals: false/);
  assert.doesNotMatch(s, /anonymize_ip/);
  assert.match(s, /return x\.origin \+ x\.pathname/);
  assert.match(s, /JSON\.stringify\(\{ v: v, em: hoje\(\), versao: VERSAO \}\)/);
});
test('medicao.js: só calculo_concluido e cta_click, via lcmTrack, destino sem query', () => {
  const ev = [...med.matchAll(/t\('([a-z_]+)'/g)].map((m) => m[1]).sort();
  assert.deepEqual(ev, ['calculo_concluido', 'cta_click']);
  assert.doesNotMatch(med, /gtag|generate_lead|sign_up|trial_start|search/);
  assert.match(med, /u\.origin === location\.origin \? u\.pathname : u\.hostname/);
});
test('política: G-02, G-03, B-01 e M-01; sem AdSense em uso e sem o contador fora da nota de versão', () => {
  assert.match(priv, /<p>Hoje este site não exibe anúncios nem usa cookies de publicidade\. Se passarmos a exibir anúncios do Google AdSense, esta política será atualizada antes e os cookies de publicidade só serão usados com o seu consentimento, pedido separadamente no aviso de cookies\.<\/p>/);
  assert.match(priv, /O Google Analytics é fornecido pelo Google LLC, que atua como operador e pode tratar esses dados nos Estados Unidos e em outros países, com base nas cláusulas contratuais do Google para transferência internacional \(LGPD, art\. 33, II\)\. Os dados de eventos ficam guardados no Google Analytics por 2 meses\. Sua escolha no aviso de cookies vale por 6 meses; depois disso, perguntaremos de novo\./);
  assert.doesNotMatch(priv, /adssettings|aboutads|Este site pode exibir anúncios|link_interno|uso da busca/);
  assert.match(priv, /a conclusão de um cálculo \(só o nome da calculadora\) e cliques em botões de chamada e em links de parceiros \(só o caminho da página ou o domínio do parceiro\)/);
  const nota = '<p><em>Última atualização: 16/10/2026 (versão 2 do dia). Nesta versão: retiramos o contador de visitas Abacus, informamos que o site não exibe anúncios, detalhamos a transferência internacional e os prazos do Google Analytics e passamos a informar que as respostas enviadas de contato@contacertabr.com.br saem pelo Brevo, com dados guardados na União Europeia. Também identificamos o Google LLC como operador do Google Analytics e incluímos a informação sobre os registros de acesso do GitHub Pages.</em></p>';
  assert.ok(priv.includes(nota));
  assert.doesNotMatch(priv.replace(nota, ''), /abacus/i);
});
