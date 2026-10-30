// Empregador em Dia: interface das páginas E2. Nada sai do navegador: respostas só em sessionStorage (T02).
import { FLAGS, ED_SST_INCLUIDO, SST_TEXTO_EM_DEFINICAO, FAIXAS, NOTA_DOMESTICO, ED_PAGAMENTO_MODO, LIMIAR_ANALISE } from './config.js?v=7827cd31ce';
import { TEXTOS_ORCAMENTO, ED_ORCAMENTO, AVISO_VERSAO, conferirOrcamento } from './orcamento-textos.js?v=1b919ef115';
import { destino, oferta, pontosAtencao, textoPgr, validarPasso, faixaPorId, jornada, cnpjValido, formatarCnpj, pagamento, andamento } from './motor.js?v=6305142b49';

const CHAVE = 'ed-diagnostico';
const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: v % 1 ? 2 : 0 }).replace(/\s/g, ' ');
const brl2 = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).replace(/\s/g, ' ');
const num2 = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const $ = (s, r = document) => r.querySelector(s);
const set = (k, t) => { const e = $(`[data-ed="${k}"]`); if (e) e.textContent = t; };
const ler = () => { try { return JSON.parse(sessionStorage.getItem(CHAVE)) || {}; } catch { return {}; } };
const gravar = (r) => sessionStorage.setItem(CHAVE, JSON.stringify(r));

function iniciar() {
  if (!FLAGS.EMPREGADOR_EM_DIA) return; // flag OFF: só o aviso "em preparação"
  if ($('#ed-orc') && !FLAGS.ED_CHECKOUT) return; // orçamento NR-1: também exige ED_CHECKOUT
  if ($('[data-ed-e3="checkout"]') && !FLAGS.ED_CHECKOUT) return; // E3: preços, contratar, pagamentos
  if ($('[data-ed-e3="login"]') && !FLAGS.ED_LOGIN) return; // E3: painel exige login (PR #7, D-14)
  $('#ed-off').hidden = true;
  $('#ed-app').hidden = false;
  const sst = ED_SST_INCLUIDO === null ? SST_TEXTO_EM_DEFINICAO : '';
  document.querySelectorAll('[data-ed-sst]').forEach((e) => { e.textContent = sst; e.hidden = !sst; });
  if ($('#ed-diag')) diagnostico();
  if ($('[data-ed-res]')) resultado();
  if ($('#ed-jornada')) simulador();
  if ($('#ed-orc')) orcamentoNr1();
  if ($('[data-ed-faixa]')) precos();
  if ($('#ed-contratar')) contratar();
  if ($('#ed-pagamento')) pagar();
  if ($('#ed-pg-ok')) pagamentoOk();
  if ($('#ed-painel')) painel();
}

// ---- E3 (backlog v3 T05-T08, T10, T12). Pagamento só em mock (D-22): nada sai do navegador, nada é cobrado.
const PEDIDO = 'ed-pedido';
const lerPedido = () => { try { return JSON.parse(sessionStorage.getItem(PEDIDO)) || {}; } catch { return {}; } };
const gravarPedido = (p) => sessionStorage.setItem(PEDIDO, JSON.stringify(p));
// T08 regra: código aleatório, não sequencial, 6 caracteres, sem derivar do CNPJ.
const ALFA = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const codigo = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => ALFA[b % ALFA.length]).join('');

function precos() {
  const f = ler().faixa;
  if (f) { const c = $(`[data-ed-faixa="${f}"] .ed-sua`); if (c) c.hidden = false; } // T05 CA 2
}

function contratar() {
  const form = $('#ed-contratar');
  const msg = $('#ct-msg');
  const faixa = new URLSearchParams(location.search).get('faixa') || ler().faixa;
  form.querySelector('[type="submit"]').disabled = false;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!oferta(faixa)) { msg.textContent = 'Faça a avaliação rápida NR-1 primeiro.'; msg.hidden = false; return; }
    if (!cnpjValido(form.cnpj.value)) { msg.textContent = 'Confira o CNPJ: os dígitos não batem.'; msg.hidden = false; return; }
    if (!form.checkValidity()) { msg.textContent = 'Preencha razão social, nome e e-mail.'; msg.hidden = false; return; }
    // T06 CA 4: os dados vão só para a sessão do navegador enquanto a flag estiver OFF.
    gravarPedido({ faixa, cnpj: formatarCnpj(form.cnpj.value), razao: form.razao.value.trim(), nome: form.nome.value.trim(), email: form.email.value.trim() });
    location.assign('/empregador-em-dia/pagamento/');
  });
}

// B-PR42-08 (QA ebbc1144): copiar para a área de transferência com retorno visível e anunciado.
function copiar(btn, texto) {
  if (!btn) return;
  const rotulo = btn.textContent;
  btn.addEventListener('click', async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(texto()); ok = true; } catch { ok = false; }
    btn.textContent = ok ? 'Copiado' : 'Não deu para copiar. Selecione o texto e copie.';
    setTimeout(() => { btn.textContent = rotulo; }, 2500);
  });
}

function pagar() {
  const form = $('#ed-pagamento');
  const msg = $('#pg-msg');
  const p = lerPedido();
  const parcela = form.dataset.edParcela;
  if (!oferta(p.faixa)) { msg.textContent = 'Pedido não encontrado. Comece pelos dados do contrato.'; msg.hidden = false; return; }
  // T12 CA 1: à vista ou 2ª já paga volta ao painel.
  if (parcela === '2' && (p.forma !== 'metade' || p.pago2)) { location.replace('/empregador-em-dia/painel/'); return; }
  set('pg-empresa', `${p.razao} · CNPJ ${p.cnpj}`);
  set('pg-faixa', `${faixaPorId(p.faixa).rotulo} funcionários`);
  const mostrar = () => {
    const forma = parcela === '2' ? 'metade' : (form.forma.value || 'metade');
    const v = pagamento(p.faixa, forma);
    set('pg-preco', brl2(v.preco));
    set('pg-agora', brl2(v.agora));
    set('pg-entrega', brl2(v.entrega));
    set('pg-total', brl2(parcela === '2' ? v.entrega : v.agora));
    const l2 = $('[data-ed-linha2]'); if (l2) l2.hidden = forma === 'avista';
    const n = $('[data-ed="pg-nota-avista"]'); if (n) n.hidden = forma !== 'avista';
    $('[data-ed-pix]').hidden = form.meio.value !== 'pix';
  };
  if (form.forma) form.forma.value = p.forma || 'metade';
  form.addEventListener('change', mostrar);
  mostrar();
  copiar($('[data-ed-copiar="pix"]'), () => $('[data-ed="pix"]').textContent.trim());
  form.querySelector('[type="submit"]').disabled = false;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.meio.value || !form.checkValidity()) { msg.textContent = 'Escolha a forma de pagamento e o e-mail da nota fiscal.'; msg.hidden = false; return; }
    if (ED_PAGAMENTO_MODO !== 'mock') throw new Error('checkout live não liberado'); // D-22: só mock
    if (parcela === '2') { gravarPedido({ ...p, pago2: true }); location.assign('/empregador-em-dia/painel/'); return; }
    const forma = form.forma.value || 'metade';
    const ano = new Date().getFullYear();
    gravarPedido({ ...p, forma, meio: form.meio.value, pedido: `ED-${ano}-${codigo(4)}`, link: codigo(6) });
    location.assign('/empregador-em-dia/pagamento/ok/');
  });
}

function pagamentoOk() {
  const p = lerPedido();
  if (!p.pedido) return;
  const v = pagamento(p.faixa, p.forma);
  set('ok-n', faixaPorId(p.faixa).rotulo);
  set('ok-link', `contacertabr.com.br/q/${p.link}`);
  set('ok-pago', brl2(v.agora));
  set('ok-pedido', p.pedido);
  // T08 CA 3 (D-11): no caminho à vista nada fala em 2ª parcela.
  set('ok-entrega', p.forma === 'avista' ? 'você recebe o relatório' : 'você recebe o relatório e paga a 2ª parcela');
  copiar($('[data-ed-copiar="ok-link"]'), () => `https://contacertabr.com.br/q/${p.link}`);
}

function painel() {
  // Dados de exemplo da v3.3 (26 de 34) até o login do PR #7; o percentual e o limiar vêm do motor e da config.
  const a = andamento(26, 34, LIMIAR_ANALISE);
  set('pn-pct', a.podeAnalisar ? `${a.pct}%: já dá para analisar` : `${a.pct}%`);
}

// /empregador-em-dia/orcamento-nr1/: destino ED-Orcamento (Google Form dedicado) e textos do Designer vêm de
// orcamento-textos.js; com placeholder a trava lança erro antes de habilitar o envio. Aviso LGPD já está no HTML.
// Envio no padrão no-cors do Google Forms; "novidades" é opcional e o envio funciona sem ela.
function orcamentoNr1() {
  conferirOrcamento();
  const form = $('#ed-orc');
  const t = TEXTOS_ORCAMENTO;
  for (const id of ['20-50', '51-100', '101-200']) set(`orc-preco-${id}`, brl(faixaPorId(id).preco));
  form.action = ED_ORCAMENTO.action;
  for (const [k, entry] of Object.entries(ED_ORCAMENTO.campos)) { const e = form.querySelector(`[data-orc-campo="${k}"]`); if (e) e.name = entry; }
  form.querySelector('[data-orc-campo="avisoVersao"]').value = AVISO_VERSAO;
  const msg = $('#ed-orc-msg');
  const b = form.querySelector('button[type="submit"]');
  b.disabled = false;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if ($('#ed-orc-site').value) return;
    if (!form.checkValidity()) { msg.textContent = t.erro; msg.hidden = false; return; }
    form.querySelector('[data-orc-campo="enviadoEm"]').value = new Date().toISOString();
    b.disabled = true;
    fetch(form.action, { method: 'POST', mode: 'no-cors', body: new FormData(form) })
      .then(() => { form.hidden = true; msg.textContent = t.sucesso; msg.hidden = false; },
        () => { b.disabled = false; msg.textContent = t.erro; msg.hidden = false; });
  });
}

function diagnostico() {
  const form = $('#ed-diag');
  const msg = $('#ed-msg');
  const voltar = $('[data-ed-voltar]');
  const r = ler();
  let passo = 1;
  // Restaura respostas (Voltar preserva).
  for (const [k, v] of Object.entries(r)) {
    for (const el of form.querySelectorAll(`[name="${Array.isArray(v) ? `${k}[]` : k}"]`)) el.checked = Array.isArray(v) ? v.includes(el.value) : el.value === v;
  }
  const coletar = () => ({
    faixa: form.faixa.value || undefined,
    onde: [...form.querySelectorAll('[name="onde[]"]:checked')].map((e) => e.value),
    metas: form.metas.value || undefined,
    reclamacao: form.reclamacao.value || undefined,
    pgr: form.pgr.value || undefined,
  });
  const mostrar = (n) => {
    passo = n;
    form.querySelectorAll('fieldset[data-passo]').forEach((f) => { f.hidden = Number(f.dataset.passo) !== n; });
    voltar.hidden = n === 1;
    msg.hidden = true;
  };
  form.querySelector('[type="submit"]').disabled = false;
  voltar.addEventListener('click', () => { gravar(coletar()); mostrar(passo - 1); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const dados = coletar();
    gravar(dados);
    const erro = validarPasso(passo, dados);
    if (erro) { msg.textContent = erro; msg.hidden = false; return; }
    // <20 e >200 não precisam dos passos 2 e 3 para o resultado, mas a v3.3 pergunta os 3 a todos.
    if (passo < 3) return mostrar(passo + 1);
    location.assign('/empregador-em-dia/avaliacao-rapida-nr1/resultado/');
  });
  mostrar(1);
}

function resultado() {
  const r = ler();
  const d = destino(r.faixa);
  if (!d) return;
  $('[data-ed-res="vazio"]').hidden = true;
  $(`[data-ed-res="${d}"]`).hidden = false;
  if (d === 'sob-consulta') orcamento();
  if (d !== 'oferta') return; // <20: sem preço nem Contratar (D-01); >200: orçamento sob medida (DEC 95a76e17)
  const o = oferta(r.faixa);
  const porte = `${faixaPorId(r.faixa).rotulo} funcionários`;
  set('porte', porte);
  set('porte2', porte);
  set('pontos', pontosAtencao(r));
  set('pgr', textoPgr(r.pgr) || '');
  set('preco', brl(o.preco));
  set('parcelas', `À vista, ou ${brl(o.parcela1)} agora e ${brl(o.parcela2)} quando receber o relatório`);
  const b = $('[data-ed-contratar]');
  if (FLAGS.ED_CHECKOUT) { b.disabled = false; b.addEventListener('click', () => location.assign(`/empregador-em-dia/contratar/?faixa=${encodeURIComponent(r.faixa)}`)); }
}

// CTA "Pedir orçamento do serviço NR-1" (DEC CPO P-21 C-04, Designer v4.1c). A página é do E3: o botão só liga com
// ED_CHECKOUT, que fica OFF.
export const URL_ORCAMENTO_NR1 = '/empregador-em-dia/orcamento-nr1/';
function orcamento() {
  const b = $('[data-ed-orcamento]');
  if (b && FLAGS.ED_CHECKOUT) { b.disabled = false; b.addEventListener('click', () => location.assign(URL_ORCAMENTO_NR1)); }
}

function simulador() {
  const form = $('#ed-jornada');
  const msg = $('#f-func-msg');
  set('preco-min', brl(FAIXAS.find((f) => f.id === '20-50').preco));
  const calcular = () => {
    const txt = form.funcionarios.value.trim();
    const n = /^\d+$/.test(txt) ? Number(txt) : NaN;
    if (!Number.isInteger(n) || n < 1) { msg.textContent = 'Digite um número inteiro de funcionários, a partir de 1.'; msg.hidden = false;
      // NB-05 (Bugbot 4396487606): limpa a conta anterior para não mostrar valores de outro número de funcionários.
      for (const k of ['salario', 'hora42', 'horas42', 'func42', 'total42', 'hora40', 'horas40', 'func40', 'total40', 'n', 'n2', 'div42', 'div40']) set(k, '—');
      return;
    }
    msg.hidden = true;
    const [e42, e40] = jornada({ funcionarios: n, faixaSalario: form.faixaSalario.value });
    set('salario', brl2(e42.salario));
    set('hora42', brl2(e42.valorHora)); set('horas42', `${num2(e42.horasMes)} h`); set('func42', brl2(e42.porFuncionario)); set('total42', `${brl2(e42.total)} por mês`);
    set('hora40', brl2(e40.valorHora)); set('horas40', `${num2(e40.horasMes)} h`); set('func40', brl2(e40.porFuncionario)); set('total40', `${brl2(e40.total)} por mês`);
    set('n', String(n)); set('n2', String(n));
    set('div42', String(e42.divisor)); set('div40', String(e40.divisor));
    const nota = $('[data-ed="nota-dom"]');
    nota.textContent = NOTA_DOMESTICO;
    nota.hidden = !form.domestico.checked;
  };
  form.querySelector('[type="submit"]').disabled = false;
  form.addEventListener('submit', (e) => { e.preventDefault(); calcular(); });
  form.addEventListener('change', calcular);
  calcular();
}

iniciar();
