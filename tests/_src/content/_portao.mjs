// Portão de revisão do blog (laudos CC-S01..S06 / CR-S01..S09, 13/10/2026).
// Um post real só entra no build (página, sitemap, RSS, llms, link Blog) se:
//  1. cada revisor exigido pelos temas tiver UM de-acordo válido na pasta oficial;
//  2. temas exigidos = tema declarado + temas detectados por palavra-chave no texto;
//  3. o Hash do de-acordo for o SHA-256 do conteúdo atual do post (mudou o texto: bloqueia);
//  4. a data for real, não futura; campos sem repetição; sem de-acordo contraditório na pasta.
// Revisor e data exibidos na página e no JSON-LD vêm do de-acordo, nunca do post.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, realpathSync, lstatSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

export const TEMAS = Object.freeze({ fiscal: 'Especialista Tributário', trabalhista: 'Especialista Tributário', juridico: 'Advogado' });
const temaValido = (t) => typeof t === 'string' && Object.hasOwn(TEMAS, t);

// Palavras-chave, comparadas com o texto normalizado (NFKC, sem invisíveis, sem acento, minúsculas, pontuação -> espaço;
// "º" -> "o"). Varre TODOS os textos do post SEM remover o HTML: href, alt, title e URLs entram na busca.
// Na dúvida, exige o revisor: termos ambíguos (consumidor, contrato, encarregado...) também pedem o Advogado (laudo R4-02/R4-04).
const CHAVES = {
  juridico: ['lgpd', 'lei geral de protecao de dados', 'protecao de dados', 'dados pessoais', 'dado pessoal', 'titular dos dados', 'direitos do titular', 'encarregado', 'dpo', 'anpd', '13709', 'privacidade', 'termos de uso', 'termo de uso', 'politica de privacidade',
    'cdc', 'codigo de defesa do consumidor', 'defesa do consumidor', 'direito do consumidor', 'consumidor', '8078', 'prescri', 'decadencia', 'marco civil', '12965', 'contrato', 'contratual', 'clausula',
    'processo judicial', 'acao judicial', 'judicial', 'judiciario', 'tribunal', 'tribunais', 'sentenca', 'peticao', 'habeas data', 'habeas', 'cpc', 'codigo de processo civil', 'processo civil', 'codigo civil',
    'jurisprud', 'responsabilidade civil', 'danos morais', 'dano moral', 'justa causa', 'rescisao indireta', 'indeniza', 'multa contratual', 'consentimento', 'mandado de seguranca',
    'licitacao', 'licitacoes', '14133', 'stf', 'stj', 'tst', 'trf', 'carf', 'sumula', 'liminar', 'recurso', 'advogad', 'juridic', 'lei 8078', 'lei 13709', 'lei 14133'],
  fiscal: ['imposto', 'tribut', 'aliquota', 'irpf', 'irpj', 'irrf', 'inss', 'cbs', 'ibs', 'icms', 'iss', 'issqn', 'pis', 'cofins', 'csll', 'ipi', 'simples nacional', 'mei', 'receita federal', 'lei complementar', 'credito fiscal', 'apuracao', 'nota fiscal', 'split payment', 'fisco', 'darf', 'das mei', 'lucro presumido', 'lucro real', 'contribuicao previdenciaria', 'reforma tributaria', '214 2025'],
  trabalhista: ['clt', 'fgts', 'ferias', '13o salario', '13 salario', 'decimo terceiro', 'demissao', 'demitid', 'rescisao', 'aviso previo', 'contracheque', 'holerite', 'hora extra', 'horas extras', 'adicional noturno', 'seguro desemprego', 'vale transporte', 'pensao alimenticia', 'carteira assinada', 'carteira de trabalho', 'ctps', 'jornada', 'empregad', 'empregador', 'salario', 'trabalhista', 'esocial', 'insalubridade', 'periculosidade', 'licenca maternidade', 'licenca paternidade', 'abono', 'convencao coletiva', 'sindicat'],
};
// Versão colapsada (só letras e dígitos, tudo junto): pega LGPD, 13709, 8078 e 14133 em qualquer grafia
// ("L.G.P.D", "L G P D", "L-G-P-D", "l13709.htm", "Lei nº 8.078/1990").
const COLAPSADAS = { juridico: ['lgpd', '13709', '8078', '14133', '12965', 'habeasdata', 'danosmorais', 'protecaodedados', 'dadospessoais', 'termosdeuso'] };
const INVISIVEIS = /[\p{Cf}\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF\u00AD]/gu;
export const normBase = (s) => String(s).normalize('NFKC').replace(INVISIVEIS, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[º°ª]/g, 'o');
export const norm = (s) => normBase(s).replace(/[^a-z0-9]+/g, ' ');
export const colapsa = (s) => normBase(s).replace(/[^a-z0-9]+/g, '');
const textos = (v) => (typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(textos) : v && typeof v === 'object' ? Object.entries(v).flatMap(([k, x]) => (k === 'deAcordo' ? [] : textos(x))) : []);
export const textoDoPost = (p) => ` ${norm(textos(p).join(' '))} `;
export function temasDetectados(p) {
  const brutos = textos(p).join(' \n ');
  const t = ` ${norm(brutos)} `; const c = colapsa(brutos);
  return Object.keys(CHAVES).filter((k) => CHAVES[k].some((x) => t.includes(x.length <= 4 ? ` ${x} ` : ` ${x}`)) || (COLAPSADAS[k] || []).some((x) => c.includes(x)));
}
export function temasExigidos(p) {
  const decl = [].concat(p.tema ?? []);
  return [...new Set([...decl, ...temasDetectados(p)])].sort();
}

// Hash do conteúdo INTEIRO do post, em qualquer nível, sem excluir campos. Única exceção: a lista deAcordo do próprio
// post (só caminhos dos arquivos, que o portão confere à parte), para o Hash não depender de quais arquivos o citam.
const ordena = (v, raiz = true) => (Array.isArray(v) ? v.map((x) => ordena(x, false)) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).filter((k) => !(raiz && k === 'deAcordo')).sort().map((k) => [k, ordena(v[k], false)])) : v);
export const hashPost = (p) => createHash('sha256').update(JSON.stringify(ordena(p))).digest('hex');
// Última alteração do post: maior entre publicado e atualizado (se existir). O de-acordo não pode ser anterior.
export const ultimaAlteracao = (p) => [p.publicado, p.atualizado].filter(Boolean).sort().at(-1) || '';

// Data real (calendário) e não futura, no fuso do usuário (America/Sao_Paulo).
export function hojeSP() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()); }
export function dataReal(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  if (!m) return false;
  const [y, mo, d] = m.slice(1).map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return y >= 2026 && dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

const CAMPOS = ['Post', 'Tema', 'Revisor', 'Nome', 'Data', 'Hash', 'Evidência', 'De-acordo'];
const chave = (k) => norm(k).replace(/ /g, '');
const CANON = Object.fromEntries(CAMPOS.map((c) => [chave(c), c]));
// Lê o texto do arquivo em UTF-8 ou UTF-16 (com ou sem BOM), para nenhum arquivo escapar da varredura (laudo R4-05).
export function lerTexto(abs) {
  const b = readFileSync(abs);
  if (b[0] === 0xff && b[1] === 0xfe) return b.subarray(2).toString('utf16le');
  if (b[0] === 0xfe && b[1] === 0xff) return Buffer.from(b.subarray(2)).swap16().toString('utf16le');
  const nulos = b.subarray(0, 200).filter((x) => x === 0).length;
  if (nulos > 10) return (b[0] === 0 ? Buffer.from(b).swap16() : b).toString('utf16le');
  return b.toString('utf8').replace(/^\uFEFF/, '');
}
// Formato FECHADO (laudo R4-01): só as 8 linhas de campo (e linhas vazias). Qualquer outra linha (texto livre,
// ressalva, comentário) recusa. "De-acordo" aprova só com o valor exato "sim" (após trim; minúsculas/maiúsculas aceitas).
export function lerDeAcordo(texto) {
  const v = {}; const erros = [];
  for (const linha of texto.split(/\r?\n/)) {
    const lim = linha.replace(INVISIVEIS, '').trim();
    if (!lim) continue;
    const m = /^([^:]{1,40}):[ \t]*(.*?)[ \t]*$/.exec(lim);
    const c = m && CANON[chave(m[1])];
    if (!c) { erros.push(`linha fora do formato (texto livre recusa): "${lim.slice(0, 80)}"`); continue; }
    if (Object.hasOwn(v, c)) erros.push(`campo "${c}" repetido`);
    v[c] = m[2].replace(INVISIVEIS, '').trim();
  }
  for (const c of CAMPOS) if (!v[c]) erros.push(`campo "${c}" ausente ou vazio`);
  if (v['De-acordo'] && v['De-acordo'].toLowerCase() !== 'sim') erros.push(`"De-acordo: ${v['De-acordo']}" recusa (só o valor exato "sim" aprova)`);
  return { v, erros };
}
// Todos os arquivos da pasta oficial, em qualquer subpasta e com qualquer extensão.
function todosArquivos(d) { return readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() && !e.isSymbolicLink() ? todosArquivos(join(d, e.name)) : [join(d, e.name)])); }
const evidenciaValida = (e) => /^https:\/\/\S+$/.test(e) || /^<[^<>@\s]+@[^<>\s]+>$/.test(e);
// Evidência por registro interno do revisor (decisão do Rodrigo, 13/10/2026; endurecido pelo laudo QA P13-01/P13-03).
// Formato do campo: "registro:registros-revisao/<arquivo>.md". O arquivo fica em registros-revisao/ na raiz do projeto
// (fora da pasta oficial), é arquivo comum (sem link nem hardlink), e nem a pasta nem nenhum diretório pai pode sair do
// projeto por symlink (realpath). Conteúdo obrigatório, uma linha cada:
//   Post: <slug>            (exata)
//   Revisor: <papel>        (o mesmo papel do de-acordo; pode ter complemento depois, ex. "Advogado (escopo...)")
//   Hash: <hash do post>    (linha exata; uma só linha "Hash:")
//   Decisão: de acordo      (valor fechado: "de acordo" ou "de-acordo"; uma só linha "Decisão:")
// Recusa qualquer "não de acordo"/"em desacordo" no arquivo. Cada de-acordo usa um registro próprio (sem repetir).
// Link https e Message-ID continuam aceitos, mas não são exigidos.
export const PASTA_REGISTRO = 'registros-revisao';
const linhasCampo = (t, campo) => t.split(/\r?\n/).map((l) => l.replace(INVISIVEIS, '').trim()).filter((l) => chave(l.split(':')[0]) === chave(campo) && l.includes(':')).map((l) => l.slice(l.indexOf(':') + 1).trim());
export function evidenciaRegistro(e, raiz, slug, hash, revisor) {
  const m = /^registro:(\S+\.md)$/.exec(e || '');
  if (!m) return { erro: 'Evidência deve ser "registro:registros-revisao/<arquivo>.md" (registro interno do revisor), link https ou Message-ID <...@...>' };
  const raizReal = realpathSync(raiz);
  const base = resolve(raiz, PASTA_REGISTRO); const abs = resolve(raiz, m[1]);
  if (!abs.startsWith(base + sep)) return { erro: `registro de evidência fora de ${PASTA_REGISTRO}/: ${m[1]}` };
  if (!existsSync(base)) return { erro: `pasta ${PASTA_REGISTRO}/ não existe` };
  const baseReal = realpathSync(base);
  if (lstatSync(base).isSymbolicLink() || baseReal !== join(raizReal, PASTA_REGISTRO)) return { erro: `pasta ${PASTA_REGISTRO}/ (ou um diretório pai) é symlink ou sai do projeto: ${baseReal}` };
  if (!existsSync(abs)) return { erro: `registro de evidência não existe: ${m[1]}` };
  const st = lstatSync(abs);
  const real = realpathSync(abs);
  if (st.isSymbolicLink() || !st.isFile() || !real.startsWith(baseReal + sep)) return { erro: `registro de evidência é link ou aponta para fora de ${PASTA_REGISTRO}/: ${m[1]}` };
  if (st.nlink > 1) return { erro: `registro de evidência com hardlink: ${m[1]}` };
  const t = lerTexto(abs);
  const posts = linhasCampo(t, 'Post'); const hashes = linhasCampo(t, 'Hash');
  const hashExatas = t.split(/\r?\n/).map((l) => l.replace(INVISIVEIS, '').trim()).filter((l) => /^Hash:/.test(l)); const decs = linhasCampo(t, 'Decisão'); const revs = linhasCampo(t, 'Revisor');
  if (posts.length !== 1 || posts[0] !== slug) return { erro: `registro de evidência precisa de uma linha "Post: ${slug}": ${m[1]}` };
  if (hashes.length !== 1 || hashExatas.length !== 1 || hashExatas[0] !== `Hash: ${hash}`) return { erro: `registro de evidência precisa de uma única linha exata "Hash: ${hash.slice(0, 12)}…" com o Hash atual do post: ${m[1]}` };
  if (revs.length !== 1 || !new RegExp(`^${norm(revisor).trim()}( |$)`).test(norm(revs[0]).trim())) return { erro: `registro de evidência é de outro revisor ("Revisor: ${revs.join(' | ')}"; esperado ${revisor}): ${m[1]}` };
  if (/(^| )(nao|n) (e |esta |estou |sou )?(de )?acordo( |$)|desacordo|( |^)nao (aprov|concord)|reprov|( |^)discord|( |^)rejeit|( |^)recus(o|a|ado|amos)( |$)/.test(` ${norm(t)} `)) return { erro: `registro de evidência contém recusa ("não de acordo", "discordo", "rejeito", "não concordo", "não aprovo", "recuso"...): ${m[1]}` };
  if (decs.length !== 1 || !/^de[ -]acordo$/i.test(decs[0].replace(/\s+/g, ' '))) return { erro: `registro de evidência precisa de uma única linha "Decisão: de acordo" (valor fechado; achado: ${decs.map((d) => `"${d.slice(0, 40)}"`).join(', ') || 'nenhuma'}): ${m[1]}` };
  return { erro: null, real };
}

// raiz: pasta do projeto; pasta: subpasta oficial dos de-acordos (ex.: 'revisoes/blog').
export function portaoRevisao(p, raiz, pasta, hoje = hojeSP()) {
  const nao = (motivo) => ({ ok: false, motivo });
  if (p.modelo) return nao('post modelo nunca passa no portão');
  for (const t of [].concat(p.tema ?? [])) if (!temaValido(t)) return nao(`tema inválido: "${t}" (use fiscal, trabalhista ou juridico)`);
  if (![].concat(p.tema ?? []).length) return nao('tema ausente');
  if (!dataReal(ultimaAlteracao(p))) return nao('post sem data de publicação válida (publicado/atualizado)');
  const exigidos = temasExigidos(p);
  const oficial = resolve(raiz, pasta);
  if (!existsSync(oficial)) return nao(`pasta oficial ${pasta}/ não existe`);
  const oficialReal = realpathSync(oficial);
  const lista = [].concat(p.deAcordo ?? []);
  if (!lista.length) return nao('campo deAcordo ausente');
  const hash = hashPost(p);
  const aprov = {}; const registrosUsados = new Map();
  for (const rel of lista) {
    const abs = resolve(raiz, rel);
    if (!(abs.startsWith(oficial + sep)) || !abs.endsWith('.md')) return nao(`de-acordo fora da pasta oficial ${pasta}/: ${rel}`);
    if (!existsSync(abs)) return nao(`arquivo de de-acordo não existe: ${rel}`);
    if (lstatSync(abs).isSymbolicLink() || !realpathSync(abs).startsWith(oficialReal + sep)) return nao(`de-acordo é link ou aponta para fora da pasta oficial: ${rel}`);
    if (lstatSync(abs).nlink > 1) return nao(`${rel}: arquivo com hardlink (pode ser cópia de fora da pasta oficial)`);
    const { v, erros } = lerDeAcordo(lerTexto(abs));
    if (erros.length) return nao(`${rel}: ${erros.join('; ')}`);
    if (v.Post !== p.slug) return nao(`${rel}: de-acordo é de outro post ("${v.Post}")`);
    if (!temaValido(v.Tema)) return nao(`${rel}: tema inválido "${v.Tema}"`);
    if (v.Revisor !== TEMAS[v.Tema]) return nao(`${rel}: revisor "${v.Revisor}" não é o exigido para ${v.Tema} (${TEMAS[v.Tema]})`);
    if (!dataReal(v.Data)) return nao(`${rel}: data impossível ou mal formatada "${v.Data}" (AAAA-MM-DD)`);
    if (v.Data > hoje) return nao(`${rel}: data futura ${v.Data} (hoje ${hoje})`);
    if (v.Data < ultimaAlteracao(p)) return nao(`${rel}: de-acordo de ${v.Data} é anterior à última alteração do post (${ultimaAlteracao(p)})`);
    if (!/^[0-9a-f]{64}$/.test(v.Hash)) return nao(`${rel}: Hash deve ser SHA-256 em hexadecimal minúsculo`);
    if (v.Hash !== hash) return nao(`${rel}: o post mudou depois do de-acordo (Hash ${v.Hash.slice(0, 12)}… ≠ atual ${hash.slice(0, 12)}…); precisa de nova revisão`);
    if (!evidenciaValida(v['Evidência'])) {
      const { erro, real } = evidenciaRegistro(v['Evidência'], raiz, p.slug, hash, v.Revisor);
      if (erro) return nao(`${rel}: ${erro}`);
      if (registrosUsados.has(real)) return nao(`${rel}: o mesmo registro interno já foi usado por outro de-acordo (${registrosUsados.get(real)})`);
      registrosUsados.set(real, rel);
    }
    // Um de-acordo por revisor exigido (fiscal e trabalhista são o mesmo papel: Especialista Tributário).
    if (aprov[v.Revisor]) return nao(`dois de-acordos do mesmo revisor (${v.Revisor}): ${aprov[v.Revisor].rel} e ${rel}`);
    const mesmo = Object.values(aprov).find((a) => norm(a.nome).trim() === norm(v.Nome).trim());
    if (mesmo) return nao(`${rel}: a mesma pessoa (${v.Nome}) não pode assinar como ${mesmo.papel} e ${v.Revisor}`);
    aprov[v.Revisor] = { rel, nome: v.Nome, papel: v.Revisor, data: v.Data, evidencia: v['Evidência'] };
  }
  // Contradição: qualquer arquivo da pasta oficial (subpastas e qualquer extensão) que cite este post e não esteja listado bloqueia.
  const listados = new Set(lista.map((r) => resolve(raiz, r)));
  const citaPost = (abs) => { try { const t = lerTexto(abs); return lerDeAcordo(t).v.Post === p.slug || new RegExp(`(^|[^a-z0-9-])${p.slug.replace(/[-]/g, '\\-')}([^a-z0-9-]|$)`, 'i').test(t); } catch { return false; } };
  for (const abs of todosArquivos(oficial)) {
    if (listados.has(abs) || abs === join(oficial, 'LEIA-ME.md')) continue; // só o LEIA-ME da raiz da pasta é isento
    if (lstatSync(abs).isSymbolicLink() || lstatSync(abs).nlink > 1 || citaPost(abs)) return nao(`arquivo não listado no post cita o post, é link ou hardlink (duplicado ou contraditório): ${abs.slice(oficial.length + 1)}`);
  }
  const falta = exigidos.filter((t) => !aprov[TEMAS[t]]);
  if (falta.length) return nao(`falta de-acordo para tema(s) ${falta.join(', ')} (detectados: ${temasDetectados(p).join(', ') || 'nenhum'}; declarado: ${[].concat(p.tema).join(', ')})`);
  const papeis = new Set(exigidos.map((t) => TEMAS[t]));
  const extras = Object.keys(aprov).filter((r) => !papeis.has(r));
  if (extras.length) return nao(`de-acordo de revisor não exigido pelos temas do post: ${extras.join(', ')}`);
  // Revisores únicos (fiscal e trabalhista podem ser o mesmo especialista).
  const revisores = Object.values(aprov);
  const data = Object.values(aprov).map((a) => a.data).sort().at(-1);
  return { ok: true, revisores, data, hash, temas: exigidos };
}
