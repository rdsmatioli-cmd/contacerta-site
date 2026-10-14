import { topo, faqExtra } from './_geo.mjs';
import { INSS, IRRF } from '../js/tabelas.js';
export default {
  slug: 'ferias', ordem: 4, categoria: 'Trabalho e salário',
  keyword: 'calculadora de férias',
  nomeCurto: 'Férias', resumo: 'Férias + 1/3, venda de 10 dias e descontos.',
  title: 'Calculadora de Férias 2026: 1/3, Abono e Descontos',
  description: 'Calcule o valor das férias 2026 com 1/3 constitucional, venda de 10 dias (abono pecuniário), INSS e IR. Veja exemplos e prazos de pagamento.',
  h1: 'Calculadora de férias',
  lead: 'Veja quanto você recebe ao sair de férias, com o terço constitucional, a opção de vender 10 dias e os descontos de INSS e imposto de renda.',
  calc: 'ferias',
  campos: [
    { n: 'salario', l: 'Salário bruto mensal', t: 'money', v: 4000 },
    { n: 'media', l: 'Média de horas extras e adicionais', t: 'money', v: 0 },
    { n: 'dias', l: 'Dias de férias', t: 'int', v: 30, min: 5, max: 30, ajuda: 'Calcula um período por vez.', ajudaMaisRotulo: 'Regras para dividir as férias', ajudaMais: 'Com a concordância do empregado, as férias podem ser divididas em até 3 períodos: um com pelo menos 14 dias corridos e os outros com pelo menos 5 dias corridos cada (art. 134, § 1º, da CLT). As férias não podem começar nos 2 dias antes de feriado ou do descanso semanal remunerado (art. 134, § 3º).' },
    { n: 'vender', l: 'Vender 1/3 das férias (abono pecuniário)', t: 'check', v: false },
    { n: 'dependentes', l: 'Dependentes para IR', t: 'int', v: 0 },
  ],
  aviso: 'Estimativa. Aqui o INSS é calculado só sobre férias + 1/3; na folha, ele é somado ao salário do mesmo mês de competência e pode variar alguns reais. Médias de variáveis e convenções coletivas também alteram o valor.',
  artigo: topo('ferias') + `
<h2>Como as férias são calculadas</h2>
<p>Após cada 12 meses de trabalho (período aquisitivo), o empregado tem direito a até 30 dias de férias remuneradas, que a empresa deve conceder nos 12 meses seguintes (período concessivo). O valor é composto por:</p>
<ul>
<li><strong>Remuneração dos dias de descanso:</strong> (salário + média de variáveis) ÷ 30 × dias de férias.</li>
<li><strong>1/3 constitucional:</strong> um terço a mais sobre o valor das férias (art. 7º, XVII, da Constituição).</li>
<li><strong>Abono pecuniário (opcional):</strong> o empregado pode vender até 1/3 dos dias (normalmente 10) e receber por eles, também com 1/3.</li>
</ul>
<p>O pagamento deve ser feito até 2 dias antes do início das férias (art. 145 da CLT). Já as férias concedidas depois de vencido o período concessivo devem ser pagas em dobro (art. 137 da CLT).</p>
<h2>Descontos</h2>
<p>Férias + 1/3 sofrem INSS e IRRF, calculados separadamente do salário do mês. O abono pecuniário e o 1/3 sobre ele são isentos de INSS e de imposto de renda. Desde janeiro de 2026, a redução da Lei 15.270/2025 zera o IR quando o valor tributável das férias não passa de R$ 5.000,00 e reduz o imposto até R$ 7.350,00.</p>
<h2>Faltas reduzem os dias de férias</h2>
<table><thead><tr><th>Faltas injustificadas no período aquisitivo</th><th>Dias de férias</th></tr></thead><tbody>
<tr><td>Até 5</td><td>30</td></tr><tr><td>6 a 14</td><td>24</td></tr><tr><td>15 a 23</td><td>18</td></tr><tr><td>24 a 32</td><td>12</td></tr><tr><td>Mais de 32</td><td>Perde o direito</td></tr>
</tbody></table>
<h2>Exemplos</h2>
<h3>30 dias, salário de R$ 4.000,00</h3>
<p>Férias de R$ 4.000,00 mais 1/3 de R$ 1.333,33: bruto de R$ 5.333,33. INSS de R$ 548,18. Pelo desconto simplificado, o imposto pela tabela seria R$ 390,96; como o valor tributável fica entre R$ 5.000,01 e R$ 7.350,00, a redução é de R$ 268,51 e o IR final, R$ 122,45. Líquido: R$ 4.662,70.</p>
<h3>Vendendo 10 dias</h3>
<p>Com 20 dias de descanso, as férias somam R$ 2.666,67 + 1/3 de R$ 888,89. O abono de 10 dias vale R$ 1.333,33 + 1/3 de R$ 444,44, sem descontos. O INSS cai para R$ 315,27 e o IR é zerado. O líquido sobe para R$ 5.018,06, porque parte do valor deixa de ser tributada.</p>
<h3>Salário de R$ 9.000,00</h3>
<p>Bruto de R$ 12.000,00, INSS no teto (R$ 988,09) e IR de R$ 2.119,55, sem redução. Líquido de R$ 8.892,36.</p>
<h2>Regras práticas</h2>
<ul>
<li>As férias podem ser divididas em até 3 períodos, sendo um de pelo menos 14 dias e os outros de pelo menos 5 dias cada (art. 134 da CLT).</li>
<li>Não podem começar nos 2 dias anteriores a feriado ou ao repouso semanal.</li>
<li>A venda de 10 dias deve ser pedida até 15 dias antes do fim do período aquisitivo.</li>
<li>Se você pedir, a 1ª parcela do 13º pode ser paga junto com as férias, desde que solicitada em janeiro.</li>
</ul>`,
  faq: [...faqExtra('ferias'),
    { q: 'Quando a empresa deve pagar as férias?', a: '<p>Até 2 dias antes do início do descanso (art. 145 da CLT). O atraso pode gerar multa administrativa e correção, mas, desde a decisão do STF na ADPF 501 (2022), não gera automaticamente o pagamento em dobro. A dobra continua valendo quando as férias são concedidas fora do período concessivo.</p>' },
    { q: 'Vale a pena vender 10 dias de férias?', a: '<p>Financeiramente, sim: o abono e seu 1/3 não têm INSS nem IR, então o líquido total aumenta. Mas você descansa menos. A decisão é sua, e a empresa não pode obrigar a venda.</p>' },
    { q: 'O 1/3 de férias tem desconto de INSS?', a: '<p>Sim, nas férias gozadas o terço integra a remuneração e as empresas recolhem INSS sobre ele; o STF confirmou em 2020 (Tema 985) a incidência da contribuição previdenciária sobre o terço de férias. Nas férias indenizadas na rescisão não há desconto.</p>' },
    { q: 'Posso tirar férias antes de completar 1 ano?', a: '<p>Só em férias coletivas ou por acordo com a empresa, que pode antecipar o período. Fora isso, o direito surge após 12 meses de contrato.</p>' },
  ],
  fontes: [
    { nome: 'CLT — arts. 129 a 145 (férias)', url: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm' },
    { nome: INSS.fonte, url: INSS.url },
    { nome: IRRF.fonte, url: IRRF.url },
  ],
  relacionadas: ['salario-liquido', 'decimo-terceiro', 'rescisao', 'horas-extras', 'imposto-de-renda'],
};
