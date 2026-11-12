// PR-0: EMPREGADOR_EM_DIA OFF. O HTML servido é só o aviso; o fluxo de venda fica no gerador (flag ON).
import { test, expect, semErros, semRedeExterna, assentar } from './fixtures.mjs';

const PAGS = [
  '/empregador-em-dia/',
  '/empregador-em-dia/avaliacao-rapida-nr1/',
  '/empregador-em-dia/avaliacao-rapida-nr1/resultado/',
  '/empregador-em-dia/jornada-42h/',
  '/empregador-em-dia/orcamento-nr1/',
  '/empregador-em-dia/precos/',
  '/empregador-em-dia/contratar/',
  '/empregador-em-dia/pagamento/',
  '/empregador-em-dia/pagamento/ok/',
  '/empregador-em-dia/painel/',
];
const AVISO = 'Esta página está em preparação e ainda não está disponível.';

for (const url of PAGS) {
  test(`PR-0 ${url}: só o aviso, sem o app de venda`, async ({ page, rede, erros }) => {
    const resposta = await page.goto(url);
    expect(resposta.status()).toBeLessThan(400);
    await assentar(page);
    await expect(page.locator('#ed-off')).toBeVisible();
    await expect(page.locator('#ed-app')).toHaveCount(0);
    await expect(page.locator('main')).toContainText(AVISO);
    const html = await page.content();
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html.toLowerCase()).not.toMatch(/inventário|plano de ação|questionário|eduzz/);
    semRedeExterna(rede);
    semErros(erros, rede);
  });
}

test('PR-0: /empregador-em-dia/pagamento/2/ não existe', async ({ page }) => {
  const resposta = await page.goto('/empregador-em-dia/pagamento/2/');
  expect(resposta.status()).toBe(404);
});
