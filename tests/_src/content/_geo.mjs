// Blocos de "resposta rápida", "como usar" e perguntas extras para GEO (buscadores com IA) e SEO.
// O build ignora arquivos que começam com "_"; cada calculadora importa daqui.
// Todos os números dos exemplos são calculados com as mesmas funções e tabelas do site
// (src/js/calc.js e src/js/tabelas.js), então mudam sozinhos quando as tabelas forem atualizadas.
import * as C from '../js/calc.js';
import { INSS, IRRF, MEI, SEGURO_DESEMPREGO, SALARIO_MINIMO, INDICADORES } from '../js/tabelas.js';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const R = (v) => brl.format(v).replace(/\u00a0/g, ' ');
const N = (v, d = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

function bloco(resposta, passos) {
  return `
<section class="resposta" aria-labelledby="resposta-t">
<h2 id="resposta-t">Resposta rápida</h2>
${resposta}
</section>
<h2>Como usar a calculadora</h2>
<ol class="passos">${passos.map((p) => `<li>${p}</li>`).join('')}</ol>
`;
}

// ---------------------------------------------------------------- exemplos calculados
const sl3500 = C.salarioLiquido({ bruto: 3500 });
const sl5000 = C.salarioLiquido({ bruto: 5000 });
const slMin = C.salarioLiquido({ bruto: SALARIO_MINIMO.valor });
const d13 = C.decimoTerceiro({ salario: 3000, meses: 12 });
const d13p = C.decimoTerceiro({ salario: 3000, meses: 7 });
const fer = C.ferias({ salario: 3000, dias: 30 });
const ferV = C.ferias({ salario: 3000, dias: 30, venderDias: true });
const fg = C.fgts({ salario: 3000, meses: 12, comRendimento: false });
const he = C.horasExtras({ salario: 2200, jornadaMensal: 220, horas50: 10 });
const sd2000 = C.seguroDesemprego({ salarios: [2000, 2000, 2000], solicitacao: 1, mesesTrabalhados: 14 });
const sd3000 = C.seguroDesemprego({ salarios: [3000, 3000, 3000], solicitacao: 1, mesesTrabalhados: 30 });
const jc = C.jurosCompostos({ inicial: 1000, aporte: 200, taxa: 1, periodo: 'mensal', meses: 120 });
const finP = C.financiamento({ valor: 100000, taxa: 1, periodo: 'mensal', meses: 120, sistema: 'price' });
const finS = C.financiamento({ valor: 100000, taxa: 1, periodo: 'mensal', meses: 120, sistema: 'sac' });
const inv = C.investimentos({ valor: 10000, dias: 365, cdi: INDICADORES.cdi, pctCdb: 100, pctLci: 90, selic: INDICADORES.selic, trMensal: INDICADORES.trMensal });
const ir6000 = C.salarioLiquido({ bruto: 6000 });
const ir7000 = C.salarioLiquido({ bruto: 7000 });
const inss3000 = C.inssEmpregado(3000);
const inssTeto = C.inssEmpregado(INSS.teto);
const imc = C.imc({ peso: 70, altura: 175 });
const idade = C.idade('2000-01-01', '2026-10-08');
const meiServ = C.dasMei({ atividade: 'servicos' });
const meiCom = C.dasMei({ atividade: 'comercio' });
const meiAmb = C.dasMei({ atividade: 'ambos' });
const invRes = Object.fromEntries(inv.resultados.map((r) => [r.nome.split(' ')[0], r]));

export const GEO = {
  'salario-liquido': {
    topo: bloco(
      `<p><strong>Salário líquido = salário bruto − INSS − imposto de renda retido (IRRF) − outros descontos.</strong> Em 2026, quem recebe até R$ 5.000,00 por mês não tem IR retido na fonte, graças à redução da Lei 15.270/2025. O INSS continua progressivo, de 7,5% a 14%, até o teto de ${R(INSS.teto)}.</p>
<p>Exemplo: com bruto de R$ 3.500,00 e sem dependentes, o INSS é ${R(sl3500.inss)}, o IRRF é ${R(sl3500.irrf)} e o líquido fica em <strong>${R(sl3500.liquido)}</strong>.</p>`,
      [
        'Digite o salário bruto do mês, somando horas extras, adicionais e comissões, se houver.',
        'Informe o número de dependentes para o IR, a pensão alimentícia e outros descontos fixos do holerite.',
        'Marque o vale-transporte se ele for descontado (até 6% do salário).',
        'Clique em <strong>Calcular</strong> e confira o líquido em destaque e cada desconto na tabela abaixo dele.',
      ],
    ),
    faq: [
      { q: `Quanto é o salário líquido de quem ganha um salário mínimo em 2026?`, a: `<p>Com o mínimo de ${R(SALARIO_MINIMO.valor)} e sem outros descontos, o INSS é de ${R(slMin.inss)} (7,5%) e não há IR. O líquido fica em ${R(slMin.liquido)}.</p>` },
      { q: 'Quanto fica o salário líquido de R$ 5.000 em 2026?', a: `<p>Sem dependentes e sem outros descontos, o INSS é de ${R(sl5000.inss)} e o IRRF é ${R(sl5000.irrf)}, por causa da isenção efetiva até R$ 5.000,00. O líquido estimado é ${R(sl5000.liquido)}.</p>` },
    ],
  },
  rescisao: {
    topo: bloco(
      `<p><strong>Na demissão sem justa causa, você recebe saldo de salário, aviso prévio (30 dias mais 3 por ano completo, até 90), 13º proporcional, férias vencidas e proporcionais com 1/3, saque do FGTS e multa de 40% sobre o saldo do fundo.</strong></p>
<p>No pedido de demissão não há aviso indenizado, multa nem saque do FGTS. No acordo (art. 484-A da CLT), o aviso indenizado e a multa caem pela metade e o saque do FGTS fica limitado a 80%. Na justa causa, restam apenas saldo de salário e férias vencidas com 1/3. O empregador tem até 10 dias corridos após o fim do contrato para pagar.</p>`,
      [
        'Escolha o motivo do desligamento e o tipo de aviso prévio.',
        'Informe o último salário bruto, a data de admissão e o último dia de trabalho.',
        'Indique férias vencidas não tiradas (até 2 períodos) e, para cada uma, se o prazo de concessão já venceu (nesse caso, são pagas em dobro). Depois, informe o saldo do FGTS (veja no app FGTS) e os dependentes para o IR.',
        'Clique em <strong>Calcular</strong>: o resultado separa as verbas, os descontos e o que vai para a conta do FGTS.',
      ],
    ),
    faq: [
      { q: 'Qual o prazo para pagar a rescisão?', a: '<p>Até 10 dias corridos contados do término do contrato, independentemente de o aviso ser trabalhado ou indenizado (art. 477, § 6º, da CLT). O atraso gera multa de um salário a favor do trabalhador (art. 477, § 8º).</p>' },
    ],
  },
  'decimo-terceiro': {
    topo: bloco(
      `<p><strong>13º salário = (salário + média de variáveis) ÷ 12 × meses trabalhados no ano.</strong> Conta como mês inteiro aquele em que você trabalhou 15 dias ou mais. A 1ª parcela, paga até 30 de novembro, é metade do bruto sem descontos; a 2ª, até 20 de dezembro, já desconta INSS e IR sobre o valor total.</p>
<p>Exemplo: salário de R$ 3.000,00 o ano todo dá 13º bruto de ${R(d13.bruto)}, 1ª parcela de ${R(d13.primeira)} e 2ª parcela de ${R(d13.segunda)} (líquido total de <strong>${R(d13.liquidoTotal)}</strong>).</p>`,
      [
        'Digite o salário bruto mensal e, se houver, a média mensal de horas extras, comissões e adicionais.',
        'Informe quantos meses você trabalhou no ano (15 dias ou mais no mês contam como mês cheio).',
        'Indique os dependentes para o imposto de renda.',
        'Clique em <strong>Calcular</strong> para ver o valor de cada parcela e os descontos da segunda.',
      ],
    ),
    faq: [
      { q: 'Quanto recebe de 13º quem trabalhou 7 meses?', a: `<p>Com salário de R$ 3.000,00, o 13º proporcional é de 7/12: ${R(d13p.bruto)} brutos. A 1ª parcela é ${R(d13p.primeira)} e a 2ª, após INSS e IR, ${R(d13p.segunda)}.</p>` },
    ],
  },
  ferias: {
    topo: bloco(
      `<p><strong>Férias = salário dos dias de descanso + 1/3 constitucional, menos INSS e IR.</strong> Você pode vender até 10 dias (abono pecuniário); esse valor e o 1/3 sobre ele não têm desconto de INSS nem de IR. O pagamento deve sair até 2 dias antes do início das férias (art. 145 da CLT).</p>
<p>Exemplo: salário de R$ 3.000,00 e 30 dias de férias dão ${R(fer.bruto)} brutos e <strong>${R(fer.liquido)}</strong> líquidos. Vendendo 10 dias, o líquido sobe para ${R(ferV.liquido)}.</p>`,
      [
        'Digite o salário bruto e a média de variáveis (horas extras, comissões) dos últimos 12 meses.',
        'Informe os dias de férias a que tem direito no período, antes da venda. Se marcar a venda de 1/3 (abono pecuniário), 1/3 desses dias vira abono: para tirar 20 dias e vender 10, informe 30.',
        'Informe os dependentes para o IR.',
        'Clique em <strong>Calcular</strong> e confira férias, 1/3, abono e descontos separados.',
      ],
    ),
    faq: [
      { q: 'Vender 10 dias de férias compensa?', a: `<p>Financeiramente, sim: o abono e o seu 1/3 são isentos de INSS e IR. No exemplo de salário de R$ 3.000,00, o líquido passa de ${R(fer.liquido)} para ${R(ferV.liquido)}. Em troca, você descansa 20 dias em vez de 30.</p>` },
      { q: 'Quando a empresa deve pagar as férias?', a: '<p>Até 2 dias antes do início do período de descanso (art. 145 da CLT).</p>' },
    ],
  },
  fgts: {
    topo: bloco(
      `<p><strong>O empregador deposita todo mês 8% do salário bruto no FGTS (2% para aprendiz), sem descontar nada do trabalhador.</strong> O saldo rende 3% ao ano mais TR e pode receber distribuição de lucros. Na demissão sem justa causa, você saca tudo e recebe multa de 40% sobre o saldo; no acordo, a multa é de 20% e o saque, de 80%.</p>
<p>Exemplo: salário de R$ 3.000,00 gera depósito de ${R(fg.deposito)} por mês. Em 12 meses, com os depósitos sobre o 13º e o 1/3 de férias, o total é de ${R(fg.depositado)}, antes do rendimento.</p>`,
      [
        'Digite o salário bruto mensal e os meses de contrato que quer projetar.',
        'Informe o saldo que já existe na conta (consulte no app FGTS), se quer incluir o rendimento de 3% ao ano e se você é jovem aprendiz.',
        'Escolha a situação na saída para ver a multa e o valor que pode ser sacado.',
        'Clique em <strong>Calcular</strong> e compare o resultado com o extrato do app.',
      ],
    ),
    faq: [
      { q: 'O FGTS é descontado do meu salário?', a: '<p>Não. O depósito de 8% é um custo do empregador, além do salário. Ele aparece no holerite apenas como informação, sem reduzir o líquido.</p>' },
    ],
  },
  'horas-extras': {
    topo: bloco(
      `<p><strong>Valor da hora extra = (salário ÷ jornada mensal) × (1 + adicional).</strong> O adicional mínimo é de 50% (Constituição, art. 7º, XVI); domingos e feriados não compensados costumam ser pagos com 100%. Para quem trabalha 44 horas semanais, a jornada mensal é de 220 horas. As horas extras também aumentam o descanso semanal remunerado (DSR).</p>
<p>Exemplo: salário de R$ 2.200,00 e 220 horas dão hora normal de ${R(he.valorHora)}; 10 horas extras a 50% valem <strong>${R(he.he50)}</strong>, sem contar o DSR.</p>`,
      [
        'Digite o salário bruto e o divisor da jornada mensal (220 horas para 44 horas semanais, 200 para 40).',
        'Informe as horas extras feitas a 50% (dias úteis) e a 100% (domingos e feriados).',
        'Para calcular o reflexo no DSR, informe os dias úteis e os domingos e feriados do mês.',
        'Clique em <strong>Calcular</strong> e veja o valor por tipo de hora e o total com DSR.',
      ],
    ),
    faq: [
      { q: 'Qual é o limite de horas extras por dia?', a: '<p>Em regra, até 2 horas extras por dia (art. 59 da CLT). Acordos de compensação, banco de horas e escalas como a 12x36 seguem regras próprias definidas em lei ou em convenção coletiva.</p>' },
    ],
  },
  'seguro-desemprego': {
    topo: bloco(
      `<p><strong>O valor do seguro-desemprego sai da média dos três últimos salários, aplicada à tabela do Ministério do Trabalho: nenhuma parcela é menor que o salário mínimo (${R(SEGURO_DESEMPREGO.piso)}) nem maior que ${R(SEGURO_DESEMPREGO.teto)} em 2026.</strong> São de 3 a 5 parcelas, conforme o tempo trabalhado e quantas vezes você já pediu o benefício.</p>
<p>Exemplo: média de R$ 3.000,00 e 30 meses de trabalho dão 5 parcelas de <strong>${R(sd3000.parcela)}</strong>, total de ${R(sd3000.total)}.</p>`,
      [
        'Digite os três últimos salários brutos antes da dispensa.',
        'Informe quantos meses você trabalhou com carteira assinada nos últimos 36 meses.',
        'Escolha se é a primeira, a segunda ou a terceira solicitação (ou mais).',
        'Clique em <strong>Calcular</strong> para ver o valor da parcela, quantas parcelas e o total.',
      ],
    ),
    faq: [
      { q: 'Qual o valor do seguro-desemprego para quem ganhava R$ 2.000?', a: `<p>A tabela dá 80% da média (R$ 1.600,00), mas nenhuma parcela pode ser menor que o salário mínimo. Por isso, a parcela fica em ${R(sd2000.parcela)}. Com 14 meses trabalhados na primeira solicitação, são ${sd2000.parcelas} parcelas.</p>` },
    ],
  },
  'juros-compostos': {
    topo: bloco(
      `<p><strong>Montante = capital × (1 + i)<sup>n</sup>, e cada aporte mensal soma A × [(1 + i)<sup>n</sup> − 1] ÷ i.</strong> Nos juros compostos, os juros de cada mês passam a render no mês seguinte, por isso o crescimento acelera com o tempo.</p>
<p>Exemplo: R$ 1.000,00 iniciais mais R$ 200,00 por mês, a 1% ao mês por 10 anos, somam ${R(jc.investido)} investidos e chegam a <strong>${R(jc.total)}</strong>, dos quais ${R(jc.juros)} são juros.</p>`,
      [
        'Digite o valor inicial e o aporte mensal (use zero se não for aportar).',
        'Informe a taxa de juros e escolha se ela é mensal ou anual.',
        'Defina o prazo em meses.',
        'Clique em <strong>Calcular</strong> para ver o montante final, os juros ganhos e a evolução ano a ano.',
      ],
    ),
    faq: [
      { q: 'Como converter taxa anual em mensal?', a: '<p>Use a equivalência composta: taxa mensal = (1 + taxa anual)<sup>1/12</sup> − 1. Por exemplo, 12% ao ano equivalem a cerca de 0,95% ao mês, e não a 1%. A calculadora faz essa conversão quando você escolhe "anual".</p>' },
    ],
  },
  financiamento: {
    topo: bloco(
      `<p><strong>Na tabela Price as parcelas são fixas; na SAC a amortização é fixa e as parcelas começam maiores e caem todo mês.</strong> Com o mesmo valor, taxa e prazo, a SAC paga menos juros no total, e a Price tem a primeira parcela menor.</p>
<p>Exemplo: R$ 100.000,00 a 1% ao mês em 120 meses. Na Price, a parcela é ${R(finP.primeira)} e os juros somam ${R(finP.totalJuros)}. Na SAC, a primeira parcela é ${R(finS.primeira)}, a última ${R(finS.ultima)} e os juros somam <strong>${R(finS.totalJuros)}</strong>.</p>`,
      [
        'Digite o valor financiado (preço do bem menos a entrada).',
        'Informe a taxa de juros, escolha se é mensal ou anual e defina o prazo em meses.',
        'Escolha o sistema de amortização: SAC ou Price.',
        'Clique em <strong>Calcular</strong> para ver parcelas, juros totais e a tabela mês a mês.',
      ],
    ),
    faq: [
      { q: 'O que é CET e por que ele importa?', a: '<p>O Custo Efetivo Total (CET) soma juros, tarifas, seguros e impostos do financiamento. Os bancos são obrigados a informá-lo, e ele é o número certo para comparar propostas, porque a taxa de juros sozinha não mostra o custo real.</p>' },
    ],
  },
  investimentos: {
    topo: bloco(
      `<p><strong>Com a Selic acima de 8,5% ao ano, CDB a 100% do CDI e Tesouro Selic tendem a render mais que a poupança mesmo depois do IR, e LCI/LCA são isentas de IR.</strong> O IR da renda fixa segue a tabela regressiva: 22,5% até 180 dias e 15% acima de 720 dias.</p>
<p>Exemplo com R$ 10.000,00 por 365 dias, Selic de ${N(INDICADORES.selic)}% e CDI aproximado de ${N(INDICADORES.cdi)}% ao ano (valores padrão da calculadora): CDB 100% do CDI termina com ${R(invRes.CDB.final)}, LCI/LCA 90% do CDI com ${R(invRes['LCI/LCA'].final)} (a isenção de IR compensa a taxa menor) e poupança com ${R(invRes['Poupança'].final)}.</p>`,
      [
        'Digite o valor a investir e o prazo em dias corridos.',
        'Confira o CDI, a Selic e a TR mensal, que já vêm preenchidos com valores de referência e podem ser editados.',
        'Informe o percentual do CDI oferecido pelo CDB e pela LCI/LCA.',
        'Clique em <strong>Calcular</strong> para comparar o rendimento líquido de cada aplicação.',
      ],
    ),
    faq: [
      { q: 'LCI e LCA têm garantia do FGC?', a: '<p>Sim. Assim como CDB e poupança, LCI e LCA contam com a garantia do Fundo Garantidor de Créditos, dentro dos limites por CPF e por instituição definidos pelo FGC. O Tesouro Selic tem garantia do Tesouro Nacional.</p>' },
    ],
  },
  'imposto-de-renda': {
    topo: bloco(
      `<p><strong>IRRF = imposto pela tabela progressiva sobre a base (rendimento − deduções) − redução da Lei 15.270/2025.</strong> A base desconta INSS, ${R(IRRF.deducaoDependente)} por dependente e pensão, ou o desconto simplificado de ${R(IRRF.descontoSimplificado)}, o que for melhor. Em 2026, a redução zera o imposto até R$ 5.000,00 de rendimento e diminui gradualmente até R$ 7.350,00.</p>
<p>Exemplo: salário de R$ 6.000,00 tem IRRF de ${R(ir6000.irrf)}; de R$ 7.000,00, <strong>${R(ir7000.irrf)}</strong> (sem dependentes).</p>`,
      [
        'Digite os rendimentos tributáveis do mês (salário, horas extras, adicionais).',
        'Informe o INSS descontado, o número de dependentes e a pensão judicial, se houver.',
        'Inclua outras deduções legais, como a previdência privada PGBL, se for o caso.',
        'Clique em <strong>Calcular</strong> para ver a base, a alíquota efetiva e a redução de 2026.',
      ],
    ),
    faq: [
      { q: 'Qual a diferença entre alíquota nominal e efetiva?', a: '<p>A nominal é a da faixa da tabela em que a sua base cai (até 27,5%). A efetiva é o imposto dividido pelo rendimento total e é sempre menor, porque a parcela a deduzir e a redução de 2026 diminuem o valor final.</p>' },
    ],
  },
  'das-mei': {
    topo: bloco(
      `<p><strong>O DAS do MEI em 2026 custa ${R(meiCom.mensal)} para comércio e indústria, ${R(meiServ.mensal)} para serviços e ${R(meiAmb.mensal)} para comércio e serviços.</strong> O valor é 5% do salário mínimo para o INSS (${R(MEI.inss)}) mais R$ 1,00 de ICMS e/ou R$ 5,00 de ISS. O vencimento é no dia 20 de cada mês e o limite de faturamento é de ${R(MEI.limiteAnual)} por ano.</p>`,
      [
        'Escolha a atividade: comércio/indústria, serviços ou ambos.',
        'Marque se você é MEI transportador autônomo de cargas (caminhoneiro), que tem contribuição e limite próprios.',
        'Informe quantos meses a empresa ficou ativa no ano e, se quiser, o faturamento bruto para conferir o limite.',
        'Clique em <strong>Calcular</strong> para ver o DAS mensal, o total no ano e se você está dentro do limite.',
      ],
    ),
    faq: [
      { q: 'O DAS do MEI muda quando o salário mínimo sobe?', a: `<p>Sim. A parte do INSS é 5% do salário mínimo, então o DAS é reajustado todo ano junto com o mínimo. Com o mínimo de ${R(SALARIO_MINIMO.valor)} em 2026, essa parte é de ${R(MEI.inss)}.</p>` },
    ],
  },
  inss: {
    topo: bloco(
      `<p><strong>O INSS do empregado CLT é progressivo: 7,5%, 9%, 12% e 14%, cada alíquota aplicada só à parte do salário dentro da faixa, até o teto de ${R(INSS.teto)}.</strong> A contribuição máxima em 2026 é ${R(inssTeto.inss)}. Autônomos pagam 20% (ou 11% sobre o mínimo no plano simplificado) e o MEI e o facultativo de baixa renda, 5% do mínimo.</p>
<p>Exemplo: salário de R$ 3.000,00 paga <strong>${R(inss3000.inss)}</strong> de INSS, alíquota efetiva de ${N(inss3000.aliquotaEfetiva * 100)}%.</p>`,
      [
        'Escolha a categoria: empregado CLT (doméstico ou avulso), contribuinte individual ou facultativo, plano simplificado ou facultativo baixa renda.',
        'Digite o salário bruto ou o salário de contribuição.',
        'Clique em <strong>Calcular</strong> para ver a contribuição faixa por faixa e a alíquota efetiva.',
      ],
    ),
    faq: [
      { q: 'Qual o desconto máximo de INSS em 2026?', a: `<p>Para empregados, ${R(inssTeto.inss)} por mês, valor pago por quem ganha a partir do teto de ${R(INSS.teto)}. Acima disso, o desconto não aumenta.</p>` },
    ],
  },
  porcentagem: {
    topo: bloco(
      `<p><strong>X% de um valor = valor × X ÷ 100.</strong> Para saber quantos por cento uma parte representa, divida a parte pelo total e multiplique por 100. Para a variação, faça (valor novo − valor antigo) ÷ valor antigo × 100.</p>
<p>Exemplos: 15% de 200 é ${N(C.porcentagem.deValor(15, 200), 0)}; 30 de 200 é ${N(C.porcentagem.quantoPorcento(30, 200), 0)}%; de 50 para 56 a variação é de ${N(C.porcentagem.variacao(50, 56), 0)}%.</p>`,
      [
        'Escolha o bloco da conta que você quer fazer: 1) quanto é X% de um valor, 2) quantos por cento, 3) variação ou 4) aumento e desconto.',
        'Preencha os dois campos desse bloco.',
        'Clique em <strong>Calcular</strong> para ver o resultado e a fórmula usada.',
      ],
    ),
    faq: [
      { q: 'Como calcular desconto de 20% de cabeça?', a: '<p>Ache 10% dividindo o valor por 10 e dobre. Em R$ 150,00, 10% é R$ 15,00 e 20% é R$ 30,00, então o preço com desconto é R$ 120,00.</p>' },
    ],
  },
  'regra-de-tres': {
    topo: bloco(
      `<p><strong>Na regra de três direta, x = (b × c) ÷ a; na inversa, x = (a × b) ÷ c.</strong> Use a direta quando as grandezas crescem juntas (mais quilos, mais caro) e a inversa quando uma cresce e a outra diminui (mais trabalhadores, menos dias).</p>
<p>Exemplos: se 2 kg custam R$ 10, 5 kg custam R$ ${N(C.regraDeTres({ a: 2, b: 10, c: 5 }), 0)}. Se 4 pessoas fazem um serviço em 10 dias, 8 pessoas fazem em ${N(C.regraDeTres({ a: 4, b: 10, c: 8, inversa: true }), 0)} dias.</p>`,
      [
        'Preencha os três valores conhecidos: A está para B, assim como C está para X.',
        'Escolha o tipo de proporção: direta (quanto mais, mais) ou inversa (quanto mais, menos).',
        'Clique em <strong>Calcular</strong> para ver o valor de X e a conta montada.',
      ],
    ),
    faq: [],
  },
  'conversor-de-medidas': {
    topo: bloco(
      `<p><strong>As conversões mais buscadas: 1 polegada = 2,54 cm; 1 pé = 30,48 cm; 1 libra = 0,4536 kg; 1 milha = 1,609 km; 1 alqueire paulista = 24.200 m²; °F = °C × 9/5 + 32.</strong> A calculadora converte comprimento, massa, volume, área, velocidade e temperatura.</p>`,
      [
        'Escolha a grandeza: comprimento, massa (peso), volume, área, velocidade ou temperatura.',
        'Selecione a unidade de origem e a de destino.',
        'Digite o valor e clique em <strong>Calcular</strong>.',
      ],
    ),
    faq: [],
  },
  imc: {
    topo: bloco(
      `<p><strong>IMC = peso (kg) ÷ altura (m)².</strong> Para adultos, a Organização Mundial da Saúde classifica: abaixo de 18,5, abaixo do peso; de 18,5 a 24,9, peso normal; de 25 a 29,9, sobrepeso; 30 ou mais, obesidade (graus I, II e III a partir de 30, 35 e 40).</p>
<p>Exemplo: 70 kg e 1,75 m dão IMC de <strong>${N(imc.imc)}</strong> (${imc.classe.toLowerCase()}). A faixa de peso normal para essa altura vai de ${N(imc.pesoMin, 1)} kg a ${N(imc.pesoMax, 1)} kg.</p>`,
      [
        'Digite o peso em quilos.',
        'Digite a altura em centímetros ou em metros.',
        'Clique em <strong>Calcular</strong> para ver o IMC, a classificação da OMS e a faixa de peso normal para a sua altura.',
      ],
    ),
    faq: [],
  },
  idade: {
    topo: bloco(
      `<p><strong>A idade exata é a diferença entre a data de nascimento e a data de referência, contada em anos completos, depois meses e dias.</strong> Um ano só se completa no dia do aniversário; quem nasceu em 29 de fevereiro completa o ano em 1º de março nos anos não bissextos (Código Civil, art. 132, § 3º).</p>
<p>Exemplo: quem nasceu em 01/01/2000 tinha, em 08/10/2026, <strong>${idade.anos} anos, ${idade.meses} meses e ${idade.dias} dias</strong>, ou ${idade.totalDias.toLocaleString('pt-BR')} dias de vida.</p>`,
      [
        'Digite a data de nascimento.',
        'Deixe a data de referência como hoje ou escolha outra data.',
        'Clique em <strong>Calcular</strong> para ver a idade em anos, meses e dias e quanto falta para o próximo aniversário.',
      ],
    ),
    faq: [],
  },
};

export const topo = (slug) => GEO[slug]?.topo ?? '';
export const faqExtra = (slug) => GEO[slug]?.faq ?? [];
