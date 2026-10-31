import { topo, faqExtra } from './_geo.mjs';
import { INSS, IRRF, FGTS } from '../js/tabelas.js';
export default {
  slug: 'rescisao', ordem: 2, categoria: 'Trabalho e salário',
  keyword: 'calculadora de rescisão',
  nomeCurto: 'Rescisão trabalhista', resumo: 'Verbas rescisórias, aviso prévio e multa do FGTS.',
  title: 'Calculadora de Rescisão 2026: Verbas, Aviso Prévio e FGTS',
  description: 'Simule sua rescisão trabalhista 2026: saldo de salário, aviso prévio proporcional, 13º, férias + 1/3 e multa de 40% do FGTS. Demissão, pedido de demissão e acordo.',
  h1: 'Calculadora de rescisão trabalhista',
  lead: 'Simule as verbas rescisórias de quem trabalha com carteira assinada: demissão sem justa causa, pedido de demissão, justa causa ou acordo entre as partes.',
  calc: 'rescisao',
  campos: [
    { n: 'salario', l: 'Último salário bruto', t: 'money', v: 4000 },
    { n: 'tipo', l: 'Motivo do desligamento', t: 'select', v: 'semJustaCausa', o: [['semJustaCausa', 'Demissão sem justa causa'], ['pedidoDemissao', 'Pedido de demissão'], ['acordo', 'Acordo (art. 484-A da CLT)'], ['justaCausa', 'Demissão por justa causa']] },
    { n: 'admissao', l: 'Data de admissão', t: 'date', v: '2023-02-01' },
    { n: 'desligamento', l: 'Data do desligamento (último dia)', t: 'date', v: '2026-09-15' },
    { n: 'dataPagamento', l: 'Data de pagamento das verbas', t: 'date', v: '', req: false, ajuda: 'O pagamento pode ocorrer até 10 dias após o término do contrato (CLT, art. 477, § 6º). Se não souber, deixe em branco: usamos a data do desligamento.' },
    { n: 'aviso', l: 'Aviso prévio', t: 'select', v: 'indenizado', o: [['indenizado', 'Indenizado (pago sem trabalhar)'], ['trabalhado', 'Trabalhado'], ['naoCumprido', 'Não cumprido pelo empregado (pedido de demissão)']], ajuda: 'No acordo, o aviso indenizado é pago pela metade; o trabalhado não gera aviso nem projeção.' },
    { n: 'feriasVencidas', l: 'Períodos de férias vencidas não tiradas', t: 'int', v: 0, max: 2, ajuda: 'Informe só os períodos que já estavam vencidos na data real do desligamento. O período completado durante a projeção do aviso entra no cálculo automaticamente.', avisoMax: 'A CLT não limita a 2 os períodos de férias vencidas, mas esta calculadora considera no máximo 2. Com mais de 2 períodos, faça o cálculo manualmente.' },
    { n: 'dobro1', l: '1º período vencido: prazo de concessão já venceu?', t: 'select', v: 'nao', o: [['nao', 'Não'], ['sim', 'Sim']], ajudaMaisRotulo: 'Quando marcar Sim?', ajudaMais: 'Marque Sim se a empresa não concedeu essas férias nos 12 meses seguintes ao fim do período aquisitivo. Nesse caso, elas são pagas em dobro, com o 1/3 também em dobro (art. 137 da CLT). Períodos muito antigos podem estar prescritos: o prazo de 5 anos conta do fim do prazo de concessão, limitado a 2 anos após o fim do contrato (art. 149 da CLT; CF, art. 7º, XXIX).' },
    { n: 'dobro2', l: '2º período vencido: prazo de concessão já venceu?', t: 'select', v: 'nao', o: [['nao', 'Não'], ['sim', 'Sim']] },
    { n: 'saldoFgts', l: 'Saldo do FGTS (para a multa)', t: 'money', v: 12000, ajuda: 'Consulte no app FGTS. Inclua os depósitos feitos durante o contrato; se o do mês anterior ainda não aparecer, some-o. Não inclua o depósito sobre as verbas da rescisão (saldo de salário, aviso indenizado e 13º): o app ainda não o mostra e a calculadora já o soma.' },
    { n: 'dependentes', l: 'Dependentes para IR', t: 'int', v: 0 },
  ],
  aviso: 'Cálculo estimativo. Não considera médias de horas extras e comissões, adicionais, convenção coletiva, estabilidades nem descontos de adiantamentos. Confira o termo de rescisão (TRCT) com o sindicato ou um advogado.',
  afiliado: 'Possível parceria: serviço de consulta/revisão trabalhista online.',
  artigo: topo('rescisao') + `
<h2>Quais verbas entram na rescisão</h2>
<p>O que você recebe depende do motivo do desligamento. A tabela resume as verbas mais comuns para quem tem carteira assinada:</p>
<table><thead><tr><th>Verba</th><th>Sem justa causa</th><th>Pedido de demissão</th><th>Acordo</th><th>Justa causa</th></tr></thead><tbody>
<tr><td>Saldo de salário</td><td>Sim</td><td>Sim</td><td>Sim</td><td>Sim</td></tr>
<tr><td>Aviso prévio indenizado</td><td>Sim</td><td>Não</td><td>Metade</td><td>Não</td></tr>
<tr><td>13º proporcional</td><td>Sim</td><td>Sim</td><td>Sim</td><td>Não</td></tr>
<tr><td>Férias vencidas + 1/3</td><td>Sim</td><td>Sim</td><td>Sim</td><td>Sim</td></tr>
<tr><td>Férias proporcionais + 1/3</td><td>Sim</td><td>Sim</td><td>Sim</td><td>Não</td></tr>
<tr><td>Multa do FGTS</td><td>40%</td><td>Não</td><td>20%</td><td>Não</td></tr>
<tr><td>Saque do FGTS</td><td>100%</td><td>Não</td><td>80%</td><td>Não</td></tr>
<tr><td>Seguro-desemprego</td><td>Sim, se cumprir carência</td><td>Não</td><td>Não</td><td>Não</td></tr>
</tbody></table>
<h2>Como cada parte é calculada</h2>
<h3>Saldo de salário</h3>
<p>São os dias trabalhados no mês da saída. A conta usa o mês comercial de 30 dias: salário ÷ 30 × dias trabalhados. Se a admissão foi no próprio mês, contam só os dias desde a admissão, também pelo mês de 30 dias: quem entra no dia 10 e sai no último dia do mês recebe 21 dias, em qualquer mês. Quem trabalha o mês inteiro recebe os 30 dias, inclusive em fevereiro; há empresas que pagam 28 ou 29 dias nesse caso, e a prática varia.</p>
<h3>Aviso prévio proporcional</h3>
<p>Pela Lei 12.506/2011, o aviso é de 30 dias mais 3 dias por ano completo de trabalho, até o máximo de 90 dias. Quando indenizado, esse período também conta como tempo de serviço (a chamada projeção do aviso) e pode acrescentar avos de 13º e de férias.</p>
<h3>13º e férias proporcionais</h3>
<p>Cada mês com 15 dias ou mais de trabalho vale 1/12. No 13º, contam os meses do ano da saída; nas férias, os meses desde o último aniversário de admissão. Sobre todas as férias (vencidas e proporcionais) incide o adicional de 1/3 previsto na Constituição.</p>
<h3>Férias vencidas e pagamento em dobro</h3>
<p>Cada período de férias vencidas não tiradas vale um salário, mais 1/3. Se o prazo de concessão já venceu, ou seja, a empresa não deu as férias nos 12 meses seguintes ao período aquisitivo, aquele período é pago em dobro, inclusive o 1/3 (art. 137 da CLT). Exemplo: com salário de R$ 4.000,00, um período vencido dentro do prazo dá R$ 4.000,00 + R$ 1.333,33; fora do prazo, R$ 8.000,00 + R$ 2.666,67. A calculadora considera até 2 períodos vencidos; a CLT não tem esse limite, e casos com mais de 2 períodos precisam de cálculo manual.</p>
<p>A dobra vale quando as férias não foram concedidas no prazo. O simples atraso no pagamento de férias gozadas no prazo não gera dobra, já que o STF derrubou essa regra (ADPF 501). Se só parte das férias foi gozada depois do prazo, só esses dias são pagos em dobro (Súmula 81 do TST).</p>
<h3>Multa do FGTS</h3>
<p>Na dispensa sem justa causa, a empresa deposita 40% sobre o total depositado durante o contrato (art. 18 da Lei 8.036/1990). No acordo, a multa é de 20% e o trabalhador saca até 80% do saldo. A multa vai para a conta do FGTS, não entra no valor pago no termo de rescisão.</p>
<h3>Descontos</h3>
<p>Saldo de salário e 13º sofrem INSS e IRRF, calculados separadamente. Aviso prévio indenizado e férias indenizadas não têm desconto de INSS nem de imposto de renda. Desde 2026, rendimentos de até R$ 5.000,00 ficam livres do IRRF graças à redução da Lei 15.270/2025.</p>
<h2>Exemplo completo</h2>
<p>Carla foi admitida em 01/02/2023, ganhava R$ 4.000,00 e foi dispensada sem justa causa em 15/09/2026, com aviso indenizado e R$ 12.000,00 de saldo no FGTS.</p>
<ul>
<li>Saldo de salário: 15 dias = R$ 2.000,00.</li>
<li>Aviso prévio: 3 anos completos → 39 dias = R$ 5.200,00. A projeção leva o contrato até 24/10/2026.</li>
<li>13º proporcional: 10/12 (outubro conta por ter 24 dias projetados) = R$ 3.333,33.</li>
<li>Férias proporcionais: 9/12 = R$ 3.000,00, mais 1/3 = R$ 1.000,00.</li>
<li>Descontos: INSS de R$ 155,69 sobre o saldo e R$ 288,60 sobre o 13º; IR zerado.</li>
</ul>
<p>Total líquido estimado no termo de rescisão: R$ 14.089,04. Além disso, a empresa deposita no FGTS R$ 842,67 (8% sobre saldo de salário, aviso e 13º) e a multa de R$ 5.137,07 (40% sobre R$ 12.842,67), e ela pode sacar todo o saldo.</p>
<h2>Prazos e cuidados</h2>
<p>A empresa tem até 10 dias corridos após o fim do contrato para pagar as verbas e entregar os documentos (art. 477 da CLT). O atraso gera multa de um salário a favor do trabalhador. Guarde o termo de rescisão, as guias do FGTS e os holerites para conferir os valores.</p>`,
  faq: [...faqExtra('rescisao'),
    { q: 'Quanto tempo a empresa tem para pagar a rescisão?', a: '<p>Até 10 dias corridos contados do término do contrato, independentemente de o aviso ser trabalhado ou indenizado (art. 477, § 6º, da CLT).</p>' },
    { q: 'Quem pede demissão recebe férias e 13º?', a: '<p>Sim. Recebe saldo de salário, 13º proporcional e férias vencidas e proporcionais com 1/3. Não recebe multa do FGTS, não saca o fundo e não tem direito a seguro-desemprego.</p>' },
    { q: 'Se eu pedir demissão e não cumprir o aviso, o que acontece?', a: '<p>A empresa pode descontar o equivalente a 30 dias de salário das verbas rescisórias. Ela também pode dispensar o cumprimento sem desconto, o que deve constar por escrito.</p>' },
    { q: 'Como funciona o acordo de demissão?', a: '<p>Previsto no art. 484-A da CLT, o acordo paga metade do aviso prévio indenizado e multa de 20% do FGTS, permite sacar 80% do saldo e não dá direito ao seguro-desemprego. As demais verbas são pagas integralmente.</p>' },
    { q: 'A rescisão tem desconto de imposto de renda?', a: '<p>Só sobre saldo de salário e 13º, e apenas se esses valores superarem os limites de isenção. Aviso indenizado, férias indenizadas com 1/3 e multa do FGTS são isentos.</p>' },
  ],
  fontes: [
    { nome: 'CLT — Decreto-Lei nº 5.452/1943 (arts. 477, 484-A e 487)', url: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm' },
    { nome: 'Lei nº 12.506/2011 — aviso prévio proporcional', url: 'https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12506.htm' },
    { nome: FGTS.fonte, url: FGTS.url },
    { nome: INSS.fonte, url: INSS.url },
    { nome: IRRF.fonte, url: IRRF.url },
  ],
  relacionadas: ['fgts', 'aviso-previo', 'seguro-desemprego', 'ferias', 'decimo-terceiro', 'salario-liquido'],
};
