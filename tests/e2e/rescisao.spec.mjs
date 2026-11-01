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
  // 0 (padrão): os dois somem e saem da ordem de tabulação (o próximo campo é o da 1ª parcela do 13º, do lote 2)
  await expect(d1).toBeHidden();
  await expect(d2).toBeHidden();
  await venc.focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#f-primeiraParcela13')).toBeFocused();
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

// Lote 2 da linha cc-calc (CC-CALC-TRABALHISTA-06, -04, -08 e CC-CALC-FGTS-01): valores que o resultado superestimava.
const NOTA_SAQUE = 'Quem adere ao saque-aniversário recebe uma parte do saldo todo ano, no mês do aniversário, mas, se for demitido, saca apenas a multa de 40%, e não o saldo. Para voltar ao saque-rescisão é preciso pedir a mudança e aguardar uma carência de 25 meses.';
// Valor com todos os espaços flexíveis (o Intl usa espaço não separável depois de R$).
const valor = (s) => new RegExp(`^${s.replace(/[.$]/g, '\\$&').replace(/ /g, '\\s')}$`);
const linha = (resultado, rotulo) => resultado.locator('tr').filter({ has: resultado.page().locator('th', { hasText: rotulo }) });

test('padrão da página: alerta de férias vencidas no campo e na lista, sem erro, com resultado', async ({ page, rede, erros }) => {
  const { resultado, calcular } = await abrir(page);
  const venc = page.locator('#f-feriasVencidas');
  const msg = page.locator('#f-feriasVencidas-msg');
  await calcular();
  await expect(msg).toBeVisible();
  await expect(msg).toContainText('3 períodos aquisitivos de férias se completaram até o desligamento (o último terminou em 31/01/2026)');
  await expect(venc).not.toHaveAttribute('aria-invalid', 'true');
  await expect(resultado.locator('.aviso-limite')).toContainText('Períodos de férias vencidas não tiradas: Pelas datas informadas, 3 períodos');
  await expect(resultado.locator('.erro')).toHaveCount(0);
  await expect(resultado.locator('.destaque strong')).toHaveText(valor('R$ 14.089,04'));
  // caso do achado: um período (01/08/2025 a 31/07/2026)
  await page.fill('#f-admissao', '2025-08-01');
  await calcular();
  await expect(msg).toContainText('terminou em 31/07/2026');
  // informado 1 período: o alerta some
  await venc.fill('1');
  await calcular();
  await expect(msg).toBeHidden();
  await expect(resultado).not.toContainText('Atenção');
  await assentar(page);
  semRedeExterna(rede);
  semErros(erros, rede);
});

test('1ª parcela do 13º: sugerida em dezembro, sai do líquido e do FGTS; o valor digitado não é trocado', async ({ page, rede, erros }) => {
  const { resultado, calcular } = await abrir(page);
  const p13 = page.locator('#f-primeiraParcela13');
  await expect(p13).toHaveValue('0');
  await page.fill('#f-admissao', '2020-01-01');
  await page.fill('#f-desligamento', '2026-12-15');
  await page.selectOption('#f-aviso', 'trabalhado');
  await calcular();
  await expect(p13).toHaveValue('2000');
  await expect(page.locator('#f-primeiraParcela13-msg')).toContainText('Valor sugerido: metade do salário');
  await expect(linha(resultado, '1ª parcela do 13º já recebida (valor sugerido)').locator('td')).toHaveText(valor('− R$ 2.000,00'));
  await expect(resultado.locator('.destaque strong')).toHaveText(valor('R$ 8.809,04'));
  await expect(linha(resultado, 'Depósito do FGTS sobre as verbas da rescisão').locator('td')).toHaveText(valor('R$ 320,00'));
  await expect(linha(resultado, 'INSS sobre 13º').locator('td')).toHaveText(valor('− R$ 368,60'));
  // digitado: fica, com outro salário e outro mês
  await p13.fill('1500');
  await page.fill('#f-salario', '6000');
  await calcular();
  await expect(p13).toHaveValue('1500');
  await expect(linha(resultado, '1ª parcela do 13º já recebida').locator('td')).toHaveText(valor('− R$ 1.500,00'));
  await expect(resultado).not.toContainText('valor sugerido');
  await page.fill('#f-desligamento', '2026-11-20');
  await calcular();
  await expect(p13).toHaveValue('1500');
  await assentar(page);
  semRedeExterna(rede);
  semErros(erros, rede);
});

test('1ª parcela do 13º acima do 13º do ano: alerta no campo e na lista, sem bloquear', async ({ page, rede, erros }) => {
  const { resultado, calcular } = await abrir(page);
  await page.fill('#f-admissao', '2020-01-01');
  await page.fill('#f-desligamento', '2026-03-20');
  await page.selectOption('#f-aviso', 'trabalhado');
  await page.fill('#f-primeiraParcela13', '2000');
  await calcular();
  const alerta = /A 1ª parcela informada \(R\$\s2\.000,00\) é maior que o 13º proporcional de 2026 calculado aqui \(R\$\s1\.000,00\)\. Confira o valor: a calculadora desconta a parcela inteira do líquido\./;
  await expect(page.locator('#f-primeiraParcela13-msg')).toHaveText(alerta);
  await expect(page.locator('#f-primeiraParcela13')).not.toHaveAttribute('aria-invalid', 'true');
  await expect(resultado.locator('.aviso-limite')).toContainText(alerta);
  await expect(resultado.locator('.erro')).toHaveCount(0);
  await expect(resultado.locator('.destaque')).toHaveCount(1);
  // admitido no ano, em dezembro: sem sugestão
  await page.fill('#f-primeiraParcela13', '0');
  await page.fill('#f-admissao', '2026-03-02');
  await page.fill('#f-desligamento', '2026-12-15');
  await calcular();
  await expect(page.locator('#f-primeiraParcela13')).toHaveValue('0');
  await expect(resultado).not.toContainText('1ª parcela');
  semRedeExterna(rede);
  semErros(erros, rede);
});

test('saque-aniversário na rescisão: Não mantém o saque; Sim retém o saldo; no acordo, não estimado', async ({ page, rede, erros }) => {
  const { resultado, calcular } = await abrir(page);
  await expect(page.locator('#f-saqueAniversario')).toHaveValue('nao');
  await calcular();
  await expect(linha(resultado, 'Saque do saldo do FGTS').locator('td')).toHaveText(valor('R$ 12.842,67'));
  await page.selectOption('#f-saqueAniversario', 'sim');
  await calcular();
  await expect(linha(resultado, 'Saldo do FGTS').locator('td')).toHaveText('fica retido (saque-aniversário)');
  await expect(resultado).not.toContainText('Saque do saldo do FGTS');
  await expect(linha(resultado, 'Multa do FGTS').locator('td')).toHaveText(valor('R$ 5.137,07'));
  await expect(resultado.locator('.nota', { hasText: NOTA_SAQUE })).toHaveCount(1);
  await expect(resultado.locator('.destaque strong')).toHaveText(valor('R$ 14.089,04'));
  await page.selectOption('#f-tipo', 'acordo');
  await calcular();
  await expect(linha(resultado, 'Saque do saldo do FGTS').locator('td')).toHaveText('não estimado (saque-aniversário)');
  await expect(resultado).toContainText(`No acordo, a calculadora não estima o saque de quem aderiu ao saque-aniversário. ${NOTA_SAQUE}`);
  semRedeExterna(rede);
  semErros(erros, rede);
});

test('saque-aniversário na /fgts/: Sim deixa só a multa como valor sacável', async ({ page, rede, erros }) => {
  await page.goto('/fgts/');
  const botao = page.locator('form[data-calc="fgts"] button[type="submit"]');
  await expect(botao).toBeEnabled();
  const resultado = page.locator('#resultado');
  const total = resultado.locator('tr.total td');
  await expect(page.locator('#f-saqueAniversario')).toHaveValue('nao');
  await expect(total).toHaveText(valor('R$ 16.353,95'));
  await page.selectOption('#f-saqueAniversario', 'sim');
  await botao.click();
  await expect(total).toHaveText(valor('R$ 4.672,56'));
  await expect(linha(resultado, 'Saldo do FGTS').locator('td')).toHaveText('fica retido (saque-aniversário)');
  await expect(resultado.locator('.nota', { hasText: NOTA_SAQUE })).toHaveCount(1);
  await page.selectOption('#f-tipo', 'acordo');
  await botao.click();
  await expect(total).toHaveText('não estimado (saque-aniversário)');
  await assentar(page);
  semRedeExterna(rede);
  semErros(erros, rede);
});
