// Gera as páginas do Empregador em Dia E2 (T01, T02, T03, T15) e E3 (T05-T08, T10, T12) a partir do molde de
// tabelas-oficiais-2026/obrigado/index.html (cabeçalho, consentimento, rodapé). Rodar: node tests/_src/empregador/gerar.mjs
// Textos literais da v3.3 (4c21797f, p. 2-7 e 19) com as decisões do CEO (becbf681, 95a76e17), o parecer do
// Advogado (c23c3792) e o CFO (0619d010). Com a flag OFF só o aviso aparece. DEC CPO 31/10 (PR #56): landing, avaliação rápida e jornada 42h
// indexáveis (ADENDO Advogado 7ec7825b: preços só com checkout) e no sitemap; as demais (preços, resultado, orçamento, contratar, pagamento, painel) seguem noindex.
import { readFileSync, writeFileSync, mkdirSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { FLAGS } from '../../../assets/js/empregador/config.js';
import { TEXTO_ACEITE, LINHA_ANTES_STRIPE, LINK_TERMOS_VENDA, NOME_PRODUTO, htmlAnexoEd1, INICIO_SERVICO, PRAZO_RELATORIO, ARREPENDIMENTO_ED1 } from '../../../assets/js/empregador/textos-checkout.js';

const raiz = fileURLToPath(new URL('../../../', import.meta.url));
const molde = readFileSync(join(raiz, 'tabelas-oficiais-2026/obrigado/index.html'), 'utf8');
const ver = (p) => createHash('sha256').update(readFileSync(join(raiz, p))).digest('hex').slice(0, 10);
const [head0, resto] = molde.split('</head>');
const corpoIni = resto.slice(0, resto.indexOf('<main'));
const rodape = resto.slice(resto.indexOf('</main>') + '</main>'.length);
const ORIG = 'https://contacertabr.com.br';
const vUi = ver('assets/js/empregador/ui.js');
const vCfg = ver('assets/js/empregador/config.js');
// ed.css vai inline (QA B-PR42-09: sem CSS extra bloqueando a renderização).
const cssEd = readFileSync(join(raiz, 'assets/js/empregador/ed.css'), 'utf8').trim();
// O script de checkout só entra com a flag ON. O link deste SHA está vazio, então o botão não libera.
const CLS_CHECKOUT_CSS = '<style>html[data-ed-checkout="on"] #ed-off{display:none!important}html[data-ed-checkout="on"] #ed-app[hidden]{display:block!important}html[data-ed-checkout="on"] .ed-pagar[hidden]{display:inline-flex!important}</style>';
const clsCheckoutAntes = () => `<script>(function(){try{var x=new XMLHttpRequest();x.open('GET','/assets/js/empregador/config.js?v=${vCfg}',false);x.send();var t=x.responseText||'';var link=(/ED_PAYMENT_LINK_20_50 = '([^']*)'/.exec(t)||[])[1]||'';var modo=(/ED_PAGAMENTO_MODO = '([^']*)'/.exec(t)||[])[1];if(/ED_CHECKOUT:\\s*true/.test(t)&&modo==='link'&&link.length>0&&link.indexOf('/test_')<0)document.documentElement.setAttribute('data-ed-checkout','on');}catch(e){}})();</script>\n`;
const clsCheckoutDepois = '<script>if(document.documentElement.getAttribute(\'data-ed-checkout\')===\'on\'){var o=document.getElementById(\'ed-off\'),a=document.getElementById(\'ed-app\');if(o)o.hidden=true;if(a)a.hidden=false;var b=document.querySelector(\'[data-ed-pagar]\');if(b)b.hidden=false;}</script>\n';

const INDEXAVEIS = ['empregador-em-dia/', 'empregador-em-dia/jornada-42h/'];
const TITULO_OFF = {
  'empregador-em-dia/orcamento-nr1/': 'Pedir orçamento | Empregador em Dia',
};
// DEC CEO 11/11 19h20 e parecer ADV 8cb75b8d §8: com a flag OFF o HTML servido é só o aviso.
export const AVISO_ED = 'Esta página está em preparação e ainda não está disponível.';
export const DESC_NEUTRA = 'Empregador em Dia: serviço em preparação, ainda não disponível para contratação.';
export const TITLE_PRECOS = 'Empregador em Dia: em preparação';
const META_PROIBIDA = /inventário|plano de ação|adequação|metade|parcela|questionário anônimo/i;
const DESC_NEUTRA_SEMPRE = new Set([
  'empregador-em-dia/',
  'empregador-em-dia/precos/',
  'empregador-em-dia/avaliacao-rapida-nr1/',
  'empregador-em-dia/avaliacao-rapida-nr1/resultado/',
  'empregador-em-dia/jornada-42h/',
  'empregador-em-dia/pagamento/',
  'empregador-em-dia/pagamento/ok/',
  'empregador-em-dia/contratar/',
  'empregador-em-dia/orcamento-nr1/',
  'empregador-em-dia/painel/',
]);
const TITULO_PREPARACAO = new Set([
  'empregador-em-dia/precos/',
  'empregador-em-dia/avaliacao-rapida-nr1/',
  'empregador-em-dia/avaliacao-rapida-nr1/resultado/',
  'empregador-em-dia/jornada-42h/',
]);
const estado = { flag: FLAGS.EMPREGADOR_EM_DIA, escrever: false, saida: [] };

function pagina({ caminho, titulo, desc, conteudo, selo = true }) {
  const flag = estado.flag;
  const url = `${ORIG}/${caminho}`;
  let tituloFinal = titulo;
  let descFinal = desc;
  if (!flag) {
    if (TITULO_PREPARACAO.has(caminho)) tituloFinal = TITLE_PRECOS;
    else if (TITULO_OFF[caminho]) tituloFinal = TITULO_OFF[caminho];
    else if (META_PROIBIDA.test(titulo)) throw new Error(`title com termo proibido em ${caminho}: ${titulo}`);
    if (DESC_NEUTRA_SEMPRE.has(caminho) || META_PROIBIDA.test(desc)) descFinal = DESC_NEUTRA;
  }
  let h = head0
    .replace(/<title>[^<]*<\/title>/, `<title>${tituloFinal}</title>`)
    .replaceAll('Planilha Tabelas oficiais 2026 | Conta Certa', tituloFinal)
    .replaceAll('Download da planilha Tabelas oficiais 2026 do Conta Certa.', descFinal)
    .replaceAll(`${ORIG}/tabelas-oficiais-2026/obrigado/`, url);
  if (flag && INDEXAVEIS.includes(caminho)) h = h.replace('<meta name="robots" content="noindex, nofollow">', '<meta name="robots" content="index, follow, max-image-preview:large">');
  if (flag && caminho === 'empregador-em-dia/avaliacao-rapida-nr1/') h = h.replace('<meta name="robots" content="noindex, nofollow">', '<meta name="robots" content="noindex, follow">');
  if (!flag) h = h.replace(/<meta name="robots" content="[^"]*">/, '<meta name="robots" content="noindex">');
  const checkout = /id="ed-pagamento"|id="ed-contratar"/.test(conteudo);
  if (flag && checkout) h = h.replace(/(<link rel="stylesheet" href="\/assets\/style\.css\?v=[0-9a-f]+">)/, `$1\n${CLS_CHECKOUT_CSS}`);
  h = h.replace('<link rel="stylesheet" href="/assets/style.css', `<style>${cssEd}</style>\n<link rel="stylesheet" href="/assets/style.css`);
  // NB-05 (CLS): com a flag ON o HTML sai no estado final das flags. Com a página liberada, #ed-app vem visível e #ed-off oculto.
  // PR-0: com a flag OFF o #ed-app e o texto de venda não entram no HTML servido.
  let main;
  if (!flag) {
    main = `<main id="conteudo" class="caixa ed">
<section id="ed-off" class="ed-off"><p class="ed-off-t"><strong>Empregador em Dia</strong></p><p>${AVISO_ED}</p><p><a href="/nr1-riscos-psicossociais/">Leia sobre a NR-1 e os riscos psicossociais</a>.</p></section>
</main>`;
  } else {
    const liberada = true
      && !(/id="ed-orc"/.test(conteudo) && !FLAGS.ED_ORCAMENTO_NR1)
      && !(/data-ed-e3="checkout"/.test(conteudo) && !FLAGS.ED_CHECKOUT)
      && !(/data-ed-e3="login"/.test(conteudo) && !FLAGS.ED_LOGIN);
    main = `<main id="conteudo" class="caixa ed">
${selo ? '<p class="ed-selo">simulação · dados de exemplo</p>' : ''}${checkout ? clsCheckoutAntes() : ''}<section id="ed-off" class="ed-off"${liberada ? ' hidden' : ''}><p class="ed-off-t"><strong>Empregador em Dia</strong></p><p>${AVISO_ED}</p><p><a href="/nr1-riscos-psicossociais/">Leia sobre a NR-1 e os riscos psicossociais</a>.</p></section>
<div id="ed-app"${liberada ? '' : ' hidden'}>
<nav class="ed-menu" aria-label="Empregador em Dia"><a href="/nr1-riscos-psicossociais/">NR-1</a><a href="/empregador-em-dia/jornada-42h/">Jornada 42h</a><a href="/empregador-em-dia/#preco">Preço</a></nav>
${conteudo}
<nav class="ed-rodape" aria-label="Empregador em Dia: links"><span>Conta Certa · Empregador em Dia</span><a href="/termos/">Termos de uso</a><a href="/privacidade/">Privacidade</a><a href="/contato/">Ajuda</a><a href="/contato/">Contato</a></nav>
</div>
${checkout ? clsCheckoutDepois : ''}<script>(()=>{let f=0;const ir=()=>{if(f++)return;import('/assets/js/empregador/ui.js?v=${vUi}')},ocioso=()=>window.requestIdleCallback?requestIdleCallback(ir,{timeout:1500}):setTimeout(ir,1);addEventListener('load',()=>{let t=setTimeout(ocioso,600);try{new PerformanceObserver(()=>{clearTimeout(t);t=setTimeout(ocioso,600)}).observe({type:'largest-contentful-paint',buffered:true})}catch{}setTimeout(ir,3000)},{once:true})})()</script>
</main>`;
  }
  let out = `${h}</head>${corpoIni}${main}${rodape}`;
  // Sprite só com os símbolos usados, na ordem do primeiro uso (fonte-seo.test.mjs, sprite()).
  const sm = out.match(/<svg class="sprite"[^>]*>((?:<symbol\b[^]*?<\/symbol>)*)<\/svg>/);
  const depois = out.slice(sm.index + sm[0].length);
  const simbolos = new Map([...sm[1].matchAll(/<symbol id="([^"]+)"[^]*?<\/symbol>/g)].map((m) => [m[1], m[0]]));
  const usados = [...new Set([...depois.matchAll(/href="#(i-[\w-]+)"/g)].map((m) => m[1]))].filter((i) => simbolos.has(i));
  out = out.replace(sm[0], sm[0].replace(sm[1], usados.map((i) => simbolos.get(i)).join('')));
  estado.saida.push({ caminho, html: out });
  if (estado.escrever) {
    mkdirSync(join(raiz, caminho), { recursive: true });
    writeFileSync(join(raiz, caminho, 'index.html'), out);
  }
  return out;
}

function montarPaginas() {
const radio = (nome, opcoes, ajudaId) => opcoes.map(([v, t]) =>
  `<label class="ed-op"><input type="radio" name="${nome}" value="${v}" aria-describedby="${ajudaId}"> ${t}</label>`).join('');
const check = (nome, opcoes, ajudaId) => opcoes.map(([v, t]) =>
  `<label class="ed-op"><input type="checkbox" name="${nome}" value="${v}" aria-describedby="${ajudaId}"> ${t}</label>`).join('');

pagina({
  caminho: 'empregador-em-dia/',
  titulo: 'Empregador em Dia: NR-1 e riscos psicossociais no PGR',
  desc: 'Apoio para a sua empresa trabalhar a NR-1, faixa de 40 a 50 empregados: sua empresa aplica o questionário internamente e recebe um relatório orientativo dos resultados agregados. Não substitui o PGR.',
  selo: false,
  conteudo: `<section class="ed-hero" data-ed-tela="1">
<p class="cat-pill">NR-1: riscos psicossociais no PGR</p>
<h1>Apoio para a sua empresa trabalhar a NR-1</h1>
<p class="lead">A NR-1 agora inclui os fatores de risco psicossociais relacionados ao trabalho, como sobrecarga e assédio, no gerenciamento de riscos da empresa (desde 26/05/2026). As multas e sanções baseadas nesse ponto estão suspensas provisoriamente pelo STF na ADPF 1316 (situação conferida em 12/11/2026, sem data final divulgada); a obrigação de identificar e avaliar esses riscos continua. Sua empresa aplica o questionário internamente, com o nosso material, e nos envia só resultados agregados e protegidos. Você recebe um relatório orientativo com esses resultados, as limitações e sugestões de referência para ações. O relatório não é inventário de riscos, plano de ação, PGR, laudo nem avaliação psicológica: esses itens são da sua empresa, que define os responsáveis, com conhecimento técnico adequado e, quando a lei exigir, profissional legalmente habilitado. Serviços e responsabilidade técnica de SST não estão incluídos no preço. A sua empresa deve verificar, com profissional legalmente habilitado quando exigido, quais avaliações, documentos e validações são necessários, e contratá-los diretamente.</p>
<p id="aviso-lc13">Aviso sobre o questionário: o questionário do Empregador em Dia (questionário de aplicação interna com até 24 itens, agrupados por fator, em escala de 5 pontos; resultados agregados por pergunta e por fator em faixas orientativas, com agrupamento em 3 faixas, modelo ED-3F-1.0, quando necessário para proteger o anonimato de quem respondeu) foi preparado pelo Conta Certa como material de apoio. Ele não é instrumento psicométrico validado cientificamente nem homologado por órgão ou instituição de segurança e saúde no trabalho, e o resultado não é avaliação psicológica, diagnóstico de saúde nem classificação de risco. O Manual de GRO/PGR do Ministério do Trabalho e Emprego orienta que a ferramenta específica usada na avaliação de riscos psicossociais tenha validação científica e seja aplicada e interpretada por profissional qualificado no método. Por isso, o questionário e o relatório não substituem a avaliação de riscos psicossociais da sua empresa no GRO/PGR. Cabe à sua empresa escolher as ferramentas adequadas e os responsáveis, e decidir se e como usar estes resultados.</p>
<p><a class="btn" href="/empregador-em-dia/avaliacao-rapida-nr1/">Ver o que minha empresa precisa</a></p>
<h2>O que você recebe</h2>
<ul class="ed-lista"><li>Instruções para a sua empresa aplicar o questionário internamente</li><li>Material e instruções para a coleta interna do questionário pela sua empresa</li><li>Modelo para enviar só resultados agregados e protegidos</li><li>Relatório orientativo com resultados agregados e protegidos, limitações e sugestões de referência para ações</li><li>Relatório orientativo com resultados agregados e protegidos. Os resultados precisam ser analisados pela sua empresa, com os responsáveis que ela definir, e integrados à avaliação de riscos do GRO/PGR.</li><li>Lembrete de revisão: a NR-1 pede revisar a avaliação de riscos pelo menos a cada 2 anos</li></ul><p>Não inclui inventário de riscos, plano de ação, PGR, laudo nem avaliação psicológica. Esses itens são da sua empresa, que define os responsáveis, com conhecimento técnico adequado e, quando a lei exigir, profissional legalmente habilitado. O relatório é preparado com apoio de inteligência artificial, não é elaborado, revisado nem assinado por profissional legalmente habilitado em segurança do trabalho, medicina ou psicologia, e não vem com Anotação de Responsabilidade Técnica (ART).</p><p><a href="#aviso-lc13">Questionário de apoio, não validado cientificamente. Não substitui a avaliação de riscos psicossociais do PGR.</a></p>
<p class="ed-sst" data-ed-sst></p>
</section>
<ul class="ed-cartoes" id="preco">
<li><strong>De 40 a 50 empregados. Preço fechado para esta faixa. Para haver resultado, são precisas pelo menos 28 respostas válidas; com menos, a maior parte das perguntas pode ficar sem resultado.</strong></li>
<li><span>R$ 1.490,00 à vista, tributos incluídos, por cartão de crédito ou Pix.</span></li>
<li><strong>51 a 200 funcionários</strong><span>Em breve.</span></li>
<li><a href="/empregador-em-dia/jornada-42h/"><strong>Grátis: simulador da jornada 42h</strong><span>Veja quanto custaria reduzir a jornada.</span></a></li>
</ul>
<p>Aviso sobre o questionário: o questionário do Empregador em Dia (questionário de aplicação interna com até 24 itens, agrupados por fator, em escala de 5 pontos; resultados agregados por pergunta e por fator em faixas orientativas, com agrupamento em 3 faixas, modelo ED-3F-1.0, quando necessário para proteger o anonimato de quem respondeu) foi preparado pelo Conta Certa como material de apoio. Ele não é instrumento psicométrico validado cientificamente nem homologado por órgão ou instituição de segurança e saúde no trabalho, e o resultado não é avaliação psicológica, diagnóstico de saúde nem classificação de risco. O Manual de GRO/PGR do Ministério do Trabalho e Emprego orienta que a ferramenta específica usada na avaliação de riscos psicossociais tenha validação científica e seja aplicada e interpretada por profissional qualificado no método. Por isso, o questionário e o relatório não substituem a avaliação de riscos psicossociais da sua empresa no GRO/PGR. Cabe à sua empresa escolher as ferramentas adequadas e os responsáveis, e decidir se e como usar estes resultados.</p>
<p><a class="btn" href="/empregador-em-dia/avaliacao-rapida-nr1/">Ver o que minha empresa precisa</a></p>`,
});

pagina({
  caminho: 'empregador-em-dia/avaliacao-rapida-nr1/',
  titulo: 'O que sua empresa precisa para trabalhar a NR-1 | Empregador em Dia',
  desc: 'Responda três perguntas sobre a sua empresa e veja pontos de atenção para a sua empresa trabalhar a NR-1. Resultado orientativo, na hora. Não é a avaliação de riscos do PGR nem garante conformidade.',
  conteudo: `<h1>Apoio para a sua empresa trabalhar a NR-1</h1>
<p>Esta é uma triagem gratuita e orientativa. Não é a avaliação de riscos psicossociais da NR-1.</p>
<form class="ed-form" id="ed-diag" novalidate>
<fieldset data-passo="1"><legend><span class="ed-passo">Passo 1 de 3</span> Quantas pessoas trabalham na empresa?</legend>
<p>Conte quem tem carteira assinada. O preço sai daqui.</p>
<p class="ed-rotulo">Funcionários com carteira</p>
<div class="ed-ops">${radio('faixa', [['lt20', 'Menos de 20'], ['20-50', '40 a 50'], ['51-100', '51 a 100'], ['101-200', '101 a 200'], ['gt200', 'Mais de 200']], 'aj-faixa')}</div>
<p class="ajuda" id="aj-faixa"><small>Use o número da última folha de pagamento. Exemplo: 34 funcionários na folha de setembro, escolha "40 a 50". Não conte sócios nem prestadores PJ.</small></p>
</fieldset>
<fieldset data-passo="2" hidden><legend><span class="ed-passo">Passo 2 de 3</span> Como é o trabalho na sua empresa?</legend>
<p>Marque o que existe hoje.</p>
<p class="ed-rotulo">Onde as pessoas trabalham</p>
<div class="ed-ops">${check('onde[]', [['escritorio', 'Escritório'], ['loja', 'Loja ou atendimento ao público'], ['rua', 'Na rua (entregas, visitas)'], ['fabrica', 'Fábrica ou obra']], 'aj-onde')}</div>
<p class="ajuda" id="aj-onde"><small>Pode marcar mais de um. Exemplo: uma rede de farmácias marca "Loja ou atendimento ao público".</small></p>
<p class="ed-rotulo">Tem metas de venda ou de produção?</p>
<div class="ed-ops">${radio('metas', [['sim', 'Sim'], ['nao', 'Não'], ['asvezes', 'Às vezes']], 'aj-metas')}</div>
<p class="ajuda" id="aj-metas"><small>Metas que geram excesso de demandas (sobrecarga) são um dos fatores de risco psicossocial citados pelo guia do MTE. Exemplo: vendedores com meta mensal.</small></p>
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
  titulo: 'Resultado da triagem | Empregador em Dia',
  desc: 'Pontos de atenção para a sua empresa trabalhar a NR-1. Resultado orientativo; não é a avaliação de riscos do PGR nem garante conformidade.',
  conteudo: `<p class="ed-rotulo">Resultado da triagem</p>
<section data-ed-res="vazio"><h1>Faça primeiro a triagem gratuita do Empregador em Dia</h1><p><a class="btn" href="/empregador-em-dia/avaliacao-rapida-nr1/">Ver o que minha empresa precisa</a></p></section>
<section data-ed-res="oferta" hidden><h1>Sua empresa deve avaliar os riscos psicossociais no PGR</h1>
<ul class="ed-cartoes"><li><strong>Seu porte</strong><span data-ed="porte"></span></li><li><strong>Pontos de atenção</strong><span data-ed="pontos"></span></li><li><strong>PGR</strong><span data-ed="pgr"></span></li></ul>
<div class="ed-oferta"><h2>Empregador em Dia (apoio para a sua empresa trabalhar a NR-1) para <span data-ed="porte2"></span></h2><p class="ed-preco" data-ed="preco"></p><p data-ed="parcelas"></p><p data-ed-validade>Preços válidos até 31/12/2026.</p><p class="ed-sst" data-ed-sst></p><p class="ed-aviso-sst">O Conta Certa fornece o material do questionário, para aplicação interna pela sua empresa, e um relatório orientativo como apoio. Inventário de riscos, plano de ação e PGR são da sua empresa, que define os responsáveis, com conhecimento técnico adequado e, quando a lei exigir, profissional legalmente habilitado. Para inventário de riscos, plano de ação, PGR, laudo ou avaliação psicológica, procure diretamente um profissional ou uma empresa de SST da sua escolha; o Conta Certa não indica nem recebe comissão de fornecedores.</p>
<p><button type="button" class="btn" data-ed-contratar hidden disabled>Contratar</button></p></div>
<p>${INICIO_SERVICO}</p>
<p>${PRAZO_RELATORIO}</p></section>
<section data-ed-res="em-breve" hidden><h1>Em breve</h1></section>
<section data-ed-res="simplificada" hidden><h1>Empresas pequenas podem ter regras mais simples na NR-1</h1>
<p>O MEI está dispensado de elaborar o PGR (NR-1, item 1.8.1). As microempresas e empresas de pequeno porte de grau de risco 1 ou 2 que, no levantamento preliminar de perigos, não identificarem exposição a agentes físicos, químicos ou biológicos conforme a NR-9 e fizerem a declaração digital prevista na NR-1 ficam dispensadas de elaborar o PGR (item 1.8.4). A dispensa vale só para o documento: as demais obrigações continuam. Este serviço foi pensado para 40 a 50 empregados.</p>
<ul class="ed-cartoes"><li><strong>Guia gratuito para pequenas empresas</strong><span>Checklist de 1 página com o que avaliar, um modelo em branco de plano de ação para a sua empresa preencher e como anexar ao PGR.</span><button type="button" class="btn" disabled>Receber o guia por e-mail</button></li></ul>
<p><a href="/contato/">Quer mesmo assim um serviço sob medida? Fale com a gente.</a></p></section>
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
<p>Organize a coleta interna sobre sobrecarga para o PGR da sua empresa. A partir de <span data-ed="preco-min"></span> para 40 a 50 empregados.</p>
<p><a class="btn" href="/empregador-em-dia/">Empregador em Dia (apoio para a sua empresa trabalhar a NR-1)</a></p></section>`,
});

pagina({
  caminho: 'empregador-em-dia/orcamento-nr1/',
  titulo: 'Pedir orçamento | Empregador em Dia',
  desc: 'Formulário de contato do Empregador em Dia para empresas fora da faixa de 40 a 50 empregados. Esta faixa não está à venda neste momento.',
  conteudo: `<h1>Contato do Empregador em Dia</h1>
<p>Prazo: retorno em até 2 dias úteis, proposta em até 5 dias úteis.</p>
<form class="ed-form le-form" id="ed-orc" action="#" method="post" accept-charset="UTF-8" novalidate>
<label for="orc-empresa">Nome da empresa</label><input id="orc-empresa" data-orc-campo="empresa" autocomplete="organization" required aria-describedby="orc-empresa-ajuda"><small id="orc-empresa-ajuda">Digite o nome da empresa. Não consultamos o CNPJ em nenhuma base.</small>
<label for="orc-cnpj">CNPJ da empresa</label><input id="orc-cnpj" data-orc-campo="cnpj" inputmode="numeric" aria-describedby="orc-cnpj-ajuda"><small id="orc-cnpj-ajuda">Opcional. Ajuda a preparar a proposta.</small>
<label for="orc-faixa">Número de funcionários</label><select id="orc-faixa" data-orc-campo="faixa" required><option value="">Selecione</option><option>40 a 50</option><option>51 a 100</option><option>101 a 200</option><option>Mais de 200</option></select>
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
<button type="submit" disabled class="btn">Enviar mensagem</button>
</form>
<p id="ed-orc-msg" class="nota" role="alert" aria-live="assertive" hidden></p>`,
});

pagina({
  caminho: 'empregador-em-dia/precos/',
  titulo: 'Preço do Empregador em Dia (apoio para a sua empresa trabalhar a NR-1)',
  desc: 'Preço à vista do Empregador em Dia, faixa de 40 a 50 empregados (apoio para a sua empresa trabalhar a NR-1).',
  selo: false,
  conteudo: `<p>Aviso sobre o questionário: o questionário do Empregador em Dia (questionário de aplicação interna com até 24 itens, agrupados por fator, em escala de 5 pontos; resultados agregados por pergunta e por fator em faixas orientativas, com agrupamento em 3 faixas, modelo ED-3F-1.0, quando necessário para proteger o anonimato de quem respondeu) foi preparado pelo Conta Certa como material de apoio. Ele não é instrumento psicométrico validado cientificamente nem homologado por órgão ou instituição de segurança e saúde no trabalho, e o resultado não é avaliação psicológica, diagnóstico de saúde nem classificação de risco. O Manual de GRO/PGR do Ministério do Trabalho e Emprego orienta que a ferramenta específica usada na avaliação de riscos psicossociais tenha validação científica e seja aplicada e interpretada por profissional qualificado no método. Por isso, o questionário e o relatório não substituem a avaliação de riscos psicossociais da sua empresa no GRO/PGR. Cabe à sua empresa escolher as ferramentas adequadas e os responsáveis, e decidir se e como usar estes resultados.</p>
<h1 data-ed-e3="checkout">Preço fechado para 40 a 50 empregados</h1>
<ul class="ed-cartoes"><li data-ed-faixa="20-50"><span class="ed-sua" hidden>Sua faixa</span><strong>Sua faixa 40 a 50 empregados. Para haver resultado, são precisas pelo menos 28 respostas válidas; com menos, a maior parte das perguntas pode ficar sem resultado.</strong><span class="ed-preco">R$ 1.490</span><span>R$ 1.490,00 à vista, tributos incluídos.</span></li><li data-ed-faixa="51-100"><strong>51 a 100 funcionários</strong><span>Em breve.</span></li><li data-ed-faixa="101-200"><strong>101 a 200 funcionários</strong><span>Em breve.</span></li></ul>
<p>Menos de 20 funcionários: <a href="/empregador-em-dia/avaliacao-rapida-nr1/">veja a opção gratuita</a>. Mais de 200: <a href="/empregador-em-dia/orcamento-nr1/">Orçamento sob medida</a>.</p>
<p data-ed-validade>Preços válidos até 31/12/2026.</p>
<h2>O que o serviço entrega</h2>
<ul class="ed-lista"><li>Instruções para a sua empresa aplicar o questionário internamente</li><li>Material e instruções para a coleta interna do questionário pela sua empresa</li><li>Modelo para enviar só resultados agregados e protegidos</li><li>Relatório orientativo com resultados agregados e protegidos, limitações e sugestões de referência para ações</li><li>Relatório orientativo com resultados agregados e protegidos. Os resultados precisam ser analisados pela sua empresa, com os responsáveis que ela definir, e integrados à avaliação de riscos do GRO/PGR.</li><li>Lembrete de revisão: a NR-1 pede revisar a avaliação de riscos pelo menos a cada 2 anos</li></ul><p>Não inclui inventário de riscos, plano de ação, PGR, laudo nem avaliação psicológica. Esses itens são da sua empresa, que define os responsáveis, com conhecimento técnico adequado e, quando a lei exigir, profissional legalmente habilitado. O relatório é preparado com apoio de inteligência artificial, não é elaborado, revisado nem assinado por profissional legalmente habilitado em segurança do trabalho, medicina ou psicologia, e não vem com Anotação de Responsabilidade Técnica (ART).</p><p><a href="#aviso-lc13">Questionário de apoio, não validado cientificamente. Não substitui a avaliação de riscos psicossociais do PGR.</a></p>
<p>O PGR, o inventário de riscos e o plano de ação são da sua empresa, que define os responsáveis, com conhecimento técnico adequado e, quando a lei exigir, profissional legalmente habilitado. Não os elaboramos, assinamos nem validamos.</p>
<p class="ed-sst" data-ed-sst></p>
<p class="ed-aviso-sst">O Conta Certa fornece o material do questionário, para aplicação interna pela sua empresa, e um relatório orientativo como apoio. Inventário de riscos, plano de ação e PGR são da sua empresa, que define os responsáveis, com conhecimento técnico adequado e, quando a lei exigir, profissional legalmente habilitado. Para inventário de riscos, plano de ação, PGR, laudo ou avaliação psicológica, procure diretamente um profissional ou uma empresa de SST da sua escolha; o Conta Certa não indica nem recebe comissão de fornecedores.</p>`,
});

pagina({
  caminho: 'empregador-em-dia/contratar/',
  titulo: 'Dados para o contrato | Empregador em Dia',
  desc: 'Dados da empresa para o contrato do Empregador em Dia (apoio para a sua empresa trabalhar a NR-1).',
  selo: false,
  conteudo: `<form class="ed-form" id="ed-contratar" data-ed-e3="checkout" novalidate>
<h1>Dados para o contrato</h1>
<label for="ct-razao">Razão social</label><input id="ct-razao" name="razao" autocomplete="organization" required aria-describedby="aj-razao"><small id="aj-razao">Digite como está no cartão CNPJ. Não consultamos o CNPJ em nenhuma base.</small>
<label for="ct-nome">Seu nome</label><input id="ct-nome" name="nome" autocomplete="name" required aria-describedby="aj-nome"><small id="aj-nome">Quem responde pela empresa neste serviço. Exemplo: o dono ou o gerente de RH.</small>
<label for="ct-email">E-mail</label><input id="ct-email" name="email" type="email" autocomplete="email" required aria-describedby="aj-email"><small id="aj-email">Recebe as instruções, o material da coleta interna e o relatório.</small>
<section class="nota le-privacidade" id="ct-aviso" aria-labelledby="ct-aviso-t"><h2 id="ct-aviso-t">Como usamos seus dados</h2>
<p>Quem cuida dos seus dados é RODRIGO DE SIMONE MATIOLI LTDA (LCM Global Services), CNPJ 61.193.879/0001-20, responsável pelo Conta Certa.</p>
<p>Usamos CNPJ, razão social, seu nome, e-mail e WhatsApp (se informado) só para fechar e cumprir o contrato do Empregador em Dia: emitir recibo e nota fiscal, enviar as instruções e o material da coleta interna, receber só resultados agregados e protegidos, e enviar o relatório e os avisos de andamento. A base legal é a LGPD, art. 7º, V (contrato) e, para a nota fiscal, art. 7º, II (obrigação legal).</p>
<p>Guardamos esses dados enquanto o contrato durar e, depois, pelo prazo que a lei fiscal exige. Não vendemos nem cedemos seus dados.</p>
<p>Você pode pedir confirmação, acesso, correção, cópia, exclusão e informação sobre com quem compartilhamos seus dados (LGPD, art. 18). Escreva para contato@contacertabr.com.br.</p>
<p>Mais detalhes na nossa Política de Privacidade: <a href="/privacidade/">https://contacertabr.com.br/privacidade/</a></p></section>
<p class="campo-msg" id="ct-msg" role="alert" hidden></p>
<p>Faixa: 40 a 50 empregados</p>
<p>Preço: R$ 1.490,00 à vista</p>
<p>${INICIO_SERVICO}</p>
<p>${PRAZO_RELATORIO}</p>
<button type="submit" disabled class="btn">Continuar para pagamento</button>
</form>`,
});

pagina({
  caminho: 'empregador-em-dia/pagamento/',
  titulo: 'Pagamento | Empregador em Dia',
  desc: 'Pagamento à vista do Empregador em Dia, faixa de 40 a 50 empregados (apoio para a sua empresa trabalhar a NR-1).',
  selo: false,
  conteudo: `<form class="ed-form" id="ed-pagamento" data-ed-e3="checkout" novalidate>
<p class="ed-passo">Dados ✓ › Pagamento</p>
<h1>Pagamento</h1>
<label for="pg-nf">E-mail</label><input id="pg-nf" name="nf" type="email" autocomplete="email" required aria-describedby="aj-nf"><small id="aj-nf">Mandamos a nota fiscal neste e-mail. Exemplo: o e-mail do financeiro.</small>
<section class="ed-oferta" aria-labelledby="pg-resumo"><h2 id="pg-resumo">Resumo antes de pagar</h2>
<p>Serviço: ${NOME_PRODUTO}</p>
<p>Faixa: 40 a 50 empregados</p>
<p>Preço: R$ 1.490,00 à vista</p>
<p>Forma de pagamento: cartão de crédito ou Pix, à vista, pelo link de pagamento da Stripe</p>
<p><a href="${LINK_TERMOS_VENDA}">Termos de Uso, item 6</a></p>
<p data-ed-validade>Preços válidos até 31/12/2026.</p>
<p class="ed-aviso-sst">O Conta Certa fornece o material do questionário, para aplicação interna pela sua empresa, e um relatório orientativo como apoio. Inventário de riscos, plano de ação e PGR são da sua empresa, que define os responsáveis, com conhecimento técnico adequado e, quando a lei exigir, profissional legalmente habilitado. Para inventário de riscos, plano de ação, PGR, laudo ou avaliação psicológica, procure diretamente um profissional ou uma empresa de SST da sua escolha; o Conta Certa não indica nem recebe comissão de fornecedores.</p></section>
${htmlAnexoEd1()}
<label class="ed-op"><input type="checkbox" name="aceite" data-ed-aceite required> ${TEXTO_ACEITE}</label>
<p class="campo-msg" id="pg-msg" role="alert" hidden></p>
<p>${LINHA_ANTES_STRIPE}</p>
<p>Aviso sobre o questionário: o questionário do Empregador em Dia (questionário de aplicação interna com até 24 itens, agrupados por fator, em escala de 5 pontos; resultados agregados por pergunta e por fator em faixas orientativas, com agrupamento em 3 faixas, modelo ED-3F-1.0, quando necessário para proteger o anonimato de quem respondeu) foi preparado pelo Conta Certa como material de apoio. Ele não é instrumento psicométrico validado cientificamente nem homologado por órgão ou instituição de segurança e saúde no trabalho, e o resultado não é avaliação psicológica, diagnóstico de saúde nem classificação de risco. O Manual de GRO/PGR do Ministério do Trabalho e Emprego orienta que a ferramenta específica usada na avaliação de riscos psicossociais tenha validação científica e seja aplicada e interpretada por profissional qualificado no método. Por isso, o questionário e o relatório não substituem a avaliação de riscos psicossociais da sua empresa no GRO/PGR. Cabe à sua empresa escolher as ferramentas adequadas e os responsáveis, e decidir se e como usar estes resultados.</p>
<button type="submit" disabled class="btn ed-pagar" data-ed-pagar hidden>Continuar para pagamento</button>
<section class="nota le-privacidade" id="pg-aviso" aria-labelledby="pg-aviso-t"><h2 id="pg-aviso-t">Como usamos seus dados</h2>
<p>Quem cuida dos seus dados é RODRIGO DE SIMONE MATIOLI LTDA (LCM Global Services), CNPJ 61.193.879/0001-20, responsável pelo Conta Certa.</p>
<p>Usamos o e-mail para recibo e nota fiscal e os dados do pedido só para fechar e cumprir o contrato do Empregador em Dia: emitir recibo e nota fiscal, enviar por e-mail o kit de coleta interna, as instruções e o relatório, receber só resultados agregados e protegidos, e os avisos de andamento. A base legal é a LGPD, art. 7º, V (contrato) e, para a nota fiscal, art. 7º, II (obrigação legal).</p>
<p>Guardamos esses dados enquanto o contrato durar e, depois, pelo prazo que a lei fiscal exige. Não vendemos nem cedemos seus dados.</p>
<p>Você pode pedir confirmação, acesso, correção, cópia, exclusão e informação sobre com quem compartilhamos seus dados (LGPD, art. 18). Escreva para contato@contacertabr.com.br.</p>
<p>Mais detalhes na nossa Política de Privacidade: <a href="/privacidade/">https://contacertabr.com.br/privacidade/</a></p></section>
</form>`,
});

pagina({
  caminho: 'empregador-em-dia/pagamento/ok/',
  titulo: 'Pagamento recebido | Empregador em Dia',
  desc: 'A Stripe envia o recibo para o e-mail que você informou. Se não chegar em alguns minutos, confira a caixa de spam.',
  selo: false,
  conteudo: `<section data-ed-e3="checkout" id="ed-pg-ok">
<h1>Pedido recebido.</h1>
<p>A Stripe envia o recibo para o e-mail que você informou. Se não chegar em alguns minutos, confira a caixa de spam.</p>
<p>Se você pagou com Pix, a compra é confirmada quando a Stripe confirmar o pagamento, normalmente em instantes. Confirmaremos por e-mail; os prazos contam dessa confirmação.</p>
<p>Serviço: ${NOME_PRODUTO}</p>
<h2>Próximos passos</h2>
<p>1. Após a confirmação do pagamento pela Stripe, pedimos por e-mail o CNPJ e, se necessário, somente o total de empregados ativos na data da compra. Não envie CPF ou dados individuais de trabalhadores.</p>
<p>2. A emissão da nota é prevista para até 1 dia útil após a confirmação do pagamento, se os dados fiscais necessários estiverem disponíveis e corretos e a empresa for elegível. Sem o CNPJ, a faixa confirmada e a nota emitida corretamente, não iniciamos o serviço. Se a nota não puder ser emitida corretamente até o primeiro limite entre 3 dias úteis após a confirmação do pagamento e o encerramento do mês dessa confirmação, às 23h59 no horário de Brasília (America/Sao_Paulo, UTC-3), cancelamos a compra e providenciamos estorno integral na forma do item 6.16 dos Termos, sem pedido seu.</p>
<p>3. Com a nota emitida e a elegibilidade confirmada, enviamos por e-mail em até 1 dia útil o kit e as instruções para aplicação interna pela empregadora. A LCM só recebe arquivo novo de resultados agregados e protegidos, nunca respostas individuais. Google Forms não é utilizado nesta modalidade.</p>
<p>4. ${PRAZO_RELATORIO}</p>
${ARREPENDIMENTO_ED1.map((p) => '<p>' + p + '</p>').join('\n')}
<p><a href="/termos/termos-empregador-1.2.pdf">Guarde a cópia das condições que você aceitou: Termos de Uso, item 6, versão TERMOS-EMPREGADOR-1.2, e Anexo ED-1, em PDF.</a></p>
<p>Dúvidas: <a href="mailto:contato@contacertabr.com.br">contato@contacertabr.com.br</a>. Atendimento só por e-mail.</p>
<p>Condições de venda: <a href="${LINK_TERMOS_VENDA}">Termos de Uso, item 6</a> · <a href="/privacidade/">Política de Privacidade</a></p>
</section>`,
});

pagina({
  caminho: 'empregador-em-dia/painel/',
  titulo: 'Acompanhamento | Empregador em Dia',
  desc: 'Acompanhamento do pedido do Empregador em Dia.',
  conteudo: `<section data-ed-e3="login" id="ed-painel">
<p class="ed-selo">dados de exemplo</p>
<h1>Empregador em Dia · <span data-ed="pn-empresa">[EMPRESA]</span></h1>
<p>Pedido <span data-ed="pn-pedido">ED-2026-10-0087</span> · iniciado em <span data-ed="pn-inicio">27/10/2026</span></p>
<nav class="ed-menu" aria-label="Painel"><a href="#andamento">Andamento</a><a href="#respostas">Respostas</a><a href="#relatorio">Relatório</a><a href="#pagamentos">Pagamentos</a><a href="/contato/">Ajuda</a></nav>
<ul class="ed-cartoes" id="andamento">
<li id="respostas"><strong>Respostas</strong><span data-ed="pn-resp">26 de 34</span><span data-ed="pn-pct"></span></li>
<li><strong>Etapa</strong><span>Análise das respostas</span></li>
<li id="relatorio"><strong>Entrega prevista</strong><span data-ed="pn-entrega">conforme o prazo do contrato</span></li>
<li id="pagamentos"><strong>Pagamento</strong><span>à vista</span></li>
</ul>
<h2>Linha do tempo</h2>
<ol class="ed-lista"><li>Contratado</li><li>Questionário enviado</li><li>70% de respostas</li><li>Análise dos resultados agregados</li><li>Relatório entregue</li><li>Depois: relatório orientativo pronto. Serviços e responsabilidade técnica de SST não estão incluídos.</li></ol>
<p class="ed-sst" data-ed-sst></p>
</section>`,
});

}
export function gerarEd({ flag = FLAGS.EMPREGADOR_EM_DIA, escrever = false } = {}) {
  estado.flag = flag;
  estado.escrever = escrever;
  estado.saida = [];
  montarPaginas();
  return estado.saida.slice();
}

const ehCli = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (ehCli) {
  gerarEd({ escrever: true });
  console.log('ok', vUi);
}
