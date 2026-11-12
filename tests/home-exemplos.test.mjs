// Home (visual de 11/2026): todo número de exemplo mostrado na página inicial vem da calculadora publicada, com os
// valores padrão do formulário dela. Se uma tabela oficial ou o formulário mudar, este arquivo falha e diz o que
// regravar no index.html; nenhum valor da home é fixo "de cabeça".
// 1. Salário líquido: o resultado dentro da "tela da calculadora" (.app-res) é, byte a byte, o HTML que o ui.js gera
//    para o formulário publicado de /salario-liquido/; o cartão do hero e o cartão das contas mais feitas repetem o
//    mesmo valor, e os campos mostrados na tela são os do formulário (rótulo e valor padrão).
// 2. Rescisão: o valor do hero e do cartão é o "Valor líquido estimado da rescisão" do formulário publicado de
//    /rescisao/; salário, datas, motivo e dias de aviso citados na home são os do formulário e do resultado.
// 3. "R$ 0 de IR para quem ganha até R$ 5 mil": IRRF zero para R$ 5.000,00 de salário bruto, pela calc.js.
// 4. Faixa das tabelas: o número grande de cada cartão (aria-hidden) só repete valores que estão no resumo do cartão.
// 5. A contagem de calculadoras é a mesma na description, na prova, no título do índice e na og:image:alt.
// 6. Datas de conferência: todo <time> da página tem o texto igual ao datetime e a mesma data.
// 7. As contas mais feitas: cada cartão leva a uma calculadora que existe e usa o nome do cartão dela no índice.
// 8. Imagens: toda <img> da home tem largura e altura, e todo arquivo de src e srcset existe.
// Rode: node --test 'tests/*.test.mjs'
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as C from '../assets/js/calc.js';
import { abrirCalculadora } from './_formulario-minimo.mjs';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (iso) => iso.split('-').reverse().join('/');
// Sem as tags; o espaço que não quebra de "R$ 1.621,00" (U+00A0) fica como está (\s o trocaria por espaço comum).
const texto = (html) => html.replace(/<[^>]+>/g, ' ').replace(/[ \t\n]+/g, ' ').trim();
const um = (re, onde = home, oQue = String(re)) => {
  const m = onde.match(re);
  assert.ok(m, `não achei na home: ${oQue}`);
  return m[1];
};
const destaque = (saida) => um(/<p class="destaque"><span>[^<]+<\/span> <strong>([^<]+)<\/strong><\/p>/, saida, 'valor em destaque do resultado');

test('salário líquido: a tela da calculadora na home mostra o HTML que a calculadora gera', async () => {
  const f = await abrirCalculadora('salario-liquido');
  const saida = f.out.innerHTML;
  assert.ok(saida.includes('class="destaque"'), 'a calculadora não gerou resultado com o formulário padrão');
  assert.ok(home.includes(`<div class="app-res resultado">\n${saida}\n</div>`),
    'o bloco .app-res da home difere do resultado atual de /salario-liquido/ com os valores padrão: regrave o bloco com a saída da calculadora');
  const liquido = destaque(saida);
  // hero e cartão das contas mais feitas: o mesmo valor
  assert.equal(um(/<p class="mini-valor">([^<]+)<\/p>/), liquido);
  assert.ok(home.includes(`<b>${liquido}</b><small>${brl(Number(f.campo('bruto').value))} de salário bruto</small>`), 'cartão do salário líquido');
  // barra e legenda do hero: as mesmas partes do resultado
  const barra = um(/<div class="barra" aria-hidden="true">(.*?)<\/div>/, saida);
  const legenda = um(/<ul class="legenda">(.*?)<\/ul>/, saida);
  assert.ok(home.includes(`<div class="mini-barra" aria-hidden="true">${barra}</div>`), 'barra do hero');
  assert.ok(home.includes(`<ul class="mini-leg">${legenda}</ul>`), 'legenda do hero');
  // campos mostrados na tela: rótulo e valor padrão do formulário publicado
  const pagina = readFileSync(new URL('../salario-liquido/index.html', import.meta.url), 'utf8');
  const rotulo = (id) => um(new RegExp(`<label for="${id}">([^<]+)</label>`), pagina);
  assert.ok(home.includes(`<div><dt>${rotulo('f-bruto')}</dt><dd>${brl(Number(f.campo('bruto').value))}</dd></div>`), 'campo do salário bruto');
  assert.ok(home.includes(`<div><dt>${rotulo('f-dependentes')}</dt><dd>${f.campo('dependentes').value}</dd></div>`), 'campo dos dependentes');
  for (const n of ['pensao', 'outros']) assert.equal(Number(f.campo(n).value), 0, `${n}: o exemplo da home supõe zero`);
  assert.equal(f.campo('vt').checked, false, 'vale-transporte: o exemplo da home supõe desmarcado');
  // legendas: mesmo salário bruto
  const bruto = brl(Number(f.campo('bruto').value));
  assert.ok(home.includes(`: ${bruto} brutos<span class="leg-extra">, sem dependentes, tabelas de 2026</span>.</figcaption>`), 'legenda do hero');
  assert.ok(home.includes(`com o exemplo de ${bruto} brutos, sem dependentes.</figcaption>`), 'legenda da tela');
});

test('rescisão: valor, salário, datas, motivo e dias de aviso da home são os do formulário publicado', async () => {
  const f = await abrirCalculadora('rescisao');
  const saida = f.out.innerHTML;
  const liquido = destaque(saida);
  assert.ok(saida.includes('<span>Valor líquido estimado da rescisão</span>'));
  assert.ok(home.includes(`<b>Rescisão estimada: ${liquido}</b>`), `hero: rescisão de ${liquido}`);
  const dias = um(/Aviso prévio indenizado \((\d+) dias\)/, saida);
  assert.ok(home.includes(`<small>Exemplo: sem justa causa, aviso indenizado de ${dias} dias</small>`), `hero: aviso de ${dias} dias`);
  assert.equal(f.campo('tipo').value, 'semJustaCausa');
  assert.equal(f.campo('aviso').value, 'indenizado');
  const exemplo = `${brl(Number(f.campo('salario').value))} de salário, de ${dataBR(f.campo('admissao').value)} a ${dataBR(f.campo('desligamento').value)}`;
  assert.ok(home.includes(`<p class="dc-ex"><span>Exemplo, sem justa causa</span><b>${liquido}</b><small>${exemplo}</small></p>`), `cartão da rescisão: ${exemplo}`);
});

test('"R$ 0 de IR para quem ganha até R$ 5 mil": IRRF zero em R$ 5.000,00', () => {
  assert.equal(C.salarioLiquido({ bruto: 5000 }).irrf, 0);
  assert.ok(C.salarioLiquido({ bruto: 5500 }).irrf > 0, 'acima da faixa há imposto: a frase não pode virar "sem IR"');
  for (const frase of ['<b>R$\u00a00 de IR</b><small>para quem ganha até R$\u00a05 mil</small>', '<b>R$\u00a00 <small>de IR</small></b><span>para quem ganha até R$\u00a05 mil</span>']) assert.ok(home.includes(frase), frase);
});

test('faixa das tabelas: o número grande de cada cartão repete valores do resumo do próprio cartão', () => {
  const secao = um(/(<section class="secao" aria-labelledby="tabelas">[^]*?<\/section>)/);
  const cartoes = [...secao.matchAll(/<a class="card" href="(\/[^"]+\/)">[^]*?<strong>([^<]+)<\/strong><span>([^<]+)<\/span>(?:<b class="card-num" aria-hidden="true">([^]*?)<\/b>)?<\/span>/g)];
  assert.equal(cartoes.length, 4);
  for (const [, href, nome, resumo, num] of cartoes) {
    assert.ok(num, `${href}: sem número grande`);
    const valores = texto(num).match(/R\$\u00a0[\d.]+,\d{2}|\d+(?:,\d+)?%/g) || [];
    assert.ok(valores.length >= 1, `${nome}: número sem valor`);
    for (const v of valores) assert.ok(resumo.includes(v), `${nome}: "${v}" não está no resumo "${resumo}"`);
  }
});

test('contagem de calculadoras: a mesma na description, na og:image:alt, na prova e no título do índice', () => {
  const n = [
    um(/<meta name="description" content="[^"]*?(\d+) calculadoras grátis/),
    um(/<meta property="og:image:alt" content="[^"]*?(\d+) calculadoras online grátis/),
    um(/<strong>(\d+) calculadoras<\/strong> grátis, sem limite de uso/),
    um(/<h2 id="todas">(\d+) calculadoras grátis/),
  ];
  assert.deepEqual([...new Set(n)], [n[0]], `contagens diferentes: ${n.join(', ')}`);
});

test('datas de conferência: texto igual ao datetime e a mesma data em toda a home', () => {
  const tempos = [...home.matchAll(/<time datetime="(\d{4}-\d{2}-\d{2})">([^<]+)<\/time>/g)];
  assert.ok(tempos.length >= 3, 'hero, faixa das tabelas e rodapé');
  for (const [, iso, visto] of tempos) assert.equal(visto, dataBR(iso));
  assert.equal(new Set(tempos.map((t) => t[1])).size, 1, 'datas diferentes na mesma página');
  assert.ok(home.includes(`conferidos em ${tempos[0][2]}.`), 'a data do FAQ é a mesma');
});

test('as contas mais feitas: seis cartões, cada um para uma calculadora que existe, com o nome dela no índice', () => {
  const secao = um(/(<section class="dest" aria-labelledby="dest-t">[^]*?<\/section>)/);
  const cartoes = [...secao.matchAll(/<h3>([^<]+)<\/h3>[^]*?<a class="lk" href="(\/[a-z0-9-]+\/)">([^<]+)<\/a>/g)];
  assert.equal(cartoes.length, 6);
  for (const [, nome, href, cta] of cartoes) {
    assert.ok(existsSync(new URL(`..${href}index.html`, import.meta.url)), href);
    const noIndice = um(new RegExp(`<li><a class="card" href="${href}"><span class="tile t-[a-z]+">[^]*?<strong>([^<]+)</strong>`), home, `cartão de ${href} no índice`);
    assert.equal(nome, noIndice, `${href}: nome diferente do índice`);
    assert.match(cta, /^Calcular /);
  }
  assert.equal(new Set(cartoes.map((c) => c[2])).size, 6, 'calculadora repetida');
});

test('imagens da home: largura e altura declaradas, e todo arquivo de src e srcset existe', () => {
  const imgs = home.match(/<img\b[^>]*>/g) || [];
  assert.ok(imgs.length >= 7, 'ilustração do hero e seis cartões');
  for (const tag of imgs) {
    assert.match(tag, /\swidth="\d+"/, tag);
    assert.match(tag, /\sheight="\d+"/, tag);
    assert.match(tag, /\salt="[^"]*"/, tag);
  }
  // só a primeira imagem (hero) carrega com prioridade; as outras, sob demanda
  assert.equal(imgs.filter((t) => /fetchpriority="high"/.test(t)).length, 1);
  assert.ok(/fetchpriority="high"/.test(imgs[0]) && !/loading="lazy"/.test(imgs[0]));
  for (const tag of imgs.slice(1)) assert.match(tag, /loading="lazy"/, tag);
  const arquivos = new Set();
  for (const [, v] of home.matchAll(/\ssrc="(\/assets\/img\/[^"]+)"/g)) arquivos.add(v);
  for (const [, lista] of home.matchAll(/\ssrcset="([^"]+)"/g)) for (const item of lista.split(',')) arquivos.add(item.trim().split(/\s+/)[0]);
  assert.ok(arquivos.size >= 14);
  for (const a of arquivos) assert.ok(existsSync(`${raiz}${a.slice(1)}`), `${a} não existe`);
});
