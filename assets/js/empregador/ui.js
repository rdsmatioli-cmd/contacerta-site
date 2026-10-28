// Empregador em Dia: interface das páginas E2. Nada sai do navegador: respostas só em sessionStorage (T02).
import { FLAGS, ED_SST_INCLUIDO, SST_TEXTO_EM_DEFINICAO, FAIXAS, NOTA_DOMESTICO } from './config.js?v=04a97dcdba';
import { TEXTOS_ORCAMENTO, ED_ORCAMENTO, AVISO_VERSAO, conferirOrcamento } from './orcamento-textos.js?v=0a40d19e5c';
import { destino, oferta, pontosAtencao, textoPgr, validarPasso, faixaPorId, jornada } from './motor.js?v=2a8eac4c08';

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
  $('#ed-off').hidden = true;
  $('#ed-app').hidden = false;
  const sst = ED_SST_INCLUIDO === null ? SST_TEXTO_EM_DEFINICAO : '';
  document.querySelectorAll('[data-ed-sst]').forEach((e) => { e.textContent = sst; e.hidden = !sst; });
  if ($('#ed-diag')) diagnostico();
  if ($('[data-ed-res]')) resultado();
  if ($('#ed-jornada')) simulador();
  if ($('#ed-orc')) orcamentoNr1();
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
  if (d !== 'oferta') return; // <20: sem preço nem Contratar (D-01); >200: sob consulta (DEC 95a76e17)
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
    if (!Number.isInteger(n) || n < 1) { msg.textContent = 'Digite um número inteiro de funcionários, a partir de 1.'; msg.hidden = false; return; }
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
