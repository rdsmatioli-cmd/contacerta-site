// Interface do simulador /irpf/. Motor e constantes em irpf-2026.js (IRPF-R2-01).
import { IRPF_2026, simularIrpf, validar } from './irpf-2026.js?v=d4ec9724e0';

// IRPF-R2-09: captura de lead só DEPOIS do resultado e desligada até o DE ACORDO do Advogado e um destino de envio.
// IRPF-R2-16: sem checkout, sem cobrança e sem DARF nesta página.
export const FLAGS = Object.freeze({ IRPF_CAPTURA: false, IRPF_CHECKOUT: false });

const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (v) => `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const lerNum = (s) => {
  const t = String(s ?? '').trim().replace(/\s|R\$/g, '');
  if (t === '') return 0;
  const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
  return Number.isFinite(n) ? n : NaN;
};
const MSG = {
  rendimentos: 'Informe um valor maior que zero.',
  irRetido: 'Informe um valor igual ou maior que zero.',
  inss: 'Informe um valor igual ou maior que zero.',
  saude: 'Informe um valor igual ou maior que zero.',
  instrucao: 'Informe um valor igual ou maior que zero.',
  dependentes: `Use um número inteiro de 0 a ${IRPF_2026.dependentesMax}.`,
  pessoasInstrucao: 'Use um número inteiro de 0 até o total de pessoas (você + dependentes).',
};

const form = document.getElementById('irpf-form');
const saida = document.getElementById('resultado');
const captura = document.getElementById('irpf-captura');

function dados() {
  const g = (n) => form.elements[n].value;
  return {
    rendimentos: lerNum(g('rendimentos')), irRetido: lerNum(g('irRetido')), inss: lerNum(g('inss')),
    dependentes: lerNum(g('dependentes')), saude: lerNum(g('saude')), instrucao: lerNum(g('instrucao')),
    pessoasInstrucao: lerNum(g('pessoasInstrucao')),
  };
}

function mostrarErros(erros) {
  for (const k of Object.keys(MSG)) {
    const campo = form.elements[k];
    const msg = document.getElementById(`f-${k}-msg`);
    const ruim = erros.includes(k);
    campo.setAttribute('aria-invalid', String(ruim));
    msg.hidden = !ruim;
    msg.textContent = ruim ? MSG[k] : '';
  }
}

function linha(rot, val) { return `<tr><th scope="row">${rot}</th><td>${val}</td></tr>`; }

function render(r) {
  const ind = r.indicado === 'completo' ? 'completo (deduções legais)' : 'simplificado (desconto de 20%)';
  const destaque = r.aPagar > 0
    ? `<p class="res-rot">Saldo a pagar estimado</p><p class="res-valor">${brl(r.aPagar)}</p>`
    : `<p class="res-rot">Restituição estimada</p><p class="res-valor">${brl(r.restituicao)}</p>`;
  const col = (m, saldo) => `<td>${brl(m.deducao)}</td><td>${brl(m.base)}</td><td>${brl(m.tabela)}</td><td>${brl(m.reducao)}</td><td>${brl(m.devido)}</td><td>${saldo >= 0 ? `restituição de ${brl(saldo)}` : `saldo a pagar de ${brl(-saldo)}`}</td>`;
  saida.innerHTML = `${destaque}
<p>Pela simulação, o modelo que parece mais vantajoso é o <strong>${ind}</strong>. Valores de 2026 (declaração 2027).</p>
<div class="tabela-rolagem"><table><caption>Comparação estimada dos dois modelos</caption>
<thead><tr><th scope="col">Modelo</th><th scope="col">Deduções ou desconto</th><th scope="col">Base de cálculo</th><th scope="col">Imposto pela tabela</th><th scope="col">Redução (Lei 15.270/2025)</th><th scope="col">Imposto devido estimado</th><th scope="col">Com o IR retido</th></tr></thead>
<tbody><tr><th scope="row">Completo</th>${col(r.completo, r.saldoCompleto)}</tr><tr><th scope="row">Simplificado</th>${col(r.simplificado, r.saldoSimplificado)}</tr></tbody></table></div>
<table class="res-det"><caption>Deduções consideradas no modelo completo</caption><tbody>
${linha('INSS informado', brl(r.deducoes.inss))}${linha('Dependentes', brl(r.deducoes.dependentes))}${linha('Saúde', brl(r.deducoes.saude))}${linha('Instrução (até R$ 3.561,50 por pessoa)', brl(r.deducoes.instrucao))}${linha('Alíquota da faixa no modelo indicado', pct(r[r.indicado].aliquota))}
</tbody></table>
<p class="aviso-curto">Confira no programa da Receita Federal antes de enviar a sua declaração.</p>`;
  if (FLAGS.IRPF_CAPTURA && captura) captura.hidden = false;
}

form.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const d = dados();
  const erros = validar(d);
  mostrarErros(erros);
  if (erros.length) { form.elements[erros[0]].focus(); return; }
  render(simularIrpf(d));
  saida.focus();
});
const botao = form.querySelector('button[type=submit]');
botao.disabled = false;
