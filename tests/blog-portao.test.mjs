// Portão de revisão do blog: casos essenciais (o conjunto completo fica em evidencias/portao).
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { portaoRevisao, hashPost } from './_src/content/_portao.mjs';
const P = () => ({ slug: 's', titulo: 'INSS no pró-labore', resposta: '<p>INSS</p>', secoes: [], faq: [], tema: 'fiscal', publicado: '2026-10-01' });
function raiz(p, extra = {}) {
  const r = fs.mkdtempSync(path.join(os.tmpdir(), 'pt-')); fs.mkdirSync(path.join(r, 'revisoes/blog'), { recursive: true });
  const c = { Post: 's', Tema: 'fiscal', Revisor: 'Especialista Tributário', Nome: 'Maria', Data: '2026-10-12', Hash: hashPost(p), 'Evidência': 'https://x.slack.com/p1', 'De-acordo': 'sim', ...extra };
  fs.writeFileSync(path.join(r, 'revisoes/blog/a.md'), Object.entries(c).map(([k, v]) => `${k}: ${v}`).join('\n')); p.deAcordo = 'revisoes/blog/a.md'; return r;
}
test('aceita de-acordo válido e devolve o revisor do arquivo', () => { const p = P(); const r = portaoRevisao(p, raiz(p), 'revisoes/blog', '2026-10-13'); assert.equal(r.ok, true); assert.equal(r.revisores[0].nome, 'Maria'); });
test('bloqueia texto alterado depois do de-acordo', () => { const p = P(); const d = raiz(p); p.resposta = '<p>outro</p>'; assert.equal(portaoRevisao(p, d, 'revisoes/blog', '2026-10-13').ok, false); });
test('bloqueia data futura e impossível', () => { for (const Data of ['2026-10-14', '2026-02-31']) { const p = P(); assert.equal(portaoRevisao(p, raiz(p, { Data }), 'revisoes/blog', '2026-10-13').ok, false); } });
test('bloqueia LGPD sem Advogado', () => { const p = P(); p.resposta += '<p>LGPD e dados pessoais</p>'; assert.equal(portaoRevisao(p, raiz(p), 'revisoes/blog', '2026-10-13').ok, false); });
function dois(p, nomeF, nomeJ) {
  const r = fs.mkdtempSync(path.join(os.tmpdir(), 'pt-')); fs.mkdirSync(path.join(r, 'revisoes/blog'), { recursive: true });
  const c = (o) => Object.entries({ Post: 's', Tema: 'fiscal', Revisor: 'Especialista Tributário', Nome: nomeF, Data: '2026-10-12', Hash: hashPost(p), 'Evidência': 'https://x.slack.com/p1', 'De-acordo': 'sim', ...o }).map(([k, v]) => `${k}: ${v}`).join('\n');
  fs.writeFileSync(path.join(r, 'revisoes/blog/a.md'), c({})); fs.writeFileSync(path.join(r, 'revisoes/blog/b.md'), c({ Tema: 'juridico', Revisor: 'Advogado', Nome: nomeJ }));
  p.deAcordo = ['revisoes/blog/a.md', 'revisoes/blog/b.md']; return r;
}
const PJ = () => { const p = P(); p.resposta += '<p>LGPD</p>'; return p; };
test('aceita rótulos internos distintos no Nome (tributário e jurídico)', () => { const p = PJ(); assert.equal(portaoRevisao(p, dois(p, 'Revisão tributária interna', 'Revisão jurídica interna'), 'revisoes/blog', '2026-10-13').ok, true); });
test('bloqueia a mesma pessoa real nos dois papéis', () => { const p = PJ(); const r = portaoRevisao(p, dois(p, 'Maria Souza', 'MARIA  SOUZA'), 'revisoes/blog', '2026-10-13'); assert.equal(r.ok, false); assert.match(r.motivo, /mesma pessoa/); });
test('bloqueia o mesmo rótulo nos dois papéis', () => { const p = PJ(); assert.equal(portaoRevisao(p, dois(p, 'Revisão interna', 'Revisão interna'), 'revisoes/blog', '2026-10-13').ok, false); });
test('registro interno: aceita completo; recusa sem Hash atual, com NÃO de acordo e sem Decisão/Revisor', () => {
  for (const [conteudo, esperado] of [[(h) => `Post: s\nRevisor: Especialista Tributário\nHash: ${h}\nDecisão: de acordo\n`, true], [() => `Post: s\nRevisor: Especialista Tributário\nHash: ${'0'.repeat(64)}\nDecisão: de acordo\n`, false], [(h) => `Post: s\nRevisor: Especialista Tributário\nHash: ${h}\nDecisão: NÃO de acordo\n`, false], [(h) => `Post: s\nHash: ${h}\n`, false]]) {
    const p = P(); const r = raiz(p, { 'Evidência': 'registro:registros-revisao/r.md' });
    fs.mkdirSync(path.join(r, 'registros-revisao')); fs.writeFileSync(path.join(r, 'registros-revisao/r.md'), conteudo(hashPost(p)));
    assert.equal(portaoRevisao(p, r, 'revisoes/blog', '2026-10-13').ok, esperado);
  }
});

