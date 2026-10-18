# Porte do PR #25 para o gerador

O PR #25 (merge `b863412`) editou o HTML publicado direto. O gerador (`scripts/build.mjs`, `src/content/*.mjs`,
`src/css/style.css`) não tem essas mudanças: se rodar como está, apaga todas, e `links-guias`, `speculation-rules`,
`jsonld-entidade` e `fonte-seo` acusam a perda. Este guia leva as mudanças para o gerador sem reescrever nada à mão.

| Arquivo neste repositório | Papel |
|---|---|
| `tests/_src/content/_seo.mjs` | espelho do futuro `src/content/_seo.mjs`: funções puras que geram os fragmentos do PR |
| `tests/fonte-seo.test.mjs` | prova que o `_seo.mjs` reproduz o HTML publicado, byte a byte |
| `tests/_src/conferir-porte.mjs` | confere a saída do build contra o commit do worktree: linha de base (passo 1) e porte (passo 11) |

Nomes usados abaixo: `<site>` é o clone do contacerta-site, `<tmp>` é um worktree destacado da main do site e
`<base>` é um worktree destacado da `775d4ad` (o site antes do PR #25). Nenhum dos dois worktrees cria branch.

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

**0. Pré-requisitos e preparação.**

- Esta branch (`fix/gerador`) precisa estar mergeada na main do site, e o merge depende do OK do Rodrigo. A `b863412`
  não tem `_seo.mjs`, `conferir-porte.mjs`, `fonte-seo.test.mjs` nem este guia. Confira com
  `git -C <site> fetch origin && git -C <site> cat-file -e origin/main:tests/_src/conferir-porte.mjs`. Se falhar,
  pare.
- Crie o worktree da main sem branch: `git -C <site> worktree add --detach <tmp> origin/main`. Não use
  `worktree add <tmp> main`: o git recusa quando a main está aberta no clone principal, e `-b` criaria branch no
  site. O clone principal não é tocado em nenhum passo.
- Branch nova no gerador. Node 22. Mudanças no `scripts/build.mjs` seguem a convenção do gerador: o comentário de
  `_guias.mjs` diz que o render, o sitemap e o link na home "entram pelo patch de scripts/build.mjs (não editar
  scripts/ direto)". Se esse patch existir, as chamadas abaixo entram nele.
- Antes de rodar o build pela primeira vez, leia o `scripts/build.mjs` e confirme: onde ele grava a saída; se apaga
  a pasta de saída antes; de que pasta lê o histórico git do site (para o `lastmod`); se só grava arquivo cujo
  conteúdo mudou; e que não faz `git commit`, `push`, deploy nem chamada de rede. Se fizer algum desses, ou se a
  saída for fixa no clone principal do site, pare e relate antes de rodar. Se a saída for uma pasta própria do
  gerador, esvazie-a antes de cada build e copie-a por cima do worktree depois (`cp -R <saida>/. <tmp>/`).
- Não mexa no portão nem nos de-acordos: `src/content/_portao.mjs`, a pasta oficial dos de-acordos (ex.:
  `revisoes/blog`), `registros-revisao/` e os Hash ficam como estão. Post barrado no portão é motivo para parar e
  relatar, nunca para "consertar" de-acordo, Hash ou portão.

**1. Linha de base (gerador sem nenhuma mudança).** Antes de portar, prove que o gerador reproduz o site de antes do
PR #25. O site recebeu edições à mão que podem não estar no gerador: a regra do `lastmod` foi aplicada no
`sitemap.xml` à mão no `47f69c9`; o `?v=` por sha256 de cada arquivo foi escrito à mão no `843c11a`; o PR #24 editou
direto `assets/js/*.js`, `assets/style.css` (`a94daf7`) e os espelhos `rescisao.mjs`, `ferias.mjs`, `_geo.mjs` e o
`SCRIPT_BUSCA` de `_visual.mjs`; as 6 URLs de `/licitacoes/` entraram no sitemap à mão (`8b8f844`).

Primeiro compare as fontes do gerador com o site da `775d4ad` (os `tests/_src/js/*.js` são só reexportações, não
espelhos; por isso o JS é comparado com `assets/js`, onde diferença só no `?v=` dos imports é esperada se o build os
escreve):

```sh
for n in $(git -C <site> ls-tree --name-only 775d4ad tests/_src/content/); do
  git -C <site> show "775d4ad:$n" | diff -u "src/content/$(basename "$n")" -; done
git -C <site> show 775d4ad:assets/style.css | diff -u src/css/style.css -
for f in src/js/*.js src/static/assets/js/*.js; do git -C <site> show "775d4ad:assets/js/$(basename "$f")" | diff -u "$f" -; done
```

Diferença em `card`, `tile`, `icone`, `sprite`, `ICONES` ou `COR_CAT` do `_visual.mjs`: pare, porque o `_seo.mjs`
e os testes daqui usam o espelho. Outras diferenças entram no relato e quase certamente aparecem na linha de base.
Depois rode o build sem mudanças:

```sh
git -C <site> worktree add --detach <base> 775d4ad
node <tmp>/tests/_src/conferir-porte.mjs <base> --marcar   # antes do build
# … build do gerador SEM mudanças, saída em <base> (ou na pasta dele, esvaziada antes, copiada por cima) …
node <tmp>/tests/_src/conferir-porte.mjs <base> --exato    # tem de dizer "Diferenças inesperadas: 0" (saída 0)
git -C <site> worktree remove --force <base>               # descarta só a saída do build nesse worktree
```

`--exato` não aceita nem a diferença na ordem do sprite. Se a linha de base não sair limpa, o gerador está atrás do
site (PR #24 ou edições anteriores) ou faz algo de outro jeito (`?v=`, `lastmod`, data do dia no HTML, post barrado
no portão). Pare e relate ao Rodrigo a lista de diferenças, sem portar nada: nem o PR #25, nem as mudanças do PR #24,
que incluem texto que o revisor mandou passar pelo Advogado. Se o build adota o esquema de `?v=` e de `lastmod` do
site, ou se o sitemap e o `?v=` continuam mantidos à mão no site, quem escolhe é ele.

**2. Copiar o módulo.** `cp <tmp>/tests/_src/content/_seo.mjs src/content/_seo.mjs`, sem editar. Ele importa
`card`, `icone` e `COR_CAT` de `./_visual.mjs`, já comparado no passo 1. Se o Rodrigo decidiu tirar a ordem do
sprite da regra do `lastmod` (passo 10), a mudança entra antes no site e só depois se copia o módulo.

**3. Lista de posts.** O build já monta os posts que passaram no portão, na ordem do índice do blog. Converta cada
um para `{ href: '/blog/<slug>/', titulo, resumo, categoria }`: `titulo` é o h1 do post, `resumo` é o mesmo texto do
card do índice (não a meta description: no post do 13º os dois diferem) e `categoria` é a do card do índice. Não
acrescente campo nos objetos dos posts: o `hashPost` do portão cobre o post inteiro, e um campo novo bloqueia o post
até um novo de-acordo. Chame essa lista de `postsSeo` abaixo.

**4. Cabeçalho (todas as páginas, menos `/licitacoes/`).** No template que fecha o `<head>` (calculadoras, tabelas,
institucionais, home, posts, índice e categorias do blog, 404), logo depois do que `headGa4(cfg)` devolve:

```js
`${headGa4(cfg)}${speculationRules(rota)}</head>`
```

`rota` pode ser a URL (`/rescisao/`, `/404.html`) ou o arquivo de saída (`rescisao/index.html`). Para `/licitacoes/`
a função devolve `''`, então não há exceção a escrever. Esperado: 50 páginas com a linha, as 6 de `/licitacoes/` sem.

**5. Calculadoras.** No template da calculadora, imediatamente antes da seção das relacionadas:

```js
`${secaoGuiaCompleto(guiaDaCalculadora(calc.slug, postsSeo))}<section class="relacionadas" aria-labelledby="rel-t">`
```

Sem guia, ou com o post fora do portão, a função devolve `''`. O mapa calculadora -> post fica só em
`GUIA_DA_CALCULADORA`, no `_seo.mjs`. Não criei campo `guia` nos módulos das calculadoras: só 2 dos 5 módulos estão
espelhados aqui, então o teste não cobriria os outros 3, e duas cópias do mapa podem divergir.

**6. Home.** Bloco novo entre a seção das tabelas oficiais e a seção "Por que usar estas calculadoras":

```js
`…</section>\n${blocoGuiasRecentes(postsSeo)}<section class="texto porque">…`
```

JSON-LD: onde o build monta os nós da home (Organization, WebSite, FAQPage), passe a lista por
`nosJsonLdHome(nos)` antes de serializar. A função acrescenta `parentOrganization` como última chave do nó
`#organizacao` e põe o nó `#lcm` logo depois dele. O publicado é um `<script type="application/ld+json">` por nó
com `JSON.stringify` puro, separados por `"\n"` (é o `scriptLdJson`). Se o build serializa de outro jeito, mantenha
o jeito dele: os nós novos não têm `<` nem `&`.

**7. Sprite.** `icone()` só escreve o `<use href="#i-…">`. `sprite(html)` varre o HTML que recebe e inclui um
`<symbol>` para cada `#i-…` que exista em `ICONES`, na ordem do primeiro uso. Os ícones dos cards novos
(`documento`, `seta`, `calendario`) já estão em `ICONES`, então não há nada a acrescentar. A única condição: o
`sprite()` tem de receber o HTML já com as seções novas. Se o build calcula o sprite antes de inserir o bloco,
falta o `<symbol>`, e o teste "todo `<use href>` tem o `<symbol>` na página" de `links-guias` acusa.

Diferença esperada: o PR acrescentou os `<symbol>` novos no fim do sprite, à mão. Em 5 páginas
(`SPRITE_FORA_DE_ORDEM`: nr1-riscos-psicossociais, rescisao, salario-liquido, seguro-desemprego, simples-hibrido)
o build sai com os mesmos símbolos em outra ordem. Não muda nada na página. É a única diferença aceita na
conferência do passo 11.

**8. Relacionadas.** O card do aviso prévio sai do `cardCalc` que o build já usa. Basta incluir o slug:

| Módulo | `relacionadas` publicadas |
|---|---|
| `src/content/seguro-desemprego.mjs` (2ª posição) | `['rescisao', 'aviso-previo', 'fgts', 'salario-liquido', 'das-mei', 'juros-compostos']` |
| `src/content/rescisao.mjs` (2ª posição) | `['fgts', 'aviso-previo', 'seguro-desemprego', 'ferias', 'decimo-terceiro', 'salario-liquido']` |
| `src/content/ferias.mjs` (última) | `['salario-liquido', 'decimo-terceiro', 'rescisao', 'horas-extras', 'imposto-de-renda', 'aviso-previo']` |

Mude só essa linha. `rescisao.mjs` e `ferias.mjs` espelhados aqui já têm o aviso prévio (o PR #25 mudou os
espelhos), e o `seguro-desemprego.mjs` não está espelhado (a lista dele fica no teste "aviso prévio nas
relacionadas" de `fonte-seo.test.mjs`). `decimo-terceiro.mjs` e `das-mei.mjs` não mudam. O `das-mei` já publicava 6
relacionadas, o que indica que o build não corta a lista em 5.

**9. CSS.** Acrescente `CSS_GUIA_COMPLETO` no fim de `src/css/style.css`, exatamente: linha em branco, comentário,
regra, quebra de linha final. Esperado: `shasum -a 256 assets/style.css` começa com `03383b6fea`, o `?v=` que todas
as páginas da main usam. Que o build calcula o `?v=` pelo sha256 de cada arquivo é hipótese: na main ele foi escrito
à mão no `843c11a`, e em commits antigos do site (ex.: `d71a6f6`, `ce3c241`) `calc.js`, `ui.js` e `style.css` tinham
o mesmo `?v=`, que não era o sha256 do `style.css`. A linha de base do passo 1 já mostrou se o build faz assim.

**10. Sitemap.** A regra do `lastmod` que o `sitemap.xml` da main segue (data do último commit sem merge que mudou o
arquivo, fora os que só trocam `?v=`, e as datas do próprio documento) foi aplicada à mão no `47f69c9`. Antes dele,
49 das 55 entradas estavam em 2026-10-10. Se a linha de base passou, o build reproduz o sitemap da `775d4ad`; confira
no `build.mjs` como. Se ele usa essa regra, troque a comparação "só trocou `?v=`" por
`!mudancaSignificativa(antes, depois)`. Essa função também ignora a linha do speculationrules (regra estendida no
PR) e a ordem dos `<symbol>` do sprite. Se o build chega às datas de outro jeito (tabela de datas, data do build),
não invente regra: pare e relate ao Rodrigo.

A ordem do sprite é uma proposta minha, não regra do PR. Sem ela, o `lastmod` das 5 páginas do passo 7 iria para a
data do commit que publicar a saída do build. Se o Rodrigo preferir sem, a mudança entra antes no site, num PR com o
OK dele: tirar o `ordenaSprite` de `normalizaLastmod` em `tests/_src/content/_seo.mjs` e tirar `invertido` da lista
da asserção do teste "mudancaSignificativa" em `tests/fonte-seo.test.mjs`, que senão falha. O teste do sitemap
aceita `lastmod` posterior a 2026-10-18 e não muda. Só depois copie o `_seo.mjs` (passo 2).

Esperado: `sitemap.xml` igual ao da main (55 entradas). As 8 de `PAGINAS_PR25` ficam em 2026-10-18 e as outras com
a data atual da main (ex.: `/blog/pro-labore/` em 2026-10-16). Conferido aqui pelo histórico do site:
`mudancaSignificativa` mais as datas do documento reproduz as 55 entradas. Com a regra antiga (só `?v=`), 41
divergem. A suíte de testes não pega essa divergência (o teste do sitemap só exige `lastmod` a partir de 2026-10-18
nas 8 páginas): quem pega é o `conferir-porte.mjs` do passo 11, pelo `sitemap.xml`.

**11. Conferência.** Rode o build com a saída no worktree `<tmp>` do passo 0, nunca no clone principal.

```sh
node <tmp>/tests/_src/conferir-porte.mjs <tmp> --marcar   # antes do build, com git status limpo
# … build portado, saída em <tmp> (ou na pasta dele, esvaziada antes, copiada por cima com cp -R <saida>/. <tmp>/) …
node <tmp>/tests/_src/conferir-porte.mjs <tmp>            # tem de dizer "Diferenças inesperadas: 0" (saída 0)
cd <tmp> && node --test 'tests/*.test.mjs'                # 0 falhas
find . -name '*.html' -not -path './.git/*' -not -name 'google*.html' -print0 | xargs -0 npx --yes html-validate@9.7.1 --max-warnings 0 -c .htmlvalidate.json
```

O `--marcar` exige `git status` limpo e HEAD destacado (recusa o clone principal), muda só a data de modificação dos
arquivos que o build tem de regravar (páginas fora de `/licitacoes/` e da verificação do Google, `sitemap.xml`,
`blog/feed.xml`, `llms.txt`, `assets/style.css`, `assets/js/*.js`) e guarda a lista no diretório git do worktree,
fora do `git status`. Depois do build, o `conferir-porte.mjs` exige `git diff` vazio em todos os arquivos, e todo
arquivo da lista regravado. A única exceção é a ordem do sprite nas 5 páginas do passo 7. Arquivo novo, apagado ou
não regravado também conta como diferença: um arquivo que o build não escreve continua com o conteúdo da main, que
já tem o PR #25, e por isso o conteúdo igual não prova nada. Se o build só grava arquivo cujo conteúdo mudou, todo
arquivo igual aparece como não regravado: pare e relate, sem mexer nas datas. Para examinar uma diferença:
`git -C <tmp> diff --word-diff=color -- <arquivo>`. No fim, fora do `<tmp>`, remova o worktree com
`git -C <site> worktree remove --force <tmp>` (o `--force` descarta só a saída do build nele).

**12. Depois do OK do Rodrigo.** Commit do porte no gerador. A primeira publicação da saída do build muda só a ordem
do sprite nas 5 páginas. Nesse PR, esvazie `SPRITE_FORA_DE_ORDEM` em `tests/_src/content/_seo.mjs` e em
`src/content/_seo.mjs`, e o teste do sprite volta a exigir a ordem exata em todas as páginas. Os demais testes do
`fonte-seo.test.mjs` continuam valendo depois do porte: a regra do CSS pode deixar de ser a última do arquivo e o
`lastmod` das 8 páginas pode avançar.

## O que não deu para garantir sem o gerador

- Os pontos de inserção foram deduzidos do HTML publicado, não do `build.mjs`. Para testá-los, simulei o build:
  parti do HTML publicado na `775d4ad`, apliquei o `_seo.mjs` nos pontos acima e refiz o sprite com `sprite()`.
  Saíram 51 de 56 páginas idênticas à `b863412`, e as outras 5 diferem só na ordem do sprite. A `775d4ad` não é
  necessariamente a saída do gerador: o site recebeu edições à mão (passo 1), e só a linha de base diz se o gerador
  a reproduz.
- Não sei se o `_visual.mjs` e os módulos do gerador são iguais aos espelhos daqui (por isso os `diff` do passo 1).
- Não sei os nomes dos campos dos posts no build (passo 3) nem como ele serializa o JSON-LD (passo 6).
- Não sei como o build implementa o `lastmod`: se lê o histórico do site, de que pasta, e o que faz com arquivo
  ainda sem commit. Nem como implementa o `?v=` (passos 9 e 10).
- Se o build grava alguma data do dia no HTML, ela aparece como diferença já na linha de base (passo 1).

## Prompt para o Claude Code na pasta do gerador

```text
Você está na pasta do gerador do Conta Certa (scripts/build.mjs, src/content/*.mjs, src/css/style.css,
src/js/*.js). O clone do site está em <CLONE_DO_SITE>. Tarefa: portar para o gerador as mudanças do PR #25 do site
seguindo o tests/_src/PORTAR-PR25.md da main do site, e provar que o build reproduz a main.

Pré-requisito: a main do site com o merge da branch fix/gerador. Rode
git -C <CLONE_DO_SITE> fetch origin && git -C <CLONE_DO_SITE> cat-file -e origin/main:tests/_src/conferir-porte.mjs
Se falhar, pare: o merge depende do OK do Rodrigo.

Regras:
- Crie o worktree da main sem branch: git -C <CLONE_DO_SITE> worktree add --detach <TMP> origin/main. Leia ali o
  guia inteiro, o tests/_src/content/_seo.mjs e o tests/fonte-seo.test.mjs, e leia o scripts/build.mjs, antes de
  mudar qualquer coisa. Trabalhe numa branch nova do gerador (porte-pr25).
- Antes de rodar o build pela primeira vez, confirme no código onde ele grava a saída, se apaga a pasta de saída,
  de onde lê o histórico git do site e que não faz git commit, push, deploy nem chamada de rede. Se fizer, ou se a
  saída for fixa no clone principal, pare e explique antes de rodar. Rode o build só com a saída num worktree
  destacado (ou numa pasta própria, esvaziada antes e copiada por cima dele), nunca no clone principal.
- Faça a linha de base do passo 1 antes de portar: build sem mudanças num worktree destacado <BASE> da 775d4ad
  (git -C <CLONE_DO_SITE> worktree add --detach <BASE> 775d4ad), com conferir-porte --marcar antes e --exato
  depois. Se ela não sair limpa, pare e relate as diferenças, sem portar nada (nem o PR #25, nem o PR #24).
- Copie o _seo.mjs sem editar. Se algo não encaixar, adapte a chamada no build. Se o _seo.mjs parecer errado, pare
  e explique.
- Não mude texto aprovado (calculadoras, posts, FAQs) nem campos dos posts (o hashPost do portão cobre o post
  inteiro). Não altere src/content/_portao.mjs, a pasta oficial dos de-acordos (ex.: revisoes/blog),
  registros-revisao/ nem qualquer Hash. Post barrado no portão: pare e relate. Siga a convenção do gerador para
  alterar scripts/build.mjs (o _guias.mjs fala em patch).
- Se o build implementa o lastmod ou o ?v= de outro jeito do que o guia supõe (passos 9 e 10), não invente regra:
  pare e relate.
- Proibido sem o OK explícito do Rodrigo: commit ou branch no repositório do site, push, PR, deploy, qualquer
  publicação. No gerador, só commits locais na branch nova, sem push.

Conferência (todas obrigatórias, mostre a saída):
1. linha de base: node <TMP>/tests/_src/conferir-porte.mjs <BASE> --marcar antes do build e, depois,
   node <TMP>/tests/_src/conferir-porte.mjs <BASE> --exato -> "Diferenças inesperadas: 0"
2. porte: node <TMP>/tests/_src/conferir-porte.mjs <TMP> --marcar antes do build e, depois,
   node <TMP>/tests/_src/conferir-porte.mjs <TMP> -> "Diferenças inesperadas: 0"
3. cd <TMP> && node --test 'tests/*.test.mjs' -> 0 falhas
4. o html-validate do .github/workflows/ci.yml, rodado em <TMP>
5. os testes do próprio gerador, se houver

Relate: os arquivos e trechos alterados no gerador, a saída dos 5 passos, a saída dos diff do passo 1, as 5
páginas com o sprite reordenado e qualquer diferença inesperada (git -C <TMP> diff --word-diff=color -- <arquivo>).
Diante de diferença inesperada ou arquivo não regravado, não altere o site nem o portão: corrija a chamada do
_seo.mjs no build, se o erro for dela, ou pare e explique. Ao terminar, remova os worktrees
(git -C <CLONE_DO_SITE> worktree remove --force <TMP>, idem <BASE>) e espere o OK do Rodrigo.
```
