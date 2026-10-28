// Gera as 4 páginas do Empregador em Dia E2 (T01, T02, T03, T15) a partir do molde de
// tabelas-oficiais-2026/obrigado/index.html (cabeçalho, consentimento, rodapé). Rodar: node tests/_src/empregador/gerar.mjs
// Textos literais da v3.3 (4c21797f, p. 2-7 e 19) com as decisões do CEO (becbf681, 95a76e17), o parecer do
// Advogado (c23c3792) e o CFO (0619d010). Páginas noindex, fora do sitemap; com a flag OFF só o aviso aparece.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { FAIXAS } from '../../../assets/js/empregador/config.js';

const raiz = fileURLToPath(new URL('../../../', import.meta.url));
const molde = readFileSync(join(raiz, 'tabelas-oficiais-2026/obrigado/index.html'), 'utf8');
const ver = (p) => createHash('sha256').update(readFileSync(join(raiz, p))).digest('hex').slice(0, 10);
const [head0, resto] = molde.split('</head>');
const corpoIni = resto.slice(0, resto.indexOf('<main'));
const rodape = resto.slice(resto.indexOf('</main>') + '</main>'.length);
const ORIG = 'https://contacertabr.com.br';
const vUi = ver('assets/js/empregador/ui.js');
const vCss = ver('assets/js/empregador/ed.css');

function pagina({ caminho, titulo, desc, conteudo }) {
  const url = `${ORIG}/${caminho}`;
  let h = head0
    .replace(/<title>[^<]*<\/title>/, `<title>${titulo}</title>`)
    .replaceAll('Planilha Tabelas oficiais 2026 | Conta Certa', titulo)
    .replaceAll('Download da planilha Tabelas oficiais 2026 do Conta Certa.', desc)
    .replaceAll(`${ORIG}/tabelas-oficiais-2026/obrigado/`, url);
  h = h.replace('<link rel="stylesheet" href="/assets/style.css', `<link rel="stylesheet" href="/assets/js/empregador/ed.css?v=${vCss}">\n<link rel="stylesheet" href="/assets/style.css`);
  const main = `<main id="conteudo" class="caixa ed">
<p class="ed-selo">simulação · dados de exemplo</p>
<section id="ed-off" class="ed-off"><h1>Empregador em Dia</h1><p>Esta página está em preparação e ainda não está disponível.</p><p><a href="/nr1-riscos-psicossociais/">Leia sobre a NR-1 e os riscos psicossociais</a>.</p></section>
<div id="ed-app" hidden>
<nav class="ed-menu" aria-label="Empregador em Dia"><a href="/nr1-riscos-psicossociais/">NR-1</a><a href="/empregador-em-dia/jornada-42h/">Jornada 42h</a><a href="/empregador-em-dia/#preco">Preço</a></nav>
${conteudo}
<nav class="ed-rodape" aria-label="Empregador em Dia: links"><span>Conta Certa · Empregador em Dia</span><a href="/termos/">Termos de uso</a><a href="/privacidade/">Privacidade</a><a href="/contato/">Ajuda</a><a href="/contato/">Contato</a></nav>
</div>
<script type="module" src="/assets/js/empregador/ui.js?v=${vUi}"></script>
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
  titulo: 'Empregador em Dia: NR-1 e riscos psicossociais no PGR | Conta Certa',
  desc: 'Sua empresa em dia com a NR-1, sem montar planilha: questionário anônimo, inventário e plano de ação para o PGR.',
  conteudo: `<section class="ed-hero" data-ed-tela="1">
<p class="cat-pill">NR-1: riscos psicossociais no PGR</p>
<h1>Sua empresa em dia com a NR-1, sem montar planilha</h1>
<p class="lead">A NR-1 agora pede que a empresa avalie estresse, sobrecarga e assédio no trabalho (desde 26/05/2026; as multas sobre esse ponto estão suspensas provisoriamente pelo STF na ADPF 1316, mas a obrigação de avaliar continua). A gente aplica o questionário anônimo e você recebe o inventário e o plano de ação para o PGR. A validação por profissional de segurança do trabalho está em definição.</p>
<p><a class="btn" href="/empregador-em-dia/avaliacao-rapida-nr1/">Ver o que minha empresa precisa</a></p>
<h2>O que você recebe</h2>
<ul class="ed-lista"><li>Questionário anônimo para os funcionários, por link</li><li>Inventário de riscos psicossociais para o PGR</li><li>Plano de ação com prazos e responsáveis</li><li>Relatório com o resultado do grupo para anexar ao PGR</li></ul>
<p class="ed-sst" data-ed-sst></p>
</section>
<ul class="ed-cartoes" id="preco">
<li><strong>De 20 a 200 funcionários</strong><span>Preço fechado pela faixa de funcionários.</span></li>
<li><strong>Metade agora, metade na entrega</strong><span>Você só paga o resto quando receber o relatório.</span></li>
<li><a href="/empregador-em-dia/jornada-42h/"><strong>Grátis: simulador da jornada 42h</strong><span>Veja quanto custaria reduzir a jornada.</span></a></li>
</ul>
<p><a class="btn" href="/empregador-em-dia/avaliacao-rapida-nr1/">Ver o que minha empresa precisa</a></p>`,
});

pagina({
  caminho: 'empregador-em-dia/avaliacao-rapida-nr1/',
  titulo: 'Avaliação rápida NR-1 da sua empresa | Empregador em Dia',
  desc: 'Três perguntas de rotina para saber o que sua empresa precisa para a NR-1.',
  conteudo: `<form class="ed-form" id="ed-diag" novalidate>
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
<p class="ajuda" id="aj-recl"><small>Fica só entre você e o profissional de SST. Exemplo: uma queixa no RH no último ano.</small></p>
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
<div class="ed-oferta"><h2>Adequação NR-1 para <span data-ed="porte2"></span></h2><p class="ed-preco" data-ed="preco"></p><p data-ed="parcelas"></p><p class="ed-sst" data-ed-sst></p>
<p><button type="button" class="btn" data-ed-contratar disabled>Contratar</button></p></div>
<p>Prazo: definido com o profissional de SST após o questionário.</p></section>
<section data-ed-res="simplificada" hidden><h1>Empresas pequenas podem ter regras mais simples na NR-1</h1>
<p>MEI e microempresas ou empresas de pequeno porte de grau de risco 1 ou 2, sem exposição a agentes físicos, químicos ou biológicos conforme a NR-9, podem ficar dispensadas de elaborar o PGR (NR-1, itens 1.8). A dispensa vale só para o documento: as demais obrigações continuam. Este serviço foi pensado para 20 a 200 funcionários.</p>
<ul class="ed-cartoes"><li><strong>Guia gratuito para pequenas empresas</strong><span>Checklist de 1 página com o que avaliar, um modelo de plano de ação e como anexar ao PGR.</span><button type="button" class="btn" disabled>Receber o guia por e-mail</button></li>
<li><form class="ed-form" id="ed-avise" novalidate><strong>Vai passar de 20 funcionários?</strong><span>Avisamos quando fizer sentido contratar a adequação completa.</span>
<label for="ed-email">Seu e-mail</label><input type="email" id="ed-email" name="email" autocomplete="email" placeholder="dono@lojaexemplo.com.br" aria-describedby="aj-email aviso-lgpd-avise"><small id="aj-email">Exemplo: o e-mail que você mais usa.</small><small id="aviso-lgpd-avise">Usamos seu e-mail só para avisar quando a adequação fizer sentido para a sua empresa. Você pode pedir para sair a qualquer momento. Detalhes na <a href="/privacidade/">Política de privacidade</a>.</small>
<button type="submit" disabled class="btn">Me avise</button></form></li></ul>
<p><a href="/contato/">Quer mesmo assim a adequação completa? Fale com a gente.</a></p></section>
<section data-ed-res="sob-consulta" hidden><h1>Para mais de 200 funcionários, fazemos um orçamento</h1>
<p>Com várias unidades ou turnos, o questionário e a análise mudam. Orçamento sob medida, caso a caso.</p>
<p class="ed-sst" data-ed-sst></p>
<p><button type="button" class="btn" data-ed-orcamento disabled>Pedir orçamento</button></p></section>`,
});

pagina({
  caminho: 'empregador-em-dia/jornada-42h/',
  titulo: 'Simulador da jornada de 42 horas: quanto custa | Empregador em Dia',
  desc: 'Simulador grátis: quanto custaria reduzir a jornada para 42 horas por semana, com a conta aberta.',
  conteudo: `<p class="cat-pill">Simulador grátis</p>
<h1>Quanto custaria reduzir a jornada para 42 horas por semana?</h1>
<p class="ed-aviso" role="note">A Emenda Constitucional 141/2026 reduz a jornada máxima para 42 horas por semana a partir de 16/12/2026 e para 40 horas a partir de 16/12/2027, sem redução de salário. Esta simulação é uma estimativa e não substitui a análise do seu contrato ou da convenção coletiva.</p>
<form class="ed-form" id="ed-jornada" novalidate>
<div class="campo"><label for="f-func">Funcionários em jornada integral</label><div class="entrada"><input type="text" inputmode="numeric" autocomplete="off" id="f-func" name="funcionarios" value="34" aria-describedby="aj-func f-func-msg"></div><p class="ajuda" id="aj-func"><small>Veja no contrato ou na folha. Exemplo: todos da loja trabalham em jornada integral, digite o total.</small></p><p class="campo-msg" id="f-func-msg" hidden></p></div>
<fieldset><legend>Salário médio desses funcionários</legend><div class="ed-ops">${radio('faixaSalario', [['ate2', 'Até R$ 2 mil'], ['2a3', 'R$ 2 mil a R$ 3 mil'], ['3a5', 'R$ 3 mil a R$ 5 mil'], ['gt5', 'Acima de R$ 5 mil']], 'aj-sal').replace('value="2a3"', 'value="2a3" checked')}</div>
<p class="ajuda" id="aj-sal"><small>Valor da carteira, sem descontos. Exemplo: a maioria ganha R$ 2.400.</small></p></fieldset>
<p><label class="ed-op"><input type="checkbox" id="f-dom" name="domestico"> Sou empregador doméstico</label></p>
<p class="ed-aviso" data-ed="nota-dom" hidden></p>
<button type="submit" disabled class="btn">Calcular</button>
</form>
<section class="ed-conta" aria-live="polite"><h2>Como chegamos no valor</h2>
<table class="ed-tab"><caption>Etapa de 42 horas, a partir de 16/12/2026</caption><tbody>
<tr><th scope="row">Salário médio (meio da faixa)</th><td data-ed="salario"></td></tr>
<tr><th scope="row">Valor da hora (salário ÷ <span data-ed="div42">210</span> horas, cálculo pelo método da CLT (art. 64))<br><small>Divisor pelo método do art. 64 da CLT. A convenção coletiva da categoria pode adotar outro.</small></th><td data-ed="hora42"></td></tr>
<tr><th scope="row">Horas a cobrir por mês (2h × 52 semanas ÷ 12)</th><td data-ed="horas42"></td></tr>
<tr><th scope="row">Custo por funcionário, como hora extra (+50%)</th><td data-ed="func42"></td></tr>
<tr><th scope="row">Total para <span data-ed="n"></span> funcionários</th><td data-ed="total42"></td></tr>
</tbody></table>
<table class="ed-tab"><caption>Etapa de 40 horas, a partir de 16/12/2027</caption><tbody>
<tr><th scope="row">Valor da hora (salário ÷ <span data-ed="div40">200</span> horas, cálculo pelo método da CLT (art. 64))<br><small>Divisor pelo método do art. 64 da CLT. A convenção coletiva da categoria pode adotar outro.</small></th><td data-ed="hora40"></td></tr>
<tr><th scope="row">Horas a cobrir por mês (4h × 52 semanas ÷ 12)</th><td data-ed="horas40"></td></tr>
<tr><th scope="row">Custo por funcionário, como hora extra (+50%)</th><td data-ed="func40"></td></tr>
<tr><th scope="row">Total para <span data-ed="n2"></span> funcionários</th><td data-ed="total40"></td></tr>
</tbody></table>
<p><small>O adicional de 50% é o mínimo da Constituição (art. 7º, XVI); a convenção coletiva pode prever um adicional maior. A conta mostra um cenário: a empresa mantém 44 horas por semana em 5 dias, respeitando os 2 dias de repouso semanal exigidos a partir de 16/12/2026 e o limite de 2 horas extras por dia (CLT, art. 59), e paga como extra as horas acima do novo limite. Não é uma recomendação: hora extra fixa todo mês tem efeitos trabalhistas e pode ser questionada. Reduzir a jornada, reorganizar escalas ou contratar são alternativas. O valor não inclui os reflexos das horas extras habituais no descanso semanal remunerado, nas férias com 1/3, no 13º e no FGTS, nem os encargos sobre a folha (INSS patronal, RAT e terceiros). Por isso é um valor mínimo: o custo real tende a ser maior. Valores sem encargos e reflexos (FGTS, INSS, DSR, férias e 13º). Para "Acima de R$ 5 mil" usamos R$ 5.000,00. Nenhuma faixa fica abaixo do salário mínimo de 2026 (R$ 1.621,00). Para MEI, microempresas e empresas de pequeno porte, uma lei complementar ainda poderá criar regras de transição, ligadas à manutenção de empregos. Até lá, valem as datas acima.</small></p>
</section>
<section class="ed-oferta"><h2>Já que está revendo a jornada, a NR-1 também mudou</h2>
<p>Avalie riscos de sobrecarga no PGR. A partir de <span data-ed="preco-min"></span> para 20 a 50 funcionários.</p>
<p><a class="btn" href="/empregador-em-dia/">Ver a adequação NR-1</a></p></section>`,
});
// N-1 (CPO/NR-1): preços da tabela no HTML estático, a partir de FAIXAS (config.js); mesmo formato do brl() de ui.js.
const precoEstatico = (id) => FAIXAS.find((f) => f.id === id).preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).replace(/\s/g, ' ');
pagina({
  caminho: 'empregador-em-dia/orcamento-nr1/',
  titulo: 'Pedir orçamento NR-1 | Empregador em Dia',
  desc: 'Formulário de pedido de orçamento da adequação NR-1 para empresas com mais de 200 funcionários.',
  conteudo: `<h1>Orçamento do serviço NR-1</h1>
<table class="ed-tab"><caption>Preços do serviço NR-1</caption><thead><tr><th scope="col">Funcionários</th><th scope="col">Preço</th></tr></thead><tbody>
<tr><th scope="row">20 a 50</th><td data-ed="orc-preco-20-50">${precoEstatico('20-50')}</td></tr>
<tr><th scope="row">51 a 100</th><td data-ed="orc-preco-51-100">${precoEstatico('51-100')}</td></tr>
<tr><th scope="row">101 a 200</th><td data-ed="orc-preco-101-200">${precoEstatico('101-200')}</td></tr>
<tr><th scope="row">Mais de 200</th><td>Orçamento sob medida</td></tr>
</tbody></table>
<p>Pagamento: 50% no início e 50% na entrega, ou tudo à vista.</p>
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
console.log('ok', vUi, vCss);
