// Empregador em Dia E2: EMPREGADOR_EM_DIA ON no arquivo (DEC CEO/CPO 31/10); a rota que liga a flag ficou sem efeito,
// mantida por segurança. Confere o estado inicial no HTML, o fluxo das 5 faixas, o bloqueio de "R$" em <20 e >200, a conta da jornada (EC 141) e nenhuma
// requisição com dados das respostas.
import { test, expect, semErros, semRedeExterna, semRolagemHorizontal, assentar } from './fixtures.mjs';

const PAGS = ['/empregador-em-dia/', '/empregador-em-dia/avaliacao-rapida-nr1/', '/empregador-em-dia/avaliacao-rapida-nr1/resultado/', '/empregador-em-dia/jornada-42h/', '/empregador-em-dia/orcamento-nr1/'];
const ligar = (page) => page.route(/\/assets\/js\/empregador\/config\.js/, async (route) => {
  const r = await route.fetch();
  const corpo = (await r.text()).replace('EMPREGADOR_EM_DIA: false', 'EMPREGADOR_EM_DIA: true');
  await route.fulfill({ response: r, body: corpo });
});

// DEC CEO/CPO 31/10: EMPREGADOR_EM_DIA ON no arquivo. NB-05 (CLS): o app já vem visível no HTML, antes do ui.js, sem
// troca aviso -> app; o orçamento NR-1 (ED_CHECKOUT OFF) segue só com o aviso.
for (const url of PAGS) {
  const liberada = !url.includes('orcamento-nr1');
  test(`flag ON no arquivo ${url}: estado final já no HTML (${liberada ? 'app' : 'só o aviso'})`, async ({ page, rede, erros }) => {
    await page.route(/\/assets\/js\/empregador\/ui\.js/, (route) => route.abort()); // sem o ui.js: só o HTML
    await page.goto(url);
    await expect(page.locator(liberada ? '#ed-app' : '#ed-off')).toBeVisible();
    await expect(page.locator(liberada ? '#ed-off' : '#ed-app')).toBeHidden();
    await page.unroute(/\/assets\/js\/empregador\/ui\.js/);
    await page.goto(url);
    await assentar(page);
    await expect(page.locator(liberada ? '#ed-app' : '#ed-off')).toBeVisible();
    await expect(page.locator(liberada ? '#ed-off' : '#ed-app')).toBeHidden();
    if (!liberada) expect(await page.locator('main').innerText()).not.toContain('R$');
    semRedeExterna(rede);
    semErros(erros, rede);
  });
}

const CASOS = [
  ['20-50', 'oferta', 'R$ 1.490', 'R$ 745 agora e R$ 745'],
  ['51-100', 'oferta', 'R$ 2.290', 'R$ 1.145 agora e R$ 1.145'],
  ['101-200', 'oferta', 'R$ 3.490', 'R$ 1.745 agora e R$ 1.745'],
  ['lt20', 'simplificada', null, null],
  ['gt200', 'sob-consulta', null, null],
];
for (const [faixa, destino, preco, parcelas] of CASOS) {
  test(`flag ON avaliação rápida ${faixa} -> ${destino}`, async ({ page, rede, erros }) => {
    await ligar(page);
    const posts = [];
    page.on('request', (r) => { if (r.method() !== 'GET') posts.push(r.url()); });
    await page.goto('/empregador-em-dia/avaliacao-rapida-nr1/');
    await expect(page.getByText('Passo 1 de 3')).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.locator('#ed-msg')).toBeVisible();
    await page.locator(`input[name="faixa"][value="${faixa}"]`).check();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByText('Passo 2 de 3')).toBeVisible();
    await page.locator('input[name="onde[]"][value="loja"]').check();
    await page.locator('input[name="metas"][value="sim"]').check();
    await page.locator('input[name="reclamacao"][value="nao"]').check();
    await page.getByRole('button', { name: 'Voltar' }).click();
    await expect(page.locator(`input[name="faixa"][value="${faixa}"]`)).toBeChecked();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.locator('input[name="onde[]"][value="loja"]')).toBeChecked();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.locator('input[name="pgr"][value="naosei"]').check();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.waitForURL('**/avaliacao-rapida-nr1/resultado/');
    await assentar(page);
    const bloco = page.locator(`[data-ed-res="${destino}"]`);
    await expect(bloco).toBeVisible();
    const txt = await bloco.innerText();
    if (preco) {
      expect(txt).toContain(preco);
      expect(txt).toContain(parcelas);
      expect(txt).toContain('Metas de venda · atendimento ao público');
      expect(txt).toContain('Não sabe se tem: incluímos orientação');
      expect(txt).toContain('validação técnica opcional, não incluída no preço'); // ED_SST_INCLUIDO=false (DEC CPO 30/10, Jurídico 5a441f81 T2)
    } else {
      expect(txt).not.toContain('R$');
      await expect(bloco.getByRole('button', { name: 'Contratar' })).toHaveCount(0);
    }
    await semRolagemHorizontal(page);
    expect(posts).toEqual([]);
    semRedeExterna(rede);
    semErros(erros, rede);
  });
}

test('flag ON jornada 42h: conta aberta com divisor 210 e etapa de 40 h', async ({ page, rede, erros }) => {
  await ligar(page);
  await page.goto('/empregador-em-dia/jornada-42h/');
  await assentar(page);
  const conta = page.locator('.ed-conta');
  await expect(conta).toContainText('R$ 2.500,00');
  await expect(conta).toContainText('R$ 11,90');
  await expect(conta).toContainText('8,67 h');
  await expect(conta).toContainText('R$ 154,76');
  await expect(conta).toContainText('R$ 5.261,90 por mês');
  await expect(conta).toContainText('R$ 11.050,00 por mês');
  await expect(page.locator('main')).toContainText('A partir de R$ 1.490 para 20 a 50 funcionários.');
  await expect(page.locator('[data-ed="nota-dom"]')).toBeHidden();
  await page.locator('#f-dom').check();
  await expect(page.locator('[data-ed="nota-dom"]')).toContainText('LC 150/2015');
  await page.locator('#f-func').fill('0');
  await page.getByRole('button', { name: 'Calcular' }).click();
  await expect(page.locator('#f-func-msg')).toBeVisible();
  await expect(conta).not.toContainText('R$ 11.050,00'); // NB-05: conta anterior limpa
  await semRolagemHorizontal(page);
  semRedeExterna(rede);
  semErros(erros, rede);
});

test('orçamento NR-1: EMPREGADOR_EM_DIA ON mas ED_CHECKOUT OFF continua indisponível', async ({ page, rede, erros }) => {
  await ligar(page);
  await page.goto('/empregador-em-dia/orcamento-nr1/');
  await assentar(page);
  await expect(page.locator('#ed-off')).toBeVisible();
  await expect(page.locator('#ed-app')).toBeHidden();
  await expect(page.locator('#ed-orc button[type="submit"]')).toBeDisabled();
  semRedeExterna(rede);
  semErros(erros, rede);
});

// CC-SITE-06: os CTAs a.btn ("Ver o que minha empresa precisa", "Ver a adequação NR-1") eram links de texto de 21 px
// (nenhuma regra .btn existia), o Voltar (.btn.sec) era igual ao primário e o #f-func da jornada tinha fonte de 13,3 px.
// A varredura de todas as páginas em 390 px está no toque.spec.mjs; aqui fica o caso das páginas do Empregador nas duas
// larguras, com o Voltar em contorno.
const medir = (loc) => loc.evaluate((el) => {
  const cs = getComputedStyle(el);
  return { altura: el.getBoundingClientRect().height, fonte: parseFloat(cs.fontSize), fundo: cs.backgroundColor, sublinhado: cs.textDecorationLine };
});
for (const [url, rotulo] of [['/empregador-em-dia/', 'Ver o que minha empresa precisa'], ['/empregador-em-dia/jornada-42h/', 'Ver a adequação NR-1'], ['/empregador-em-dia/avaliacao-rapida-nr1/resultado/', 'Ver o que minha empresa precisa']]) {
  test(`CC-SITE-06 ${url}: "${rotulo}" com cara de botão, 44 px ou mais`, async ({ page }) => {
    await page.goto(url);
    await assentar(page);
    const ctas = await page.locator('a.btn', { hasText: rotulo }).all();
    expect(ctas.length, `${url}: a.btn "${rotulo}" na página`).toBeGreaterThan(0);
    for (const cta of ctas) {
      const m = await medir(cta);
      expect(m.altura, `${url}: a.btn "${rotulo}" com ${m.altura}px de altura`).toBeGreaterThanOrEqual(44);
      expect(m.fundo, 'a.btn com fundo').not.toBe('rgba(0, 0, 0, 0)');
      expect(m.sublinhado, 'a.btn sem sublinhado').toBe('none');
    }
    if (url.includes('jornada')) {
      const m = await medir(page.locator('#f-func'));
      expect(m.fonte, '#f-func com fonte de 16 px ou mais (abaixo disso o iOS dá zoom no foco)').toBeGreaterThanOrEqual(16);
      expect(m.altura).toBeGreaterThanOrEqual(44);
    }
  });
}

test('CC-SITE-06 avaliação rápida: Voltar (.btn.sec) em contorno, diferente do Continuar', async ({ page }) => {
  await page.goto('/empregador-em-dia/avaliacao-rapida-nr1/');
  await assentar(page);
  await page.locator('input[name="faixa"][value="20-50"]').check();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText('Passo 2 de 3')).toBeVisible();
  const voltar = await medir(page.getByRole('button', { name: 'Voltar' }));
  const continuar = await medir(page.getByRole('button', { name: 'Continuar' }));
  expect(voltar.fundo, 'Voltar sem fundo (contorno)').toBe('rgba(0, 0, 0, 0)');
  expect(continuar.fundo).not.toBe('rgba(0, 0, 0, 0)');
  expect(voltar.altura).toBeGreaterThanOrEqual(44);
});
