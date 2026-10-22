// Selo do aviso jurídico de /licitacoes/ ("Aviso AVISO-LICITACOES-x · sha256 <12 hex>"). O valor é o do método A, o
// mesmo dos commits d98f915 e 8b8f844: sha256 dos bytes de licitacoes/politica.html com o próprio selo trocado por
// 000000000000, 12 primeiros hex. Qualquer mudança em politica.html (até um atributo, como o aria-label do logo em
// d7075b3) muda o valor, e as 6 páginas de /licitacoes/ exibem o selo ao visitante. Mudou politica.html: recalcule
// pelo método A e troque o valor nas 6 páginas no mesmo commit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const pasta = join(raiz, 'licitacoes');
const SELO = /sha256 ([0-9a-f]{12})/g;
const listar = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  const p = join(dir, d.name);
  if (d.isDirectory()) return listar(p);
  return d.name.endsWith('.html') ? [relative(raiz, p).split(sep).join('/')] : [];
});
// Lista fechada (decisão do CPO, 22/10/2026): só este caminho exato fica fora do selo. Nenhuma regra genérica
// (meta refresh, noindex): qualquer outra página de /licitacoes/ sem selo continua falhando, e o total segue 6.
const EXCLUIDAS_DO_SELO = new Set(['licitacoes/privacidade/index.html']);
const paginasDoSelo = (lista) => lista.filter((p) => !EXCLUIDAS_DO_SELO.has(p)).sort();
const paginas = paginasDoSelo(listar(pasta));
const selos = (texto) => [...texto.matchAll(SELO)].map((m) => m[1]);

// Método A sobre os bytes do arquivo (o .gitattributes desliga a conversão de fim de linha dos .html).
function seloMetodoA(bytes) {
  const lista = [...new Set(selos(bytes.toString('latin1')))];
  assert.equal(lista.length, 1, `politica.html deve ter um único valor de selo; achados: ${lista.join(', ') || 'nenhum'}`);
  const zerado = Buffer.from(bytes.toString('latin1').split(lista[0]).join('0'.repeat(12)), 'latin1');
  return createHash('sha256').update(zerado).digest('hex').slice(0, 12);
}

function checarSelo(lista, lerPagina, esperado) {
  const doSelo = paginasDoSelo(lista);
  assert.equal(doSelo.length, 6, `páginas em /licitacoes/: ${doSelo.join(', ')}`);
  const divergentes = [];
  for (const p of doSelo) {
    const achados = selos(lerPagina(p));
    if (!achados.length) divergentes.push(`${p}: sem selo`);
    for (const s of achados) if (s !== esperado) divergentes.push(`${p}: ${s}`);
  }
  assert.deepEqual(divergentes, [], `selo diferente do método A (${esperado}): troque o valor nas 6 páginas`);
}
const lerReal = (p) => readFileSync(join(raiz, p), 'utf8');

test('selo do aviso: as 6 páginas de /licitacoes/ exibem o sha256 (método A) de politica.html', () => {
  checarSelo(listar(pasta), lerReal, seloMetodoA(readFileSync(join(pasta, 'politica.html'))));
});

const OUTRA = 'licitacoes/outra-redirect/index.html';
// Fixture só em memória: o HTML de redirecionamento (meta refresh, noindex, CSP de redirecionamento) em outro caminho.
const FIXTURE_OUTRA = lerReal('licitacoes/privacidade/index.html').replaceAll('/licitacoes/politica.html', '/licitacoes/index.html');
test('negativo: página de redirecionamento fora da lista (licitacoes/outra-redirect/index.html) falha no selo', () => {
  const esperado = seloMetodoA(readFileSync(join(pasta, 'politica.html')));
  const ler = (p) => (p === OUTRA ? FIXTURE_OUTRA : lerReal(p));
  // Somada às páginas reais: 7 páginas, falha a contagem.
  assert.throws(() => checarSelo([...listar(pasta), OUTRA], ler, esperado), assert.AssertionError);
  // No lugar de uma página real, mantendo 6: falha por "sem selo".
  const seis = [...paginas.filter((p) => p !== 'licitacoes/index.html'), OUTRA];
  assert.throws(() => checarSelo(seis, ler, esperado), /outra-redirect\/index\.html: sem selo/);
});

test('selo do aviso: o método A não depende do selo impresso, só do resto do arquivo', () => {
  const pagina = (selo, texto = 'aviso') => Buffer.from(`<p>${texto}</p><span>sha256 ${selo}</span><div>Aviso · sha256 ${selo}</div>`, 'latin1');
  const zerado = pagina('000000000000');
  assert.equal(seloMetodoA(pagina('abcdefabcdef')), createHash('sha256').update(zerado).digest('hex').slice(0, 12));
  assert.equal(seloMetodoA(pagina('abcdefabcdef')), seloMetodoA(pagina('0123456789ab')));
  assert.notEqual(seloMetodoA(pagina('abcdefabcdef', 'Aviso')), seloMetodoA(pagina('abcdefabcdef')));
});
