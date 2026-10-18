# Porte do PR #25 para o gerador

O PR #25 (merge `b863412`) editou o HTML publicado direto. O gerador (`scripts/build.mjs`, `src/content/*.mjs`,
`src/css/style.css`) não tem essas mudanças: se rodar como está, apaga todas, e `links-guias`, `speculation-rules`,
`jsonld-entidade` e `fonte-seo` acusam a perda. Este guia leva as mudanças para o gerador sem reescrever nada à mão.

| Arquivo neste repositório | Papel |
|---|---|
| `tests/_src/content/_seo.mjs` | espelho do futuro `src/content/_seo.mjs`: funções puras que geram os fragmentos do PR |
| `tests/fonte-seo.test.mjs` | prova que o `_seo.mjs` reproduz o HTML publicado, byte a byte |
| `tests/_src/conferir-porte.mjs` | confere a saída do build contra a main e aceita só a diferença esperada (passo 9) |

## O que o PR mudou e quem gera cada parte

| Mudança publicada | No `_seo.mjs` | Onde chamar no build |
|---|---|---|
| `<script type="speculationrules">` em 50 páginas (todas fora de `/licitacoes/`, com o `404.html`) | `speculationRules(caminho)` | cabeçalho comum, logo antes de `</head>` |
| Seção "Guia completo" em `/rescisao/`, `/decimo-terceiro/`, `/salario-liquido/`, `/nr1-riscos-psicossociais/`, `/simples-hibrido/` | `GUIA_DA_CALCULADORA`, `guiaDaCalculadora`, `secaoGuiaCompleto` | página de calculadora, antes das relacionadas |
| Bloco "Guias recentes" na home (6 primeiros posts do índice do blog) | `blocoGuiasRecentes(posts)`, `RECENTES` | home, depois das tabelas oficiais |
| Nó JSON-LD da LCM Global Services e `parentOrganization` na Organization Conta Certa | `nosJsonLdHome`, `noLcm`, `comParentOrganization`, `scriptLdJson` | JSON-LD da home (única página com mudança de JSON-LD) |
| `/aviso-previo/` nas relacionadas de rescisão, férias e seguro-desemprego | (nada: é dado dos módulos) | `src/content/*.mjs` |
| Regra `.relacionadas.guia-completo .cards` | `CSS_GUIA_COMPLETO` | fim de `src/css/style.css` |
| `lastmod` 2026-10-18 nas 8 páginas com conteúdo novo | `mudancaSignificativa`, `PAGINAS_PR25`, `LASTMOD_PR25` | regra do `lastmod` do sitemap |

## Passo a passo

**0. Preparação.** Branch nova no gerador. Clone do contacerta-site na main (`b863412` ou posterior) com
`git status` limpo. Node 22. Mudanças no `scripts/build.mjs` seguem a convenção do gerador: o comentário de
`_guias.mjs` diz que o render, o sitemap e o link na home "entram pelo patch de scripts/build.mjs (não editar
scripts/ direto)". Se esse patch existir, as chamadas abaixo entram nele.

**1. Copiar o módulo.** `cp <site>/tests/_src/content/_seo.mjs src/content/_seo.mjs`, sem editar. Ele importa
`card`, `icone` e `COR_CAT` de `./_visual.mjs`. Rode `diff src/content/_visual.mjs <site>/tests/_src/content/_visual.mjs`.
Se houver diferença em `card`, `tile`, `icone`, `sprite`, `ICONES` ou `COR_CAT`, pare: os testes daqui usam o
espelho. Diferença em outras partes não afeta o `_seo.mjs`, mas anote no relato.

**2. Lista de posts.** O build já monta os posts que passaram no portão, na ordem do índice do blog. Converta cada
um para `{ href: '/blog/<slug>/', titulo, resumo, categoria }`: `titulo` é o h1 do post, `resumo` é o mesmo texto do
card do índice (não a meta description: no post do 13º os dois diferem) e `categoria` é a do card do índice. Não
acrescente campo nos objetos dos posts: o `hashPost` do portão cobre o post inteiro, e um campo novo bloqueia o post
até um novo de-acordo. Chame essa lista de `postsSeo` abaixo.

**3. Cabeçalho (todas as páginas, menos `/licitacoes/`).** No template que fecha o `<head>` (calculadoras, tabelas,
institucionais, home, posts, índice e categorias do blog, 404), logo depois do que `headGa4(cfg)` devolve:

```js
`${headGa4(cfg)}${speculationRules(rota)}</head>`
```

`rota` pode ser a URL (`/rescisao/`, `/404.html`) ou o arquivo de saída (`rescisao/index.html`). Para `/licitacoes/`
a função devolve `''`, então não há exceção a escrever. Esperado: 50 páginas com a linha, as 6 de `/licitacoes/` sem.

**4. Calculadoras.** No template da calculadora, imediatamente antes da seção das relacionadas:

```js
`${secaoGuiaCompleto(guiaDaCalculadora(calc.slug, postsSeo))}<section class="relacionadas" aria-labelledby="rel-t">`
```

Sem guia, ou com o post fora do portão, a função devolve `''`. O mapa calculadora -> post fica só em
`GUIA_DA_CALCULADORA`, no `_seo.mjs`. Não criei campo `guia` nos módulos das calculadoras: só 2 dos 5 módulos estão
espelhados aqui, então o teste não cobriria os outros 3, e duas cópias do mapa podem divergir.

**5. Home.** Bloco novo entre a seção das tabelas oficiais e a seção "Por que usar estas calculadoras":

```js
`…</section>\n${blocoGuiasRecentes(postsSeo)}<section class="texto porque">…`
```

JSON-LD: onde o build monta os nós da home (Organization, WebSite, FAQPage), passe a lista por
`nosJsonLdHome(nos)` antes de serializar. A função acrescenta `parentOrganization` como última chave do nó
`#organizacao` e põe o nó `#lcm` logo depois dele. O publicado é um `<script type="application/ld+json">` por nó
com `JSON.stringify` puro, separados por `"\n"` (é o `scriptLdJson`). Se o build serializa de outro jeito, mantenha
o jeito dele: os nós novos não têm `<` nem `&`.

**6. Sprite.** `icone()` só escreve o `<use href="#i-…">`. `sprite(html)` varre o HTML que recebe e inclui um
`<symbol>` para cada `#i-…` que exista em `ICONES`, na ordem do primeiro uso. Os ícones dos cards novos
(`documento`, `seta`, `calendario`) já estão em `ICONES`, então não há nada a acrescentar. A única condição: o
`sprite()` tem de receber o HTML já com as seções novas. Se o build calcula o sprite antes de inserir o bloco,
falta o `<symbol>`, e o teste "todo `<use href>` tem o `<symbol>` na página" de `links-guias` acusa.

Diferença esperada: o PR acrescentou os `<symbol>` novos no fim do sprite, à mão. Em 5 páginas
(`SPRITE_FORA_DE_ORDEM`: nr1-riscos-psicossociais, rescisao, salario-liquido, seguro-desemprego, simples-hibrido)
o build sai com os mesmos símbolos em outra ordem. Não muda nada na página. É a única diferença aceita na
conferência.

**7. Relacionadas.** O card do aviso prévio sai do `cardCalc` que o build já usa. Basta incluir o slug:

| Módulo | `relacionadas` publicadas |
|---|---|
| `src/content/seguro-desemprego.mjs` (2ª posição) | `['rescisao', 'aviso-previo', 'fgts', 'salario-liquido', 'das-mei', 'juros-compostos']` |
| `src/content/rescisao.mjs` (2ª posição) | `['fgts', 'aviso-previo', 'seguro-desemprego', 'ferias', 'decimo-terceiro', 'salario-liquido']` |
| `src/content/ferias.mjs` (última) | `['salario-liquido', 'decimo-terceiro', 'rescisao', 'horas-extras', 'imposto-de-renda', 'aviso-previo']` |

Mude só essa linha. `rescisao.mjs` e `ferias.mjs` espelhados aqui já têm o aviso prévio, e o
`seguro-desemprego.mjs` não está espelhado (a lista dele fica no teste "aviso prévio nas relacionadas" de
`fonte-seo.test.mjs`). `decimo-terceiro.mjs` e `das-mei.mjs` não mudam. O `das-mei` já publicava 6 relacionadas, o
que indica que o build não corta a lista em 5.

**8. CSS.** Acrescente `CSS_GUIA_COMPLETO` no fim de `src/css/style.css`, exatamente: linha em branco, comentário,
regra, quebra de linha final. Esperado: `shasum -a 256 assets/style.css` começa com `03383b6fea`, o `?v=` que todas
as páginas usam.

**9. Sitemap.** Ache no build a regra do `lastmod`: data do último commit sem merge que mudou o arquivo, fora os que
só trocam `?v=`, e as datas do próprio documento. Troque a comparação "só trocou `?v=`" por
`!mudancaSignificativa(antes, depois)`. Essa função também ignora a linha do speculationrules (regra estendida no
PR) e a ordem dos `<symbol>` do sprite.

A ordem do sprite é uma proposta minha, não regra do PR. Sem ela, o commit que publicar a saída do build moveria o
`lastmod` das 5 páginas do passo 6 para a data dele. Se o Rodrigo preferir sem, tire o `ordenaSprite` de
`normalizaLastmod`.

Esperado: `sitemap.xml` igual ao da main (55 entradas). As 8 de `PAGINAS_PR25` ficam em 2026-10-18 e as outras com
a data atual da main (ex.: `/blog/pro-labore/` em 2026-10-16). Conferido aqui pelo histórico do site:
`mudancaSignificativa` mais as datas do documento reproduz as 55 entradas. Com a regra antiga (só `?v=`), 41
divergem.

**10. Conferência.** Rode o build gravando num worktree limpo da main do site, nunca no clone principal. Se o build
grava em outra pasta, copie a saída por cima do worktree.

```sh
git -C <site> worktree add <tmp> main          # cópia limpa
# … rode o build com saída em <tmp> …
node <tmp>/tests/_src/conferir-porte.mjs <tmp>  # tem de dizer "Diferenças inesperadas: 0" (saída 0)
cd <tmp> && node --test 'tests/*.test.mjs'      # 0 falhas
find . -name '*.html' -not -path './.git/*' -not -name 'google*.html' -print0 | xargs -0 npx --yes html-validate@9.7.1 --max-warnings 0 -c .htmlvalidate.json
```

O `conferir-porte.mjs` exige `git diff` vazio em todos os arquivos (`.html`, `.css`, `sitemap.xml`, `llms.txt`,
feed…). A única exceção é a ordem do sprite nas 5 páginas do passo 6. Arquivo novo ou apagado também conta como
diferença. Para examinar uma diferença: `git -C <tmp> diff --word-diff=color -- <arquivo>`.

**11. Depois do OK do Rodrigo.** Commit do porte no gerador. A primeira publicação da saída do build muda só a ordem
do sprite nas 5 páginas. Nesse PR, esvazie `SPRITE_FORA_DE_ORDEM` em `tests/_src/content/_seo.mjs` e em
`src/content/_seo.mjs`, e o teste do sprite volta a exigir a ordem exata em todas as páginas.

## O que não deu para garantir sem o gerador

- Os pontos de inserção foram deduzidos do HTML publicado, não do `build.mjs`. Para testá-los, simulei o build:
  parti do HTML da `775d4ad` (saída do gerador antes do PR), apliquei o `_seo.mjs` nos pontos acima e refiz o sprite
  com `sprite()`. Saíram 51 de 56 páginas idênticas à `b863412`, e as outras 5 diferem só na ordem do sprite.
- Não sei se o `_visual.mjs` e os módulos do gerador são iguais aos espelhos daqui (por isso o `diff` do passo 1).
- Não sei os nomes dos campos dos posts no build (passo 2) nem como ele serializa o JSON-LD (passo 5).
- Não sei como o build implementa o `lastmod`: se lê o histórico do site, de que pasta, e o que faz com arquivo
  ainda sem commit.
- Se o build grava alguma data do dia no HTML, ela aparece como diferença inesperada no passo 10. Nesse caso,
  analise antes de aceitar.

## Prompt para o Claude Code na pasta do gerador

```text
Você está na pasta do gerador do Conta Certa (scripts/build.mjs, src/content/*.mjs, src/css/style.css,
src/js/*.js). O clone do site está em <CLONE_DO_SITE>, na main atualizada. Tarefa: portar para o gerador as mudanças
do PR #25 do site seguindo <CLONE_DO_SITE>/tests/_src/PORTAR-PR25.md, e provar que o build reproduz a main.

Regras:
- Leia o guia inteiro, o tests/_src/content/_seo.mjs e o tests/fonte-seo.test.mjs do site, e o scripts/build.mjs,
  antes de mudar qualquer coisa. Trabalhe numa branch nova do gerador (porte-pr25).
- Copie o _seo.mjs sem editar. Se algo não encaixar, adapte a chamada no build. Se o _seo.mjs parecer errado, pare
  e explique.
- Não mude texto aprovado (calculadoras, posts, FAQs) nem campos dos posts (o hashPost do portão cobre o post
  inteiro). Siga a convenção do gerador para alterar scripts/build.mjs (o _guias.mjs fala em patch).
- Rode o build só num worktree limpo da main do site (git -C <CLONE_DO_SITE> worktree add <TMP> main), nunca no
  clone principal.
- Proibido sem o OK explícito do Rodrigo: commit ou branch no repositório do site, push, PR, deploy, qualquer
  publicação. No gerador, só commits locais na branch nova, sem push.

Conferência (todas obrigatórias, mostre a saída):
1. node <TMP>/tests/_src/conferir-porte.mjs <TMP>  -> "Diferenças inesperadas: 0"
2. cd <TMP> && node --test 'tests/*.test.mjs'      -> 0 falhas
3. o html-validate do .github/workflows/ci.yml, rodado em <TMP>
4. os testes do próprio gerador, se houver

Relate: os arquivos e trechos alterados no gerador, a saída dos 4 passos, as 5 páginas com o sprite reordenado e
qualquer diferença inesperada (git -C <TMP> diff --word-diff=color -- <arquivo>). Diante de diferença inesperada,
não altere o site: ajuste o gerador ou pare e explique. Ao terminar, remova o worktree <TMP> e espere o OK do
Rodrigo.
```
