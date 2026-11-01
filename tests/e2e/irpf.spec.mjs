// /irpf/ (motor próprio, irpf.js): o JS habilita Simular, o envio mostra o resultado estimado sem recarregar,
// a captura (R2-09) nunca bloqueia o resultado e segue oculta com IRPF_CAPTURA=false; sem checkout; sem rede externa.
import { test, expect, semErros, semRedeExterna, semRolagemHorizontal, assentar } from './fixtures.mjs';
import { PROPRIOS } from './site.mjs';

test('descoberta: /irpf/ é simulador de motor próprio', () => {
  expect(PROPRIOS.map((c) => c.url)).toEqual(['/irpf/']);
});

test('/irpf/: resultado primeiro, captura depois e desligada, sem erro', async ({ page, rede, erros }) => {
  await page.goto('/irpf/');
  await assentar(page);
  const form = page.locator('#irpf-form');
  const botao = form.locator('button[type="submit"]');
  await expect(botao, 'irpf.js habilita Simular').toBeEnabled();
  await expect(page.locator('#irpf-captura')).toBeHidden();
  await page.evaluate(() => { window.__semRecarga = true; });
  await botao.click();
  const resultado = page.locator('#resultado');
  await expect(resultado).toContainText('R$');
  await expect(resultado).toContainText(/estimad/i);
  // CC-CALC-A11Y-01: o #resultado não é região viva; o leitor de tela recebe só a frase curta do valor principal.
  await expect(resultado).toHaveAttribute('aria-live', 'off');
  await expect(page.locator('#resultado-anuncio')).toHaveText(/^(Restituição estimada|Saldo a pagar estimado): R\$\s[\d.]+,\d{2}$/);
  expect(await page.evaluate(() => window.__semRecarga), 'o envio não recarregou a página').toBe(true);
  await expect(page.locator('#irpf-captura'), 'IRPF_CAPTURA=false').toBeHidden();
  await expect(page.locator('#irpf-captura button[type="submit"]')).toBeDisabled();
  await semRolagemHorizontal(page);
  semRedeExterna(rede);
  semErros(erros, rede);
});
