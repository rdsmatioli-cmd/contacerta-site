// Empregador em Dia: configuração única (backlog v2 81dfa1e0; OK do CEO a1dc9f21; DEC 95a76e17; CFO 0619d010).
// Flags: tudo desligado. Ligar só em homologação, com OK do CEO.
export const FLAGS = Object.freeze({
  EMPREGADOR_EM_DIA: false, // páginas: com false, só o aviso "em preparação"
  ED_CHECKOUT: false, // checkout/contratar (E3)
  ED_ME_AVISE: false, // captura "Me avise" (<20)
  ED_GUIA: false, // guia gratuito (E4, D-06)
  ED_QUIZ_12: false, // questionário de 12 fatores (UI aguarda OK do CEO + visualização do Rodrigo)
  ED_LOGIN: false, // login Supabase (PR #7, D-14)
  ED_SEO: false, // páginas SEO (D-21)
  ED_CONTADOR_EMAIL: false, // M-04: e-mail ao contador (T14, D-18)
});
// D-03 / DEC 95a76e17 item 4-5: SST em definição até o pacote de 12/11.
export const ED_SST_INCLUIDO = null; // null = "em definição"; true/false só após decisão do Rodrigo
export const SST_TEXTO_EM_DEFINICAO = 'Validação pelo profissional de SST: em definição';

// Tabela aprovada (16/10; CFO eb62ca5d). Única fonte de preço.
export const FAIXAS = Object.freeze([
  { id: 'lt20', rotulo: 'Menos de 20', min: 1, max: 19, preco: null },
  { id: '20-50', rotulo: '20 a 50', min: 20, max: 50, preco: 1490, grupos: 4 },
  { id: '51-100', rotulo: '51 a 100', min: 51, max: 100, preco: 2290, grupos: 8 },
  { id: '101-200', rotulo: '101 a 200', min: 101, max: 200, preco: 3490, grupos: 12 },
  { id: 'gt200', rotulo: 'Mais de 200', min: 201, max: Infinity, preco: null }, // DEC 95a76e17: sob medida
]);

// Jornada (parecer do Advogado c23c3792: EC 141/2026 promulgada; 42 h de 16/12/2026; 40 h de 16/12/2027).
export const JORNADA = Object.freeze({
  atual: 44,
  etapas: [
    // Divisor em configuração (padrão 210 / 200), pendente da validação trabalhista (M-02, adendo 2 02eb5fb1).
    { horas: 42, desde: '2026-12-16', divisor: 210 },
    { horas: 40, desde: '2027-12-16', divisor: 200 },
  ],
  adicional: 0.5, // mínimo constitucional (CF art. 7º XVI); a convenção pode prever mais
});
// Salário mínimo nacional 2026 (Decreto 12.797/2025) e meios de faixa (CFO P-20; DEC 95a76e17: ">R$ 5 mil" = 5.000).
export const SALARIO_MINIMO = 1621;
export const FAIXAS_SALARIO = Object.freeze([
  { id: 'ate2', rotulo: 'Até R$ 2 mil', meio: 1810.5 },
  { id: '2a3', rotulo: 'R$ 2 mil a R$ 3 mil', meio: 2500 },
  { id: '3a5', rotulo: 'R$ 3 mil a R$ 5 mil', meio: 4000 },
  { id: 'gt5', rotulo: 'Acima de R$ 5 mil', meio: 5000 },
]);
// P-12 (parecer c23c3792): só tokens individuais; mínimo de 5 respostas para mostrar resultado agregado.
export const ANONIMATO = Object.freeze({ minimoRespostas: 5, tipoToken: 'individual' });
// D-08 / backlog v2 24577443: escala de 5 pontos (0 a 4) do questionário de 12 fatores (UI atrás de ED_QUIZ_12).
export const ESCALA_5 = Object.freeze(['Nunca', 'Raramente', 'Às vezes', 'Frequentemente', 'Sempre']);
// Adendo 2 do Advogado (02eb5fb1): nota para empregador doméstico no simulador 42h (EC 141; CF art. 7º, § 1º).
export const NOTA_DOMESTICO = 'Para empregado doméstico, a lei específica (LC 150/2015) ainda fala em 44 horas, mas a Emenda Constitucional 141/2026 também vale para ele.';
// E3 (backlog v3 T07, T10): checkout só em mock (D-22); limiar de respostas para a análise vem daqui (T10 CA 2).
export const ED_PAGAMENTO_MODO = 'mock'; // 'mock' até a ativação live aprovada (E6); nenhuma chave no repositório
export const LIMIAR_ANALISE = 0.7;
