// Imagens de compartilhamento (CC-SITE-07, auditoria de 30-31/10/2026): o /irpf/ saiu com og/irpf.jpg byte a byte
// igual a og/imposto-de-renda.jpg (a arte da calculadora de IRRF mensal), com um og:image:alt que falava de outra coisa.
// 1. Toda og:image do site diferente de og/padrao.jpg tem bytes únicos: nenhum arquivo de outra URL (nem o padrão) é
//    cópia dele. Página que usa a arte padrão aponta para og/padrao.jpg, não para uma cópia com outro nome.
// 2. A og:image existe e tem a largura e a altura declaradas em og:image:width e og:image:height.
// As artes do Conta Certa saem do tools/og.mjs (Playwright de tests/e2e e a fonte de /fonts).
// Rode: node --test 'tests/*.test.mjs'
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../', import.meta.url));
const ORIGEM = 'https://contacertabr.com.br/';
const PADRAO = 'og/padrao.jpg';
const listar = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  if (['.git', 'node_modules', 'tests'].includes(d.name)) return [];
  const p = join(dir, d.name);
  if (d.isDirectory()) return listar(p);
  return d.name.endsWith('.html') && !d.name.startsWith('google') ? [relative(RAIZ, p).split(sep).join('/')] : [];
});
const meta = (html, prop) => (html.match(new RegExp(`<meta property="${prop}" content="([^"]+)"`)) || [])[1];

// arquivo da imagem -> páginas que a usam
const usos = new Map();
const declarados = [];
for (const pagina of listar(RAIZ)) {
  const html = readFileSync(join(RAIZ, pagina), 'utf8');
  const url = meta(html, 'og:image');
  if (!url) continue;
  assert.ok(url.startsWith(ORIGEM), `${pagina}: og:image fora do domínio (${url})`);
  const arquivo = url.slice(ORIGEM.length);
  usos.set(arquivo, [...(usos.get(arquivo) || []), pagina]);
  const w = meta(html, 'og:image:width');
  const h = meta(html, 'og:image:height');
  if (w || h) declarados.push({ pagina, arquivo, w: Number(w), h: Number(h) });
}

// Largura e altura de JPEG (marcador SOFn) ou PNG (IHDR), sem dependência.
function dimensoes(buf) {
  if (buf.readUInt32BE(0) === 0x89504e47) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  assert.equal(buf.readUInt16BE(0), 0xffd8, 'nem JPEG nem PNG');
  for (let i = 2; i < buf.length - 9;) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m === 0xff) { i++; continue; }
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error('JPEG sem SOF');
}

test('og:image: cada imagem diferente de og/padrao.jpg tem bytes únicos entre as páginas', () => {
  assert.ok(usos.size >= 20, `${usos.size} imagens de compartilhamento`);
  assert.ok(usos.has('og/irpf.jpg'), 'o /irpf/ tem arte própria');
  const porHash = new Map();
  for (const arquivo of usos.keys()) {
    const sha = createHash('sha256').update(readFileSync(join(RAIZ, arquivo))).digest('hex');
    porHash.set(sha, [...(porHash.get(sha) || []), arquivo]);
  }
  const copias = [...porHash.values()].filter((arqs) => arqs.length > 1)
    .map((arqs) => `${arqs.join(' = ')} (usadas em ${arqs.map((a) => usos.get(a).join(', ')).join(' | ')})`);
  assert.deepEqual(copias, [], `arte de compartilhamento copiada de outra (use ${PADRAO} ou gere a arte da página com tools/og.mjs)`);
});

test('og:image: o arquivo tem a largura e a altura declaradas em og:image:width/height', () => {
  const erradas = [];
  const medidas = new Map();
  for (const { pagina, arquivo, w, h } of declarados) {
    if (!medidas.has(arquivo)) medidas.set(arquivo, dimensoes(readFileSync(join(RAIZ, arquivo))));
    const d = medidas.get(arquivo);
    if (d.w !== w || d.h !== h) erradas.push(`${pagina}: ${arquivo} tem ${d.w}x${d.h}, declarado ${w}x${h}`);
  }
  assert.deepEqual(erradas, []);
});
