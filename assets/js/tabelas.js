// Tabelas oficiais vigentes. Atualize aqui e rode `npm test` + `npm run build`.
// Cada bloco cita a fonte oficial e a data em que o valor foi conferido.

export const ATUALIZADO_EM = '2026-10-10';

export const SALARIO_MINIMO = {
  valor: 1621.0,
  vigencia: '01/01/2026',
  fonte: 'Decreto nº 12.797, de 23/12/2025',
  url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/decreto/d12797.htm',
};

// INSS — empregado, doméstico e avulso (alíquotas progressivas por faixa)
export const INSS = {
  vigencia: 'competência janeiro/2026',
  fonte: 'Portaria Interministerial MPS/MF nº 13, de 09/01/2026',
  url: 'https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/tabela-de-contribuicao-mensal/tabela-de-contribuicao-mensal',
  faixas: [
    { ate: 1621.0, aliquota: 0.075 },
    { ate: 2902.84, aliquota: 0.09 },
    { ate: 4354.27, aliquota: 0.12 },
    { ate: 8475.55, aliquota: 0.14 },
  ],
  teto: 8475.55,
  // Contribuinte individual / facultativo / MEI (sobre o salário de contribuição)
  individual: { normal: 0.2, simplificado: 0.11, baixaRendaMei: 0.05 },
};

// IRRF — tabela progressiva mensal + redução da Lei 15.270/2025
export const IRRF = {
  vigencia: 'a partir de janeiro/2026',
  fonte: 'Receita Federal — Tributação de 2026 (Lei nº 15.191/2025 e Lei nº 15.270/2025)',
  url: 'https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026',
  faixas: [
    { ate: 2428.8, aliquota: 0, deducao: 0 },
    { ate: 2826.65, aliquota: 0.075, deducao: 182.16 },
    { ate: 3751.05, aliquota: 0.15, deducao: 394.16 },
    { ate: 4664.68, aliquota: 0.225, deducao: 675.49 },
    { ate: Infinity, aliquota: 0.275, deducao: 908.73 },
  ],
  deducaoDependente: 189.59,
  descontoSimplificado: 607.2,
  reducao: { isencaoAte: 5000.0, limiteIsencao: 312.89, faixaAte: 7350.0, a: 978.62, b: 0.133145 },
};

// IR sobre aplicações de renda fixa (tabela regressiva)
export const IR_RENDA_FIXA = {
  fonte: 'Receita Federal — Tributação de 2026 (aplicações de renda fixa)',
  url: 'https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026',
  faixas: [
    { ateDias: 180, aliquota: 0.225 },
    { ateDias: 360, aliquota: 0.2 },
    { ateDias: 720, aliquota: 0.175 },
    { ateDias: Infinity, aliquota: 0.15 },
  ],
};

// Indicadores de mercado (mudam com frequência — valores padrão editáveis na calculadora)
export const INDICADORES = {
  selic: 13.75, // % a.a., meta Copom desde 17/09/2026 (Comunicado BCB nº 45.963)
  selicFonte: 'Banco Central do Brasil — Comunicado nº 45.963, de 16/09/2026',
  selicUrl: 'https://www.bcb.gov.br/controleinflacao/historicotaxasjuros',
  cdi: 13.65, // % a.a., aproximação (CDI costuma ficar ~0,10 p.p. abaixo da Selic meta)
  trMensal: 0.17, // % a.m., TR aproximada de set/2026
  poupancaUrl: 'https://www.bcb.gov.br/estatisticas/remuneradepositospoupanca',
};

// MEI — DAS mensal
export const MEI = {
  vigencia: '2026',
  fonte: 'Receita Federal — Simples Nacional, notícia de 02/01/2026 (PGMEI 2026)',
  url: 'https://www8.receita.fazenda.gov.br/simplesnacional/noticias/NoticiaCompleta.aspx?id=c3b2044c-ff97-432a-b33c-ecf2a3df6dc3',
  inss: 81.05, // 5% do salário mínimo
  inssCaminhoneiro: 194.52, // 12% do salário mínimo
  icms: 1.0,
  iss: 5.0,
  limiteAnual: 81000,
  limiteAnualCaminhoneiro: 251600,
};

// Seguro-desemprego — tabela MTE vigente desde 11/01/2026
export const SEGURO_DESEMPREGO = {
  vigencia: '11/01/2026',
  fonte: 'Ministério do Trabalho e Emprego — Portal FAT, 13/01/2026',
  url: 'https://portalfat.trabalho.gov.br/mte-reajusta-valores-do-beneficio-seguro-desemprego/',
  faixa1Ate: 2222.17,
  faixa2Ate: 3703.99,
  fixoFaixa2: 1777.74,
  teto: 2518.65,
  piso: 1621.0,
};

// FGTS
export const FGTS = {
  fonte: 'Lei nº 8.036/1990 (arts. 13, 15 e 18)',
  url: 'https://www.planalto.gov.br/ccivil_03/leis/l8036consol.htm',
  aliquota: 0.08,
  aliquotaAprendiz: 0.02,
  multaSemJustaCausa: 0.4,
  multaAcordo: 0.2,
  jurosAnuais: 0.03,
};
