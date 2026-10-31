// (b) A home, o índice do blog, as categorias e os posts (descobertos em blog/**/index.html) carregam sem erro de
// console nem pageerror, sem recurso local quebrado, sem rede externa e sem rolagem horizontal.
import { test, expect, semErros, semRedeExterna, semRolagemHorizontal, assentar } from './fixtures.mjs';
import { BLOG, POSTS } from './site.mjs';

test('descoberta: blog com índice e ao menos um post', () => {
  expect(BLOG).toContain('/blog/');
  expect(POSTS.length).toBeGreaterThanOrEqual(1);
});

for (const url of ['/', ...BLOG]) {
  test(`página ${url}: carrega sem erro`, async ({ page, rede, erros }) => {
    const resposta = await page.goto(url);
    expect(resposta.status()).toBe(200);
    await assentar(page);
    // Stub M-02 (noindex, conteúdo movido): sem H1 por desenho; exige o link de destino visível.
    const noindex = await page.locator('meta[name="robots"][content*="noindex"]').count();
    if (noindex) await expect(page.locator('main a, body a').first()).toBeVisible();
    else await expect(page.locator('h1').first()).toBeVisible();
    await semRolagemHorizontal(page);
    semRedeExterna(rede);
    semErros(erros, rede);
  });
}
