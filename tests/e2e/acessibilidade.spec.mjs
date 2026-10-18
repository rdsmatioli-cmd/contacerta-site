// (d) Acessibilidade: o axe-core (@axe-core/playwright, versão exata no package-lock.json) roda em toda página HTML do
// site, achada pela mesma descoberta dos outros specs (ARQUIVOS em site.mjs: calculadoras, blog, institucionais, 404 e
// /licitacoes/), nos dois tamanhos de tela, com as regras WCAG 2.0, 2.1 e 2.2 dos níveis A e AA. Falha só com violação
// de impacto serious ou critical; moderate e minor vão para o anexo axe-menores.json e para o log, sem falhar.
// O banner de cookies fica aberto (visitante novo, nunca clicado) e a rede externa continua abortada (fixtures.mjs):
// o GA não carrega e o axe avalia a página como o visitante a vê antes do aceite. O axe entra por page.evaluate, sem
// rede e sem bypassCSP.
import AxeBuilder from '@axe-core/playwright';
import { test, expect, assentar } from './fixtures.mjs';
import { ARQUIVOS, urlDe } from './site.mjs';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];
const GRAVES = new Set(['serious', 'critical']);
// label-content-name-mismatch (WCAG 2.5.3, nível A: o nome acessível contém o texto visível) ainda é experimental no
// axe-core 4.13 e fica desligada por padrão; a 4.14 a promoveu. Ligada aqui para valer já. As demais experimentais
// continuam fora.
const REGRAS = { 'label-content-name-mismatch': { enabled: true } };

const PAGINAS = ARQUIVOS.map(urlDe);

test('descoberta: acessibilidade cobre home, 404, blog, calculadoras e /licitacoes/', () => {
  expect(PAGINAS).toEqual(expect.arrayContaining(['/', '/404.html', '/blog/', '/licitacoes/']));
  // Piso de sanidade (hoje são 56 páginas): se a descoberta quebrar, o teste não passa vazio.
  expect(PAGINAS.length).toBeGreaterThanOrEqual(50);
});

// Uma linha por ocorrência: página, regra, impacto, critério e o seletor do elemento, para achar no HTML.
const linhas = (url, violacoes) => violacoes.flatMap((v) => {
  const criterios = v.tags.filter((t) => /^wcag\d{3,}$/.test(t)).join(' ');
  return v.nodes.map((n) => `${url} | ${v.id} (${v.impact}${criterios ? `, ${criterios}` : ''}) | alvo: ${n.target.join(' >>> ')} | ${v.help}`);
});

for (const url of PAGINAS) {
  test(`acessibilidade ${url}: axe sem violação serious ou critical (WCAG 2.x A e AA)`, async ({ page }, testInfo) => {
    const resposta = await page.goto(url);
    expect(resposta.status()).toBe(200);
    await assentar(page);
    const { violations } = await new AxeBuilder({ page })
      .options({ resultTypes: ['violations'], rules: REGRAS })
      .withTags(TAGS)
      .analyze();

    const menores = violations.filter((v) => !GRAVES.has(v.impact));
    if (menores.length) {
      const resumo = linhas(url, menores);
      await testInfo.attach('axe-menores.json', { body: JSON.stringify(menores, null, 2), contentType: 'application/json' });
      console.log(`[axe ${testInfo.project.name}] moderate/minor, não falham:\n  ${resumo.join('\n  ')}`);
    }

    const graves = violations.filter((v) => GRAVES.has(v.impact));
    if (graves.length) await testInfo.attach('axe-graves.json', { body: JSON.stringify(graves, null, 2), contentType: 'application/json' });
    expect(linhas(url, graves), `violações serious/critical do axe em ${url} (corrija a página, não o teste)`).toEqual([]);
  });
}
