// Validação de datas e acessibilidade do resultado (lote 4 da linha cc-calc, auditoria de 30-31/10/2026:
// CC-CALC-VALIDA-01, CC-CALC-A11Y-01 e CC-CALC-VALIDA-02). Preenche os campos, confere o erro no campo (mensagem,
// aria-invalid e link na lista) e o que o leitor de tela recebe, sem erro de console nem rede externa.
import { test, expect, semErros, semRedeExterna } from './fixtures.mjs';

const abrir = async (page, url) => {
  await page.goto(url);
  const form = page.locator('form[data-calc]');
  await expect(form.locator('button[type="submit"]')).toBeEnabled();
  return {
    resultado: page.locator('#resultado'),
    // Envio pelo botão: cálculo imediato, sem esperar o atraso do evento input.
    calcular: () => form.locator('button[type="submit"]').click(),
  };
};

test('porcentagem: "-0" sai como 0, sem sinal de menos', async ({ page, rede, erros }) => {
  const { resultado, calcular } = await abrir(page, '/porcentagem/');
  for (const id of ['p1', 'v1', 'x2', 'v2', 'a3', 'b3', 'v4', 'p4']) await page.fill(`#f-${id}`, '-0');
  await calcular();
  await expect(resultado.locator('table.res')).toBeVisible();
  await expect(resultado).toContainText('0% de 0');
  await expect(resultado).not.toContainText('-0');
  await expect(resultado).not.toContainText('-R$');
  semRedeExterna(rede);
  semErros(erros, rede);
});
