// (c) Regra "nada do Google antes do aceite", conferida no navegador com o componente aprovado assets/lcm-consent.js
// (seletores reais: section#lcm-consent, botões [data-lcmc="aceitar"] e [data-lcmc="recusar"], escolha em
// localStorage "lcm-consent"). A rede externa está sempre abortada (fixtures.mjs): nada sai de verdade, mas a
// tentativa fica registrada. Antes de qualquer clique no banner e depois de Recusar, zero tentativa ao Google;
// depois de Aceitar, a tentativa de carregar o gtag.js aparece, o que prova que o bloqueio depende do consentimento.
import { test, expect, ehGoogle, semErros, semRedeExterna, semRolagemHorizontal, assentar } from './fixtures.mjs';
import { ARQUIVOS, BLOG, CALCULADORAS, DESLIGADAS, LICITACOES, POSTS, urlDe } from './site.mjs';

const banner = (page) => page.locator('section#lcm-consent');

async function semGoogle(page, rede, quando) {
  expect(rede.google(), `tentativas de requisição ao Google ${quando}`).toEqual([]);
  const estado = await page.evaluate(() => ({
    gtag: typeof window.gtag,
    dataLayer: typeof window.dataLayer,
    scripts: [...document.scripts].map((s) => s.src).filter((s) => /google|doubleclick/i.test(s)),
    cookies: document.cookie.split(';').map((c) => c.trim().split('=')[0]).filter((n) => /^(_ga|_gid$|_gat)/.test(n)),
  }));
  expect(estado, `nenhum gtag, dataLayer, script ou cookie do Google ${quando}`).toEqual({ gtag: 'undefined', dataLayer: 'undefined', scripts: [], cookies: [] });
}

// Envia a calculadora: o ui.js dispara cc:calculo-concluido, que o medicao.js passa ao lcmTrack.
async function calcular(page, id) {
  await page.locator(`form[data-calc="${id}"] button[type="submit"]`).click();
  await expect(page.locator('#resultado')).toHaveText(/\d/);
}

const calc = CALCULADORAS[0];
const PAGINAS = [
  { nome: 'home', url: '/' },
  { nome: `calculadora ${calc.url}`, url: calc.url, calc: calc.id },
  { nome: `post ${POSTS[0]}`, url: POSTS[0] },
];

for (const p of PAGINAS) {
  test(`${p.nome}: zero Google antes de qualquer clique no banner e depois de Recusar`, async ({ page, rede, erros }) => {
    await page.goto(p.url);
    await expect(banner(page)).toBeVisible();
    await assentar(page);
    if (p.calc) { await calcular(page, p.calc); await assentar(page); }
    await semGoogle(page, rede, 'antes de qualquer clique no banner');

    await banner(page).locator('[data-lcmc="recusar"]').click();
    await expect(banner(page)).toBeHidden();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('lcm-consent')).v)).toBe('recusado');
    if (p.calc) await calcular(page, p.calc);
    await assentar(page);
    await semGoogle(page, rede, 'depois de Recusar');

    await page.reload();
    await assentar(page);
    await expect(banner(page), 'a recusa fica guardada: o banner não volta').toBeHidden();
    await semGoogle(page, rede, 'depois de Recusar e recarregar');
    semErros(erros, rede);
    semRedeExterna(rede);
  });

  test(`${p.nome}: depois de Aceitar, a tentativa de carregar o GA aparece (e é abortada)`, async ({ page, rede, erros }) => {
    await page.goto(p.url);
    await expect(banner(page)).toBeVisible();
    await assentar(page);
    await semGoogle(page, rede, 'antes do aceite');

    await banner(page).locator('[data-lcmc="aceitar"]').click();
    await expect(banner(page)).toBeHidden();
    await expect.poll(() => rede.google().length, { message: 'depois de Aceitar, o navegador tenta carregar o GA' }).toBeGreaterThan(0);
    await assentar(page);
    const [gtag, ...outras] = rede.google();
    expect(gtag).toMatch(/^https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-[A-Z0-9]+$/);
    expect(outras, 'só o gtag.js: com ele abortado, nada mais do Google é pedido').toEqual([]);
    expect(rede.abortadas, 'a rede externa continua abortada: o gtag.js não chega').toContain(gtag);
    expect(rede.tentativas.filter((u) => !ehGoogle(u)), 'nenhum outro host externo').toEqual([]);
    expect(await page.evaluate(() => typeof window.gtag)).toBe('function');

    // Com o aceite guardado, o GA é tentado logo ao abrir a página, sem banner.
    await page.reload();
    await assentar(page);
    await expect(banner(page)).toBeHidden();
    await expect.poll(() => rede.google(), { message: 'com o aceite guardado, o GA é tentado ao recarregar' }).toEqual([gtag, gtag]);
    semErros(erros, rede, { externasAbortadas: true });
  });
}

// Varredura: toda página com o banner (fora das já cobertas em calculadoras.spec e paginas.spec) abre com o banner
// visível e sem nenhuma tentativa externa, sem erro e sem rolagem horizontal.
const cobertas = new Set(['/', ...BLOG, ...CALCULADORAS.map((c) => c.url), ...DESLIGADAS.map((c) => c.url), ...LICITACOES]);
const demais = ARQUIVOS.map(urlDe).filter((u) => !cobertas.has(u));
for (const url of demais) {
  test(`página ${url}: banner visível, zero Google e nenhum host externo antes do aceite`, async ({ page, rede, erros }) => {
    await page.goto(url);
    await expect(banner(page)).toBeVisible();
    await assentar(page);
    await semGoogle(page, rede, 'antes de qualquer clique no banner');
    await semRolagemHorizontal(page);
    semErros(erros, rede);
    semRedeExterna(rede);
  });
}

// /licitacoes/ é outra marca e promete "sem ferramentas de análise": nem banner, nem lcm-consent, nem rede externa.
// A rolagem horizontal não é conferida aqui: o layout de /licitacoes/ é outro e fica fora do escopo destes testes.
test('descoberta: /licitacoes/ tem páginas', () => { expect(LICITACOES).toContain('/licitacoes/'); });
for (const url of LICITACOES) {
  test(`licitações ${url}: sem banner, sem lcm-consent, sem rede externa e sem erro`, async ({ page, rede, erros }) => {
    await page.goto(url);
    await assentar(page);
    await expect(page.locator('#lcm-consent'), 'sem banner de cookies').toHaveCount(0);
    expect(await page.evaluate(() => [typeof window.lcmConsent, typeof window.gtag, typeof window.dataLayer]), 'sem lcmConsent, gtag e dataLayer')
      .toEqual(['undefined', 'undefined', 'undefined']);
    semErros(erros, rede);
    semRedeExterna(rede);
  });
}
