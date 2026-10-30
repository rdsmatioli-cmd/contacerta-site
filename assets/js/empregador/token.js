// Empregador em Dia: regras de anonimato do questionário (P-12, parecer c23c3792; M-01 resolvido: só token individual).
// Backend-agnóstico (funções puras + armazenamento injetado). Guardar só o hash do token e o marcador "usado";
// nunca a relação token-destinatário, IP, aparelho, nome ou e-mail; resposta sem vínculo com o token.
import { ANONIMATO } from './config.js?v=56bd0dd4ca';

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
export async function hashToken(token) {
  return hex(await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)));
}
export function gerarToken() {
  const b = new Uint8Array(24);
  globalThis.crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(36).padStart(2, '0')).join('').slice(0, 32);
}
// Gera n tokens individuais para um pedido. Devolve os tokens em claro (só para quem distribui, uma vez) e o
// registro a guardar ({hash, usado:false}), sem lista de destinatários.
export async function emitirTokens(n) {
  if (!Number.isInteger(n) || n < 1) throw new RangeError('n');
  const tokens = Array.from({ length: n }, gerarToken);
  const registro = await Promise.all(tokens.map(async (t) => ({ hash: await hashToken(t), usado: false })));
  return { tokens, registro };
}
// Consome o token e grava a resposta separada. respostas: array sem campo de token. 1 resposta por token.
export async function responder(registro, respostas, token, resposta) {
  const h = await hashToken(token);
  const item = registro.find((r) => r.hash === h);
  if (!item) return { ok: false, erro: 'token-invalido' };
  if (item.usado) return { ok: false, erro: 'token-usado' };
  item.usado = true;
  respostas.push({ ...resposta });
  return { ok: true };
}
// O resultado agregado só sai com o mínimo de respostas.
export const podeAgregar = (respostas) => respostas.length >= ANONIMATO.minimoRespostas;
