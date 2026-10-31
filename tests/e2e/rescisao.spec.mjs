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

test('acordo com aviso trabalhado: sem metade do aviso, sem projeção e sem a nota da metade', async ({ page, rede, erros }) => {
  const { resultado, calcular } = await abrir(page);
  await page.selectOption('#f-tipo', 'acordo');
  await page.selectOption('#f-aviso', 'indenizado');
  await calcular();
  await expect(resultado).toContainText('Aviso prévio indenizado (19,5 dias, metade de 39)');
  await expect(resultado).toContainText('No acordo (CLT, art. 484-A), o aviso indenizado é pago pela metade');
  await expect(resultado.locator('.destaque strong')).toHaveText(brl('R$ 10.751,27'));
  await page.selectOption('#f-aviso', 'trabalhado');
  await calcular();
  await expect(resultado.locator('.destaque strong')).toHaveText(brl('R$ 8.151,27'));
  await expect(resultado).not.toContainText('Aviso prévio indenizado');
  await expect(resultado).not.toContainText('A projeção do aviso');
  await expect(resultado).not.toContainText('No acordo (CLT, art. 484-A)');
  await expect(page.locator('#f-aviso-ajuda')).toHaveText('No acordo, o aviso indenizado é pago pela metade; o trabalhado não gera aviso nem projeção.');
  semRedeExterna(rede);
  semErros(erros, rede);
});

test('trocar o motivo mantém a escolha do aviso, mostra o erro no campo e nenhum resultado', async ({ page, rede, erros }) => {
  const { resultado, calcular } = await abrir(page);
  const aviso = page.locator('#f-aviso');
  const msg = page.locator('#f-aviso-msg');
  // padrão: sem justa causa, só "não cumprido" desabilitado
  await expect(aviso.locator('option[value="naoCumprido"]')).toBeDisabled();
  await expect(aviso.locator('option[value="indenizado"]')).toBeEnabled();
  // pedido de demissão herda "indenizado": a opção fica desabilitada, a escolha não muda e o campo acusa o erro
  await page.selectOption('#f-tipo', 'pedidoDemissao');
  await expect(aviso).toHaveValue('indenizado');
  await expect(aviso.locator('option[value="indenizado"]')).toBeDisabled();
  await expect(aviso.locator('option[value="naoCumprido"]')).toBeEnabled();
  await calcular();
  await expect(aviso).toHaveAttribute('aria-invalid', 'true');
  await expect(msg).toBeVisible();
  await expect(msg).toHaveText('No pedido de demissão, quem deve o aviso é o empregado: escolha trabalhado ou não cumprido pelo empregado.');
  await expect(resultado.locator('.erro a[href="#f-aviso"]')).toHaveText('Aviso prévio');
  await expect(resultado.locator('.destaque')).toHaveCount(0);
  await expect(resultado).not.toContainText('Líquido');
  // escolha válida: erro some, resultado volta com o desconto do aviso
  await page.selectOption('#f-aviso', 'naoCumprido');
  await calcular();
  await expect(aviso).not.toHaveAttribute('aria-invalid', 'true');
  await expect(msg).toBeHidden();
  await expect(resultado).toContainText('Desconto do aviso prévio não cumprido');
  // volta para sem justa causa: "não cumprido" continua escolhido, desabilitado, com erro e sem resultado
  await page.selectOption('#f-tipo', 'semJustaCausa');
  await expect(aviso).toHaveValue('naoCumprido');
  await expect(aviso.locator('option[value="naoCumprido"]')).toBeDisabled();
  await calcular();
  await expect(aviso).toHaveAttribute('aria-invalid', 'true');
  await expect(msg).toHaveText('Não cumprido pelo empregado só vale no pedido de demissão (CLT, art. 487, § 2º). Na demissão sem justa causa, escolha indenizado ou trabalhado.');
  await expect(resultado.locator('.destaque')).toHaveCount(0);
  // o mesmo no acordo
  await page.selectOption('#f-tipo', 'acordo');
  await calcular();
  await expect(msg).toContainText('No acordo, escolha indenizado ou trabalhado.');
  await expect(resultado).not.toContainText('Aviso prévio indenizado');
  // sem calcular de novo, a correção também vale pelo recálculo automático (evento input)
  await page.selectOption('#f-aviso', 'trabalhado');
  await expect(resultado.locator('.destaque')).toHaveCount(1);
  await expect(aviso).not.toHaveAttribute('aria-invalid', 'true');
  semRedeExterna(rede);
  semErros(erros, rede);
});

test('justa causa: aviso desabilitado com "não se aplica", resultado sem aviso; ao sair, a escolha volta', async ({ page, rede, erros }) => {
  const { resultado, calcular } = await abrir(page);
  const aviso = page.locator('#f-aviso');
  await page.selectOption('#f-tipo', 'justaCausa');
  await expect(aviso).toBeDisabled();
  await expect(page.locator('#f-aviso-ajuda')).toHaveText('Não se aplica na demissão por justa causa.');
  await calcular();
  await expect(resultado.locator('.destaque')).toHaveCount(1);
  await expect(resultado).not.toContainText('Aviso prévio');
  await expect(aviso).not.toHaveAttribute('aria-invalid', 'true');
  await page.selectOption('#f-tipo', 'semJustaCausa');
  await expect(aviso).toBeEnabled();
  await expect(aviso).toHaveValue('indenizado');
  await expect(page.locator('#f-aviso-ajuda')).toHaveText('No acordo, o aviso indenizado é pago pela metade; o trabalhado não gera aviso nem projeção.');
  semRedeExterna(rede);
  semErros(erros, rede);
});

test('pedido de demissão com desconto do aviso maior que as verbas: líquido R$ 0,00 e o excedente explicado', async ({ page, rede, erros }) => {
  const { resultado, calcular } = await abrir(page);
  await page.fill('#f-salario', '15000');
  await page.fill('#f-admissao', '2026-08-03');
  await page.fill('#f-desligamento', '2026-08-20');
  await page.selectOption('#f-tipo', 'pedidoDemissao');
  await page.selectOption('#f-aviso', 'naoCumprido');
  await calcular();
  await expect(resultado.locator('.destaque strong')).toHaveText(brl('R$ 0,00'));
  await expect(resultado.locator('tr.total td')).toHaveText(brl('R$ 0,00'));
  await expect(resultado).toContainText('Desconto do aviso prévio não cumprido (limitado às verbas)');
  await expect(resultado).toContainText(/O desconto do aviso não cumprido \(R\$\s15\.000,00\) é maior que as verbas depois do INSS e do IRRF: o líquido fica em R\$\s0,00 e R\$\s5\.459,72 não foram descontados aqui\./);
  await expect(resultado).not.toContainText('-R$');
  semRedeExterna(rede);
  semErros(erros, rede);
});

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
