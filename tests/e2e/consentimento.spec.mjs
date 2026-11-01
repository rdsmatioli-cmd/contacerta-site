// (c) Regra "nada do Google antes do aceite", conferida no navegador com o componente aprovado assets/lcm-consent.js
// (seletores reais: section#lcm-consent, botões [data-lcmc="aceitar"] e [data-lcmc="recusar"], escolha em
// localStorage "lcm-consent"). A rede externa está sempre abortada (fixtures.mjs): nada sai de verdade, mas a
// tentativa fica registrada. Antes de qualquer clique no banner e depois de Recusar, zero tentativa ao Google;
// depois de Aceitar, a tentativa de carregar o gtag.js aparece, o que prova que o bloqueio depende do consentimento.
import { test, expect, ehGoogle, semErros, semRedeExterna, semRolagemHorizontal, assentar, prepararEnvio, semRecarga } from './fixtures.mjs';
import { ARQUIVOS, BLOG, CALCULADORAS, DESLIGADAS, LICITACOES, PROPRIOS, POSTS, urlDe } from './site.mjs';

const banner = (page) => page.locator('section#lcm-consent');

// rede.google() inclui as dicas de conexão (preconnect, dns-prefetch...) para hosts do Google, que não viram request.
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

// Envia a calculadora: o ui.js dispara cc:calculo-concluido, que o medicao.js passa ao lcmTrack. Sem recarga: senão o
// evento nem sai e o teste não exercitaria o caminho da medição.
async function calcular(page, id) {
  await prepararEnvio(page);
  await page.locator(`form[data-calc="${id}"] button[type="submit"]`).click();
  await expect(page.locator('#resultado')).toHaveText(/\d/);
  await semRecarga(page);
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
    semRedeExterna(rede);
    semErros(erros, rede);
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
    expect(rede.tentativas.filter((u) => !ehGoogle(u)), 'nenhum outro host externo, também depois de recarregar').toEqual([]);
    expect(rede.dicas, 'nenhuma dica de conexão para outro host').toEqual([]);
    semErros(erros, rede);
  });
}

// CC-SITE-11: o `font:600 15px/1.2 inherit` do lcm-consent.css é descartado inteiro (inherit não entra no atalho), e a
// regra global button{} do style.css vazava nos botões do aviso (16,8 px, peso 800, margin-top de 22 px). O componente
// fica intacto; o style.css define a fonte e zera margem, espaçamento e largura do .lcmc-btn. Os dois botões seguem
// iguais (G-06): mesma classe, mesma fonte, mesmo tamanho.
test('aviso de cookies: botões com 15 px, peso 600, sem a margem nem a largura do button{} global, e iguais (G-06)', async ({ page }) => {
  await page.goto('/salario-liquido/');
  await expect(banner(page)).toBeVisible();
  const estilo = (sel) => banner(page).locator(sel).evaluate((b) => {
    const s = getComputedStyle(b), r = b.getBoundingClientRect();
    return { fonte: s.fontSize, peso: s.fontWeight, linha: s.lineHeight, margem: s.marginTop, espacamento: s.letterSpacing, largura: Math.round(r.width), altura: Math.round(r.height) };
  });
  const aceitar = await estilo('[data-lcmc="aceitar"]');
  const recusar = await estilo('[data-lcmc="recusar"]');
  expect(aceitar).toMatchObject({ fonte: '15px', peso: '600', linha: '18px', margem: '0px', espacamento: 'normal' });
  expect(recusar, 'Recusar igual a Aceitar (G-06)').toEqual(aceitar);
  expect(aceitar.altura).toBeGreaterThanOrEqual(44);
});

// CC-SITE-09 (WCAG 2.2, 2.4.11): com o aviso aberto, nenhum dos 40 primeiros focáveis da página fica atrás dele. O
// aviso fixo ocupa metade da tela em 390 px; o site acrescenta embaixo do body o espaço que ele ocupa e, quando o foco
// vai para um elemento que ficaria sob o aviso, rola a página até o elemento ficar acima dele. Confere também que o
// espaço sai quando o aviso fecha.
// Falha: elemento inteiramente sob o aviso (o critério 2.4.11) ou, se ele cabe entre o cabeçalho fixo e o aviso e não
// está num contêiner sticky/fixed (que a rolagem não move), qualquer parte dele sob o aviso. Elemento mais alto que esse
// espaço (tabela que rola, por exemplo) fica com o topo logo abaixo do cabeçalho, e o resto passa por trás do aviso.
const sobAviso = (page) => page.evaluate(() => {
  const a = document.activeElement, av = document.getElementById('lcm-consent');
  if (!a || a === document.body || !av || av.hidden || av.contains(a)) return null;
  const r = a.getBoundingClientRect(), b = av.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const sob = Math.max(0, Math.min(r.right, b.right) - Math.max(r.left, b.left)) * Math.max(0, Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top));
  if (!sob) return null;
  const pct = Math.round((100 * sob) / (r.width * r.height));
  const livre = b.top - 16 - (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0);
  let preso = false;
  for (let p = a; p && p !== document.body; p = p.parentElement) if (/^(sticky|fixed)$/.test(getComputedStyle(p).position)) preso = true;
  if (pct < 100 && (r.height > livre || preso)) return null;
  const nome = `${a.tagName.toLowerCase()}${a.id ? `#${a.id}` : ''} "${(a.textContent || a.value || '').replace(/\s+/g, ' ').trim().slice(0, 30)}"`;
  return `${nome}: ${pct}% sob o aviso`;
});
// Com Tab rápido, a rolagem suave do navegador (html com scroll-behavior:smooth) pode estar em curso: mede a posição em
// que a página para (3 quadros e nenhum evento de rolagem há 150 ms; no máximo 3 s), que é o que a pessoa vê.
const rolagemParada = (page) => page.evaluate(() => new Promise((ok) => {
  if (!window.__e2eRolagem) { window.__e2eRolagem = { t: 0 }; addEventListener('scroll', () => { window.__e2eRolagem.t = performance.now(); }, { passive: true }); }
  const inicio = performance.now();
  let quadros = 0;
  const passo = (t) => {
    quadros++;
    if ((quadros >= 3 && t - window.__e2eRolagem.t >= 150) || t - inicio > 3000) ok(); else requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}));
for (const url of ['/', '/salario-liquido/', '/rescisao/', '/simples-hibrido/', '/blog/pro-labore/']) {
  test(`${url}: com o aviso aberto, o foco do teclado nunca fica atrás dele (40 Tabs)`, async ({ page }) => {
    await page.goto(url);
    await expect(banner(page)).toBeVisible();
    await assentar(page);
    const espaco = await page.evaluate(() => [parseFloat(getComputedStyle(document.body).paddingBottom), document.getElementById('lcm-consent').getBoundingClientRect().height]);
    expect(espaco[0], 'o body ganha embaixo pelo menos a altura do aviso').toBeGreaterThanOrEqual(espaco[1]);
    const cobertos = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      await rolagemParada(page);
      const r = await sobAviso(page);
      if (r) cobertos.push(r);
    }
    expect(cobertos, 'focáveis atrás do aviso de cookies').toEqual([]);
    await banner(page).locator('[data-lcmc="recusar"]').click();
    await expect(banner(page)).toBeHidden();
    expect(await page.evaluate(() => document.body.style.paddingBottom), 'o espaço sai quando o aviso fecha').toBe('');
  });
}

// CC-SITE-10 (2.4.3): reaberto pelo rodapé, o aviso fecha pelo teclado (Recusar ou Esc) e o foco volta ao botão
// "Preferências de cookies", em vez de cair no body (o Tab seguinte voltava ao "Pular para o conteúdo", no topo).
test('aviso reaberto pelo rodapé: Recusar ou Esc devolvem o foco a "Preferências de cookies"', async ({ page }) => {
  await page.goto('/salario-liquido/');
  await banner(page).locator('[data-lcmc="recusar"]').click();
  await expect(banner(page)).toBeHidden();
  const rever = page.locator('button.cc-rever');
  for (const fechar of ['Recusar', 'Escape']) {
    await rever.focus();
    await page.keyboard.press('Enter');
    await expect(banner(page)).toBeVisible();
    await expect(banner(page).locator('[data-lcmc="aceitar"]')).toBeFocused();
    if (fechar === 'Recusar') { await page.keyboard.press('Tab'); await page.keyboard.press('Enter'); } else await page.keyboard.press('Escape');
    await expect(banner(page)).toBeHidden();
    await expect(rever, `foco depois de fechar com ${fechar}`).toBeFocused();
    expect(await page.evaluate(() => document.body.style.paddingBottom)).toBe('');
  }
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('lcm-consent')).v)).toBe('recusado');
});

// Na primeira visita, o aviso abre sem tirar o foco de lugar; quem entra nele pelo teclado e escolhe volta ao último
// elemento que tinha o foco fora dele. Com o mouse ou o toque, o foco não volta para o campo (no celular, isso reabriria
// o teclado virtual).
test('primeira visita: escolha pelo teclado devolve o foco ao último elemento focado fora do aviso; pelo clique, não', async ({ page }) => {
  await page.goto('/salario-liquido/');
  await expect(banner(page)).toBeVisible();
  await page.locator('#f-bruto').focus();
  await banner(page).locator('[data-lcmc="recusar"]').focus();
  await page.keyboard.press('Enter');
  await expect(banner(page)).toBeHidden();
  await expect(page.locator('#f-bruto')).toBeFocused();

  await page.evaluate(() => localStorage.removeItem('lcm-consent'));
  await page.reload();
  await expect(banner(page)).toBeVisible();
  await page.locator('#f-bruto').click();
  await banner(page).locator('[data-lcmc="recusar"]').click();
  await expect(banner(page)).toBeHidden();
  await expect(page.locator('#f-bruto')).not.toBeFocused();
});

// Varredura: toda página com o banner (fora das já cobertas em calculadoras.spec e paginas.spec) abre com o banner
// visível e sem nenhuma tentativa externa, sem erro e sem rolagem horizontal.
const cobertas = new Set(['/', ...BLOG, ...CALCULADORAS.map((c) => c.url), ...DESLIGADAS.map((c) => c.url), ...PROPRIOS.map((c) => c.url), ...LICITACOES]);
const demais = ARQUIVOS.map(urlDe).filter((u) => !cobertas.has(u));
for (const url of demais) {
  test(`página ${url}: banner visível, zero Google e nenhum host externo antes do aceite`, async ({ page, rede, erros }) => {
    await page.goto(url);
    await expect(banner(page)).toBeVisible();
    await assentar(page);
    await semGoogle(page, rede, 'antes de qualquer clique no banner');
    await semRolagemHorizontal(page);
    semRedeExterna(rede);
    semErros(erros, rede);
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
    semRedeExterna(rede);
    semErros(erros, rede);
  });
}
