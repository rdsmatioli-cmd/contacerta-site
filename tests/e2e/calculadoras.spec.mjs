// (a) Cada calculadora, descoberta pelo HTML (form.calc-form[data-calc]), envia o formulário com os valores padrão e
// mostra um resultado com número, sem erro de console nem pageerror, sem rolagem horizontal e sem rede externa.
// O banner de cookies fica aberto (visitante novo) e nunca é clicado aqui.
import { test, expect, semErros, semRedeExterna, semRolagemHorizontal, assentar, prepararEnvio, semRecarga } from './fixtures.mjs';
import { CALCULADORAS, DESLIGADAS, SEM_CLASSIFICACAO } from './site.mjs';

test('descoberta: calculadoras achadas pelo HTML, nenhuma sem classificação', () => {
  expect(SEM_CLASSIFICACAO, 'form.calc-form sem data-calc e com botão de envio habilitado').toEqual([]);
  // Piso de sanidade da descoberta (hoje são 27 ativas): se o padrão do HTML mudar, o teste não passa vazio.
  expect(CALCULADORAS.length).toBeGreaterThanOrEqual(20);
  expect(new Set(CALCULADORAS.map((c) => c.url)).size, 'uma calculadora por página').toBe(CALCULADORAS.length);
});

const enviar = async (page, form, { destaque = false } = {}) => {
  const resultado = page.locator('#resultado');
  // O ui.js já calcula ao carregar: limpa a saída para provar que o resultado veio do envio, e marca a janela para
  // provar que o envio não recarregou a página (GET nativo com o resultado dos padrões).
  await resultado.evaluate((el) => { el.innerHTML = ''; });
  await prepararEnvio(page);
  await form.locator('button[type="submit"]').click();
  if (destaque) await expect(resultado.locator('.destaque'), 'resultado em destaque').toBeVisible();
  else await expect(resultado, 'resultado com número').toHaveText(/\d/);
  await expect(resultado.locator('.erro'), 'resultado sem mensagem de erro').toHaveCount(0);
  await expect(resultado).not.toContainText('Não foi possível calcular');
  await semRecarga(page);
};

for (const c of CALCULADORAS) {
  test(`calculadora ${c.url}: valores padrão, resultado com número`, async ({ page, rede, erros }) => {
    await page.goto(c.url);
    const form = page.locator(`form[data-calc="${c.id}"]`);
    await expect(form.locator('button[type="submit"]'), 'o ui.js habilita o botão Calcular').toBeEnabled();
    await semRolagemHorizontal(page);
    await enviar(page, form);

    // Questionário sem resposta padrão (hoje só a NR-1): com os padrões, a saída pede as respostas e informa quantas
    // são (o número da conferência acima). O teste responde cada pergunta em branco com a última opção e exige o
    // resultado em destaque (o nível indicativo é texto, sem número).
    const emBranco = await form.evaluate((f) => [...f.querySelectorAll('select')].filter((s) => s.value === '' && !s.closest('[hidden]')).map((s) => s.id));
    if (emBranco.length) {
      for (const id of emBranco) {
        const ultima = await page.locator(`[id="${id}"] option`).last().getAttribute('value');
        await page.selectOption(`[id="${id}"]`, ultima);
      }
      await enviar(page, form, { destaque: true });
    }

    await assentar(page);
    await semRolagemHorizontal(page); // de novo, com o resultado na tela
    semRedeExterna(rede);
    semErros(erros, rede);
  });
}

// Calculadoras desligadas no HTML (hoje IMC e idade): carregam sem erro, o botão continua desabilitado com o JS
// ligado e a saída mostra o aviso estático. Se alguém religar uma delas, ela passa a ter data-calc e cai no teste acima.
for (const c of DESLIGADAS) {
  test(`calculadora desligada ${c.url}: botão desabilitado e aviso, sem erro`, async ({ page, rede, erros }) => {
    await page.goto(c.url);
    await assentar(page);
    const form = page.locator('form.calc-form');
    await expect(form.locator('button[type="submit"]')).toBeDisabled();
    await expect(page.locator('#resultado')).toHaveText('Calculadora temporariamente indisponível.');
    await semRolagemHorizontal(page);
    semRedeExterna(rede);
    semErros(erros, rede);
  });
}
