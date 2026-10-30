// B-05 + operadores finais (Advogado: minuta 8ee9ece9, seções B7-B9 e C; nota de capa d39ff580, F-1 a F-3; endereço 20dad5c7).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const ler = (p) => readFileSync(join(raiz, p), 'utf8');
const ENDERECO = 'Rua Pais Leme, 215, Conj. 1713, Pinheiros, São Paulo, SP, 05424-150';
const RODAPE = `RODRIGO DE SIMONE MATIOLI LTDA (LCM Global Services) · CNPJ 61.193.879/0001-20 · ${ENDERECO} · contato@contacertabr.com.br`;
const NOTA = 'Última atualização: 30/10/2026. Nesta versão: incluímos o endereço da sede da LCM e atualizamos os nomes empresariais do Brevo e do ImprovMX nas seções 4 e 5.';

function htmls(d = '') {
  return readdirSync(join(raiz, d)).flatMap((n) => {
    const p = join(d, n);
    if (['tests', 'node_modules', '.git', 'licitacoes'].includes(n) && d === '') return [];
    return statSync(join(raiz, p)).isDirectory() ? htmls(p) : p.endsWith('.html') ? [p] : [];
  });
}
const visivel = (h) => h.replace(/<script\b[^]*?<\/script>/g, '').replace(/<style\b[^]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
const corpoPolitica = () => { const h = ler('privacidade/index.html'); return h.slice(h.indexOf('<main'), h.indexOf('</main>')); };

test('B-05 (C): rodapé de toda página do Conta Certa com razão social, CNPJ, endereço exato e e-mail', () => {
  const comRodape = htmls().filter((p) => ler(p).includes('<footer class="rodape">'));
  assert.ok(comRodape.length >= 60, `só ${comRodape.length} páginas com rodapé`);
  for (const p of comRodape) assert.ok(ler(p).split('<footer class="rodape">')[1].includes(RODAPE), p);
});

test('B-05: endereço sem variantes ("Conjunto", "Paes Leme")', () => {
  for (const p of htmls()) assert.doesNotMatch(ler(p), /Paes Leme|Conjunto 1713/, p);
});

test('B-05 (C): rodapé do Empregador em Dia com o texto exato', () => {
  for (const p of htmls('empregador-em-dia')) {
    const h = ler(p);
    if (h.includes('class="ed-fornecedor"')) assert.ok(h.includes(`<p class="ed-fornecedor">${RODAPE}</p>`), p);
  }
});

test('B6/B7/B1-B3/E: /privacidade/ com controlador e endereço, nota de versão, Brevo SAS e ImprovMX Incorporated literais', () => {
  const h = ler('privacidade/index.html');
  assert.ok(h.includes(`<p><em>${NOTA}</em></p>`));
  assert.ok(h.includes(`CNPJ 61.193.879/0001-20, com sede na ${ENDERECO}, responsável pelo Conta Certa.`));
  assert.ok(h.includes('saem pelo Brevo (Brevo SAS, antiga Sendinblue, Paris, França), que atua como operador e guarda os dados na União Europeia.'));
  assert.ok(h.includes('Brevo SAS, antiga Sendinblue (envio das nossas respostas e da proposta, França, dados na União Europeia).'));
  assert.ok(h.includes('ImprovMX Incorporated (encaminhamento do e-mail contato@contacertabr.com.br, Estados Unidos)'));
  assert.ok(h.includes('passam pelo ImprovMX (ImprovMX Incorporated, Estados Unidos), serviço de encaminhamento de e-mail que atua como operador,'));
  assert.ok(h.includes('<p>Fornecedores que tratam dados para o Conta Certa: Brevo SAS (envio de e-mails'));
  assert.ok(h.indexOf('Fornecedores que tratam dados') > h.indexOf('<h2>10. Base legal e finalidade</h2>') && h.indexOf('Fornecedores que tratam dados') < h.indexOf('<h2>11. Seus direitos</h2>'));
  assert.ok(h.includes(`${ENDERECO} · contato@contacertabr.com.br`), 'rodapé na /privacidade/');
});

test('B9: /privacidade/ sem seção de pagamento/Me avise, sem colchetes, sem Stripe, Zoho, "Sendinblue SAS /"; numeração 1-12', () => {
  const c = corpoPolitica();
  const v = visivel(c);
  assert.doesNotMatch(v, /[[\]]/);
  assert.doesNotMatch(c, /Stripe|Zoho|Sendinblue SAS \//);
  const secoes = [...c.matchAll(/<h2[^>]*>(\d+)\. /g)].map((m) => +m[1]);
  assert.deepEqual(secoes, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.doesNotMatch(c, /<h[23][^>]*>[^<]*(Contratação e pagamento|Me avise|WhatsApp|[Nn]ota fiscal)/);
  // "Me avise", WhatsApp e nota fiscal só aparecem na frase do parágrafo consolidado (seção E), dizendo que não são usados.
  const semE = c.replace(/<p>Fornecedores que tratam dados para o Conta Certa:[^]*?<\/p>/, '');
  assert.doesNotMatch(semE, /Me avise|WhatsApp|nota fiscal/i);
});

test('B8: lastmod da /privacidade/ no sitemap = data da nota de versão', () => {
  assert.match(ler('sitemap.xml'), /<loc>https:\/\/contacertabr\.com\.br\/privacidade\/<\/loc><lastmod>2026-10-30<\/lastmod>/);
});

test('flags OFF: ED_CHECKOUT e ED_ME_AVISE em false; SST não incluído', () => {
  const cfg = ler('assets/js/empregador/config.js');
  for (const f of ['ED_CHECKOUT', 'ED_ME_AVISE']) assert.match(cfg, new RegExp(`${f}: false`), f);
  assert.doesNotMatch(cfg, /ED_SST_INCLUIDO = true/);
});
