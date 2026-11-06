// Páginas de cauda longa (tabelas oficiais). O carregador de calculadoras ignora
// arquivos que começam com "_". O render, o sitemap e o link na home entram pelo
// patch de scripts/build.mjs (não editar scripts/ direto).
// Todos os valores saem de src/js/tabelas.js e das funções de src/js/calc.js.
import * as C from '../js/calc.js';
import { INSS, IRRF, MEI, SEGURO_DESEMPREGO, SALARIO_MINIMO } from '../js/tabelas.js';

const R = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\u00a0/g, ' ');
const pctAliq = (x) => {
  const n = Math.round(x * 1000) / 10;
  const d = Number.isInteger(n) ? 0 : 1;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: 1 }) + '%';
};
const pctEfetiva = (x) => (x * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
const cent = (v) => (Math.round(v * 100) + 1) / 100;

function rotuloFaixa(de, ate) {
  if (!Number.isFinite(ate)) return `Acima de ${R(de)}`;
  if (de <= 0) return `Até ${R(ate)}`;
  return `De ${R(cent(de))} a ${R(ate)}`;
}

const sm = SALARIO_MINIMO.valor;
const aliqMei = INSS.individual.baixaRendaMei;
const aliqCaminhoneiro = 0.12; // comentário em tabelas.js: inssCaminhoneiro é 12% do mínimo
if (C.r2(sm * aliqMei) !== MEI.inss) throw new Error('INSS do MEI não coincide com a alíquota de baixa renda sobre o salário mínimo');
if (C.r2(sm * aliqCaminhoneiro) !== MEI.inssCaminhoneiro) throw new Error('INSS do MEI caminhoneiro não coincide com 12% do salário mínimo');
if (INSS.faixas[0].ate !== sm) throw new Error('A primeira faixa do INSS não termina no salário mínimo');
if (SEGURO_DESEMPREGO.piso !== sm) throw new Error('O piso do seguro-desemprego não é o salário mínimo');

const tetoInss = C.inssEmpregado(INSS.teto);
const ex5000 = C.inssEmpregado(5000);
const ex2500 = C.inssEmpregado(2500);
const exMin = C.inssEmpregado(sm);
const liqMin = C.salarioLiquido({ bruto: sm });
const indMin = C.inssIndividual(sm, 'normal');
const indTeto = C.inssIndividual(INSS.teto, 'normal');
const ind11 = C.inssIndividual(sm, 'simplificado');
const ind5 = C.inssIndividual(sm, 'baixaRendaMei');
const hora220 = C.r2(sm / 220);
const dia30 = C.r2(sm / 30);
const doisMin = C.r2(sm * 2);

const red = IRRF.reducao;
const salariosIr = [sm, 3000, 5000, 6000, red.faixaAte, 8000];
function linhaIr(bruto) {
  const { inss } = C.inssEmpregado(bruto);
  const ir = C.irrfMensal({ rendimentos: bruto, inss });
  return { bruto, inss, ir };
}
const linhasIr = salariosIr.map(linhaIr);
const ir5000 = linhasIr.find((l) => l.bruto === 5000);
const ir6000 = linhasIr.find((l) => l.bruto === 6000);
const irTetoRed = linhasIr.find((l) => l.bruto === red.faixaAte);
const ir8000 = linhasIr.find((l) => l.bruto === 8000);

const T = SEGURO_DESEMPREGO;
const sd1800 = C.seguroDesemprego({ salarios: [1800, 1800, 1800], solicitacao: 1, mesesTrabalhados: 24 });
const sd3000 = C.seguroDesemprego({ salarios: [3000, 3000, 3000], solicitacao: 1, mesesTrabalhados: 18 });
const sd5000 = C.seguroDesemprego({ salarios: [5000, 5000, 5000], solicitacao: 1, mesesTrabalhados: 24 });
const bruta1800 = C.r2(1800 * 0.8);

function parcelas(meses, solicitacao) {
  return C.seguroDesemprego({ salarios: [3000], solicitacao, mesesTrabalhados: meses }).parcelas;
}

const dasLinhas = [
  ['comercio', 'Comércio e indústria'],
  ['servicos', 'Serviços'],
  ['ambos', 'Comércio e serviços'],
].map(([atividade, nome]) => ({ nome, ...C.dasMei({ atividade }) }));
const dasCaminhao = C.dasMei({ atividade: 'comercio', caminhoneiro: true });

function tabelaInss() {
  const body = tetoInss.faixas.map((f) => `<tr><td>${rotuloFaixa(f.de, f.ate)}</td><td>${pctAliq(f.aliquota)}</td><td>${R(f.valor)}</td></tr>`).join('');
  return `<table><thead><tr><th>Salário de contribuição</th><th>Alíquota</th><th>Contribuição da faixa cheia</th></tr></thead><tbody>${body}</tbody></table>`;
}

function tabelaIrProgressiva() {
  let anterior = 0;
  const body = IRRF.faixas.map((f) => {
    const de = anterior;
    anterior = Number.isFinite(f.ate) ? f.ate : anterior;
    const aliq = f.aliquota === 0 ? 'Isento' : pctAliq(f.aliquota);
    const ded = f.deducao === 0 ? '—' : R(f.deducao);
    return `<tr><td>${rotuloFaixa(de, f.ate)}</td><td>${aliq}</td><td>${ded}</td></tr>`;
  }).join('');
  return `<table><thead><tr><th>Base de cálculo mensal</th><th>Alíquota</th><th>Parcela a deduzir</th></tr></thead><tbody>${body}</tbody></table>`;
}

function tabelaIrPratica() {
  const body = linhasIr.map((l) => `<tr><td>${R(l.bruto)}</td><td>${R(l.inss)}</td><td>${R(l.ir.base)}</td><td>${l.ir.usaSimplificado ? 'Simplificado' : 'Deduções legais'}</td><td>${R(l.ir.impostoTabela)}</td><td>${R(l.ir.reducao)}</td><td>${R(l.ir.irrf)}</td></tr>`).join('');
  return `<table><thead><tr><th>Rendimento bruto</th><th>INSS</th><th>Base do IR</th><th>Dedução usada</th><th>Imposto da tabela</th><th>Redução</th><th>IRRF</th></tr></thead><tbody>${body}</tbody></table>`;
}

function tabelaSeguro() {
  return `<table><thead><tr><th>Média dos salários</th><th>Parcela</th></tr></thead><tbody>
<tr><td>Até ${R(T.faixa1Ate)}</td><td>80% da média, com piso de ${R(T.piso)}</td></tr>
<tr><td>${rotuloFaixa(T.faixa1Ate, T.faixa2Ate)}</td><td>${R(T.fixoFaixa2)} mais 50% do que passar de ${R(T.faixa1Ate)}</td></tr>
<tr><td>Acima de ${R(T.faixa2Ate)}</td><td>${R(T.teto)} (teto)</td></tr>
</tbody></table>`;
}

function tabelaParcelas() {
  const amostras = [8, 11, 18, 24];
  const body = amostras.map((m) => `<tr><td>${m}</td><td>${parcelas(m, 1) || '—'}</td><td>${parcelas(m, 2) || '—'}</td><td>${parcelas(m, 3) || '—'}</td></tr>`).join('');
  return `<table><thead><tr><th>Meses trabalhados (exemplo)</th><th>1ª solicitação</th><th>2ª solicitação</th><th>3ª ou posterior</th></tr></thead><tbody>${body}</tbody></table>`;
}

const guiaInss = {
  slug: 'tabela-inss-2026',
  keyword: 'tabela INSS 2026',
  nomeCurto: 'Tabela INSS 2026',
  resumo: 'Faixas de 7,5% a 14%, teto e planos de autônomo.',
  title: 'Tabela INSS 2026: Faixas, Alíquotas e Teto',
  description: 'Tabela do INSS 2026 para empregado: faixas de 7,5% a 14%, teto, contribuição máxima e planos de autônomo de 20%, 11% e 5%. Fonte oficial.',
  h1: 'Tabela do INSS 2026',
  lead: 'Alíquotas progressivas do empregado, contribuição de cada faixa, teto e os planos de contribuinte individual, facultativo e MEI, com os valores oficiais de 2026.',
  apareceEm: ['inss'],
  calculadora: 'inss',
  fontes: [
    { nome: INSS.fonte, url: INSS.url },
    { nome: SALARIO_MINIMO.fonte, url: SALARIO_MINIMO.url },
  ],
  relacionadas: ['inss', 'salario-liquido', 'tabela-ir-2026', 'salario-minimo-2026', 'das-mei'],
  resposta: `<p><strong>Em 2026, o INSS do empregado é progressivo: ${pctAliq(INSS.faixas[0].aliquota)} até ${R(INSS.faixas[0].ate)}, ${pctAliq(INSS.faixas[1].aliquota)} até ${R(INSS.faixas[1].ate)}, ${pctAliq(INSS.faixas[2].aliquota)} até ${R(INSS.faixas[2].ate)} e ${pctAliq(INSS.faixas[3].aliquota)} até o teto de ${R(INSS.teto)}.</strong> Cada alíquota incide só sobre o pedaço do salário que cai naquela faixa. A contribuição máxima, no teto, é ${R(tetoInss.inss)}.</p>
<p>A vigência desta tabela é ${INSS.vigencia}, conforme a ${INSS.fonte}.</p>`,
  artigo: `<h2>Tabela do INSS 2026 para empregado, doméstico e avulso</h2>
<p>A contribuição previdenciária de quem trabalha com carteira não usa uma alíquota única sobre o salário inteiro. O desconto sobe em degraus. A tabela abaixo é a soma de cada degrau completo, montada a partir das faixas oficiais vigentes.</p>
${tabelaInss()}
<p>Quem ganha acima de ${R(INSS.teto)} continua pagando ${R(tetoInss.inss)}: o salário de contribuição não passa do teto. A soma das faixas arredondadas uma a uma pode diferir em um centavo do total, que é arredondado uma única vez no fim.</p>
<h2>Como ler a alíquota progressiva</h2>
<p>A alíquota da última faixa atingida não é o percentual que sai do salário. A alíquota efetiva é a contribuição dividida pelo salário, e ela é sempre menor.</p>
<h3>Exemplo: salário de ${R(5000)}</h3>
<ul>${ex5000.faixas.map((f) => `<li>${pctAliq(f.aliquota)} sobre ${R(f.base)} = ${R(f.valor)}</li>`).join('')}</ul>
<p>Total: <strong>${R(ex5000.inss)}</strong>, alíquota efetiva de ${pctEfetiva(ex5000.aliquotaEfetiva)}.</p>
<h3>Exemplo: salário de ${R(2500)}</h3>
<ul>${ex2500.faixas.map((f) => `<li>${pctAliq(f.aliquota)} sobre ${R(f.base)} = ${R(f.valor)}</li>`).join('')}</ul>
<p>Total: <strong>${R(ex2500.inss)}</strong>, alíquota efetiva de ${pctEfetiva(ex2500.aliquotaEfetiva)}.</p>
<p>No salário mínimo de ${R(sm)}, só a primeira faixa entra: ${R(exMin.inss)} (${pctAliq(INSS.faixas[0].aliquota)}).</p>
<h2>Contribuinte individual, facultativo e MEI</h2>
<p>Quem não é empregado recolhe por um destes planos, sobre o salário de contribuição escolhido entre o mínimo e o teto no plano normal:</p>
<table><thead><tr><th>Plano</th><th>Alíquota</th><th>Valor em 2026</th></tr></thead><tbody>
<tr><td>Normal (contribuinte individual ou facultativo)</td><td>${pctAliq(INSS.individual.normal)} entre o mínimo e o teto</td><td>${R(indMin.inss)} a ${R(indTeto.inss)}</td></tr>
<tr><td>Simplificado</td><td>${pctAliq(INSS.individual.simplificado)} do salário mínimo</td><td>${R(ind11.inss)}</td></tr>
<tr><td>Facultativo de baixa renda e MEI</td><td>${pctAliq(aliqMei)} do salário mínimo</td><td>${R(ind5.inss)}</td></tr>
</tbody></table>
<p>O INSS do MEI em 2026 está cadastrado como ${R(MEI.inss)}, o mesmo que ${pctAliq(aliqMei)} de ${R(sm)}. O detalhe dos benefícios de cada plano está na <a href="/inss/">calculadora de INSS</a>. Para o boleto do microempreendedor, use a <a href="/das-mei/">calculadora do DAS MEI 2026</a>.</p>
<h2>O que esta tabela não faz</h2>
<p>Ela não calcula o INSS de férias nem do 13º, que usam a mesma progressão em competências separadas, nem o desconto de quem tem dois empregos (a soma dos salários de contribuição também respeita o teto). Esses casos ficam na calculadora, junto com o salário líquido.</p>
<p>Para aplicar a tabela a um valor seu, abra a <a href="/inss/">calculadora de INSS 2026</a>. O efeito no contracheque, já com o imposto de renda, está na <a href="/salario-liquido/">calculadora de salário líquido</a> e na <a href="/tabela-ir-2026/">tabela do IR 2026</a>.</p>`,
  faq: [
    { q: 'Qual é a tabela do INSS 2026 para empregado?', a: `<p>Quatro faixas progressivas, ${INSS.vigencia}: ${pctAliq(INSS.faixas[0].aliquota)} até ${R(INSS.faixas[0].ate)}, ${pctAliq(INSS.faixas[1].aliquota)} até ${R(INSS.faixas[1].ate)}, ${pctAliq(INSS.faixas[2].aliquota)} até ${R(INSS.faixas[2].ate)} e ${pctAliq(INSS.faixas[3].aliquota)} até ${R(INSS.teto)}. A contribuição máxima é ${R(tetoInss.inss)}.</p>` },
    { q: 'Qual o teto do INSS em 2026?', a: `<p>O teto do salário de contribuição é ${R(INSS.teto)}. Acima disso o desconto do empregado não aumenta e fica em ${R(tetoInss.inss)} por competência.</p>` },
    { q: 'Qual o desconto de INSS de quem ganha salário mínimo?', a: `<p>Sobre ${R(sm)}, a alíquota é ${pctAliq(INSS.faixas[0].aliquota)} e o desconto é ${R(exMin.inss)}. Não há faixa seguinte.</p>` },
    { q: 'Quanto o autônomo paga de INSS em 2026?', a: `<p>No plano de ${pctAliq(INSS.individual.normal)}, entre ${R(indMin.inss)} (sobre o mínimo) e ${R(indTeto.inss)} (sobre o teto). O plano simplificado é ${R(ind11.inss)} e o de baixa renda é ${R(ind5.inss)}, ambos sobre o salário mínimo.</p>` },
    { q: 'A alíquota da faixa incide sobre o salário inteiro?', a: `<p>Não. Desde a progressividade, cada alíquota vale apenas para a parcela do salário dentro da faixa. Por isso um salário de ${R(5000)} paga ${R(ex5000.inss)}, e não ${pctAliq(INSS.faixas[3].aliquota)} sobre os ${R(5000)}.</p>` },
  ],
};

const guiaIr = {
  slug: 'tabela-ir-2026',
  keyword: 'tabela IR 2026',
  nomeCurto: 'Tabela IR 2026',
  resumo: `Isenção efetiva até ${R(red.isencaoAte)} e faixas do IRRF.`,
  title: `Tabela IR 2026: Isenção até ${R(red.isencaoAte)}`,
  description: `Tabela do imposto de renda 2026: faixas do IRRF, dedução por dependente, desconto simplificado e isenção efetiva até ${R(red.isencaoAte)} pela Lei 15.270/2025.`,
  h1: 'Tabela do imposto de renda 2026',
  lead: `Faixas mensais do IRRF, deduções e a redução da Lei 15.270/2025, que zera o imposto retido na fonte até ${R(red.isencaoAte)} de rendimento e diminui o imposto até ${R(red.faixaAte)}.`,
  apareceEm: ['imposto-de-renda'],
  calculadora: 'imposto-de-renda',
  fontes: [
    { nome: IRRF.fonte, url: IRRF.url },
    { nome: 'Receita Federal — exemplos de aplicação da Lei 15.270/2025', url: 'https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/exemplos-de-aplicacao-da-lei-15-270-2025' },
    { nome: 'Lei nº 15.270, de 26/11/2025', url: 'https://in.gov.br/web/dou/-/lei-n-15.270-de-26-de-novembro-de-2025-671614220' },
  ],
  relacionadas: ['imposto-de-renda', 'irpf', 'salario-liquido', 'tabela-inss-2026', 'inss', 'decimo-terceiro'],
  resposta: `<p><strong>Em 2026, rendimentos tributáveis mensais de até ${R(red.isencaoAte)} ficam sem IRRF.</strong> A tabela progressiva em si continua isentando só a base até ${R(IRRF.faixas[0].ate)}. A isenção até ${R(red.isencaoAte)} é a redução da Lei 15.270/2025, aplicada depois da tabela: até ${R(red.limiteIsencao)} de imposto, o bastante para zerar a retenção nesse patamar.</p>
<p>De ${R(cent(red.isencaoAte))} a ${R(red.faixaAte)}, a redução é ${R(red.a)} − ${String(red.b).replace('.', ',')} × rendimento. Acima de ${R(red.faixaAte)}, não há redução. A vigência é ${IRRF.vigencia}.</p>`,
  artigo: `<h2>Tabela progressiva do IRRF em 2026</h2>
<p>O imposto de renda retido na fonte do salário, das férias e do 13º usa a tabela mensal abaixo. A base é o rendimento menos as deduções, não o bruto.</p>
${tabelaIrProgressiva()}
<p>Dedução por dependente: <strong>${R(IRRF.deducaoDependente)}</strong>. Desconto simplificado mensal: <strong>${R(IRRF.descontoSimplificado)}</strong>, que substitui INSS, dependentes, pensão e outras deduções quando essa opção gera menos imposto. A fonte pagadora fica com a alternativa menor. A alíquota máxima da tabela continua ${pctAliq(IRRF.faixas[IRRF.faixas.length - 1].aliquota)}.</p>
<h2>Isenção até ${R(red.isencaoAte)} e redução até ${R(red.faixaAte)}</h2>
<p>A Lei 15.270/2025 não substituiu as faixas. Ela cria uma redução calculada sobre o rendimento tributável bruto do mês, depois de a tabela ter sido aplicada:</p>
<ul>
<li>Até ${R(red.isencaoAte)}: redução limitada a ${R(red.limiteIsencao)}, o que zera o IRRF de quem está nesse limite com as deduções usuais.</li>
<li>De ${R(cent(red.isencaoAte))} a ${R(red.faixaAte)}: redução = ${R(red.a)} − ${String(red.b).replace('.', ',')} × rendimento, sem passar do imposto da tabela.</li>
<li>Acima de ${R(red.faixaAte)}: redução zero.</li>
</ul>
<p>Um rendimento de ${R(5000)}, sem dependentes, tem INSS de ${R(ir5000.inss)}, imposto de tabela de ${R(ir5000.ir.impostoTabela)}, redução de ${R(ir5000.ir.reducao)} e <strong>IRRF de ${R(ir5000.ir.irrf)}</strong>. Em ${R(6000)}, o IRRF fica em ${R(ir6000.ir.irrf)} (imposto de tabela ${R(ir6000.ir.impostoTabela)} menos redução de ${R(ir6000.ir.reducao)}). Em ${R(red.faixaAte)}, a redução é ${R(irTetoRed.ir.reducao)} e o IRRF é ${R(irTetoRed.ir.irrf)}. Em ${R(8000)}, já sem redução, o IRRF é ${R(ir8000.ir.irrf)}.</p>
<h2>Quanto fica o IR em salários comuns</h2>
<p>A tabela a seguir usa o INSS progressivo de 2026 e a comparação entre deduções legais e desconto simplificado, sem dependentes, pensão ou outros descontos. É estimativa da mesma fórmula da calculadora, não um holerite oficial.</p>
${tabelaIrPratica()}
<h2>Como a base é escolhida</h2>
<ol class="passos">
<li>Some o rendimento tributável do mês.</li>
<li>Some as deduções legais: INSS + ${R(IRRF.deducaoDependente)} por dependente + pensão alimentícia judicial + outras deduções admitidas.</li>
<li>Compare com o desconto simplificado de ${R(IRRF.descontoSimplificado)} e use o que gerar menos imposto.</li>
<li>Aplique a alíquota e a parcela a deduzir da faixa.</li>
<li>Subtraia a redução da Lei 15.270/2025, limitada ao imposto.</li>
</ol>
<p>Férias e 13º têm IR calculado à parte, com a mesma tabela. Quem tem duas fontes de renda pode não sofrer retenção em nenhuma delas e ainda ter imposto no ajuste anual, porque cada fonte olha só o que ela paga. A declaração anual e os exemplos publicados pela Receita estão explicados na <a href="/imposto-de-renda/">calculadora de imposto de renda 2026</a>.</p>
<p>O INSS que entra na dedução legal está na <a href="/tabela-inss-2026/">tabela do INSS 2026</a>. Para ver o líquido do mês, use a <a href="/salario-liquido/">calculadora de salário líquido</a>.</p>`,
  faq: [
    { q: `Quem ganha até ${R(red.isencaoAte)} paga imposto de renda em 2026?`, a: `<p>Não há IRRF sobre rendimento tributável mensal de até ${R(red.isencaoAte)}. No cálculo deste site, ${R(5000)} sem dependentes resulta em ${R(ir5000.ir.irrf)} de imposto retido. O INSS continua sendo descontado.</p>` },
    { q: `A isenção até ${R(red.isencaoAte)} acabou com a tabela progressiva?`, a: `<p>Não. A tabela progressiva segue valendo, com isenção de base só até ${R(IRRF.faixas[0].ate)}. A faixa até ${R(red.isencaoAte)} fica sem imposto por causa da redução posterior, de no máximo ${R(red.limiteIsencao)}.</p>` },
    { q: 'Qual a dedução por dependente no IR 2026?', a: `<p>${R(IRRF.deducaoDependente)} por dependente na base mensal. A diferença só reduz imposto de quem ainda tem IRRF a pagar, isto é, acima da faixa de isenção efetiva.</p>` },
    { q: 'Qual o valor do desconto simplificado mensal?', a: `<p>${R(IRRF.descontoSimplificado)}. Ele substitui todas as deduções legais quando produz um imposto menor. A calculadora mostra qual opção foi usada.</p>` },
    { q: `Quem ganha acima de ${R(red.faixaAte)} tem redução de IR?`, a: `<p>Não. Acima de ${R(red.faixaAte)} de rendimento tributável mensal, o IRRF é só o da tabela progressiva. Em ${R(8000)} sem dependentes, o resultado deste site é ${R(ir8000.ir.irrf)}.</p>` },
  ],
};

const guiaSm = {
  slug: 'salario-minimo-2026',
  keyword: 'salário mínimo 2026',
  nomeCurto: 'Salário mínimo 2026',
  resumo: `${R(sm)} a partir de ${SALARIO_MINIMO.vigencia}, e o que esse piso altera.`,
  title: `Salário Mínimo 2026: Valor Oficial de ${R(sm)}`,
  description: `O salário mínimo de 2026 é ${R(sm)}, vigente desde ${SALARIO_MINIMO.vigencia} (${SALARIO_MINIMO.fonte}). Veja o efeito no INSS, no seguro-desemprego e no DAS do MEI.`,
  h1: 'Salário mínimo 2026',
  lead: `Valor mensal oficial, a norma que o fixou e onde esse número entra nas outras tabelas do site: INSS, seguro-desemprego, DAS do MEI e salário líquido.`,
  apareceEm: ['salario-liquido', 'das-mei'],
  calculadora: 'salario-liquido',
  fontes: [
    { nome: SALARIO_MINIMO.fonte, url: SALARIO_MINIMO.url },
    { nome: INSS.fonte, url: INSS.url },
    { nome: MEI.fonte, url: MEI.url },
    { nome: SEGURO_DESEMPREGO.fonte, url: SEGURO_DESEMPREGO.url },
  ],
  relacionadas: ['salario-liquido', 'inss', 'das-mei', 'seguro-desemprego', 'tabela-inss-2026'],
  resposta: `<p><strong>O salário mínimo de 2026 é ${R(sm)} por mês, vigente desde ${SALARIO_MINIMO.vigencia}.</strong> A fonte usada por este site é o ${SALARIO_MINIMO.fonte}.</p>
<p>Esse valor é também o fim da primeira faixa do INSS, o piso da parcela do seguro-desemprego e a base do INSS do MEI (${pctAliq(aliqMei)}, ou ${R(MEI.inss)}).</p>`,
  artigo: `<h2>Valor oficial do salário mínimo em 2026</h2>
<p>O piso nacional mensal cadastrado nas tabelas do site é <strong>${R(sm)}</strong>, com vigência em ${SALARIO_MINIMO.vigencia}. Não há, nesta base, um salário mínimo diário ou por hora separado. O decreto citado fixa o valor mensal; hora e dia abaixo são só referências de cálculo do próprio site, não valores oficiais publicados à parte.</p>
<ul>
<li>Hora de referência na jornada de 220 horas mensais (padrão da <a href="/horas-extras/">calculadora de horas extras</a>, usada para contratos de 44 horas semanais): ${R(hora220)}.</li>
<li>Diária de referência pela divisão por 30 (a mesma conta da <a href="/ferias/">calculadora de férias</a>, remuneração ÷ 30): ${R(dia30)}.</li>
</ul>
<p>Pisos estaduais, convenções coletivas e salário-família não estão nesta base. Quando a categoria garante um piso maior, o mínimo nacional não o reduz.</p>
<h2>O que o mínimo muda nas outras tabelas</h2>
<table><thead><tr><th>Tabela</th><th>Como o mínimo entra</th><th>Valor resultante</th></tr></thead><tbody>
<tr><td>INSS do empregado</td><td>A primeira faixa vai até o mínimo, a ${pctAliq(INSS.faixas[0].aliquota)}</td><td>Desconto de ${R(exMin.inss)}</td></tr>
<tr><td>Salário líquido no mínimo</td><td>Bruto menos esse INSS, sem IR</td><td>${R(liqMin.liquido)}</td></tr>
<tr><td>Seguro-desemprego</td><td>Nenhuma parcela pode ser menor que o mínimo</td><td>Piso de ${R(T.piso)}</td></tr>
<tr><td>MEI</td><td>INSS de ${pctAliq(aliqMei)} do mínimo</td><td>${R(MEI.inss)}</td></tr>
<tr><td>MEI caminhoneiro</td><td>INSS de ${pctAliq(aliqCaminhoneiro)} do mínimo</td><td>${R(MEI.inssCaminhoneiro)}</td></tr>
</tbody></table>
<p>O líquido de ${R(liqMin.liquido)} considera só o INSS de empregado, sem vale-transporte, pensão ou outros descontos. O IRRF desse bruto é ${R(liqMin.irrf)}, porque o rendimento está abaixo de ${R(red.isencaoAte)}.</p>
<h2>DAS do MEI em cima do mínimo</h2>
<p>O boleto mensal soma o INSS de ${R(MEI.inss)} ao ICMS de ${R(MEI.icms)} e/ou ao ISS de ${R(MEI.iss)}, conforme a atividade:</p>
<table><thead><tr><th>Atividade</th><th>INSS</th><th>ICMS</th><th>ISS</th><th>DAS mensal</th></tr></thead><tbody>
${dasLinhas.map((d) => `<tr><td>${d.nome}</td><td>${R(d.inss)}</td><td>${R(d.icms)}</td><td>${R(d.iss)}</td><td>${R(d.mensal)}</td></tr>`).join('')}
</tbody></table>
<p>No MEI transportador autônomo de cargas, o INSS da tabela é ${R(MEI.inssCaminhoneiro)}. No comércio, o DAS mensal fica em ${R(dasCaminhao.mensal)}. O limite anual de faturamento do MEI comum é ${R(MEI.limiteAnual)}; o do caminhoneiro é ${R(MEI.limiteAnualCaminhoneiro)}. O detalhe do boleto está na <a href="/das-mei/">calculadora do DAS MEI</a>.</p>
<h2>INSS de autônomo sobre o mínimo</h2>
<p>O plano normal, a ${pctAliq(INSS.individual.normal)}, custa ${R(indMin.inss)} quando a contribuição é feita sobre o mínimo. O simplificado, a ${pctAliq(INSS.individual.simplificado)}, custa ${R(ind11.inss)}. O facultativo de baixa renda, a ${pctAliq(aliqMei)}, custa ${R(ind5.inss)}. A calculadora de INSS registra que esse último plano exige família no CadÚnico com renda de até 2 salários mínimos, ou seja, ${R(doisMin)} em 2026.</p>
<p>Para transformar o mínimo no valor que cai na conta, use a <a href="/salario-liquido/">calculadora de salário líquido</a>. As faixas completas estão na <a href="/tabela-inss-2026/">tabela do INSS 2026</a> e o piso do benefício, na <a href="/tabela-seguro-desemprego-2026/">tabela do seguro-desemprego 2026</a>.</p>`,
  faq: [
    { q: 'Qual o valor do salário mínimo em 2026?', a: `<p>${R(sm)} por mês, vigente desde ${SALARIO_MINIMO.vigencia}, conforme o ${SALARIO_MINIMO.fonte}.</p>` },
    { q: 'Desde quando vale o salário mínimo de 2026?', a: `<p>Desde ${SALARIO_MINIMO.vigencia}. As tabelas de INSS, MEI e seguro-desemprego deste site já usam esse piso.</p>` },
    { q: 'Existe salário mínimo por hora nesta tabela?', a: `<p>Não como valor oficial separado. O que está na base é o mensal de ${R(sm)}. Dividido por 220 horas, a referência interna do site fica em ${R(hora220)}; dividido por 30, em ${R(dia30)}. Nenhum dos dois substitui o piso da categoria.</p>` },
    { q: 'Quanto é o INSS de quem recebe o mínimo?', a: `<p>${R(exMin.inss)}, que é ${pctAliq(INSS.faixas[0].aliquota)} de ${R(sm)}. O líquido estimado, sem outros descontos, é ${R(liqMin.liquido)}.</p>` },
    { q: 'O MEI paga INSS sobre o salário mínimo?', a: `<p>Sim. O INSS do MEI é ${pctAliq(aliqMei)} do mínimo, ${R(MEI.inss)} em 2026. O do MEI caminhoneiro é ${R(MEI.inssCaminhoneiro)}. ICMS e ISS entram por cima, no DAS.</p>` },
  ],
};

const guiaSd = {
  slug: 'tabela-seguro-desemprego-2026',
  keyword: 'tabela seguro-desemprego 2026',
  nomeCurto: 'Tabela seguro-desemprego 2026',
  resumo: `Parcela entre ${R(T.piso)} e ${R(T.teto)}, vigente desde ${T.vigencia}.`,
  title: 'Tabela do Seguro-Desemprego 2026: Faixas e Teto',
  description: `Tabela do seguro-desemprego 2026, vigente desde ${T.vigencia}: 80% da média até ${R(T.faixa1Ate)}, faixa intermediária e teto de ${R(T.teto)}.`,
  h1: 'Tabela do seguro-desemprego 2026',
  lead: `Faixas da média salarial, piso, teto e o número de parcelas da regra usada pela calculadora, com a tabela do Ministério do Trabalho vigente desde ${T.vigencia}.`,
  apareceEm: ['seguro-desemprego'],
  calculadora: 'seguro-desemprego',
  fontes: [
    { nome: T.fonte, url: T.url },
    { nome: 'Lei nº 7.998/1990 — Programa do Seguro-Desemprego', url: 'https://www.planalto.gov.br/ccivil_03/leis/l7998.htm' },
    { nome: SALARIO_MINIMO.fonte, url: SALARIO_MINIMO.url },
  ],
  relacionadas: ['seguro-desemprego', 'rescisao', 'fgts', 'salario-minimo-2026', 'salario-liquido'],
  resposta: `<p><strong>Desde ${T.vigencia}, a parcela do seguro-desemprego vai de ${R(T.piso)} a ${R(T.teto)}.</strong> Até ${R(T.faixa1Ate)} de média, a parcela é 80% da média, respeitado o piso. Até ${R(T.faixa2Ate)}, soma-se ${R(T.fixoFaixa2)} a 50% do que passar de ${R(T.faixa1Ate)}. Acima disso, vale o teto de ${R(T.teto)}.</p>
<p>A fonte desta tabela é: ${T.fonte}.</p>`,
  artigo: `<h2>Tabela do seguro-desemprego vigente em 2026</h2>
<p>O valor de cada parcela depende da média dos salários anteriores à dispensa, não do último salário sozinho. Os cortes de faixa abaixo são os cadastrados na tabela oficial usada pelo site.</p>
${tabelaSeguro()}
<p>O piso de ${R(T.piso)} é o salário mínimo de 2026. Se 80% da média ficarem abaixo disso, a parcela sobe para o mínimo. Nada passa de ${R(T.teto)}.</p>
<h2>Exemplos calculados com a mesma fórmula da calculadora</h2>
<ul>
<li>Média de ${R(1800)}: 80% dariam ${R(bruta1800)}, abaixo do piso, então a parcela fica em <strong>${R(sd1800.parcela)}</strong>. Com 24 meses na primeira solicitação, são ${sd1800.parcelas} parcelas, total de ${R(sd1800.total)}.</li>
<li>Média de ${R(3000)}: a segunda faixa produz <strong>${R(sd3000.parcela)}</strong>. Com 18 meses na primeira solicitação, são ${sd3000.parcelas} parcelas, total de ${R(sd3000.total)}.</li>
<li>Média de ${R(5000)}: acima de ${R(T.faixa2Ate)}, a parcela é o teto de <strong>${R(sd5000.parcela)}</strong>.</li>
</ul>
<p>Os três últimos salários é que formam a média na calculadora. Se você informar menos de três, ela usa os que foram preenchidos.</p>
<h2>Quantas parcelas</h2>
<p>A quantidade não depende do valor da média. Depende de quantos meses foram trabalhados e de qual solicitação é esta. A regra no código da calculadora é: 5 parcelas com 24 meses ou mais, 4 com 12 a 23 meses e 3 quando se atinge a carência mínima sem chegar a 12. Na primeira solicitação, menos de 12 meses não gera parcela. A carência mínima é de 12 meses na primeira, 9 na segunda e 6 a partir da terceira.</p>
${tabelaParcelas()}
<p>Os traços significam zero parcela para aquela combinação. Quem pede demissão, é dispensado por justa causa ou sai no acordo do art. 484-A da CLT não recebe o benefício; o passo a passo do pedido e as outras condições estão na <a href="/seguro-desemprego/">calculadora de seguro-desemprego</a>.</p>
<h2>Como conferir antes de contar com o valor</h2>
<p>O número oficial sai dos salários que a empresa lançou, não do que foi combinado de boca. Vale comparar a média com o holerite e com a rescisão. O saque do FGTS e a multa de 40% são outra conta: use a <a href="/rescisao/">calculadora de rescisão</a> e a <a href="/fgts/">calculadora de FGTS</a>. O piso desta tabela é o <a href="/salario-minimo-2026/">salário mínimo de 2026</a>.</p>`,
  faq: [
    { q: 'Qual a tabela do seguro-desemprego em 2026?', a: `<p>Vigente desde ${T.vigencia}: 80% da média até ${R(T.faixa1Ate)}; de ${R(cent(T.faixa1Ate))} a ${R(T.faixa2Ate)}, ${R(T.fixoFaixa2)} mais 50% do excedente sobre ${R(T.faixa1Ate)}; acima disso, teto de ${R(T.teto)}. O piso é ${R(T.piso)}.</p>` },
    { q: 'Qual o valor máximo do seguro-desemprego em 2026?', a: `<p>${R(T.teto)} por parcela, para média salarial acima de ${R(T.faixa2Ate)}.</p>` },
    { q: 'Qual o valor mínimo da parcela?', a: `<p>${R(T.piso)}, igual ao salário mínimo de 2026. Uma média de ${R(1800)} teria 80% de ${R(bruta1800)}, mas a parcela sobe para ${R(sd1800.parcela)}.</p>` },
    { q: 'Como é calculada a segunda faixa?', a: `<p>${R(T.fixoFaixa2)} mais 50% da diferença entre a média e ${R(T.faixa1Ate)}. Com média de ${R(3000)}, a parcela calculada pelo site é ${R(sd3000.parcela)}.</p>` },
    { q: 'Quantas parcelas do seguro-desemprego posso receber?', a: `<p>Pela regra da calculadora, 3, 4 ou 5, conforme os meses trabalhados e o número da solicitação. Com 24 meses ou mais, são 5. Com 12 a 23, são 4. Abaixo de 12, só a partir da segunda solicitação, e se a carência mínima for cumprida.</p>` },
  ],
};

export const guias = [guiaInss, guiaIr, guiaSm, guiaSd];
