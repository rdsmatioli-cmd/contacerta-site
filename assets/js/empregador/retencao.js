// Empregador em Dia: retenção e anonimização das respostas (P-08; parecer do Advogado 1da103db, opção A, decidida pelo CEO).
// M-01: respostas individuais apagadas 30 dias após a empresa receber o resultado do grupo, no máximo 90 dias após o
// fechamento do questionário; exclusão automática registrada em log (sem conteúdo de resposta).
// M-02: corte com n<5 é suprimido; sem texto livre; sem data/hora de resposta.
import { ANONIMATO } from './config.js?v=293d7b1e73';

const DIA = 86400000;
const data = (iso) => { const d = new Date(iso); if (Number.isNaN(+d)) throw new RangeError(`data: ${iso}`); return d; };

export const RETENCAO = Object.freeze({ diasAposEntrega: 30, maxDiasAposFechamento: 90 });

export function prazoExclusao({ fechadoEm, entregueEm = null }) {
  const teto = +data(fechadoEm) + RETENCAO.maxDiasAposFechamento * DIA;
  if (!entregueEm) return new Date(teto);
  return new Date(Math.min(teto, +data(entregueEm) + RETENCAO.diasAposEntrega * DIA));
}

// Job de exclusão. store: { questionarios: [{id, fechadoEm, entregueEm, respostas: [] , apagadoEm?}] }.
// log: array onde entram só id, data, quantidade e motivo. Idempotente: rodar de novo não apaga nem registra nada.
export function executarExclusao(store, agora = new Date(), log = []) {
  for (const q of store.questionarios) {
    if (!q.fechadoEm || q.apagadoEm) continue;
    const prazo = prazoExclusao(q);
    if (+agora < +prazo) continue;
    const n = q.respostas.length;
    q.respostas.length = 0;
    q.apagadoEm = agora.toISOString();
    const motivo = q.entregueEm && +prazo < +data(q.fechadoEm) + RETENCAO.maxDiasAposFechamento * DIA
      ? '30 dias após a entrega do resultado do grupo' : '90 dias após o fechamento do questionário';
    log.push({ evento: 'exclusao-respostas', questionario: q.id, quando: q.apagadoEm, prazo: prazo.toISOString(), apagadas: n, motivo });
  }
  return log;
}

// Agregação por corte (ex.: setor, setor×turno). Só médias por fator; célula com n<5 sai como suprimida.
// Campos de texto livre e de data/hora são ignorados.
export function agregar(respostas, chaves = []) {
  const grupos = new Map();
  for (const r of respostas) {
    const k = chaves.map((c) => r[c] ?? '').join(' × ') || 'total';
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(r);
  }
  const out = [];
  for (const [corte, rs] of grupos) {
    if (rs.length < ANONIMATO.minimoRespostas) { out.push({ corte, suprimido: true }); continue; }
    const medias = {};
    for (const f of Object.keys(rs[0].fatores || {})) {
      const v = rs.map((r) => r.fatores?.[f]).filter((x) => Number.isInteger(x) && x >= 0 && x <= 4);
      medias[f] = v.length >= ANONIMATO.minimoRespostas ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100 : null;
    }
    out.push({ corte, n: rs.length, medias });
  }
  return out;
}
