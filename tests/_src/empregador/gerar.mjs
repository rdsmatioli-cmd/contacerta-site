// Gera as páginas do Empregador em Dia E2 (T01, T02, T03, T15) e E3 (T05-T08, T10, T12) a partir do molde de
// tabelas-oficiais-2026/obrigado/index.html (cabeçalho, consentimento, rodapé). Rodar: node tests/_src/empregador/gerar.mjs
// Textos literais da v3.3 (4c21797f, p. 2-7 e 19) com as decisões do CEO (becbf681, 95a76e17), o parecer do
// Advogado (c23c3792) e o CFO (0619d010). Com a flag OFF só o aviso aparece. DEC CPO 31/10 (PR #56): landing, avaliação rápida e jornada 42h
// indexáveis (ADENDO Advogado 7ec7825b: preços só com checkout) e no sitemap; as demais (preços, resultado, orçamento, contratar, pagamento, painel) seguem noindex.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { FAIXAS, FLAGS } from '../../../assets/js/empregador/config.js';
import { ctaCheckoutLiberado, TEXTO_ACEITE, LINHA_ANTES_STRIPE, LINK_TERMOS_VENDA, NOME_PRODUTO, htmlAnexoEd1, INICIO_SERVICO, PRAZO_RELATORIO, ARREPENDIMENTO_ED1 } from '../../../assets/js/empregador/textos-checkout.js';

const raiz = fileURLToPath(new URL('../../../', import.meta.url));
const molde = readFileSync(join(raiz, 'tabelas-oficiais-2026/obrigado/index.html'), 'utf8');
const ver = (p) => createHash('sha256').update(readFileSync(join(raiz, p))).digest('hex').slice(0, 10);
const [head0, resto] = molde.split('</head>');
const corpoIni = resto.slice(0, resto.indexOf('<main'));
const rodape = resto.slice(resto.indexOf('</main>') + '</main>'.length);
const ORIG = 'https://contacertabr.com.br';
const vUi = ver('assets/js/empregador/ui.js');
// ed.css vai inline (QA B-PR42-09: sem CSS extra bloqueando a renderização).
const cssEd = readFileSync(join(raiz, 'assets/js/empregador/ed.css'), 'utf8').trim();

const INDEXAVEIS = ['empregador-em-dia/', 'empregador-em-dia/avaliacao-rapida-nr1/', 'empregador-em-dia/jornada-42h/'];
function pagina({ caminho, titulo, desc, conteudo, selo = true }) {
  const url = `${ORIG}/${caminho}`;
  let h = head0
    .replace(/<title>[^<]*<\/title>/, `<title>${titulo}</title>`)
    .replaceAll('Planilha Tabelas oficiais 2026 | Conta Certa', titulo)
    .replaceAll('Download da planilha Tabelas oficiais 2026 do Conta Certa.', desc)
    .replaceAll(`${ORIG}/tabelas-oficiais-2026/obrigado/`, url);
  if (INDEXAVEIS.includes(caminho)) h = h.replace('<meta name="robots" content="noindex, nofollow">', '<meta name="robots" content="index, follow, max-image-preview:large">');
  h = h.replace('<link rel="stylesheet" href="/assets/style.css', `<style>${cssEd}</style>\n<link rel="stylesheet" href="/assets/style.css`);
  // NB-05 (CLS): o HTML já sai no estado final das flags. Com a página liberada, #ed-app vem visível e #ed-off oculto,
  // sem troca depois do ui.js (que repete o mesmo estado, sem deslocar nada). Mesma regra do iniciar() do ui.js.
  const orcamento = /id="ed-orc"/.test(conteudo);
  const login = /data-ed-e3="login"/.test(conteudo);
  const pagamento = /id="ed-pagamento"/.test(conteudo);
  const contratar = /id="ed-contratar"/.test(conteudo);
  const checkout = /data-ed-e3="checkout"/.test(conteudo);
  const liberada = FLAGS.EMPREGADOR_EM_DIA
    && !(orcamento && !FLAGS.ED_ORCAMENTO_NR1)
    && !(login && !FLAGS.ED_LOGIN)
    && !((pagamento || contratar) && !ctaCheckoutLiberado())
    && !(checkout && !FLAGS.ED_CHECKOUT);
  const main = `<main id="conteudo" class="caixa ed">
${selo ? '<p class="ed-selo">simulação · dados de exemplo</p>' : ''}
<section id="ed-off" class="ed-off"${liberada ? ' hidden' : ''}><p class="ed-off-t"><strong>Empregador em Dia</strong></p><p>Esta página está em preparação e ainda não está disponível.</p><p><a href="/nr1-riscos-psicossociais/">Leia sobre a NR-1 e os riscos psicossociais</a>.</p></section>
<div id="ed-app"${liberada ? '' : ' hidden'}>
<nav class="ed-menu" aria-label="Empregador em Dia"><a href="/nr1-riscos-psicossociais/">NR-1</a><a href="/empregador-em-dia/jornada-42h/">Jornada 42h</a><a href="/empregador-em-dia/#preco">Preço</a></nav>
${conteudo}
<nav class="ed-rodape" aria-label="Empregador em Dia: links"><span>Conta Certa · Empregador em Dia</span><a href="/termos/">Termos de uso</a><a href="/privacidade/">Privacidade</a><a href="/contato/">Ajuda</a><a href="/contato/">Contato</a></nav>
</div>
<script>(()=>{let f=0;const ir=()=>{if(f++)return;import('/assets/js/empregador/ui.js?v=${vUi}')},ocioso=()=>window.requestIdleCallback?requestIdleCallback(ir,{timeout:1500}):setTimeout(ir,1);addEventListener('load',()=>{let t=setTimeout(ocioso,600);try{new PerformanceObserver(()=>{clearTimeout(t);t=setTimeout(ocioso,600)}).observe({type:'largest-contentful-paint',buffered:true})}catch{}setTimeout(ir,3000)},{once:true})})()</script>
</main>`;
  let out = `${h}</head>${corpoIni}${main}${rodape}`;
  // Sprite só com os símbolos usados, na ordem do primeiro uso (fonte-seo.test.mjs, sprite()).
  const sm = out.match(/<svg class="sprite"[^>]*>((?:<symbol\b[^]*?<\/symbol>)*)<\/svg>/);
  const depois = out.slice(sm.index + sm[0].length);
  const simbolos = new Map([...sm[1].matchAll(/<symbol id="([^"]+)"[^]*?<\/symbol>/g)].map((m) => [m[1], m[0]]));
  const usados = [...new Set([...depois.matchAll(/href="#(i-[\w-]+)"/g)].map((m) => m[1]))].filter((i) => simbolos.has(i));
  out = out.replace(sm[0], sm[0].replace(sm[1], usados.map((i) => simbolos.get(i)).join('')));
  mkdirSync(join(raiz, caminho), { recursive: true });
  writeFileSync(join(raiz, caminho, 'index.html'), out);
}

const radio = (nome, opcoes, ajudaId) => opcoes.map(([v, t]) =>
  `<label class="ed-op"><input type="radio" name="${nome}" value="${v}" aria-describedby="${ajudaId}"> ${t}</label>`).join('');
const check = (nome, opcoes, ajudaId) => opcoes.map(([v, t]) =>
  `<label class="ed-op"><input type="checkbox" name="${nome}" value="${v}" aria-describedby="${ajudaId}"> ${t}</label>`).join('');

pagina({
  caminho: 'empregador-em-dia/',
  titulo: 'Empregador em Dia: NR-1 e riscos psicossociais no PGR',
  desc: 'Adequação da sua empresa à NR-1: questionário anônimo aos funcionários, inventário de riscos psicossociais e plano de ação para incluir no PGR.',
  conteudo: `<section class="ed-hero" data-ed-tela="1">
<p class="cat-pill">NR-1: riscos psicossociais no PGR</p>
<h1>Sua empresa em dia com a NR-1, sem montar planilha</h1>
<p class="lead">A NR-1 agora pede que a empresa avalie estresse, sobrecarga e assédio no trabalho (desde 26/05/2026; as multas sobre esse ponto estão suspensas provisoriamente pelo STF na ADPF 1316, mas a obrigação de avaliar continua). A gente aplica o questionário anônimo e você recebe o inventário e o plano de ação para o PGR. A validação técnica por profissional de segurança do trabalho (SST) não está incluída no preço. Ela é opcional e, se você quiser, é contratada e paga diretamente pela sua empresa. A responsabilidade pelo PGR é sempre da empresa empregadora.</p>
<p><a class="btn" href="/empregador-em-dia/avaliacao-rapida-nr1/">Ver o que minha empresa precisa</a></p>
<h2>O que você recebe</h2>
<ul class="ed-lista"><li>Questionário anônimo para os funcionários</li><li>Inventário de riscos psicossociais para o PGR</li><li>Plano de ação com prazos e responsáveis</li><li>Relatório com o resultado do grupo para anexar ao PGR (pode ser revisado por um profissional de SST, se você quiser)</li></ul>
<p class="ed-sst" data-ed-sst></p>
</section>
<ul class="ed-cartoes" id="preco">
<li><strong>20 a 50 funcionários</strong><span>R$ 1.490 à vista.</span></li>
<li><strong>51 a 200 funcionários</strong><span>Em breve.</span></li>
<li><a href="/empregador-em-dia/jornada-42h/"><strong>Grátis: simulador da jornada 42h</strong><span>Veja quanto custaria reduzir a jornada.</span></a></li>
</ul>
<p><a class="btn" href="/empregador-em-dia/avaliacao-rapida-nr1/">Ver o que minha empresa precisa</a></p>`,
});

pagina({
  caminho: 'empregador-em-dia/avaliacao-rapida-nr1/',
  titulo: 'Avaliação rápida NR-1: o que sua empresa precisa | Empregador em Dia',
  desc: 'Responda três perguntas sobre a sua empresa e veja o que falta para incluir os riscos psicossociais no PGR e cumprir a NR-1. Resultado na hora.',
  conteudo: `<h1>Avaliação rápida NR-1</h1>
<form class="ed-form" id="ed-diag" novalidate>
<fieldset data-passo="1"><legend><span class="ed-passo">Passo 1 de 3</span> Quantas pessoas trabalham na empresa?</legend>
<p>Conte quem tem carteira assinada. O preço sai daqui.</p>
<p class="ed-rotulo">Funcionários com carteira</p>
<div class="ed-ops">${radio('faixa', [['lt20', 'Menos de 20'], ['20-50', '20 a 50'], ['51-100', '51 a 100'], ['101-200', '101 a 200'], ['gt200', 'Mais de 200']], 'aj-faixa')}</div>
<p class="ajuda" id="aj-faixa"><small>Use o número da última folha de pagamento. Exemplo: 34 funcionários na folha de setembro, escolha "20 a 50". Não conte sócios nem prestadores PJ.</small></p>
</fieldset>
<fieldset data-passo="2" hidden><legend><span class="ed-passo">Passo 2 de 3</span> Como é o trabalho na sua empresa?</legend>
<p>Marque o que existe hoje.</p>
<p class="ed-rotulo">Onde as pessoas trabalham</p>
<div class="ed-ops">${check('onde[]', [['escritorio', 'Escritório'], ['loja', 'Loja ou atendimento ao público'], ['rua', 'Na rua (entregas, visitas)'], ['fabrica', 'Fábrica ou obra']], 'aj-onde')}</div>
<p class="ajuda" id="aj-onde"><small>Pode marcar mais de um. Exemplo: uma rede de farmácias marca "Loja ou atendimento ao público".</small></p>
<p class="ed-rotulo">Tem metas de venda ou de produção?</p>
<div class="ed-ops">${radio('metas', [['sim', 'Sim'], ['nao', 'Não'], ['asvezes', 'Às vezes']], 'aj-metas')}</div>
<p class="ajuda" id="aj-metas"><small>Metas apertadas são um dos riscos que a NR-1 pede para avaliar. Exemplo: vendedores com meta mensal.</small></p>
<p class="ed-rotulo">Alguém já reclamou de assédio ou de excesso de trabalho?</p>
<div class="ed-ops">${radio('reclamacao', [['sim', 'Sim'], ['nao', 'Não'], ['naodizer', 'Prefiro não dizer']], 'aj-recl')}</div>
<p class="ajuda" id="aj-recl"><small>Esta resposta fica só no seu navegador. Exemplo: uma queixa no RH no último ano.</small></p>
</fieldset>
<fieldset data-passo="3" hidden><legend><span class="ed-passo">Passo 3 de 3</span> Sua empresa já tem PGR?</legend>
<p>PGR é o programa de segurança do trabalho. Quem cuida dele costuma ser uma empresa de SST.</p>
<p class="ed-rotulo">Tem PGR hoje?</p>
<div class="ed-ops">${radio('pgr', [['sst', 'Sim, feito por uma empresa de SST'], ['proprio', 'Sim, feito por nós mesmos'], ['nao', 'Não'], ['naosei', 'Não sei']], 'aj-pgr')}</div>
<p class="ajuda" id="aj-pgr"><small>Pergunte ao RH ou ao contador; é o documento que lista riscos como ruído e queda. Exemplo: se vocês fazem exame admissional, provavelmente há um PGR.</small></p>
</fieldset>
<p class="campo-msg" id="ed-msg" role="alert" hidden></p>
<div class="ed-acoes"><button type="button" class="btn sec" data-ed-voltar hidden>Voltar</button><button type="submit" disabled class="btn">Continuar</button></div>
</form>`,
});

pagina({
  caminho: 'empregador-em-dia/avaliacao-rapida-nr1/resultado/',
  titulo: 'Resultado da avaliação rápida NR-1 | Empregador em Dia',
  desc: 'O que sua empresa precisa para incluir os riscos psicossociais no PGR.',
  conteudo: `<p class="ed-rotulo">Resultado da avaliação rápida NR-1</p>
<section data-ed-res="vazio"><h1>Faça a avaliação rápida NR-1 primeiro</h1><p><a class="btn" href="/empregador-em-dia/avaliacao-rapida-nr1/">Ver o que minha empresa precisa</a></p></section>
<section data-ed-res="oferta" hidden><h1>Sua empresa deve avaliar os riscos psicossociais no PGR</h1>
<ul class="ed-cartoes"><li><strong>Seu porte</strong><span data-ed="porte"></span></li><li><strong>Pontos de atenção</strong><span data-ed="pontos"></span></li><li><strong>PGR</strong><span data-ed="pgr"></span></li></ul>
<div class="ed-oferta"><h2>${NOME_PRODUTO} para <span data-ed="porte2"></span></h2><p class="ed-preco" data-ed="preco"></p><p data-ed="parcelas"></p><p data-ed-validade>Preços válidos até 31/12/2026.</p><p class="ed-sst" data-ed-sst></p><p class="ed-aviso-sst">O Conta Certa fornece questionário, inventário e plano de ação como apoio. O uso da ferramenta, sozinho, não garante a conformidade com a NR-1 nem substitui o PGR. A elaboração, implementação e atualização do PGR são de responsabilidade da empresa empregadora. Para contratar a validação técnica, procure diretamente um profissional ou empresa de SST de sua escolha; o Conta Certa não indica nem recebe comissão de fornecedores.</p>
<p><button type="button" class="btn" data-ed-contratar hidden disabled>Contratar</button></p></div>
<p>${INICIO_SERVICO}</p>
<p>${PRAZO_RELATORIO}</p></section>
<section data-ed-res="em-breve" hidden><h1>Em breve</h1></section>
<section data-ed-res="simplificada" hidden><h1>Empresas pequenas podem ter regras mais simples na NR-1</h1>
<p>MEI e microempresas ou empresas de pequeno porte de grau de risco 1 ou 2, sem exposição a agentes físicos, químicos ou biológicos conforme a NR-9, podem ficar dispensadas de elaborar o PGR (NR-1, itens 1.8). A dispensa vale só para o documento: as demais obrigações continuam. Este serviço foi pensado para 20 a 200 funcionários.</p>
<ul class="ed-cartoes"><li><strong>Guia gratuito para pequenas empresas</strong><span>Checklist de 1 página com o que avaliar, um modelo de plano de ação e como anexar ao PGR.</span><button type="button" class="btn" disabled>Receber o guia por e-mail</button></li></ul>
<p><a href="/contato/">Quer mesmo assim a adequação completa? Fale com a gente.</a></p></section>
<section data-ed-res="sob-consulta" hidden><h1>Para mais de 200 funcionários, fazemos um orçamento</h1>
<p>Com várias unidades ou turnos, o questionário e a análise mudam. Orçamento sob medida, caso a caso.</p>
<p class="ed-sst" data-ed-sst></p>
<p><button type="button" class="btn" data-ed-orcamento disabled>Pedir orçamento</button></p></section>`,
});

pagina({
  caminho: 'empregador-em-dia/jornada-42h/',
  titulo: 'Simulador da jornada de 42 horas: quanto custa | Empregador em Dia',
  desc: 'Simule quanto custaria reduzir a jornada da sua equipe para 42 horas por semana: horas, salário-hora e custo mensal, com a conta aberta passo a passo.',
  conteudo: `<p class="cat-pill">Simulador grátis</p>
<h1>Quanto custaria reduzir a jornada para 42 horas por semana?</h1>
<p class="ed-aviso" role="note">A Emenda Constitucional 141/2026 reduz a jornada máxima para 42 horas por semana a partir de 16/12/2026 e para 40 horas a partir de 16/12/2027, sem redução de salário. Esta simulação é uma estimativa e não substitui a análise do seu contrato ou da convenção coletiva.</p>
<form class="ed-form" id="ed-jornada" novalidate>
<div class="campo"><label for="f-func">Funcionários em jornada integral</label><div class="entrada"><input type="text" inputmode="numeric" autocomplete="off" id="f-func" name="funcionarios" value="34" aria-describedby="aj-func f-func-msg"></div><p class="ajuda" id="aj-func"><small>Veja no contrato ou na folha. Exemplo: todos da loja trabalham em jornada integral, digite o total.</small></p><p class="campo-msg" id="f-func-msg" hidden></p></div>
<fieldset><legend>Salário médio desses funcionários</legend><div class="ed-ops">${radio('faixaSalario', [['ate2', 'Até R$ 2 mil'], ['2a3', 'R$ 2 mil a R$ 3 mil'], ['3a5', 'R$ 3 mil a R$ 5 mil'], ['gt5', 'Acima de R$ 5 mil']], 'aj-sal').replace('value="2a3"', 'value="2a3" checked')}</div>
<p class="ajuda" id="aj-sal"><small>Valor da carteira, sem descontos. Exemplo: a maioria ganha R$ 2.400.</small></p></fieldset>
<p><label class="ed-op"><input type="checkbox" id="f-dom" name="domestico"> Sou empregador doméstico</label></p>
<p class="ed-aviso" data-ed="nota-dom" hidden></p>
<p class="ed-aviso" role="note" data-ed="aviso-m02">Esta simulação usa o divisor 210, que só vale se houver acordo ou convenção coletiva que distribua 42 horas por semana. Sem essa norma, a jornada efetiva com 2 repousos e 8 horas por dia é de 40 horas e o divisor é 200: o valor da hora fica maior que o mostrado aqui. O resultado é uma estimativa e não garante o valor devido.</p>
<button type="submit" disabled class="btn">Calcular</button>
</form>
<section class="ed-conta" aria-live="polite"><h2>Como chegamos no valor</h2>
<table class="ed-tab"><caption>Etapa de 42 horas, a partir de 16/12/2026</caption><tbody>
<tr><th scope="row">Salário médio (meio da faixa)</th><td data-ed="salario"></td></tr>
<tr><th scope="row">Valor da hora (salário ÷ <span data-ed="div42">210</span> horas, proporção da Súmula 431 do TST (horas semanais × 5))<br><small>A lei ainda não definiu o divisor. Na etapa de 42 horas, 210 pressupõe norma coletiva de 42 horas; sem ela, use 200.</small></th><td data-ed="hora42"></td></tr>
<tr><th scope="row">Horas a cobrir por mês (2h × 52 semanas ÷ 12)</th><td data-ed="horas42"></td></tr>
<tr><th scope="row">Custo por funcionário, como hora extra (+50%)</th><td data-ed="func42"></td></tr>
<tr><th scope="row">Total para <span data-ed="n"></span> funcionários</th><td data-ed="total42"></td></tr>
</tbody></table>
<table class="ed-tab"><caption>Etapa de 40 horas, a partir de 16/12/2027</caption><tbody>
<tr><th scope="row">Valor da hora (salário ÷ <span data-ed="div40">200</span> horas, proporção da Súmula 431 do TST (horas semanais × 5))<br><small>A lei ainda não definiu o divisor. Na etapa de 42 horas, 210 pressupõe norma coletiva de 42 horas; sem ela, use 200.</small></th><td data-ed="hora40"></td></tr>
<tr><th scope="row">Horas a cobrir por mês (4h × 52 semanas ÷ 12)</th><td data-ed="horas40"></td></tr>
<tr><th scope="row">Custo por funcionário, como hora extra (+50%)</th><td data-ed="func40"></td></tr>
<tr><th scope="row">Total para <span data-ed="n2"></span> funcionários</th><td data-ed="total40"></td></tr>
</tbody></table>
<p><small>O adicional de 50% é o mínimo da Constituição (art. 7º, XVI); a convenção coletiva pode prever um adicional maior. A conta mostra um cenário: a empresa mantém 44 horas por semana em 5 dias, respeitando os 2 dias de repouso semanal exigidos a partir de 16/12/2026 e o limite de 2 horas extras por dia (CLT, art. 59), e paga como extra as horas acima do novo limite. Não é uma recomendação: hora extra fixa todo mês tem efeitos trabalhistas e pode ser questionada. Reduzir a jornada, reorganizar escalas ou contratar são alternativas. O valor não inclui os reflexos das horas extras habituais no descanso semanal remunerado, nas férias com 1/3, no 13º e no FGTS, nem os encargos sobre a folha (INSS patronal, RAT e terceiros). Por isso é um valor mínimo: o custo real tende a ser maior. Valores sem encargos e reflexos (FGTS, INSS, DSR, férias e 13º). Para "Acima de R$ 5 mil" usamos R$ 5.000,00. Nenhuma faixa fica abaixo do salário mínimo de 2026 (R$ 1.621,00). Para MEI, microempresas e empresas de pequeno porte, uma lei complementar ainda poderá criar regras de transição, ligadas à manutenção de empregos. Até lá, valem as datas acima.</small></p>
</section>
<section class="ed-oferta"><h2>Já que está revendo a jornada, a NR-1 também mudou</h2>
<p>Avalie riscos de sobrecarga no PGR. A partir de <span data-ed="preco-min"></span> para 20 a 50 funcionários.</p>
<p><a class="btn" href="/empregador-em-dia/">${NOME_PRODUTO}</a></p></section>`,
});
// N-1 (CPO/NR-1): preços da tabela no HTML estático, a partir de FAIXAS (config.js); mesmo formato do brl() de ui.js.
const precoEstatico = (id) => FAIXAS.find((f) => f.id === id).preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).replace(/\s/g, ' ');
pagina({
  caminho: 'empregador-em-dia/orcamento-nr1/',
  titulo: 'Pedir orçamento NR-1 | Empregador em Dia',
  desc: 'Formulário de pedido de orçamento do Empregador em Dia — avaliação rápida NR-1 para empresas com mais de 200 funcionários.',
  conteudo: `<h1>Orçamento do serviço NR-1</h1>
<table class="ed-tab"><caption>Preços do serviço NR-1</caption><thead><tr><th scope="col">Funcionários</th><th scope="col">Preço</th></tr></thead><tbody>
<tr><th scope="row">20 a 50</th><td data-ed="orc-preco-20-50">${precoEstatico('20-50')}</td></tr>
<tr><th scope="row">51 a 100</th><td data-ed="orc-preco-51-100">${precoEstatico('51-100')}</td></tr>
<tr><th scope="row">101 a 200</th><td data-ed="orc-preco-101-200">${precoEstatico('101-200')}</td></tr>
<tr><th scope="row">Mais de 200</th><td>Orçamento sob medida</td></tr>
</tbody></table>
<p>Prazo: retorno em até 2 dias úteis, proposta em até 5 dias úteis.</p>
<p>Preços válidos até 31/12/2026.</p>
<form class="ed-form le-form" id="ed-orc" action="#" method="post" accept-charset="UTF-8" novalidate>
<label for="orc-empresa">Nome da empresa</label><input id="orc-empresa" data-orc-campo="empresa" autocomplete="organization" required aria-describedby="orc-empresa-ajuda"><small id="orc-empresa-ajuda">Digite o nome da empresa. Não consultamos o CNPJ em nenhuma base.</small>
<label for="orc-cnpj">CNPJ da empresa</label><input id="orc-cnpj" data-orc-campo="cnpj" inputmode="numeric" aria-describedby="orc-cnpj-ajuda"><small id="orc-cnpj-ajuda">Opcional. Ajuda a preparar a proposta.</small>
<label for="orc-faixa">Número de funcionários</label><select id="orc-faixa" data-orc-campo="faixa" required><option value="">Selecione</option><option>20 a 50</option><option>51 a 100</option><option>101 a 200</option><option>Mais de 200</option></select>
<label for="orc-nome">Seu nome</label><input id="orc-nome" data-orc-campo="nome" autocomplete="name" required>
<label for="orc-email">E-mail</label><input id="orc-email" data-orc-campo="email" type="email" autocomplete="email" required>
<label for="orc-telefone">Telefone (opcional)</label><input id="orc-telefone" data-orc-campo="telefone" type="tel" autocomplete="tel">
<input type="hidden" data-orc-campo="avisoVersao" value="aviso-orcamento-nr1-v3-20261028">
<input type="hidden" data-orc-campo="enviadoEm" value="">
<div class="le-hp" aria-hidden="true" style="position:absolute;left:-9999px"><label for="ed-orc-site">Não preencha</label><input id="ed-orc-site" tabindex="-1" autocomplete="off"></div>
<label class="le-ok"><input type="checkbox" id="orc-novidades" data-orc-campo="novidades" value="sim"> Quero receber novidades do Conta Certa por e-mail. Sei que meus dados passam por servidores do Google e do ImprovMX fora do Brasil. Posso cancelar quando quiser.</label>
<section class="nota le-privacidade" id="orc-aviso" aria-labelledby="orc-aviso-titulo">
<h2 id="orc-aviso-titulo">Como usamos seus dados</h2>
<p>Quem cuida dos seus dados é RODRIGO DE SIMONE MATIOLI LTDA (LCM GLOBAL SERVICES), CNPJ 61.193.879/0001-20, responsável pelo Conta Certa.</p>
<p>Usamos seu nome, e-mail, telefone (se informado), empresa, CNPJ (se informado) e faixa de número de funcionários só para responder ao seu pedido de orçamento e enviar a proposta. A base legal é a LGPD, art. 7º, V: passos anteriores a um contrato, feitos a seu pedido.</p>
<p>Guardamos esses dados por até 6 meses depois do envio da proposta. Se você fechar contrato, eles passam a seguir o contrato. Depois disso, apagamos.</p>
<p>As respostas ficam no Google Forms e no Google Sheets, serviços do Google LLC, que pode tratá-las em servidores fora do Brasil. Essa transferência é necessária para atender ao seu pedido (LGPD, art. 33, IX, e art. 7º, V). Não vendemos nem cedemos seus dados.</p>
<p>Você pode pedir confirmação, acesso, correção, cópia, exclusão e informação sobre com quem compartilhamos seus dados (LGPD, art. 18). Escreva para contato@contacertabr.com.br.</p>
<p>Mais detalhes na nossa Política de Privacidade: <a href="/privacidade/">https://contacertabr.com.br/privacidade/</a></p>
</section>
<button type="submit" disabled class="btn">Pedir orçamento do serviço NR-1</button>
</form>
<p id="ed-orc-msg" class="nota" role="alert" aria-live="assertive" hidden></p>`,
});

// ---- E3 (backlog v3 T05, T06, T07, T08, T10, T12; v3.3 telas 8-11, 13 e 15). Tudo dentro de #ed-app (hidden):
// com EMPREGADOR_EM_DIA/ED_CHECKOUT OFF (e ED_LOGIN OFF no painel) só o aviso aparece. Pagamento só em mock (D-22).
// DEC CPO 70f7c62a / CEO 95a76e17: ">200" = "Orçamento sob medida" (substitui o "sob consulta" da v3.3).
const card = (id) => { const f = FAIXAS.find((x) => x.id === id);
  const r = (v) => `R$ ${v.toLocaleString('pt-BR')}`;
  if (id === '20-50') return `<li data-ed-faixa="${id}"><span class="ed-sua" hidden>Sua faixa</span><strong>${f.rotulo} funcionários</strong><span class="ed-preco">${r(f.preco)}</span><span>à vista</span></li>`;
  return `<li data-ed-faixa="${id}"><strong>${f.rotulo} funcionários</strong><span>Em breve.</span></li>`; };

pagina({
  caminho: 'empregador-em-dia/precos/',
  titulo: `${NOME_PRODUTO} | preço`,
  desc: 'Preço da faixa de 20 a 50 funcionários, à vista.',
  conteudo: `<h1 data-ed-e3="checkout">Preço fechado pela faixa de funcionários</h1>
<ul class="ed-cartoes">${card('20-50')}${card('51-100')}${card('101-200')}</ul>
<p>Menos de 20 funcionários: <a href="/empregador-em-dia/avaliacao-rapida-nr1/">veja a opção gratuita</a>. Mais de 200: <a href="/empregador-em-dia/orcamento-nr1/">Orçamento sob medida</a>.</p>
<p data-ed-validade>Preços válidos até 31/12/2026.</p>
<h2>O que o serviço entrega</h2>
<ul class="ed-lista"><li>Questionário anônimo</li><li>Inventário dos riscos psicossociais para apoiar o PGR da sua empresa</li><li>Plano de ação com prazos e responsáveis</li><li>Lembrete de revisão: a NR-1 pede revisar a avaliação de riscos pelo menos a cada 2 anos</li></ul>
<p>O PGR continua com a sua empresa: o inventário e o plano de ação entram nele.</p>
<p class="ed-sst" data-ed-sst></p>
<p class="ed-aviso-sst">O Conta Certa fornece questionário, inventário e plano de ação como apoio. O uso da ferramenta, sozinho, não garante a conformidade com a NR-1 nem substitui o PGR. A elaboração, implementação e atualização do PGR são de responsabilidade da empresa empregadora. Para contratar a validação técnica, procure diretamente um profissional ou empresa de SST de sua escolha; o Conta Certa não indica nem recebe comissão de fornecedores.</p>`,
});

pagina({
  caminho: 'empregador-em-dia/contratar/',
  titulo: 'Dados para o contrato | Empregador em Dia',
  desc: 'Dados da empresa para o contrato do Empregador em Dia — avaliação rápida NR-1.',
  conteudo: `<form class="ed-form" id="ed-contratar" data-ed-e3="checkout" novalidate>
<h1>Dados para o contrato</h1>
<label for="ct-razao">Razão social</label><input id="ct-razao" name="razao" autocomplete="organization" required aria-describedby="aj-razao"><small id="aj-razao">Digite como está no cartão CNPJ. Não consultamos o CNPJ em nenhuma base.</small>
<label for="ct-nome">Seu nome</label><input id="ct-nome" name="nome" autocomplete="name" required aria-describedby="aj-nome"><small id="aj-nome">Quem responde pela empresa neste serviço. Exemplo: o dono ou o gerente de RH.</small>
<label for="ct-email">E-mail</label><input id="ct-email" name="email" type="email" autocomplete="email" required aria-describedby="aj-email"><small id="aj-email">Recebe por e-mail o questionário e o relatório. Exemplo: o e-mail do RH.</small>
<label for="ct-whats">WhatsApp (opcional)</label><input id="ct-whats" name="whatsapp" type="tel" autocomplete="tel" aria-describedby="aj-whats"><small id="aj-whats">Só para avisos do andamento. Exemplo: celular do RH.</small>
<section class="nota le-privacidade" id="ct-aviso" aria-labelledby="ct-aviso-t"><h2 id="ct-aviso-t">Como usamos seus dados</h2>
<p>Quem cuida dos seus dados é RODRIGO DE SIMONE MATIOLI LTDA (LCM Global Services), CNPJ 61.193.879/0001-20, responsável pelo Conta Certa.</p>
<p>Usamos razão social, seu nome, e-mail e WhatsApp (se informado) só para fechar e cumprir o contrato: emitir recibo e nota fiscal, enviar por e-mail o questionário e o relatório e avisar do andamento. A base legal é a LGPD, art. 7º, V (contrato) e, para a nota fiscal, art. 7º, II (obrigação legal).</p>
<p>Guardamos esses dados enquanto o contrato durar e, depois, pelo prazo que a lei fiscal exige. Não vendemos nem cedemos seus dados.</p>
<p>Você pode pedir confirmação, acesso, correção, cópia, exclusão e informação sobre com quem compartilhamos seus dados (LGPD, art. 18). Escreva para contato@contacertabr.com.br.</p>
<p>Mais detalhes na nossa Política de Privacidade: <a href="/privacidade/">https://contacertabr.com.br/privacidade/</a></p></section>
<p class="campo-msg" id="ct-msg" role="alert" hidden></p>
<p>Faixa: 20 a 50 empregados, até 4 grupos ou setores</p>
<p>Preço: R$ 1.490,00 à vista</p>
<p>${INICIO_SERVICO}</p>
<p>${PRAZO_RELATORIO}</p>
<button type="submit" disabled class="btn">Continuar para pagamento</button>
</form>`,
});

pagina({
  caminho: 'empregador-em-dia/pagamento/',
  titulo: 'Pagamento | Empregador em Dia',
  desc: 'Pagamento à vista da faixa de 20 a 50 funcionários.',
  conteudo: `<form class="ed-form" id="ed-pagamento" data-ed-e3="checkout" data-ed-parcela="1" novalidate>
<p class="ed-passo">Dados ✓ › Pagamento</p>
<h1>Pagamento</h1>
<label for="pg-nf">E-mail</label><input id="pg-nf" name="nf" type="email" autocomplete="email" required aria-describedby="aj-nf"><small id="aj-nf">Mandamos a nota fiscal neste e-mail. Exemplo: o e-mail do financeiro.</small>
<section class="ed-oferta" aria-labelledby="pg-resumo"><h2 id="pg-resumo">Resumo antes de pagar</h2>
<p>Serviço: ${NOME_PRODUTO}</p>
<p>Faixa: 20 a 50 empregados, até 4 grupos ou setores</p>
<p>Preço: R$ 1.490,00 à vista</p>
<p>Forma de pagamento: cartão de crédito ou Pix, à vista, pelo link de pagamento da Stripe</p>
<p><a href="${LINK_TERMOS_VENDA}">Termos de Uso, item 6</a></p>
<p data-ed-validade>Preços válidos até 31/12/2026.</p>
<p class="ed-aviso-sst">O Conta Certa fornece questionário, inventário e plano de ação como apoio. O uso da ferramenta, sozinho, não garante a conformidade com a NR-1 nem substitui o PGR. A elaboração, implementação e atualização do PGR são de responsabilidade da empresa empregadora. Para contratar a validação técnica, procure diretamente um profissional ou empresa de SST de sua escolha; o Conta Certa não indica nem recebe comissão de fornecedores.</p></section>
${htmlAnexoEd1()}
<label class="ed-op"><input type="checkbox" name="aceite" data-ed-aceite required> ${TEXTO_ACEITE}</label>
<p class="campo-msg" id="pg-msg" role="alert" hidden></p>
<p>${LINHA_ANTES_STRIPE}</p>
<button type="submit" disabled class="btn" data-ed-pagar hidden>Continuar para pagamento</button>
<section class="nota le-privacidade" id="pg-aviso" aria-labelledby="pg-aviso-t"><h2 id="pg-aviso-t">Como usamos seus dados</h2>
<p>Quem cuida dos seus dados é RODRIGO DE SIMONE MATIOLI LTDA (LCM Global Services), CNPJ 61.193.879/0001-20, responsável pelo Conta Certa.</p>
<p>Usamos o e-mail para recibo e nota fiscal e os dados do pedido só para fechar e cumprir o contrato: emitir recibo e nota fiscal, enviar por e-mail o questionário e o relatório e avisar do andamento. A base legal é a LGPD, art. 7º, V (contrato) e, para a nota fiscal, art. 7º, II (obrigação legal).</p>
<p>Guardamos esses dados enquanto o contrato durar e, depois, pelo prazo que a lei fiscal exige. Não vendemos nem cedemos seus dados.</p>
<p>Você pode pedir confirmação, acesso, correção, cópia, exclusão e informação sobre com quem compartilhamos seus dados (LGPD, art. 18). Escreva para contato@contacertabr.com.br.</p>
<p>Mais detalhes na nossa Política de Privacidade: <a href="/privacidade/">https://contacertabr.com.br/privacidade/</a></p></section>
</form>`,
});

pagina({
  caminho: 'empregador-em-dia/pagamento/ok/',
  titulo: 'Pedido recebido. | Empregador em Dia',
  desc: 'A Stripe envia o recibo para o e-mail que você informou. Se não chegar em alguns minutos, confira a caixa de spam.',
  selo: false,
  conteudo: `<section data-ed-e3="checkout" id="ed-pg-ok">
<h1>Pedido recebido.</h1>
<p>A Stripe envia o recibo para o e-mail que você informou. Se não chegar em alguns minutos, confira a caixa de spam.</p>
<p>Se você pagou com Pix, a compra é confirmada quando a Stripe confirmar o pagamento, normalmente em instantes. Confirmaremos por e-mail; os prazos contam dessa confirmação.</p>
<h2>Próximos passos</h2>
<p>1. Após a confirmação do pagamento pela Stripe, pedimos por e-mail o CNPJ e, se necessário, somente o total de empregados ativos na data da compra. Não envie CPF ou dados individuais de trabalhadores.</p>
<p>2. A emissão da nota é prevista para até 1 dia útil após a confirmação do pagamento, se os dados fiscais necessários estiverem disponíveis e corretos e a empresa for elegível. Sem o CNPJ, a faixa confirmada e a nota emitida corretamente, não iniciamos o serviço. Se a nota não puder ser emitida corretamente até o primeiro limite entre 3 dias úteis após a confirmação do pagamento e o encerramento do mês dessa confirmação, às 23h59 no horário de Brasília (America/Sao_Paulo, UTC-3), cancelamos a compra e providenciamos estorno integral na forma do item 6.16 dos Termos, sem pedido seu.</p>
<p>3. Com a nota emitida e a elegibilidade confirmada, enviamos por e-mail em até 1 dia útil o kit e as instruções para aplicação interna pela empregadora. A LCM só recebe arquivo novo de resultados agregados e protegidos, nunca respostas individuais. Google Forms não é utilizado nesta modalidade.</p>
<p>4. ${PRAZO_RELATORIO}</p>
${ARREPENDIMENTO_ED1.map((p) => '<p>' + p + '</p>').join('\n')}
<p>Dúvidas: <a href="mailto:contato@contacertabr.com.br">contato@contacertabr.com.br</a>. Atendimento só por e-mail.</p>
<p>Condições de venda: <a href="${LINK_TERMOS_VENDA}">Termos de Uso, item 6</a> · <a href="/privacidade/">Política de Privacidade</a></p>
</section>`,
});

pagina({
  caminho: 'empregador-em-dia/painel/',
  titulo: 'Acompanhamento | Empregador em Dia',
  desc: 'Acompanhamento do pedido do Empregador em Dia — avaliação rápida NR-1.',
  conteudo: `<section data-ed-e3="login" id="ed-painel">
<p class="ed-selo">dados de exemplo</p>
<h1>${NOME_PRODUTO} · <span data-ed="pn-empresa">Farmácia Boa</span></h1>
<p>Pedido <span data-ed="pn-pedido">ED-2026-10-0087</span> · iniciado em <span data-ed="pn-inicio">27/10/2026</span></p>
<nav class="ed-menu" aria-label="Painel"><a href="#andamento">Andamento</a><a href="#respostas">Respostas</a><a href="#relatorio">Relatório</a><a href="#pagamentos">Pagamentos</a><a href="/contato/">Ajuda</a></nav>
<ul class="ed-cartoes" id="andamento">
<li id="respostas"><strong>Respostas</strong><span data-ed="pn-resp">26 de 34</span><span data-ed="pn-pct"></span></li>
<li><strong>Etapa</strong><span>Análise das respostas</span></li>
<li id="relatorio"><strong>Entrega prevista</strong><span data-ed="pn-entrega">conforme o prazo do contrato</span></li>
<li id="pagamentos"><strong>Pagamento</strong><span>à vista</span></li>
</ul>
<h2>Linha do tempo</h2>
<ol class="ed-lista"><li>Contratado</li><li>Questionário enviado</li><li>70% de respostas</li><li>Análise e plano de ação</li><li>Relatório entregue</li><li>Depois: relatório pronto; validação opcional pelo seu profissional de SST</li></ol>
<p class="ed-sst" data-ed-sst></p>
</section>`,
});

console.log('ok', vUi);
