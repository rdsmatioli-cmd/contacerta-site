// Entidade no JSON-LD (auditoria SEO de 17/10/2026): LCM Global Services é a Organization dona do site, com
// legalName e taxID (CNPJ) só nela; Conta Certa é a Organization da marca, com parentOrganization apontando para a
// LCM. Os valores são os já publicados em /sobre/, /privacidade/ e /lista-de-espera/; sem sameAs (a lista de perfis
// oficiais não foi definida). As propriedades usadas existem em Organization no schema.org (conferido com
// google/schema-dts 2.1.0, tipo Organization; o site não depende do pacote).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const ler = (p) => readFileSync(join(raiz, p), 'utf8');
const listar = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  if (d.name === '.git' || d.name === 'node_modules') return [];
  const p = join(dir, d.name);
  if (d.isDirectory()) return listar(p);
  return d.name.endsWith('.html') && !d.name.startsWith('google') ? [relative(raiz, p).split(sep).join('/')] : [];
});
const paginas = listar(raiz).sort();
const objetos = (v) => (Array.isArray(v) ? v.flatMap(objetos) : v && typeof v === 'object' ? [v, ...Object.values(v).flatMap(objetos)] : []);
const textos = (v) => (typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(textos) : v && typeof v === 'object' ? Object.values(v).flatMap(textos) : []);
const visivel = (html) => html.replace(/<script\b[^>]*>[^]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

const LCM = 'https://contacertabr.com.br/#lcm';
const MARCA = 'https://contacertabr.com.br/#organizacao';
const NOME = 'LCM Global Services';
const RAZAO = 'RODRIGO DE SIMONE MATIOLI LTDA';
const CNPJ = '61.193.879/0001-20';
const CNPJ_RE = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/;
// Propriedades de Organization (schema-dts 2.1.0, OrganizationBase + ThingBase) usadas no site, mais as chaves JSON-LD.
const PROPS_ORGANIZATION = new Set(['@context', '@type', '@id', 'name', 'alternateName', 'url', 'description', 'logo', 'email',
  'legalName', 'taxID', 'parentOrganization', 'subOrganization']);

// Todos os blocos ld+json do site, já com JSON.parse.
const blocos = paginas.flatMap((p) => [...ler(p).matchAll(/<script type="application\/ld\+json">([^]*?)<\/script>/g)].map((m, i) => {
  let json;
  assert.doesNotThrow(() => { json = JSON.parse(m[1]); }, `${p}: bloco ${i + 1} de JSON-LD não faz parse`);
  return { p, json };
}));
const nos = blocos.flatMap(({ p, json }) => objetos(json).map((o) => ({ p, o })));
// Definição = nó com alguma propriedade além de @context/@type/@id (os posts citam a marca como
// reviewedBy {"@type":"Organization","@id":...}, que é só referência).
const define = (o) => typeof o['@id'] === 'string' && Object.keys(o).some((k) => !['@context', '@type', '@id'].includes(k));
const definicoes = (id) => nos.filter(({ o }) => o['@id'] === id && define(o));

test('todos os blocos ld+json fazem parse (inclusive /licitacoes/ e blog)', () => {
  assert.ok(blocos.length >= 130, `${blocos.length} blocos`);
  assert.ok(blocos.some((b) => b.p.startsWith('licitacoes/')) && blocos.some((b) => b.p.startsWith('blog/')));
});

test('os dados da LCM são os já publicados no site', () => {
  assert.ok(visivel(ler('sobre/index.html')).includes(`${NOME} (${RAZAO}, CNPJ ${CNPJ})`));
  assert.ok(visivel(ler('privacidade/index.html')).includes(`${RAZAO} (${NOME}), CNPJ ${CNPJ}`));
});

test('nó LCM Global Services: Organization com legalName, taxID e a marca como suborganização', () => {
  const defs = definicoes(LCM);
  assert.ok(defs.some(({ p }) => p === 'index.html'), 'definido na home');
  for (const { p, o } of defs) {
    assert.equal(o['@type'], 'Organization', p);
    assert.equal(o.name, NOME, p);
    assert.equal(o.legalName, RAZAO, p);
    assert.equal(o.taxID, CNPJ, p);
    assert.deepEqual(o.subOrganization, { '@id': MARCA }, p);
    assert.equal(o.sameAs, undefined, `${p}: sem sameAs`);
  }
});

test('nó Conta Certa: Organization da marca com parentOrganization na LCM e sem CNPJ', () => {
  const defs = definicoes(MARCA);
  // A definição completa fica na home; as tabelas repetem só @type, name e url no author (CC-10).
  assert.deepEqual(defs.find(({ p }) => p === 'index.html')?.o.parentOrganization, { '@id': LCM });
  for (const { p, o } of defs) {
    assert.equal(o['@type'], 'Organization', p);
    assert.equal(o.name, 'Conta Certa', p);
    if (o.parentOrganization !== undefined) assert.deepEqual(o.parentOrganization, { '@id': LCM }, p);
    for (const k of ['taxID', 'legalName', 'sameAs']) assert.equal(o[k], undefined, `${p}: ${k} só no nó da LCM`);
  }
});

test('CNPJ, taxID e legalName só no nó da LCM; nenhum sameAs', () => {
  for (const { p, o } of nos) {
    const ehLcm = o['@id'] === LCM;
    if (!ehLcm) for (const k of ['taxID', 'legalName']) assert.equal(o[k], undefined, `${p}: ${k} fora do nó da LCM`);
    assert.equal(o.sameAs, undefined, `${p}: sameAs`);
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'string' && CNPJ_RE.test(v)) assert.ok(ehLcm && k === 'taxID', `${p}: CNPJ em ${k}`);
    }
  }
  assert.ok(nos.flatMap(({ o }) => textos(o)).some((s) => s === CNPJ));
});

test('nós Organization só usam propriedades de Organization (schema.org / schema-dts)', () => {
  for (const { p, o } of nos) {
    if (o['@type'] !== 'Organization') continue;
    const extras = Object.keys(o).filter((k) => !PROPS_ORGANIZATION.has(k));
    assert.deepEqual(extras, [], `${p}: ${extras.join(', ')}`);
  }
});

test('parentOrganization e subOrganization apontam para @id definidos', () => {
  const ids = new Set(nos.filter(({ o }) => define(o)).map(({ o }) => o['@id']));
  for (const { p, o } of nos) {
    for (const k of ['parentOrganization', 'subOrganization']) {
      if (o[k] === undefined) continue;
      assert.ok(ids.has(o[k]['@id']), `${p}: ${k} ${JSON.stringify(o[k])}`);
    }
  }
});
