// (e) Alvos de toque e tabelas no celular (390 px), em todas as páginas de ARQUIVOS (CC-SITE-08). Pega o que o axe e o
// Lighthouse deixam passar: campo com o estilo padrão do navegador (21 px de altura, fonte de 13,3 px, que dá zoom no
// iOS ao focar), link com cara de botão sem estilo e tabela de resultado cortada por um ancestral com overflow
// hidden/clip, sem rolagem (o semRolagemHorizontal não vê o que o corte esconde).
// - Todo input, select e textarea visível (fora checkbox, radio, hidden e o honeypot .le-hp): altura >= 44 px e fonte
//   >= 16 px.
// - Todo a.btn, button e input de botão visível: altura >= 44 px (WCAG 2.5.8 pede 24 px; o site usa 44 px, o mínimo
//   de toque do iOS).
// - Nas calculadoras (form.calc-form[data-calc]) e nos simuladores de motor próprio (/irpf/), depois do envio com os
//   valores padrão: nenhuma célula de tabela passa da borda de um ancestral com overflow hidden/clip sem antes passar
//   por um ancestral que rola (overflow auto/scroll, como o .rolagem do ui.js).
// A mensagem lista página, seletor e medida de cada caso. Corrija a página, não o teste.
import { test, expect, assentar, celulasCortadas } from './fixtures.mjs';
import { ARQUIVOS, CALCULADORAS, PROPRIOS, urlDe } from './site.mjs';

const ALTURA_MIN = 44;
const FONTE_MIN = 16;
const PAGINAS = ARQUIVOS.map(urlDe);
const ENVIO = new Set([...CALCULADORAS, ...PROPRIOS].map((c) => c.url));

test.skip(({ isMobile }) => !isMobile, 'só no 390 px (toque)');

test('descoberta: alvos de toque cobrem todas as páginas, com envio nas calculadoras e no /irpf/', () => {
  expect(PAGINAS.length).toBeGreaterThanOrEqual(50);
  expect([...ENVIO]).toEqual(expect.arrayContaining(['/irpf/', '/salario-liquido/', '/rescisao/']));
});

// Campos e botões visíveis fora da medida. Roda no navegador; devolve uma linha por elemento.
function medirAlvos({ alturaMin, fonteMin }) {
  const nome = (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.classList.length ? `.${[...el.classList].join('.')}` : ''}${el.getAttribute('type') ? `[type=${el.getAttribute('type')}]` : ''}`;
  const visivel = (el) => {
    const b = el.getBoundingClientRect();
    return b.width > 1 && b.height > 1 && el.checkVisibility({ checkVisibilityCSS: true });
  };
  const px = (n) => `${Math.round(n * 10) / 10}px`;
  const fora = [];
  const BOTAO_INPUT = new Set(['submit', 'button', 'reset', 'image']);
  for (const el of document.querySelectorAll('input, select, textarea')) {
    const tipo = (el.getAttribute('type') || '').toLowerCase();
    if (el.tagName === 'INPUT' && (['checkbox', 'radio', 'hidden'].includes(tipo) || BOTAO_INPUT.has(tipo))) continue;
    if (el.closest('.le-hp') || !visivel(el)) continue;
    const altura = el.getBoundingClientRect().height;
    const fonte = parseFloat(getComputedStyle(el).fontSize);
    const erros = [];
    if (altura < alturaMin - 0.5) erros.push(`altura ${px(altura)} (mínimo ${alturaMin}px)`);
    if (fonte < fonteMin - 0.05) erros.push(`fonte ${px(fonte)} (mínimo ${fonteMin}px; abaixo disso o iOS dá zoom no foco)`);
    if (erros.length) fora.push(`campo ${nome(el)}: ${erros.join(', ')}`);
  }
  const botoes = [...document.querySelectorAll('a.btn, button')]
    .concat([...document.querySelectorAll('input')].filter((el) => BOTAO_INPUT.has((el.getAttribute('type') || '').toLowerCase())));
  for (const el of botoes) {
    if (!visivel(el)) continue;
    const altura = el.getBoundingClientRect().height;
    if (altura < alturaMin - 0.5) fora.push(`botão ${nome(el)} "${el.textContent.replace(/\s+/g, ' ').trim().slice(0, 40)}": altura ${px(altura)} (mínimo ${alturaMin}px)`);
  }
  return fora;
}

// Envia o formulário da calculadora (ou do simulador) com os valores padrão. Questionário sem resposta padrão (hoje
// só a NR-1): responde cada pergunta em branco com a última opção, como o calculadoras.spec.
async function enviar(page, url) {
  const form = page.locator(PROPRIOS.some((c) => c.url === url) ? 'form.calc-form[data-motor="proprio"]' : 'form.calc-form[data-calc]');
  const botao = form.locator('button[type="submit"]');
  await expect(botao, 'o JS habilita o botão de envio').toBeEnabled();
  const emBranco = await form.evaluate((f) => [...f.querySelectorAll('select')].filter((s) => s.value === '' && !s.closest('[hidden]')).map((s) => s.id));
  for (const id of emBranco) {
    const ultima = await page.locator(`[id="${id}"] option`).last().getAttribute('value');
    await page.selectOption(`[id="${id}"]`, ultima);
  }
  await botao.click();
  // Com o questionário respondido, o nível indicativo é texto, sem número: basta o destaque.
  if (emBranco.length) await expect(page.locator('#resultado .destaque'), 'resultado em destaque').toBeVisible();
  else await expect(page.locator('#resultado'), 'resultado com número').toHaveText(/\d/);
}

for (const url of PAGINAS) {
  test(`toque ${url}: campos e botões com 44px, fonte de 16px${ENVIO.has(url) ? ', tabela do resultado sem corte' : ''}`, async ({ page }) => {
    const resposta = await page.goto(url);
    expect(resposta.status()).toBe(200);
    await assentar(page);
    const fora = (await page.evaluate(medirAlvos, { alturaMin: ALTURA_MIN, fonteMin: FONTE_MIN })).map((l) => `${url}: ${l}`);
    if (ENVIO.has(url)) {
      await enviar(page, url);
      fora.push(...(await celulasCortadas(page)).map((l) => `${url} (depois do envio): ${l}`));
    }
    expect(fora, `fora do padrão de toque em 390 px:\n  ${fora.join('\n  ')}\n`).toEqual([]);
  });
}
