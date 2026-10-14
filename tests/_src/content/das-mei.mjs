import { topo, faqExtra } from './_geo.mjs';
import { MEI, SALARIO_MINIMO } from '../js/tabelas.js';
export default {
  slug: 'das-mei', ordem: 3, categoria: 'Impostos e MEI',
  keyword: 'DAS MEI 2026',
  nomeCurto: 'DAS MEI 2026', resumo: 'Valor do boleto mensal e limite de faturamento.',
  title: 'Calculadora DAS MEI 2026: Valor do Boleto e Limite',
  description: 'Veja o valor do DAS MEI 2026 (R$ 82,05, R$ 86,05 ou R$ 87,05), o total anual e se o seu faturamento cabe no limite de R$ 81 mil do MEI.',
  h1: 'Calculadora DAS MEI 2026',
  lead: 'Descubra quanto o microempreendedor individual paga por mês em 2026 e confira se o faturamento está dentro do limite.',
  calc: 'das-mei', appCategory: 'BusinessApplication',
  campos: [
    { n: 'atividade', l: 'Atividade do MEI', t: 'select', v: 'servicos', o: [['comercio', 'Comércio ou indústria'], ['servicos', 'Prestação de serviços'], ['ambos', 'Comércio e serviços']] },
    { n: 'caminhoneiro', l: 'MEI transportador autônomo de cargas (caminhoneiro)', t: 'check', v: false },
    { n: 'meses', l: 'Meses de atividade no ano', t: 'int', v: 12, min: 1, max: 12, ajuda: 'No ano de abertura, o limite é proporcional aos meses.' },
    { n: 'faturamento', l: 'Faturamento bruto no ano (opcional)', t: 'money', v: 0 },
  ],
  afiliado: 'Possível parceria: contabilidade online para MEI/ME ou conta PJ.',
  artigo: topo('das-mei') + `
<h2>Valores do DAS MEI em 2026</h2>
<p>O DAS do MEI é um valor fixo mensal que reúne a contribuição ao INSS (5% do salário mínimo de R$ ${SALARIO_MINIMO.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) e os impostos da atividade:</p>
<table><thead><tr><th>Atividade</th><th>INSS</th><th>ICMS/ISS</th><th>Total mensal</th></tr></thead><tbody>
<tr><td>Comércio e indústria</td><td>R$ 81,05</td><td>R$ 1,00</td><td>R$ 82,05</td></tr>
<tr><td>Serviços</td><td>R$ 81,05</td><td>R$ 5,00</td><td>R$ 86,05</td></tr>
<tr><td>Comércio e serviços</td><td>R$ 81,05</td><td>R$ 6,00</td><td>R$ 87,05</td></tr>
</tbody></table>
<p>Para o MEI caminhoneiro, o INSS é de 12% do salário mínimo (R$ 194,52), e o DAS fica entre R$ 195,52 e R$ 200,52. No ano, um MEI de serviços paga R$ 1.032,60.</p>
<h2>Vencimento e como pagar</h2>
<p>O DAS vence todo dia 20 do mês seguinte ao da competência. Ele é emitido no Portal do Empreendedor (PGMEI) ou no aplicativo MEI, e pode ser pago por Pix, boleto ou débito automático. O atraso gera multa de 0,33% ao dia (limitada a 20%) e juros pela Selic.</p>
<h2>Limite de faturamento</h2>
<p>O MEI pode faturar até R$ ${MEI.limiteAnual.toLocaleString('pt-BR')} por ano (R$ 6.750 por mês, em média). O caminhoneiro pode faturar até R$ ${MEI.limiteAnualCaminhoneiro.toLocaleString('pt-BR')}. No ano de abertura, o limite é proporcional: R$ 6.750 vezes os meses desde a abertura, contando o mês inteiro em que a empresa foi aberta.</p>
<ul>
<li><strong>Excesso de até 20%</strong> (até R$ 97.200 no ano cheio): o MEI continua enquadrado até dezembro, paga um DAS complementar sobre o valor excedente e vira microempresa (ME) em janeiro.</li>
<li><strong>Excesso acima de 20%:</strong> o desenquadramento é retroativo a janeiro (ou à data de abertura), com cobrança dos tributos como ME sobre todo o período. Nesse caso, procure um contador o quanto antes.</li>
</ul>
<h2>Obrigações além do DAS</h2>
<ul>
<li><strong>DASN-SIMEI:</strong> declaração anual de faturamento, entregue até 31 de maio do ano seguinte.</li>
<li><strong>Relatório mensal de receitas:</strong> controle simples do que foi faturado, guardado com as notas fiscais de compras.</li>
<li><strong>Nota fiscal:</strong> obrigatória para vendas e serviços a empresas. Para serviços, o padrão nacional de NFS-e é emitido pelo portal ou aplicativo do Emissor Nacional.</li>
<li><strong>Funcionário:</strong> o MEI pode ter um empregado, que recebe o salário mínimo ou o piso da categoria.</li>
</ul>
<h2>O que o DAS garante</h2>
<p>Com o DAS em dia, o MEI tem direito a aposentadoria por idade, auxílio por incapacidade, salário-maternidade e, para a família, pensão por morte e auxílio-reclusão, todos no valor de um salário mínimo. A aposentadoria por tempo de contribuição e benefícios acima do mínimo exigem contribuição complementar (mais 15% do salário mínimo, pela guia própria).</p>
<h2>Exemplo</h2>
<p>Uma designer abriu o MEI em julho e faturou R$ 45.000 até dezembro. Como esteve ativa 6 meses, seu limite proporcional é de R$ 40.500. O excesso de R$ 4.500 é menor que 20% do limite (R$ 8.100), então ela paga DAS complementar sobre o excedente e passa a ser ME no ano seguinte.</p>`,
  faq: [...faqExtra('das-mei'),
    { q: 'Quanto é o DAS MEI em 2026?', a: '<p>R$ 82,05 para comércio e indústria, R$ 86,05 para serviços e R$ 87,05 para comércio e serviços. O caminhoneiro paga a partir de R$ 195,52.</p>' },
    { q: 'O DAS muda se eu faturar mais?', a: '<p>Não. O valor é fixo, independentemente do faturamento, enquanto você estiver dentro do limite. Ele só muda quando o salário mínimo é reajustado.</p>' },
    { q: 'Qual o limite de faturamento do MEI em 2026?', a: '<p>R$ 81.000 por ano, ou R$ 251.600 para o MEI caminhoneiro. Propostas para aumentar o limite tramitam no Congresso, mas não estavam em vigor na data de conferência desta página.</p>' },
    { q: 'O que acontece se eu não pagar o DAS?', a: '<p>A dívida gera multa e juros, o tempo deixa de contar para benefícios do INSS e, depois de um período, o débito pode ser inscrito em dívida ativa e o CNPJ, excluído do Simples Nacional.</p>' },
  ],
  fontes: [
    { nome: MEI.fonte, url: MEI.url },
    { nome: 'Portal do Empreendedor (gov.br)', url: 'https://www.gov.br/empresas-e-negocios/pt-br/empreendedor' },
    { nome: 'Lei Complementar nº 123/2006 — art. 18-A (MEI)', url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm' },
  ],
  relacionadas: ['inss', 'imposto-de-renda', 'custo-funcionario', 'markup', 'porcentagem', 'salario-liquido'],
  livros: ['planilhas', 'cobranca'],
};
