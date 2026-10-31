// /rescisao/: motivo do desligamento x aviso prévio e campos condicionais (lote 1 da linha cc-calc, auditoria de
// 30-31/10/2026: CC-CALC-TRABALHISTA-02, -03, -11 e -12 e CC-CALC-CSS-01). Abre a página, troca o motivo, o aviso e as
// férias vencidas e confere o erro do campo e o resultado, sem erro de console nem rede externa.
import { test, expect, semErros, semRedeExterna, assentar } from './fixtures.mjs';

const abrir = async (page) => {
  await page.goto('/rescisao/');
  await expect(page.locator('form[data-calc="rescisao"] button[type="submit"]')).toBeEnabled();
  return {
    resultado: page.locator('#resultado'),
    // Envio pelo botão: cálculo imediato, sem esperar o atraso do evento input.
    calcular: () => page.locator('form[data-calc="rescisao"] button[type="submit"]').click(),
  };
};
// "R$ 1.234,56" com o espaço não separável do Intl
const brl = (s) => new RegExp(s.replace(/[.$]/g, '\\$&').replace(' ', '\\s'));

test('campos de dobra das férias: escondidos de fato com 0, um com 1, dois com 2; o Sim persiste no recálculo', async ({ page, rede, erros }) => {
  const { resultado, calcular } = await abrir(page);
  const venc = page.locator('#f-feriasVencidas');
  const d1 = page.locator('#f-dobro1');
  const d2 = page.locator('#f-dobro2');
  // 0 (padrão): os dois somem e saem da ordem de tabulação
  await expect(d1).toBeHidden();
  await expect(d2).toBeHidden();
  await venc.focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#f-saldoFgts')).toBeFocused();
  // 1: só o 1º período; Sim continua depois de editar outro campo
  await venc.fill('1');
  await expect(d1).toBeVisible();
  await expect(d2).toBeHidden();
  await page.selectOption('#f-dobro1', 'sim');
  await page.fill('#f-dependentes', '1');
  await calcular();
  await expect(d1).toHaveValue('sim');
  await expect(resultado).toContainText('Dobra das férias vencidas fora do prazo (1 período');
  await page.fill('#f-dependentes', '0');
  await expect(resultado).toContainText('Dobra das férias vencidas fora do prazo (1 período');
  await expect(d1).toHaveValue('sim');
  // 2: os dois
  await venc.fill('2');
  await calcular();
  await expect(d1).toBeVisible();
  await expect(d2).toBeVisible();
  await expect(d1).toHaveValue('sim');
  semRedeExterna(rede);
  semErros(erros, rede);
});

test('férias vencidas lidas como no cálculo: "1,0" e "01" mostram o 1º período; "3" mostra os dois com o aviso do máximo', async ({ page, rede, erros }) => {
  const { resultado, calcular } = await abrir(page);
  const venc = page.locator('#f-feriasVencidas');
  const d1 = page.locator('#f-dobro1');
  const d2 = page.locator('#f-dobro2');
  for (const v of ['1,0', '01']) {
    await venc.fill(v);
    await calcular();
    await expect(d1, v).toBeVisible();
    await expect(d2, v).toBeHidden();
  }
  await page.selectOption('#f-dobro1', 'sim');
  await calcular();
  await expect(resultado).toContainText('Dobra das férias vencidas fora do prazo (1 período');
  await expect(d1).toHaveValue('sim');
  await venc.fill('3');
  await calcular();
  await expect(d1).toBeVisible();
  await expect(d2).toBeVisible();
  await expect(page.locator('#f-feriasVencidas-msg')).toContainText('esta calculadora considera no máximo 2');
  // campo com erro: os selects ficam como estavam (nada escondido nem zerado)
  await venc.fill('abc');
  await calcular();
  await expect(venc).toHaveAttribute('aria-invalid', 'true');
  await expect(d1).toBeVisible();
  await expect(d2).toBeVisible();
  await expect(d1).toHaveValue('sim');
  await venc.fill('1');
  await calcular();
  await expect(d2).toBeHidden();
  await expect(d1).toHaveValue('sim');
  await assentar(page);
  semRedeExterna(rede);
  semErros(erros, rede);
});
