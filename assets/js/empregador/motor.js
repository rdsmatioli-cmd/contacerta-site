// Empregador em Dia: motor puro (sem DOM, sem rede). Testado em tests/empregador.test.mjs.
import { FAIXAS, JORNADA, SALARIO_MINIMO, FAIXAS_SALARIO } from './config.js?v=293d7b1e73';

export const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
export const faixaPorId = (id) => FAIXAS.find((f) => f.id === id) || null;

// Passo 1 decide o caminho (T02): <20 -> simplificada; >200 -> sob consulta (DEC 95a76e17); demais -> oferta.
export function destino(faixaId) {
  const f = faixaPorId(faixaId);
  if (!f) return null;
  if (f.id === 'lt20') return 'simplificada';
  if (f.id === 'gt200') return 'sob-consulta';
  return 'oferta';
}

export function oferta(faixaId) {
  const f = faixaPorId(faixaId);
  if (!f || f.preco == null) return null;
  const metade = r2(f.preco / 2);
  return { faixa: f.rotulo, preco: f.preco, parcela1: metade, parcela2: r2(f.preco - metade), grupos: f.grupos };
}

const ONDE = { escritorio: 'escritório', loja: 'atendimento ao público', rua: 'trabalho na rua', fabrica: 'fábrica ou obra' };
// Pontos de atenção derivados do passo 2 (T03 CA 3). Ordem fixa, sem termos técnicos.
export function pontosAtencao({ onde = [], metas, reclamacao } = {}) {
  const p = [];
  if (metas === 'sim' || metas === 'asvezes') p.push('Metas de venda');
  for (const k of ['loja', 'rua', 'fabrica']) if (onde.includes(k)) p.push(ONDE[k]);
  if (reclamacao === 'sim') p.push('queixa de assédio ou excesso de trabalho');
  return p.length ? p.join(' · ') : 'Nenhum ponto marcado: o questionário mostra o resto';
}

export function textoPgr(pgr) {
  return {
    'sst': 'Feito por empresa de SST: o relatório entra como anexo',
    'proprio': 'Feito pela empresa: o relatório entra como anexo',
    'nao': 'Não tem: incluímos orientação',
    'naosei': 'Não sabe se tem: incluímos orientação',
  }[pgr] || null;
}

// Valida o diagnóstico (T02 CA 1).
export function validarPasso(n, r = {}) {
  if (n === 1) return faixaPorId(r.faixa) ? null : 'Escolha uma faixa para continuar.';
  if (n === 2) {
    if (!Array.isArray(r.onde) || r.onde.length === 0) return 'Marque ao menos um lugar.';
    if (!['sim', 'nao', 'asvezes'].includes(r.metas)) return 'Responda sobre metas.';
    if (!['sim', 'nao', 'naodizer'].includes(r.reclamacao)) return 'Escolha uma resposta.';
    return null;
  }
  if (n === 3) return textoPgr(r.pgr) ? null : 'Escolha uma resposta.';
  return 'Passo inválido.';
}

// Simulador da jornada (T15, parecer c23c3792 M-02). Mantém a jornada de 44 h e paga como extra as horas
// acima do novo limite, com o valor-hora pelo divisor da nova jornada (42 h -> 210; 40 h -> 200).
export function jornada({ funcionarios, faixaSalario }) {
  if (!Number.isInteger(funcionarios) || funcionarios < 1) throw new RangeError('funcionarios: inteiro >= 1');
  const fx = FAIXAS_SALARIO.find((f) => f.id === faixaSalario);
  if (!fx) throw new RangeError('faixaSalario');
  const salario = Math.max(fx.meio, SALARIO_MINIMO);
  return JORNADA.etapas.map(({ horas, desde, divisor }) => {
    const diff = JORNADA.atual - horas;
    const valorHora = salario / divisor;
    const horasMes = (diff * 52) / 12;
    const porFuncionario = valorHora * horasMes * (1 + JORNADA.adicional);
    return {
      horas, desde, divisor, horasSemana: diff, salario,
      valorHora: r2(valorHora), horasMes: r2(horasMes),
      porFuncionario: r2(porFuncionario), total: r2(porFuncionario * funcionarios),
    };
  });
}
