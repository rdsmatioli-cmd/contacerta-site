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
const paginas = listar(pasta).sort();
const selos = (texto) => [...texto.matchAll(SELO)].map((m) => m[1]);

// Método A sobre os bytes do arquivo (o .gitattributes desliga a conversão de fim de linha dos .html).
function seloMetodoA(bytes) {
  const lista = [...new Set(selos(bytes.toString('latin1')))];
  assert.equal(lista.length, 1, `politica.html deve ter um único valor de selo; achados: ${lista.join(', ') || 'nenhum'}`);
  const zerado = Buffer.from(bytes.toString('latin1').split(lista[0]).join('0'.repeat(12)), 'latin1');
  return createHash('sha256').update(zerado).digest('hex').slice(0, 12);
}

test('selo do aviso: as 6 páginas de /licitacoes/ exibem o sha256 (método A) de politica.html', () => {
  assert.equal(paginas.length, 6, `páginas em /licitacoes/: ${paginas.join(', ')}`);
  const esperado = seloMetodoA(readFileSync(join(pasta, 'politica.html')));
  const divergentes = [];
  for (const p of paginas) {
    const achados = selos(readFileSync(join(raiz, p), 'utf8'));
    if (!achados.length) divergentes.push(`${p}: sem selo`);
    for (const s of achados) if (s !== esperado) divergentes.push(`${p}: ${s}`);
  }
  assert.deepEqual(divergentes, [], `selo diferente do método A (${esperado}): troque o valor nas 6 páginas`);
});

test('selo do aviso: o método A não depende do selo impresso, só do resto do arquivo', () => {
  const pagina = (selo, texto = 'aviso') => Buffer.from(`<p>${texto}</p><span>sha256 ${selo}</span><div>Aviso · sha256 ${selo}</div>`, 'latin1');
  const zerado = pagina('000000000000');
  assert.equal(seloMetodoA(pagina('abcdefabcdef')), createHash('sha256').update(zerado).digest('hex').slice(0, 12));
  assert.equal(seloMetodoA(pagina('abcdefabcdef')), seloMetodoA(pagina('0123456789ab')));
  assert.notEqual(seloMetodoA(pagina('abcdefabcdef', 'Aviso')), seloMetodoA(pagina('abcdefabcdef')));
});
