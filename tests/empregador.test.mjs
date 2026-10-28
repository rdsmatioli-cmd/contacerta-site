// Empregador em Dia E2 (T01, T02, T03, T15 e motor/anonimato). Backlog v2 81dfa1e0; parecer c23c3792; CFO 0619d010;
// DEC 95a76e17. Flags desligadas; páginas noindex e fora do sitemap.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FLAGS, FAIXAS, FAIXAS_SALARIO, SALARIO_MINIMO, ED_SST_INCLUIDO, ESCALA_5, NOTA_DOMESTICO, JORNADA } from '../assets/js/empregador/config.js';
import { destino, oferta, pontosAtencao, validarPasso, jornada } from '../assets/js/empregador/motor.js';
import { emitirTokens, responder, podeAgregar } from '../assets/js/empregador/token.js';

const raiz = new URL('../', import.meta.url);
const ler = (p) => readFileSync(new URL(p, raiz), 'utf8');
const PAGINAS = ['empregador-em-dia/index.html', 'empregador-em-dia/diagnostico/index.html',
  'empregador-em-dia/diagnostico/resultado/index.html', 'empregador-em-dia/jornada-42h/index.html'];

test('flags todas desligadas e SST em definição', () => {
  for (const [k, v] of Object.entries(FLAGS)) assert.equal(v, false, k);
  assert.equal(ED_SST_INCLUIDO, null);
});

test('T01 CA1: páginas noindex, fora do sitemap, aviso visível e app escondido', () => {
  const sitemap = ler('sitemap.xml');
  for (const p of PAGINAS) {
    const h = ler(p);
    assert.match(h, /<meta name="robots" content="noindex, nofollow">/, p);
    assert.ok(!sitemap.includes('empregador-em-dia'), 'sitemap');
    assert.match(h, /<div id="ed-app" hidden>/, p);
    assert.match(h, /<section id="ed-off"/, p);
  }
});

test('termos NR-1 proibidos e "se aprovada"/44h-divisor fora das páginas', () => {
  for (const p of PAGINAS) {
    const h = ler(p).toLowerCase();
    for (const t of ['diagnóstico psicológico', 'diagnostico psicologico', 'avaliação psicológica', 'avaliacao psicologica', 'laudo', 'se aprovada', '÷ 220', '44h']) {
      assert.ok(!h.includes(t), `${p}: ${t}`);
    }
  }
});

test('T01 CA2: textos literais da v3.3 p. 2 (com as reescritas do Advogado 38ccc6e0)', () => {
  const h = ler(PAGINAS[0]);
  for (const t of ['NR-1: riscos psicossociais no PGR', 'Sua empresa em dia com a NR-1, sem montar planilha',
    'A NR-1 agora pede que a empresa avalie estresse, sobrecarga e assédio no trabalho (desde 26/05/2026;',
    'Questionário anônimo para os funcionários, por link', 'Inventário de riscos psicossociais para o PGR',
    'Plano de ação com prazos e responsáveis', // 4º item e abertura: Advogado M-03 e B-01, teste abaixo
    'Preço fechado pela faixa de funcionários.', 'Você só paga o resto quando receber o relatório.',
    'Veja quanto custaria reduzir a jornada.', 'href="/empregador-em-dia/diagnostico/"', 'href="/empregador-em-dia/jornada-42h/"']) {
    assert.ok(h.includes(t), t);
  }
});

test('T02 CA5: "Passo n de 3", nunca "de 4"', () => {
  const h = ler(PAGINAS[1]);
  for (const n of [1, 2, 3]) assert.ok(h.includes(`Passo ${n} de 3`));
  assert.ok(!/de 4/.test(h));
});

test('T02 CA1/CA3: validação e destino das 5 faixas', () => {
  assert.ok(validarPasso(1, {}));
  assert.equal(validarPasso(1, { faixa: '20-50' }), null);
  assert.ok(validarPasso(2, { onde: [], metas: 'sim', reclamacao: 'nao' }));
  assert.equal(validarPasso(2, { onde: ['loja'], metas: 'sim', reclamacao: 'nao' }), null);
  assert.ok(validarPasso(3, {}));
  assert.equal(validarPasso(3, { pgr: 'naosei' }), null);
  assert.deepEqual(['lt20', '20-50', '51-100', '101-200', 'gt200'].map(destino),
    ['simplificada', 'oferta', 'oferta', 'oferta', 'sob-consulta']);
});

test('T03 CA1: preços e parcelas da tabela aprovada; <20 e >200 sem preço', () => {
  assert.deepEqual(['20-50', '51-100', '101-200'].map((f) => { const o = oferta(f); return [o.preco, o.parcela1, o.parcela2]; }),
    [[1490, 745, 745], [2290, 1145, 1145], [3490, 1745, 1745]]);
  assert.equal(oferta('lt20'), null);
  assert.equal(oferta('gt200'), null);
  assert.deepEqual(FAIXAS.filter((f) => f.grupos).map((f) => f.grupos), [4, 8, 12]);
});

test('T03 CA2: bloco <20 e bloco >200 sem "R$" no HTML', () => {
  const h = ler(PAGINAS[2]);
  for (const k of ['simplificada', 'sob-consulta']) {
    const bloco = h.match(new RegExp(`<section data-ed-res="${k}"[^]*?</section>`))[0];
    assert.ok(!bloco.includes('R$'), k);
    assert.ok(!/Contratar/.test(bloco), k);
  }
});

test('T03 CA3: pontos de atenção refletem o passo 2', () => {
  assert.equal(pontosAtencao({ onde: ['loja'], metas: 'sim', reclamacao: 'nao' }), 'Metas de venda · atendimento ao público');
  assert.match(pontosAtencao({ onde: ['escritorio'], metas: 'nao', reclamacao: 'sim' }), /assédio/);
});

test('T15: EC 141 (42 h divisor 210; 40 h divisor 200), 34 funcionários na faixa R$ 2-3 mil', () => {
  const [a, b] = jornada({ funcionarios: 34, faixaSalario: '2a3' });
  assert.deepEqual([a.desde, a.divisor, a.salario, a.valorHora, a.horasMes, a.porFuncionario, a.total],
    ['2026-12-16', 210, 2500, 11.9, 8.67, 154.76, 5261.9]);
  assert.deepEqual([b.desde, b.divisor, b.valorHora, b.horasMes, b.porFuncionario, b.total],
    ['2027-12-16', 200, 12.5, 17.33, 325, 11050]);
});

test('T15 CA2: inteiro >= 1; meios de faixa do CFO/CEO, nenhum abaixo do mínimo', () => {
  for (const n of [0, -1, 1.5, NaN]) assert.throws(() => jornada({ funcionarios: n, faixaSalario: '2a3' }));
  assert.deepEqual(FAIXAS_SALARIO.map((f) => f.meio), [1810.5, 2500, 4000, 5000]);
  for (const f of FAIXAS_SALARIO) assert.ok(f.meio >= SALARIO_MINIMO);
  const h = ler(PAGINAS[3]);
  assert.ok(h.includes('A Emenda Constitucional 141/2026 reduz a jornada máxima para 42 horas por semana a partir de 16/12/2026 e para 40 horas a partir de 16/12/2027, sem redução de salário.'));
  assert.ok(h.includes('salário ÷ <span data-ed="div42">210</span> horas'));
  assert.deepEqual(JORNADA.etapas.map((e) => e.divisor), [210, 200]);
  assert.ok(h.includes('Sou empregador doméstico'));
  assert.equal(NOTA_DOMESTICO, 'Para empregado doméstico, a lei específica (LC 150/2015) ainda fala em 44 horas, mas a Emenda Constitucional 141/2026 também vale para ele.');
  assert.deepEqual(ESCALA_5, ['Nunca', 'Raramente', 'Às vezes', 'Frequentemente', 'Sempre']);
});

test('P-12: token individual, 1 resposta por token, hash guardado, mínimo de 5', async () => {
  const { tokens, registro } = await emitirTokens(5);
  assert.equal(new Set(tokens).size, 5);
  for (const r of registro) { assert.match(r.hash, /^[0-9a-f]{64}$/); assert.ok(!tokens.includes(r.hash)); }
  const respostas = [];
  assert.deepEqual(await responder(registro, respostas, 'x', { a: 1 }), { ok: false, erro: 'token-invalido' });
  for (let i = 0; i < 4; i++) assert.equal((await responder(registro, respostas, tokens[i], { a: i })).ok, true);
  assert.equal(podeAgregar(respostas), false);
  assert.deepEqual(await responder(registro, respostas, tokens[0], { a: 9 }), { ok: false, erro: 'token-usado' });
  await responder(registro, respostas, tokens[4], { a: 4 });
  assert.equal(podeAgregar(respostas), true);
  assert.ok(respostas.every((r) => !('token' in r) && !('hash' in r)));
});

import { prazoExclusao, executarExclusao, agregar } from '../assets/js/empregador/retencao.js';
import { textosAbertura, conferirTextos, placeholdersAbertos, PRAZO_RETENCAO } from '../assets/js/empregador/questionario.js';

test('retenção opção A: 30 dias após a entrega, teto de 90 após o fechamento', () => {
  assert.equal(prazoExclusao({ fechadoEm: '2026-11-01T00:00:00Z', entregueEm: '2026-11-10T00:00:00Z' }).toISOString(), '2026-12-10T00:00:00.000Z');
  assert.equal(prazoExclusao({ fechadoEm: '2026-11-01T00:00:00Z', entregueEm: '2027-01-20T00:00:00Z' }).toISOString(), '2027-01-30T00:00:00.000Z');
  assert.equal(prazoExclusao({ fechadoEm: '2026-11-01T00:00:00Z' }).toISOString(), '2027-01-30T00:00:00.000Z');
});

test('job de exclusão: apaga no prazo, registra log sem conteúdo, idempotente', () => {
  const store = { questionarios: [
    { id: 'a', fechadoEm: '2026-11-01T00:00:00Z', entregueEm: '2026-11-10T00:00:00Z', respostas: [{ fatores: { f1: 2 } }, { fatores: { f1: 3 } }] },
    { id: 'b', fechadoEm: '2026-11-20T00:00:00Z', entregueEm: null, respostas: [{ fatores: { f1: 1 } }] },
    { id: 'c', fechadoEm: null, respostas: [{}] },
  ] };
  const log = executarExclusao(store, new Date('2026-12-10T00:00:00Z'));
  assert.equal(log.length, 1);
  assert.deepEqual(Object.keys(log[0]).sort(), ['apagadas', 'evento', 'motivo', 'prazo', 'quando', 'questionario']);
  assert.equal(log[0].apagadas, 2);
  assert.equal(log[0].motivo, '30 dias após a entrega do resultado do grupo');
  assert.equal(store.questionarios[0].respostas.length, 0);
  assert.equal(store.questionarios[1].respostas.length, 1);
  assert.equal(executarExclusao(store, new Date('2026-12-11T00:00:00Z')).length, 0);
  const l2 = executarExclusao(store, new Date('2027-02-18T00:00:00Z'));
  assert.equal(l2[0].motivo, '90 dias após o fechamento do questionário');
  assert.equal(store.questionarios[2].respostas.length, 1);
});

test('supressão n<5 por corte, inclusive cruzamentos; sem texto livre', () => {
  const rs = [...Array(5)].map((_, i) => ({ setor: 'loja', turno: i < 3 ? 'manhã' : 'tarde', fatores: { f1: i % 5 }, texto: 'x' }));
  assert.deepEqual(agregar(rs), [{ corte: 'total', n: 5, medias: { f1: 2 } }]);
  assert.ok(agregar(rs, ['setor', 'turno']).every((c) => c.suprimido));
  assert.ok(!JSON.stringify(agregar(rs)).includes('"x"'));
  assert.deepEqual(agregar(rs.slice(0, 4)), [{ corte: 'total', suprimido: true }]);
});

test('P-08: [PRAZO] com o texto literal do parecer; placeholder trava com a flag ON', () => {
  const t = textosAbertura({ empresa: 'Farmácia Boa', razaoSocial: 'Farmácia Boa Ltda' });
  assert.ok(t.privacidade.includes(`apagadas ${PRAZO_RETENCAO} e`));
  assert.equal(PRAZO_RETENCAO, 'até 30 dias depois que a empresa recebe o resultado do grupo (no máximo 90 dias depois que o questionário fecha)');
  assert.ok(!t.privacidade.includes('[PRAZO]'));
  assert.deepEqual(conferirTextos(t, { ED_QUIZ_12: false }).sort(), ['[CANAL DA EMPRESA / CIPA]', '[CONTATO DO ENCARREGADO]']);
  assert.throws(() => conferirTextos(t, { ED_QUIZ_12: true }), /placeholder em aberto/);
  const ok = textosAbertura({ empresa: 'X', razaoSocial: 'X Ltda', encarregado: 'privacidade@x.com.br', canal: 'o canal da CIPA' });
  assert.deepEqual(conferirTextos(ok, { ED_QUIZ_12: true }), []);
  assert.deepEqual(placeholdersAbertos('ver [PRAZO] e [a]'), ['[PRAZO]']);
});

test('trava de produção: nenhuma página publicada com placeholder entre colchetes', () => {
  for (const p of PAGINAS) assert.deepEqual(placeholdersAbertos(ler(p).replace(/<script[^]*?<\/script>/g, '')), [], p);
});

test('S-03: aviso de privacidade com fonte >= 14 px e sem corte', () => {
  const css = ler('assets/js/empregador/ed.css');
  assert.match(css, /\.ed-q-priv\{font-size:max\(1rem,14px\)[^}]*overflow:visible/);
});

test('B-05 (backlog v3 229abc9b): caso extra com divisor 220 reproduz a conta da v3.3 p. 19', () => {
  const salario = 2500, horasMes = (2 * 52) / 12;
  const porFunc = (salario / 220) * horasMes * 1.5;
  const r = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
  assert.deepEqual([r(salario / 220), r(horasMes), r(porFunc), r(porFunc * 34)], [11.36, 8.67, 147.73, 5022.73]);
});

// Correções de texto do PR #36 (28/10): NR-1 a5488be6 (achados 1 e 2), Advogado 38ccc6e0 (M-01 a M-04-E2, B-01, B-02),
// Tributário 93bf69ba (F-01 unificado no M-01 do Advogado, F-02). Literais: qualquer mudança exige nova revisão.
test('PR #36 revisões: textos literais travados nas páginas', () => {
  const pg = (c) => readFileSync(new URL(`../empregador-em-dia/${c}index.html`, import.meta.url), 'utf8');
  const jor = pg('jornada-42h/'), res = pg('diagnostico/resultado/'), lan = pg('');
  for (const t of [
    'O valor não inclui encargos (INSS, FGTS) nem reflexos das horas extras no descanso semanal, nas férias e no 13º, que aumentam o custo real. É uma estimativa.',
    'respeitando os 2 dias de repouso e o limite de 2 horas extras por dia (CLT, art. 59), e paga como extra as horas acima do novo limite.',
    'Regras de transição dependem de lei complementar ainda não aprovada.',
  ]) assert.ok(jor.includes(t), t);
  assert.equal(jor.split('cálculo pelo método da CLT (art. 64))').length - 1, 2, 'CLT art. 64 nas linhas 210 e 200');
  for (const t of [
    '<h1>Empresas pequenas podem ter regras mais simples na NR-1</h1>',
    'MEI e microempresas ou empresas de pequeno porte de grau de risco 1 ou 2, sem exposição a agentes físicos, químicos ou biológicos conforme a NR-9, podem ficar dispensadas de elaborar o PGR (NR-1, itens 1.8). A dispensa vale só para o documento: as demais obrigações continuam. Este serviço foi pensado para 20 a 200 funcionários.',
    '<h1>Sua empresa deve avaliar os riscos psicossociais no PGR</h1>',
    'Usamos seu e-mail só para avisar quando a adequação fizer sentido para a sua empresa. Você pode pedir para sair a qualquer momento. Detalhes na <a href="/privacidade/">Política de privacidade</a>.',
  ]) assert.ok(res.includes(t), t);
  assert.match(res, /<input type="email"[^>]*aria-describedby="aj-email aviso-lgpd-avise"/);
  assert.doesNotMatch(res, /type="checkbox"[^>]*checked/);
  assert.doesNotMatch(res, /menos de 20 funcionários, você pode|precisa incluir os riscos/i);
  for (const t of [
    '<li>Relatório com o resultado do grupo para anexar ao PGR</li>',
    'A gente aplica o questionário anônimo e você recebe o inventário e o plano de ação para o PGR. A validação por profissional de segurança do trabalho está em definição.',
    '(desde 26/05/2026; as multas sobre esse ponto estão suspensas provisoriamente pelo STF na ADPF 1316, mas a obrigação de avaliar continua)',
  ]) assert.ok(lan.includes(t), t);
  assert.doesNotMatch(lan, /assinado|profissional de segurança do trabalho analisa/i);
});
