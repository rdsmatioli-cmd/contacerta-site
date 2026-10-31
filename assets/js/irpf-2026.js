// IRPF anual: declaração 2027, ano-calendário 2026. Simulação educativa (backlog Tributário R2, 31/10/2026).
// IRPF-R2-01: todas as constantes ficam neste módulo. Fontes: Receita Federal, "Tributação de 2026"; Lei 9.250/1995,
// arts. 8º, 10 e 11-A (incluído pela Lei 15.270/2025); Lei 15.191/2025.
export const IRPF_2026 = Object.freeze({
  exercicio: 2027,
  anoCalendario: 2026,
  faixas: Object.freeze([
    Object.freeze({ ate: 29145.60, aliquota: 0, deduzir: 0 }),
    Object.freeze({ ate: 33919.80, aliquota: 0.075, deduzir: 2185.92 }),
    Object.freeze({ ate: 45012.60, aliquota: 0.15, deduzir: 4729.91 }),
    Object.freeze({ ate: 55976.16, aliquota: 0.225, deduzir: 8105.85 }),
    Object.freeze({ ate: Infinity, aliquota: 0.275, deduzir: 10904.66 }),
  ]),
  dependente: 2275.08,
  instrucaoPorPessoa: 3561.50,
  simplificadoPercentual: 0.20,
  simplificadoTeto: 17640.00,
  reducao: Object.freeze({ ateIntegral: 60000.00, maximo: 2694.15, ateParcial: 88200.00, a: 8429.73, b: 0.095575 }),
  dependentesMax: 20,
});

/** IRPF-R2-10: 2 casas, meio para cima, imune a ruído de ponto flutuante. */
export function r2(x) {
  const v = Number((Math.abs(x) * 100).toFixed(6));
  return (Math.sign(x) * Math.round(v)) / 100 + 0;
}

/** IRPF-R2-02: imposto pela tabela progressiva anual. */
export function impostoTabela(base, t = IRPF_2026) {
  const b = r2(Math.max(0, base));
  const f = t.faixas.find((x) => b <= x.ate);
  return { faixa: f, imposto: r2(Math.max(0, r2(b * f.aliquota) - f.deduzir)) };
}

/** IRPF-R2-05: redução anual (art. 11-A), sobre o rendimento tributável bruto, limitada ao imposto da tabela. */
export function reducaoAnual(rendimentos, imposto, t = IRPF_2026) {
  const R = t.reducao;
  let red = 0;
  if (rendimentos <= R.ateIntegral) red = R.maximo;
  else if (rendimentos <= R.ateParcial) red = r2(R.a - r2(R.b * rendimentos));
  return r2(Math.min(Math.max(0, red), imposto));
}

/** IRPF-R2-08: validação dos dados de entrada. Devolve lista de erros (vazia = ok). */
export function validar(e, t = IRPF_2026) {
  const erros = [];
  for (const k of ['rendimentos', 'irRetido', 'inss', 'saude', 'instrucao']) {
    if (!Number.isFinite(e[k]) || e[k] < 0) erros.push(k);
  }
  if (!erros.includes('rendimentos') && !(e.rendimentos > 0)) erros.push('rendimentos');
  const dep = e.dependentes;
  if (!Number.isInteger(dep) || dep < 0 || dep > t.dependentesMax) erros.push('dependentes');
  const p = e.pessoasInstrucao;
  if (!Number.isInteger(p) || p < 0 || p > (Number.isInteger(dep) ? dep : 0) + 1) erros.push('pessoasInstrucao');
  return erros;
}

/** IRPF-R2-03/04/06/07: simula os dois modelos, compara e estima restituição ou saldo. */
export function simularIrpf(e, t = IRPF_2026) {
  const rend = r2(e.rendimentos);
  const ded = {
    inss: r2(e.inss),
    dependentes: r2(e.dependentes * t.dependente),
    saude: r2(e.saude),
    instrucao: r2(Math.min(e.instrucao, e.pessoasInstrucao * t.instrucaoPorPessoa)),
  };
  ded.total = r2(ded.inss + ded.dependentes + ded.saude + ded.instrucao);
  const modelo = (deducao) => {
    const base = r2(Math.max(0, rend - deducao));
    const { faixa, imposto: tabela } = impostoTabela(base, t);
    const reducao = reducaoAnual(rend, tabela, t);
    return { deducao, base, aliquota: faixa.aliquota, tabela, reducao, devido: r2(Math.max(0, tabela - reducao)) };
  };
  const completo = modelo(ded.total);
  const simplificado = modelo(r2(Math.min(r2(rend * t.simplificadoPercentual), t.simplificadoTeto)));
  const indicado = completo.devido < simplificado.devido ? 'completo' : 'simplificado';
  const retido = r2(e.irRetido);
  const saldo = r2(retido - (indicado === 'completo' ? completo : simplificado).devido);
  return {
    rendimentos: rend, deducoes: ded, completo, simplificado, indicado, irRetido: retido,
    restituicao: saldo >= 0 ? saldo : 0, aPagar: saldo < 0 ? r2(-saldo) : 0,
    saldoCompleto: r2(retido - completo.devido), saldoSimplificado: r2(retido - simplificado.devido),
  };
}
