// Metas do Lighthouse no CI (tests/lighthouse/metas.mjs e o job "lighthouse" do ci.yml). O Lighthouse em si só roda no
// CI ou à mão (node tests/lighthouse/rodar.mjs); aqui ficam a regra de aprovação, com relatórios sintéticos, e a
// configuração: versão fixa 13.5.0, URLs que existem no site e actions fixadas por SHA.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIGHTHOUSE, URLS, PERFIS, METAS, avaliar, nomeRelatorio, resumo } from './lighthouse/metas.mjs';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const ler = (p) => readFileSync(join(raiz, p), 'utf8');

// Relatório mínimo que passa em todas as metas.
const lhr = (mudar = (r) => r) => mudar({
  lighthouseVersion: '13.5.0',
  categories: {
    performance: { score: 0.97, auditRefs: [] },
    accessibility: { score: 1, auditRefs: [{ id: 'color-contrast', weight: 7 }] },
    seo: { score: 1, auditRefs: [{ id: 'meta-description', weight: 1 }, { id: 'link-text', weight: 1 }] },
    'agentic-browsing': { score: 1, auditRefs: [{ id: 'llms-txt', weight: 1 }, { id: 'cumulative-layout-shift', weight: 1 }] },
  },
  audits: {
    'cumulative-layout-shift': { score: 1, numericValue: 0.02 },
    'llms-txt': { score: 1, scoreDisplayMode: 'binary' },
    'color-contrast': { score: 1 },
    'meta-description': { score: 1 },
    'link-text': { score: 1 },
  },
});

test('relatório dentro das metas não acusa nada', () => {
  assert.deepEqual(avaliar(lhr()), []);
  assert.match(resumo(lhr()), /seo 100 .*CLS 0,020 \| llms-txt 1/);
});

test('SEO abaixo de 0,95 falha e cita os audits reprovados', () => {
  const f = avaliar(lhr((r) => { r.categories.seo.score = 0.92; r.audits['meta-description'].score = 0; return r; }));
  assert.deepEqual(f, ['SEO 0,92 < 0,95 (audits abaixo de 1: meta-description)']);
  assert.deepEqual(avaliar(lhr((r) => { r.categories.seo.score = 0.95; return r; })), [], '0,95 passa');
});

test('Acessibilidade abaixo de 0,95 falha; sem nota também', () => {
  assert.match(avaliar(lhr((r) => { r.categories.accessibility.score = 0.9; return r; }))[0], /^Acessibilidade 0,90 < 0,95/);
  assert.deepEqual(avaliar(lhr((r) => { r.categories.accessibility.score = null; return r; })), ['Acessibilidade: sem nota']);
});

test('CLS precisa ficar abaixo de 0,1', () => {
  assert.deepEqual(avaliar(lhr((r) => { r.audits['cumulative-layout-shift'].numericValue = 0.1; return r; })), ['CLS 0,100 >= 0,1']);
  assert.deepEqual(avaliar(lhr((r) => { r.audits['cumulative-layout-shift'].numericValue = 0.0999; return r; })), []);
  assert.deepEqual(avaliar(lhr((r) => { delete r.audits['cumulative-layout-shift']; return r; })), ['CLS: sem valor']);
  assert.deepEqual(avaliar(lhr(), { ...METAS, clsMax: 0.015 }), ['CLS 0,020 >= 0,015'], 'meta com mais casas sai sem arredondar');
});

test('llms-txt reprovado, não aplicável ou fora da categoria agentic-browsing falha', () => {
  assert.match(avaliar(lhr((r) => { r.audits['llms-txt'] = { score: 0, scoreDisplayMode: 'binary', explanation: 'sem título' }; return r; }))[0], /^llms-txt não passou \(nota 0, binary: sem título\)/);
  assert.match(avaliar(lhr((r) => { r.audits['llms-txt'] = { score: null, scoreDisplayMode: 'notApplicable' }; return r; }))[0], /nota nula, notApplicable/);
  assert.deepEqual(avaliar(lhr((r) => { delete r.categories['agentic-browsing']; return r; })), ['categoria agentic-browsing ausente ou sem o audit llms-txt']);
});

test('outra versão do Lighthouse ou erro de execução falham', () => {
  assert.deepEqual(avaliar(lhr((r) => { r.lighthouseVersion = '12.6.1'; return r; })), ['Lighthouse 12.6.1, esperado 13.5.0']);
  assert.match(avaliar(lhr((r) => { r.runtimeError = { code: 'NO_FCP', message: 'sem pintura' }; return r; }))[0], /NO_FCP/);
  assert.deepEqual(avaliar(null), ['relatório ilegível']);
});

test('metas e URLs: 8 a 10 páginas que existem, com home, calculadoras, posts, índice do blog e tabela', () => {
  assert.equal(LIGHTHOUSE, '13.5.0');
  assert.deepEqual(METAS, { seo: 0.95, acessibilidade: 0.95, clsMax: 0.1, auditLlms: 'llms-txt' });
  assert.deepEqual(PERFIS, ['mobile', 'desktop']);
  assert.ok(URLS.length >= 8 && URLS.length <= 10);
  assert.equal(new Set(URLS).size, URLS.length);
  for (const u of URLS) assert.ok(existsSync(join(raiz, u.slice(1), 'index.html')), u);
  assert.ok(URLS.includes('/') && URLS.includes('/blog/'));
  assert.equal(URLS.filter((u) => /^\/blog\/[^/]+\/$/.test(u)).length, 2);
  assert.ok(URLS.filter((u) => ler(`${u.slice(1)}index.html`).includes('<script type="module" src="/assets/js/ui.js')).length >= 3);
  assert.ok(URLS.some((u) => /^\/tabela-/.test(u)));
  assert.equal(new Set(URLS.flatMap((u) => PERFIS.map((p) => nomeRelatorio(u, p)))).size, URLS.length * PERFIS.length);
});

test('CI: job lighthouse roda o 13.5.0 por npx (sem @lhci/cli), com actions fixadas por SHA e só leitura', () => {
  const ci = ler('.github/workflows/ci.yml');
  const rodar = ler('tests/lighthouse/rodar.mjs');
  assert.match(ci, /^ {2}lighthouse:$/m);
  assert.match(ci, /node tests\/lighthouse\/rodar\.mjs --base http:\/\/127\.0\.0\.1:8080/);
  assert.match(ci, /python3 -m http\.server 8080 --bind 127\.0\.0\.1/);
  assert.match(ci, /^permissions:\n {2}contents: read$/m);
  const semComentario = (s) => s.split('\n').filter((l) => !/^\s*(#|\/\/)/.test(l)).join('\n');
  assert.doesNotMatch(semComentario(ci) + semComentario(rodar), /lhci/, 'nada de @lhci/cli (embute o Lighthouse 12.6)');
  assert.ok(rodar.includes("`lighthouse@${LIGHTHOUSE}`"));
  const usos = [...ci.matchAll(/uses: ([^\s]+)/g)].map((m) => m[1]);
  assert.ok(usos.length >= 5);
  for (const u of usos) assert.match(u, /^[\w-]+\/[\w-]+@[0-9a-f]{40}$/, u);
});
