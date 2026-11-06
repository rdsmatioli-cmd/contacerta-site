// Oráculo das tabelas oficiais de 2026 (CC-CALC-TESTES-02 e -03): valores digitados das fontes primárias, sem
// importar assets/js/tabelas.js, para o teste não conferir o código com ele mesmo. Tudo em centavos (inteiros) e
// alíquotas em milésimos: o cálculo de referência é exato, sem ponto flutuante, e arredonda meio centavo para cima.
// Sem dependências: usado pelo tests/oraculo-2026.test.mjs (node --test da raiz) e pelos testes por propriedade
// de tests/oraculo/ (fast-check).
//
// Fontes, conferidas em 31/10/2026:
// - INSS: Portaria Interministerial MPS/MF nº 13, de 09/01/2026, transcrita em gov.br/inss, "Tabela de contribuição
//   mensal" (atualizada em 13/01/2026), tabelas válidas a partir da competência janeiro de 2026.
//   https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/tabela-de-contribuicao-mensal/tabela-de-contribuicao-mensal
// - IRRF: Receita Federal, "Tributação de 2026" (atualizada em 27/04/2026): Tabela de Incidência Mensal (Lei nº
//   15.191/2025) e Tabela de Redução Mensal (Lei nº 15.270/2025), a partir de janeiro de 2026.
//   https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026

export const FONTE_INSS = 'Portaria Interministerial MPS/MF nº 13/2026 (gov.br/inss, Tabela de contribuição mensal, competência janeiro/2026)';
export const FONTE_IRRF = 'Receita Federal, Tributação de 2026 (Lei nº 15.191/2025, incidência mensal; Lei nº 15.270/2025, redução mensal)';

// Empregado, empregado doméstico e trabalhador avulso: [limite superior da faixa em centavos, alíquota em milésimos].
// "Até R$ 1.621,00: 7,5%; de R$ 1.621,01 a R$ 2.902,84: 9%; de R$ 2.902,85 até R$ 4.354,27: 12%; de R$ 4.354,28 até
// R$ 8.475,55: 14%". Acima do teto, a contribuição é a do teto.
export const INSS_2026 = Object.freeze({
  faixas: Object.freeze([[162100, 75], [290284, 90], [435427, 120], [847555, 140]]),
  teto: 847555,
  // Contribuinte individual, facultativo e MEI, valores publicados na mesma página: 5% (baixa renda e MEI) e 11%
  // (plano simplificado) do salário mínimo de R$ 1.621,00; 20% entre R$ 324,20 (salário mínimo) e R$ 1.695,11 (teto).
  individual: Object.freeze({ baixaRendaMei: 8105, simplificado: 17831, normalMinimo: 32420, normalTeto: 169511 }),
});

// Incidência mensal: [limite superior da base em centavos, alíquota em milésimos, parcela a deduzir em centavos].
// "Até R$ 2.428,80: isento; de R$ 2.428,81 até R$ 2.826,65: 7,5%, R$ 182,16; de R$ 2.826,66 até R$ 3.751,05: 15%,
// R$ 394,16; de R$ 3.751,06 até R$ 4.664,68: 22,5%, R$ 675,49; acima de R$ 4.664,68: 27,5%, R$ 908,73".
// "Dedução mensal por dependente: R$ 189,59. Limite mensal de desconto simplificado: R$ 607,20."
// Redução mensal: "até R$ 5.000,00: até R$ 312,89, de modo que o imposto devido seja zero; de R$ 5.000,01 até
// R$ 7.350,00: R$ 978,62 − (0,133145 × rendimentos tributáveis sujeitos à incidência mensal)".
export const IRRF_2026 = Object.freeze({
  faixas: Object.freeze([[242880, 0, 0], [282665, 75, 18216], [375105, 150, 39416], [466468, 225, 67549], [Infinity, 275, 90873]]),
  dependente: 18959,
  simplificado: 60720,
  // a em centavos; b em milionésimos (0,133145 = 133145 / 1.000.000)
  reducao: Object.freeze({ isencaoAte: 500000, limiteIsencao: 31289, faixaAte: 735000, a: 97862, b: 133145 }),
});

// Divisão inteira com arredondamento de meio para cima (a >= 0, b > 0).
const divArred = (a, b) => {
  const q = (a - (a % b)) / b;
  return 2 * (a % b) >= b ? q + 1 : q;
};
const exigeCentavos = (nome, v) => {
  if (!Number.isSafeInteger(v) || v < 0) throw new TypeError(`${nome} deve ser inteiro em centavos, >= 0: ${v}`);
};

/** INSS do empregado em centavos, pelas faixas progressivas (soma exata das parcelas, arredondada no fim). */
export function inssOraculo(salarioCentavos) {
  exigeCentavos('salário', salarioCentavos);
  const base = Math.min(salarioCentavos, INSS_2026.teto);
  let anterior = 0;
  let milesimos = 0;
  for (const [ate, aliq] of INSS_2026.faixas) {
    if (base <= anterior) break;
    milesimos += (Math.min(base, ate) - anterior) * aliq;
    anterior = ate;
  }
  return divArred(milesimos, 1000);
}

/** Imposto pela tabela de incidência mensal sobre uma base em centavos. */
export function tabelaIrrfOraculo(baseCentavos) {
  exigeCentavos('base', baseCentavos);
  const [, aliq, deducao] = IRRF_2026.faixas.find(([ate]) => baseCentavos <= ate);
  const milesimos = baseCentavos * aliq - deducao * 1000;
  return milesimos > 0 ? divArred(milesimos, 1000) : 0;
}

/**
 * IRRF mensal de 2026 em centavos: o menor imposto entre deduções legais (INSS, dependentes, pensão, outras) e o
 * desconto simplificado, menos a redução da Lei 15.270/2025 (sobre os rendimentos tributáveis, limitada ao imposto).
 */
export function irrfOraculo({ rendimentos, inss = 0, dependentes = 0, pensao = 0, outras = 0 }) {
  for (const [nome, v] of Object.entries({ rendimentos, inss, pensao, outras })) exigeCentavos(nome, v);
  if (!Number.isSafeInteger(dependentes) || dependentes < 0) throw new TypeError(`dependentes: ${dependentes}`);
  const legais = inss + dependentes * IRRF_2026.dependente + pensao + outras;
  const tLegal = tabelaIrrfOraculo(Math.max(0, rendimentos - legais));
  const tSimpl = tabelaIrrfOraculo(Math.max(0, rendimentos - IRRF_2026.simplificado));
  const impostoTabela = Math.min(tLegal, tSimpl);
  const R = IRRF_2026.reducao;
  let reducao = 0;
  if (rendimentos <= R.isencaoAte) reducao = R.limiteIsencao;
  else if (rendimentos <= R.faixaAte) {
    const milionesimos = R.a * 1e6 - rendimentos * R.b;
    reducao = milionesimos > 0 ? divArred(milionesimos, 1e6) : 0;
  }
  reducao = Math.min(reducao, impostoTabela);
  return { impostoTabela, usaSimplificado: tSimpl < tLegal, reducao, irrf: impostoTabela - reducao };
}

/** Reais com até 2 casas para centavos inteiros (aceita o ruído de ponto flutuante de um r2). */
export const centavos = (reais) => Math.round(reais * 100);
