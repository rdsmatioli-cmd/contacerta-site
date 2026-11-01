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

// CC-CALC-VALIDA-01: o erro de data aparece no campo (mensagem e aria-invalid) e na lista, com link, sem resultado.
const erroNoCampo = async (page, resultado, id, rotulo, texto) => {
  await expect(page.locator(`#${id}`)).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator(`#${id}-msg`)).toBeVisible();
  await expect(page.locator(`#${id}-msg`)).toHaveText(texto);
  await expect(resultado.locator('.erro[role="alert"]')).toContainText(`${rotulo}: ${texto}`);
  await expect(resultado.locator(`.erro a[href="#${id}"]`)).toHaveText(rotulo);
  await expect(resultado.locator('.destaque')).toHaveCount(0);
  await expect(resultado).not.toContainText('Confira as datas');
};
const semErroNoCampo = async (page, id) => {
  await expect(page.locator(`#${id}`)).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator(`#${id}-msg`)).toBeHidden();
};

test('rescisão: data vazia, fora de ordem, incompleta e fora do intervalo dão erro no campo certo', async ({ page, rede, erros, isMobile }) => {
  const { resultado, calcular } = await abrir(page, '/rescisao/');
  for (const id of ['f-admissao', 'f-desligamento', 'f-dataPagamento']) {
    await expect(page.locator(`#${id}`)).toHaveAttribute('min', '1900-01-01');
    await expect(page.locator(`#${id}`)).toHaveAttribute('max', '2100-12-31');
  }
  // admissão apagada: "Preencha a data", não "desligamento antes da admissão"
  await page.fill('#f-admissao', '');
  await calcular();
  await erroNoCampo(page, resultado, 'f-admissao', 'Data de admissão', 'Preencha a data.');
  await semErroNoCampo(page, 'f-desligamento');
  // desligamento antes da admissão: o erro vai para o desligamento
  await page.fill('#f-admissao', '2026-10-01');
  await calcular();
  await semErroNoCampo(page, 'f-admissao');
  await erroNoCampo(page, resultado, 'f-desligamento', 'Data do desligamento (último dia)', 'A data não pode ser anterior à data de admissão (01/10/2026).');
  // data digitada pela metade (o navegador deixa o value vazio): incompleta, não "em branco".
  // Só no desktop: com toque (projeto 390px, isMobile), o campo de data abre o seletor do sistema e não aceita data
  // pela metade; o Chromium do CI ignora o Backspace ali e o valor fica inteiro. A regra (badInput) também está em
  // tests/validacao-datas.test.mjs.
  await page.fill('#f-admissao', '2023-02-01');
  if (!isMobile) {
    await page.locator('#f-desligamento').focus();
    await page.keyboard.press('Backspace');
    await calcular();
    await erroNoCampo(page, resultado, 'f-desligamento', 'Data do desligamento (último dia)', 'Data incompleta ou inexistente: confira dia, mês e ano.');
  }
  // fora do intervalo
  await page.fill('#f-desligamento', '2101-01-01');
  await calcular();
  await erroNoCampo(page, resultado, 'f-desligamento', 'Data do desligamento (último dia)', 'Informe uma data entre 01/01/1900 e 31/12/2100.');
  // data de pagamento (opcional) antes do desligamento: erro no campo dela
  await page.fill('#f-desligamento', '2026-09-15');
  await page.fill('#f-dataPagamento', '2026-09-10');
  await calcular();
  await erroNoCampo(page, resultado, 'f-dataPagamento', 'Data de pagamento das verbas', 'A data de pagamento não pode ser anterior à data do desligamento.');
  // tudo certo: resultado e nenhum campo marcado (o recálculo ao digitar também limpa)
  await page.fill('#f-dataPagamento', '');
  await expect(resultado.locator('.destaque')).toHaveCount(1);
  for (const id of ['f-admissao', 'f-desligamento', 'f-dataPagamento']) await semErroNoCampo(page, id);
  semRedeExterna(rede);
  semErros(erros, rede);
});

test('aviso prévio e calendário: mesmas regras de data', async ({ page, rede, erros }) => {
  let { resultado, calcular } = await abrir(page, '/aviso-previo/');
  await page.fill('#f-desligamento', '2019-05-05');
  await calcular();
  await erroNoCampo(page, resultado, 'f-desligamento', 'Data do aviso de desligamento', 'A data não pode ser anterior à data de admissão (06/05/2019).');
  await page.fill('#f-admissao', '');
  await calcular();
  await erroNoCampo(page, resultado, 'f-admissao', 'Data de admissão', 'Preencha a data.');
  await semErroNoCampo(page, 'f-desligamento');
  await page.fill('#f-admissao', '2019-05-05');
  await calcular();
  await expect(resultado.locator('.destaque')).toHaveCount(1);
  await semErroNoCampo(page, 'f-admissao');
  await semErroNoCampo(page, 'f-desligamento');

  ({ resultado, calcular } = await abrir(page, '/calendario-reforma-tributaria/'));
  await expect(page.locator('#f-data')).toHaveAttribute('aria-describedby', 'f-data-ajuda f-data-msg');
  await page.fill('#f-data', '');
  await calcular();
  await erroNoCampo(page, resultado, 'f-data', 'Data de referência', 'Preencha a data.');
  await page.fill('#f-data', '1899-12-31');
  await calcular();
  await erroNoCampo(page, resultado, 'f-data', 'Data de referência', 'Informe uma data entre 01/01/1900 e 31/12/2100.');
  await page.fill('#f-data', '2027-01-01');
  await calcular();
  await expect(resultado.locator('.destaque')).toHaveCount(1);
  await semErroNoCampo(page, 'f-data');
  semRedeExterna(rede);
  semErros(erros, rede);
});

// CC-CALC-A11Y-01: o #resultado (aria-live="off") muda ao digitar sem anúncio; o leitor de tela recebe uma frase curta
// no #resultado-anuncio (role="status") no envio e na troca de opção, sem repetir quando o texto não muda. Os
// observadores contam as trocas do resultado e cada texto não vazio que a região de anúncio recebe.
const observar = (page) => page.evaluate(() => {
  const anuncio = document.getElementById('resultado-anuncio');
  window.__anuncios = [];
  window.__trocas = 0;
  new MutationObserver(() => { if (anuncio.textContent) window.__anuncios.push(anuncio.textContent); })
    .observe(anuncio, { childList: true, characterData: true, subtree: true });
  new MutationObserver(() => { window.__trocas++; }).observe(document.getElementById('resultado'), { childList: true });
});
const anuncios = (page) => page.evaluate(() => window.__anuncios);
const trocas = (page) => page.evaluate(() => window.__trocas);

test('salário líquido: digitar atualiza o resultado sem anúncio; Calcular e a caixa de seleção anunciam uma frase curta', async ({ page, rede, erros }) => {
  const { resultado, calcular } = await abrir(page, '/salario-liquido/');
  await expect(resultado).toHaveAttribute('aria-live', 'off');
  const anuncio = page.locator('#resultado-anuncio');
  await expect(anuncio).toHaveAttribute('role', 'status');
  await expect(anuncio).toHaveClass('vh');
  await expect(anuncio).toHaveText(''); // a carga não anuncia
  await page.fill('#f-bruto', '');
  await expect(resultado.locator('.erro[role="alert"]')).toHaveCount(1);
  await observar(page);
  // digitação lenta (cada tecla depois do atraso de 250 ms): o resultado muda a cada pausa, a região de anúncio não
  await page.locator('#f-bruto').pressSequentially('4500', { delay: 350 });
  await expect(resultado.locator('.destaque strong')).toHaveText(/^R\$\s4\.068,49$/);
  expect(await trocas(page)).toBeGreaterThanOrEqual(3);
  expect(await anuncios(page)).toEqual([]);
  // espaços do Intl (não separável depois de R$) viram espaço comum na frase
  const frase = 'Salário líquido estimado: R$ 4.068,49';
  // envio: uma frase curta (rótulo e valor do destaque), não a tabela
  await calcular();
  await expect.poll(() => anuncios(page)).toEqual([frase]);
  await expect(anuncio).toHaveText(frase);
  // envio sem mudança e Tab para fora do campo: nada repetido
  await calcular();
  await page.locator('#f-dependentes').focus();
  await page.keyboard.press('Tab');
  await page.waitForTimeout(400);
  expect(await anuncios(page)).toEqual([frase]);
  // troca de opção (vale-transporte): resultado e anúncio na hora
  await page.locator('#f-vt').check();
  await expect.poll(() => anuncios(page)).toEqual([frase, 'Salário líquido estimado: R$ 3.798,49']);
  await expect(resultado.locator('.destaque strong')).toHaveText(/^R\$\s3\.798,49$/);
  // campo de texto alterado e Tab para fora: o resultado muda, sem anúncio até o próximo Calcular
  await page.locator('#f-outros').fill('100');
  await page.keyboard.press('Tab');
  await expect(resultado.locator('.destaque strong')).toHaveText(/^R\$\s3\.698,49$/);
  await page.waitForTimeout(400);
  expect(await anuncios(page)).toHaveLength(2);
  await calcular();
  await expect.poll(() => anuncios(page)).toHaveLength(3);
  expect((await anuncios(page))[2]).toBe('Salário líquido estimado: R$ 3.698,49');
  semRedeExterna(rede);
  semErros(erros, rede);
});

test('lista de erros: continua role="alert" e não é reescrita enquanto o erro é o mesmo', async ({ page, rede, erros }) => {
  const { resultado, calcular } = await abrir(page, '/salario-liquido/');
  await observar(page);
  await page.fill('#f-bruto', 'a');
  const alerta = resultado.locator('.erro[role="alert"]');
  await expect(alerta).toContainText('Digite só números.');
  await alerta.evaluate((el) => { el.dataset.marca = '1'; });
  // mais letras, o mesmo erro: o mesmo nó (nada reanunciado)
  await page.locator('#f-bruto').pressSequentially('bc', { delay: 350 });
  await page.waitForTimeout(400);
  await expect(resultado.locator('.erro[role="alert"][data-marca="1"]')).toHaveCount(1);
  // envio com erro: a lista de erros se anuncia sozinha; a região de anúncio fica vazia
  await calcular();
  await expect(alerta).toHaveCount(1);
  await expect(page.locator('#resultado-anuncio')).toHaveText('');
  expect(await anuncios(page)).toEqual([]);
  // corrigido e enviado: a frase volta
  await page.fill('#f-bruto', '3500');
  await calcular();
  await expect.poll(() => anuncios(page)).toEqual(['Salário líquido estimado: R$ 3.191,40']);
  semRedeExterna(rede);
  semErros(erros, rede);
});

test('troca do motivo na rescisão anuncia o novo líquido; sem destaque, a frase é a do erro', async ({ page, rede, erros }) => {
  const { resultado } = await abrir(page, '/rescisao/');
  await observar(page);
  await page.selectOption('#f-tipo', 'acordo');
  await expect.poll(() => anuncios(page)).toEqual(['Valor líquido estimado da rescisão: R$ 10.751,27']);
  // erro de campo pela troca (aviso fora do motivo): só a lista de erros, sem frase
  await page.selectOption('#f-tipo', 'pedidoDemissao');
  await expect(resultado.locator('.erro[role="alert"] a[href="#f-aviso"]')).toBeVisible();
  await expect(page.locator('#resultado-anuncio')).toHaveText('');
  expect(await anuncios(page)).toHaveLength(1);
  semRedeExterna(rede);
  semErros(erros, rede);
});
