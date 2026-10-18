# Conta Certa (contacertabr.com.br)

## Como editar o site

O HTML deste repositório é a fonte oficial: não existe gerador (o antigo `scripts/build.mjs` não foi encontrado em
18/10/2026). Edite os arquivos direto e, depois:

1. `node tests/manutencao/cache.mjs`: põe em todo `?v=` de `.js`/`.css`/`.mjs` local os 10 primeiros hex do sha256
   do arquivo (inclusive nos imports entre módulos e no `modulepreload`). Referência nova nasce com `?v=` (qualquer
   valor): sem ele, ou numa forma que o script não reconhece, ele recusa e não grava nada. Só os assets de
   `licitacoes/assets/` ficam sem `?v=`.
2. Commit.
3. `node tests/manutencao/lastmod.mjs`: recalcula o `lastmod` do `sitemap.xml`. Roda depois do commit porque a data
   vem do histórico (último commit que mudou a página, sem contar troca de `?v=`, da linha do `speculationrules` ou
   da ordem do sprite); antes do commit a página sai com a data de hoje e um aviso. Commit do `sitemap.xml`, se mudou.
   Precisa do histórico: num clone raso, o script e o teste só falham (com mensagem) se o histórico não alcançar o
   último commit significativo de alguma página; `git fetch --unshallow` resolve, e o CI usa `fetch-depth: 0`.
   Página nova entra no sitemap à mão.
4. Testes (abaixo) e o html-validate do `.github/workflows/ci.yml`.
5. PR para a main, com o CI verde.

`--conferir` nos dois scripts só confere e sai com 1 se algo divergir.

## Testes

Os testes exigem **Node 22** (ver `.nvmrc`). Rode na raiz do repositório:

```sh
node --test 'tests/*.test.mjs'
```

## Testes de navegador (e2e)

O job `e2e` do CI roda o Playwright (versão exata em `tests/e2e/package-lock.json`, só Chromium) em 390 px e
1280 px: cada calculadora (achada pelo HTML: `form.calc-form` com `data-calc`) calcula com os valores padrão e mostra
resultado com número, sem recarregar a página, sem erro de console nem rolagem horizontal; home e blog carregam sem
erro; nada do Google antes de clicar no banner de cookies nem depois de Recusar, e a tentativa de carregar o GA
aparece depois de Aceitar. Calculadora desligada fica sem `data-calc` e com o botão `disabled`. O mesmo job passa o
axe-core (`@axe-core/playwright`, versão exata no lockfile) em todas as páginas, nas duas larguras, com as regras
WCAG 2.0, 2.1 e 2.2 A e AA: falha só com violação serious ou critical; moderate e minor saem no log. O Playwright
serve o site com `python3 -m http.server` em 127.0.0.1:8191 (`E2E_PORTA` troca a porta), aborta e registra toda
requisição HTTP ou WebSocket a outro host e registra as dicas de conexão para fora (`preconnect`, `dns-prefetch`...);
o Chromium sobe sem proxy, nem o do ambiente, e sem DNS. Local:

```sh
cd tests/e2e
npm ci --ignore-scripts
npx playwright install --with-deps --only-shell chromium   # uma vez
npx playwright test                                        # -g "markup" roda só os casos com esse nome
```

Quando falha, a mensagem diz o quê: resultado sem número, envio que recarrega a página, erro de console, elementos
que passam da borda, URL de outro host pedida, URL do Google pedida antes do aceite, violação de acessibilidade
(página, regra do axe e seletor do elemento). No CI, capturas e traces ficam no artefato `e2e-falhas`
(`npx playwright show-trace` abre o `.zip`). Corrija a página, não o teste. Nenhuma página pode pedir nada de outro
host antes do aceite (imagem, vídeo, fonte, script de terceiro, `preconnect`): isso derruba o e2e de propósito, e
liberar um host pede decisão explícita e muda o teste junto. Google antes do aceite é violação da regra do banner.

Não use `--reporter=html` dentro do repositório: a pasta `tests/e2e/playwright-report/` (ignorada pelo git) traz um
`index.html` que o `node --test` passa a tratar como página do site; apague-a se for criada. Para atualizar o
Playwright: em `tests/e2e`, `npm install -D --save-exact @playwright/test@<versão>` e commit do `package.json` e do
`package-lock.json`; o CI baixa o Chromium da versão nova sozinho.

## Links externos

`.github/workflows/links.yml` confere os links externos de todas as páginas às segundas, 09:17 UTC, e sob demanda
(Actions > Links externos > Run workflow); não roda em push nem em PR. Local: `node tests/links/conferir-links.mjs`
(`--listar` só lista links e páginas, sem rede; atrás de proxy, `NODE_USE_ENV_PROXY=1`). O que não dá OK ganha uma
nova tentativa 60 s depois do fim da primeira passada. Em link de afiliado, o parâmetro do afiliado (`tag=` da
Amazon, `indicacao=`) sai da URL conferida, para a checagem não contar como clique.

O job falha só com QUEBRADO: 404, 410 e os demais 4xx fora da lista de robô (400, 402, 422...); 5xx nas duas
tentativas; erro de DNS, de rede (conexão recusada ou fechada) ou de certificado (expirado, autoassinado, de outro
nome); tempo esgotado duas vezes; mais de 15 redirecionamentos, 3xx sem destino ou redirecionamento que termina em
404. São só aviso: BLOQUEIO_DE_ROBO (401, 403, 405, 406, 418, 429, 451, 999 ou desafio do Cloudflare), que vale olhar
à mão se persistir, e NAO_CONFERIDO (cadeia TLS incompleta, que o navegador completa e o Node não, comum em
`*.gov.br`), que se confere abrindo no navegador.

Quando falha, o resumo da execução lista cada link quebrado com o motivo e as páginas onde aparece. Abra o link no
navegador: se abrir normalmente, rode o workflow de novo antes de mexer; se a falha continuar só no runner (site que
bloqueia o IP do GitHub), registre numa issue em vez de remover o link; se estiver quebrado de fato, troque ou remova
o link nessas páginas. O GitHub desliga o agendamento depois de 60 dias sem atividade no repositório: reative em
Actions se isso acontecer.

## Lighthouse

O job `lighthouse` do CI roda o Lighthouse 13.5.0 (`npx --yes lighthouse@13.5.0`) em 9 URLs, nos perfis mobile e
desktop, e falha se SEO ou Acessibilidade ficarem abaixo de 0,95, se o CLS chegar a 0,1 ou se o audit `llms-txt`
(categoria agentic-browsing) não passar. URLs e metas ficam em `tests/lighthouse/metas.mjs`. Para rodar local:

```sh
python3 -m http.server 8080 --bind 127.0.0.1 &
node tests/lighthouse/rodar.mjs --base http://127.0.0.1:8080 --saida /tmp/lighthouse
```

`CHROME_PATH` escolhe o Chrome. `--perfis mobile` roda só um perfil; `--so-verificar` só confere os JSON já gerados.

## Dependabot

`.github/dependabot.yml` abre no dia 1 de cada mês PRs agrupados das actions e de `tests/e2e`, só com versão publicada
há pelo menos 14 dias (no máximo 4 PRs por mês); merge manual, com o CI verde. Os alertas e as atualizações de
segurança do Dependabot são uma opção do repositório, em Settings > Advanced Security.
