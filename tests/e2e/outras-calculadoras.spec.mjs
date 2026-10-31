// Outras calculadoras: entradas sem sentido e valores que não acompanham o formulário (lote 3 da linha cc-calc,
// auditoria de 30-31/10/2026: CC-CALC-SEGURO-01, CC-CALC-IR-01, CC-CALC-FERIAS-01, CC-CALC-PARCELADO-01 e
// CC-CALC-INVEST-01). Preenche os campos, confere o erro no campo e o resultado, sem erro de console nem rede externa.
import { test, expect, semErros, semRedeExterna } from './fixtures.mjs';

const abrir = async (page, url, id) => {
  await page.goto(url);
  const form = page.locator(`form[data-calc="${id}"]`);
  await expect(form.locator('button[type="submit"]')).toBeEnabled();
  return {
    resultado: page.locator('#resultado'),
    // Envio pelo botão: cálculo imediato, sem esperar o atraso do evento input.
    calcular: () => form.locator('button[type="submit"]').click(),
  };
};
// "R$ 1.234,56" com o espaço não separável do Intl
const brl = (s) => new RegExp(s.replace(/[.$]/g, '\\$&').replace(' ', '\\s'));
const erroNoCampo = async (page, resultado, id, texto) => {
  await expect(page.locator(`#${id}`)).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator(`#${id}-msg`)).toBeVisible();
  await expect(page.locator(`#${id}-msg`)).toHaveText(texto);
  await expect(resultado.locator(`.erro a[href="#${id}"]`)).toBeVisible();
  await expect(resultado.locator('.destaque')).toHaveCount(0);
};

test('seguro-desemprego: salários zerados dão erro no campo, não o piso; menos de 3 salários ganha nota', async ({ page, rede, erros }) => {
  const { resultado, calcular } = await abrir(page, '/seguro-desemprego/', 'seguro-desemprego');
  for (const id of ['#f-s1', '#f-s2', '#f-s3']) await page.fill(id, '0');
  await calcular();
  await erroNoCampo(page, resultado, 'f-s1', 'Informe um valor maior que zero.');
  await expect(resultado).not.toContainText('1.621,00');
  await page.fill('#f-s1', '3000');
  await calcular();
  await expect(page.locator('#f-s1')).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#f-s1-msg')).toBeHidden();
  await expect(resultado.locator('.destaque')).toContainText('4 parcelas de');
  await expect(resultado.locator('.destaque strong')).toHaveText(brl('R$ 2.166,66'));
  await expect(resultado).toContainText('Média dos salários informados (1 de 3)');
  await expect(resultado).toContainText('A média usou só 1 salário: os meses com salário 0 ficam fora da conta.');
  semRedeExterna(rede);
  semErros(erros, rede);
});

test('imposto de renda: o INSS acompanha o rendimento até ser editado; depois de editado, fica', async ({ page, rede, erros }) => {
  const { resultado, calcular } = await abrir(page, '/imposto-de-renda/', 'imposto-de-renda');
  const inss = page.locator('#f-inss');
  await expect(inss).toHaveValue('571,51');
  await expect(page.locator('#f-inss-ajuda')).toHaveText('Calculado pela tabela do INSS de 2026 a partir do rendimento; edite se o desconto for outro.');
  // pelo recálculo automático (evento input), sem clicar em Calcular
  await page.fill('#f-rendimentos', '8000');
  await expect(inss).toHaveValue('921,51');
  await expect(resultado.locator('.destaque strong')).toHaveText(brl('R$ 1.037,85'));
  // INSS digitado pelo usuário: trocar o rendimento não mexe nele
  await page.fill('#f-inss', '1000');
  await page.fill('#f-rendimentos', '9000');
  await calcular();
  await expect(inss).toHaveValue('1000');
  await expect(resultado.locator('.destaque strong')).toHaveText(brl('R$ 1.291,27'));
  semRedeExterna(rede);
  semErros(erros, rede);
});

test('férias: dias de gozo e dias vendidos separados; soma acima de 30 é erro no campo', async ({ page, rede, erros }) => {
  const { resultado, calcular } = await abrir(page, '/ferias/', 'ferias');
  await expect(page.locator('#f-vender')).toHaveCount(0);
  await expect(page.getByLabel('Dias vendidos (abono)')).toHaveValue('0');
  await page.fill('#f-diasAbono', '10');
  await calcular();
  await expect(page.locator('#f-diasAbono')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#f-diasAbono-msg')).toContainText('somam 40');
  await expect(resultado.locator('.erro a[href="#f-diasAbono"]')).toHaveText('Dias vendidos (abono)');
  await expect(resultado.locator('.destaque')).toHaveCount(0);
  // 20 de gozo + 10 vendidos, salário padrão de R$ 4.000: o exemplo "Vendendo 10 dias" da página
  await page.fill('#f-diasGozo', '20');
  await calcular();
  await expect(page.locator('#f-diasAbono')).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#f-diasAbono-msg')).toBeHidden();
  await expect(resultado.locator('.destaque strong')).toHaveText(brl('R$ 5.018,06'));
  await expect(resultado).toContainText('Férias (20 dias)');
  await expect(resultado).toContainText('Abono pecuniário (10 dias vendidos)');
  // o caso do achado: 15 de gozo + 10 vendidos (antes, 25 com "vender 1/3" davam 17 + 8)
  await page.fill('#f-diasGozo', '15');
  await calcular();
  await expect(resultado).toContainText('Férias (15 dias)');
  await expect(resultado).toContainText('Abono pecuniário (10 dias vendidos)');
  semRedeExterna(rede);
  semErros(erros, rede);
});

test('à vista ou parcelado: parcelado mais barato não mostra juros de 0% nem desconto negativo; à vista 0 é erro', async ({ page, rede, erros }) => {
  const { resultado, calcular } = await abrir(page, '/parcelado-ou-a-vista/', 'parcelado-ou-a-vista');
  await page.fill('#f-parcela', '90');
  await calcular();
  await expect(resultado).toContainText('não há juros: o parcelado custa menos que à vista');
  await expect(resultado).toContainText('Parcelado custa 10,0% menos');
  await expect(resultado).not.toContainText('Juros embutidos (ao mês)');
  await expect(resultado).not.toContainText('Desconto à vista');
  await expect(resultado).not.toContainText('11,1%');
  await page.fill('#f-vista', '0');
  await calcular();
  await erroNoCampo(page, resultado, 'f-vista', 'Informe um valor maior que zero.');
  await expect(resultado).not.toContainText('100,0%');
  semRedeExterna(rede);
  semErros(erros, rede);
});

test('investimentos: CDI negativo é erro no campo, sem resultado; TR 0 calcula', async ({ page, rede, erros }) => {
  const { resultado, calcular } = await abrir(page, '/investimentos/', 'investimentos');
  await page.fill('#f-cdi', '-5');
  await calcular();
  await erroNoCampo(page, resultado, 'f-cdi', 'O valor não pode ser negativo.');
  await expect(resultado).not.toContainText('−R$');
  await page.fill('#f-cdi', '13,65');
  await page.fill('#f-tr', '0');
  await calcular();
  await expect(page.locator('#f-cdi')).not.toHaveAttribute('aria-invalid', 'true');
  await expect(resultado.locator('.destaque')).toContainText('Melhor resultado líquido');
  await expect(resultado).not.toContainText('−R$');
  semRedeExterna(rede);
  semErros(erros, rede);
});
