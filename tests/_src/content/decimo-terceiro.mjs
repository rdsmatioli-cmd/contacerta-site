import { topo, faqExtra } from './_geo.mjs';
import { INSS, IRRF } from '../js/tabelas.js';
export default {
  slug: 'decimo-terceiro', ordem: 3, categoria: 'Trabalho e salário',
  keyword: 'calculadora 13º salário',
  nomeCurto: '13º salário', resumo: 'Valor da 1ª e da 2ª parcela, com descontos.',
  title: 'Calculadora de 13º Salário 2026: 1ª e 2ª Parcela',
  description: 'Calcule o 13º salário 2026: valor proporcional aos meses trabalhados, 1ª parcela sem descontos e 2ª parcela com INSS e IR (isenção até R$ 5.000).',
  h1: 'Calculadora de 13º salário',
  lead: 'Descubra quanto você vai receber de décimo terceiro em cada parcela, de forma integral ou proporcional aos meses trabalhados no ano.',
  calc: 'decimo-terceiro',
  campos: [
    { n: 'salario', l: 'Salário bruto mensal', t: 'money', v: 4000 },
    { n: 'meses', l: 'Meses trabalhados no ano', t: 'int', v: 12, min: 1, max: 12, ajuda: 'Conte o mês em que trabalhou 15 dias ou mais.' },
    { n: 'media', l: 'Média de horas extras, comissões e adicionais', t: 'money', v: 0 },
    { n: 'dependentes', l: 'Dependentes para IR', t: 'int', v: 0 },
  ],
  artigo: topo('decimo-terceiro') + `
<h2>Como funciona o 13º salário</h2>
<p>A gratificação natalina, criada pela Lei 4.090/1962, equivale a um salário extra por ano para quem trabalha com carteira assinada, aposentados e pensionistas do INSS. Quem não trabalhou o ano todo recebe proporcionalmente: 1/12 do salário para cada mês com pelo menos 15 dias trabalhados.</p>
<p>O pagamento é dividido em duas parcelas (Lei 4.749/1965):</p>
<ul>
<li><strong>1ª parcela:</strong> paga entre 1º de fevereiro e 30 de novembro, ou junto com as férias se o empregado pedir em janeiro. Corresponde à metade do salário do mês anterior e <strong>não tem descontos</strong>.</li>
<li><strong>2ª parcela:</strong> paga até 20 de dezembro. É o valor total do 13º menos a 1ª parcela, menos o INSS e o imposto de renda calculados sobre o valor cheio.</li>
</ul>
<h2>Fórmula</h2>
<p>13º bruto = (salário + média de variáveis) ÷ 12 × meses trabalhados.</p>
<p>O INSS segue a tabela progressiva de 2026 aplicada ao 13º isoladamente. O imposto de renda é tributado exclusivamente na fonte, separado do salário de dezembro, com as mesmas deduções (INSS, dependentes ou desconto simplificado) e a redução da Lei 15.270/2025, que também vale para o 13º.</p>
<h2>Exemplos</h2>
<h3>Ano completo, R$ 4.000,00</h3>
<p>13º bruto: R$ 4.000,00. A 1ª parcela é de R$ 2.000,00. Na 2ª, desconta-se INSS de R$ 368,60; o IR pela tabela seria R$ 114,76, mas a redução zera o valor porque o 13º não passa de R$ 5.000,00. A 2ª parcela fica em R$ 1.631,40, e o total líquido em R$ 3.631,40.</p>
<h3>Admitido em junho, R$ 2.500,00</h3>
<p>Com 7 meses trabalhados, o 13º bruto é R$ 1.458,33. A 1ª parcela é R$ 729,17 e, após INSS de R$ 109,37, a 2ª parcela é R$ 619,79.</p>
<h3>Salário de R$ 8.000,00</h3>
<p>13º bruto de R$ 8.000,00, INSS de R$ 921,51 e IR de R$ 1.037,85 (sem redução, pois passa de R$ 7.350,00). A 2ª parcela cai para R$ 2.040,64: é normal que ela seja bem menor que a primeira.</p>
<h2>Médias de variáveis</h2>
<p>Horas extras, adicional noturno, comissões e gorjetas habituais entram no 13º pela média do ano. Em geral, a empresa calcula a média de janeiro a novembro para a 2ª parcela e faz um ajuste em janeiro, se necessário. Informe essa média no campo próprio para incluir no cálculo.</p>
<h2>Situações especiais</h2>
<ul>
<li><strong>Demissão:</strong> o 13º proporcional é pago na rescisão, exceto na justa causa.</li>
<li><strong>Afastamento por doença:</strong> a empresa paga os primeiros 15 dias; depois o INSS paga o abono anual proporcional.</li>
<li><strong>Licença-maternidade:</strong> o período conta normalmente para o 13º.</li>
<li><strong>Faltas injustificadas:</strong> podem fazer o mês ter menos de 15 dias trabalhados e perder o avo.</li>
</ul>
<h2>Como conferir o seu 13º</h2>
<p>Confira no holerite de dezembro se a base usada inclui a média das variáveis e se o número de avos bate com os meses trabalhados. Lembre que o INSS do 13º é calculado separadamente do salário de dezembro e que, se você recebeu a 1ª parcela nas férias, ela será abatida da 2ª. Diferenças grandes devem ser questionadas ao RH antes de 20 de dezembro.</p>`,
  faq: [...faqExtra('decimo-terceiro'),
    { q: 'Quando é paga a primeira parcela do 13º?', a: '<p>Até 30 de novembro. A segunda parcela deve ser paga até 20 de dezembro. Se a data cair em fim de semana ou feriado, a empresa deve antecipar o pagamento.</p>' },
    { q: 'Por que a segunda parcela é menor?', a: '<p>Porque todo o INSS e o imposto de renda do 13º são descontados de uma só vez na 2ª parcela, enquanto a 1ª é paga sem descontos.</p>' },
    { q: 'O 13º tem isenção de IR até R$ 5.000 em 2026?', a: '<p>Sim. A Lei 15.270/2025 manda aplicar a redução também ao 13º, que é tributado separadamente. Um 13º de até R$ 5.000,00 não tem IR retido.</p>' },
    { q: 'Quem trabalhou menos de 15 dias no mês ganha o avo?', a: '<p>Não. A fração só conta se houver 15 dias ou mais de trabalho no mês.</p>' },
    { q: 'Estagiário recebe 13º?', a: '<p>Não. A Lei do Estágio não prevê 13º, embora a empresa possa conceder por liberalidade.</p>' },
  ],
  fontes: [
    { nome: 'Lei nº 4.090/1962 — gratificação de Natal', url: 'https://www.planalto.gov.br/ccivil_03/leis/l4090.htm' },
    { nome: 'Lei nº 4.749/1965 — pagamento em duas parcelas', url: 'https://www.planalto.gov.br/ccivil_03/leis/l4749.htm' },
    { nome: INSS.fonte, url: INSS.url },
    { nome: IRRF.fonte, url: IRRF.url },
  ],
  relacionadas: ['salario-liquido', 'ferias', 'rescisao', 'imposto-de-renda', 'inss'],
};
