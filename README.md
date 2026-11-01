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
5. PR para a main, com o CI verde, mesclado com "Create a merge commit" (como os PRs anteriores). O `lastmod` usa a
   data do autor do último commit sem merge que mudou a página; o squash cria um commit novo com a data do dia do
   merge, e num outro dia o `node --test` passa a falhar na main. Se o PR for por squash, rode
   `node tests/manutencao/lastmod.mjs` na main depois do merge e commit do `sitemap.xml`.

`--conferir` nos dois scripts só confere e sai com 1 se algo divergir.

## Testes

Os testes exigem **Node 22** (ver `.nvmrc`). Rode na raiz do repositório:

```sh
node --test 'tests/*.test.mjs'
```

`tests/oraculo-2026.test.mjs` (incluído no comando acima) confere o INSS e o IRRF de 2026, com a redução da Lei
15.270/2025, nas bordas das faixas e no salário líquido, contra valores digitados das fontes oficiais, sem importar
`assets/js/tabelas.js`. As tabelas do oráculo ficam em `tests/oraculo/oficial-2026.mjs`, em centavos, com a fonte e a
data da conferência. Tabela nova (outro ano, portaria nova) muda os dois lados: `tabelas.js` e o oráculo, com o texto
da fonte oficial.

### Testes por propriedade (tests/oraculo)

`tests/oraculo/propriedades.test.mjs` cobre as invariantes das fórmulas com o fast-check (versão exata em
`tests/oraculo/package-lock.json`; dependência só desses testes, e o glob da raiz não alcança a subpasta): INSS e IRRF
de 2026 iguais ao oráculo para qualquer valor e IRRF entre 0 e o imposto pela tabela; rendimento até R$ 5.000,00 sem
IRRF com qualquer dedução; salário líquido, 13º e férias que não diminuem com o bruto (fora o arredondamento a
centavo de cada desconto, no máximo 2 centavos); `r2`; o número formatado em pt-BR lido de volta pelo `lerNumeroBR`;
rescisão (matriz motivo x aviso, líquido = verbas − descontos e nunca negativo, aviso pela metade só no acordo
indenizado, avos de 0 a 12); taxa implícita do parcelado; Price e SAC. A semente é fixa, e a falha mostra o
contraexemplo já reduzido; `ORACULO_SEMENTE=<número>` troca a semente numa execução local, para explorar outros casos.

```sh
(cd tests/oraculo && npm ci --ignore-scripts)
node --test 'tests/oraculo/*.test.mjs'
```

O job `check` do CI roda os dois comandos depois do `node --test` da raiz. Para atualizar o fast-check: em
`tests/oraculo`, `npm install -D --save-exact fast-check@<versão>` e commit do `package.json` e do `package-lock.json`.

## Testes de navegador (e2e)

O job `e2e` do CI roda o Playwright (versão exata em `tests/e2e/package-lock.json`, só Chromium) em 390 px e
1280 px: cada calculadora (achada pelo HTML: `form.calc-form` com `data-calc`) calcula com os valores padrão e mostra
resultado com número, sem recarregar a página, sem erro de console nem rolagem horizontal; home e blog carregam sem
erro; nada do Google antes de clicar no banner de cookies nem depois de Recusar, e a tentativa de carregar o GA
aparece depois de Aceitar. Calculadora desligada fica sem `data-calc` e com o botão `disabled`. O mesmo job passa o
axe-core (`@axe-core/playwright`, versão exata no lockfile) em todas as páginas, nas duas larguras e nos temas claro e
escuro (`prefers-color-scheme`), com as regras WCAG 2.0, 2.1 e 2.2 A e AA: falha só com violação serious ou critical;
moderate e minor saem no log. Em 390 px, o `toque.spec.mjs` pega o que o axe e o Lighthouse deixam passar, em todas
as páginas: campo (input, select, textarea, fora checkbox, radio e o honeypot `.le-hp`) com menos de 44 px de altura
ou fonte abaixo de 16 px (o iOS dá zoom no foco), `a.btn` ou botão com menos de 44 px e, nas calculadoras e no
`/irpf/` depois do envio, célula de tabela além da borda de um ancestral com overflow hidden/clip que não rola (use
o `.rolagem` do `ui.js`). O Playwright serve o site com `python3 -m http.server` em 127.0.0.1:8191 (`E2E_PORTA`
troca a porta), aborta e registra toda requisição HTTP ou WebSocket a outro host e registra as dicas de conexão para
fora (`preconnect`, `dns-prefetch`...); o Chromium sobe sem proxy, nem o do ambiente, e sem DNS. Local:

```sh
cd tests/e2e
npm ci --ignore-scripts
npx playwright install --with-deps --only-shell chromium   # uma vez
npx playwright test                                        # -g "markup" roda só os casos com esse nome
```

Quando falha, a mensagem diz o quê: resultado sem número, envio que recarrega a página, erro de console, elementos
que passam da borda, campo, botão ou célula fora do padrão de toque (página, seletor e medida), URL de outro host pedida, URL do Google pedida antes do aceite, violação de acessibilidade
(página, tema, regra do axe e seletor do elemento). No CI, capturas e traces ficam no artefato `e2e-falhas`
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

Entram `href`, `src`, `poster`, `cite` e as URLs do JSON-LD. Destino de envio de formulário (`action`, `formaction`)
não é link e fica de fora: um GET nele pode gravar resposta ou abrir sessão de pagamento. Hosts de outros produtos da
empresa (`NAO_BUSCAR` no script: `creditrilha.com.br` e `licitacoes-checkout.*.workers.dev`) não recebem nenhuma
requisição, nem quando outro link redireciona para eles: cada acesso ao Creditrilha grava no banco dele, e o checkout
do Licitações abriria sessão de pagamento. Eles saem no resumo como "não conferido (próprio)", sem falhar o job; link
para outro produto novo da empresa entra nessa lista antes de ir ao ar.

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

## Imagens de compartilhamento (og:image)

As artes de `og/` têm 1200x630 e o mesmo layout (marca, selo, título, subtítulo, chips e o ícone da página).
`node tools/og.mjs <nome>` gera `og/<nome>.jpg` a partir da tabela `ARTES` do script, com o Playwright de `tests/e2e`
(`npm ci --ignore-scripts` lá) e a fonte de `/fonts`, sem rede; `CHROME_PATH` aponta outro Chromium. Os textos da arte
saem do que a página já diz. Página sem arte própria usa `og/padrao.jpg`: `tests/og-imagens.test.mjs` falha com arte
copiada de outra página (bytes iguais com outro nome) e com medida diferente da declarada em `og:image:width/height`.

## Lighthouse

O job `lighthouse` do CI roda o Lighthouse 13.5.0 (`npx --yes lighthouse@13.5.0`) em 9 URLs, nos perfis mobile e
desktop, e falha se SEO ou Acessibilidade ficarem abaixo de 0,95, se o CLS chegar a 0,1 ou se o audit `llms-txt`
(categoria agentic-browsing) não passar. URLs e metas ficam em `tests/lighthouse/metas.mjs`. Para rodar local:

```sh
python3 -m http.server 8080 --bind 127.0.0.1 &
node tests/lighthouse/rodar.mjs --base http://127.0.0.1:8080 --saida /tmp/lighthouse
```

`CHROME_PATH` escolhe o Chrome. `--perfis mobile` roda só um perfil; `--so-verificar` só confere os JSON já gerados.

## Runbook: publicação da política de privacidade

A publicação (`.github/workflows/pages.yml`, só a partir da main) roda a trava da data da política antes do upload:
data `<=` hoje (America/Sao_Paulo) num push que não altera `privacidade/index.html`; data `=` hoje num push que a
altera, num `workflow_dispatch` ou num push sem base conhecida. O log do passo mostra a regra aplicada e os SHAs.
"Altera" é mudança de conteúdo: a troca do `?v=` que o `cache.mjs` faz em todas as páginas quando um CSS ou JS muda
não conta (`tests/manutencao/politica-alterada.mjs`, o mesmo critério no `ci.yml` e no `pages.yml`).

Se a publicação de um push que alterou a política falhar (trava, upload ou deploy), não espere o próximo push: no
mesmo dia, rode Actions > Pages > Run workflow na main (`workflow_dispatch`, regra `= hoje`). Em outro dia, ajuste
antes a "Última atualização" para a data da republicação, num PR que altera a política (o CI cobra `= hoje`). Isso
evita que um push posterior sem mudança na política publique a versão nova com data anterior à publicação real
(B-PR34-05, Advogado 123a5499).

## Dependabot e workflows

`.github/dependabot.yml` abre no dia 1 de cada mês PRs das actions, de `tests/e2e` e de `tests/oraculo`, só com
versão publicada há pelo menos 14 dias: minor e patch num PR agrupado por ecossistema, e o major de cada dependência
em PR separado (no máximo 3 PRs abertos por ecossistema); merge manual, com o CI verde. A primeira verificação
costuma rodar logo que o arquivo chega à main, sem esperar o dia 1; em 19/10/2026, isso quer dizer um PR para
`actions/checkout` v7 e outro para `actions/setup-node` v7. As versões fixadas nos comandos do `ci.yml` (zizmor,
html-validate, Lighthouse) não passam pelo Dependabot: atualize à mão, com versão publicada há pelo menos 14 dias. Os
alertas e as atualizações de segurança do Dependabot são uma opção do repositório, em Settings > Advanced Security. O
CI roda em push (menos nas branches `dependabot/**`) e em PR, então cada PR do Dependabot roda o CI uma vez.

O job `check` instala o zizmor 1.30.1 num venv, com o sha256 do wheel conferido pelo pip (`--require-hashes`), e passa
o perfil padrão em `.github/` (offline, sem token). Ele falha com: action por tag ou branch em vez de SHA, checkout
sem `persist-credentials: false`, workflow sem bloco `permissions` ou com escrita no nível do workflow, expressão
`${{ }}` de entrada externa dentro de `run`, e `dependabot.yml` sem `cooldown`. Não confere, e fica para a revisão: o
comentário da versão ao lado do SHA (a auditoria que confere, `ref-version-mismatch`, só roda online e com token),
`permissions` de escrita no nível do job e `persist-credentials: true` explícito. Os achados dos perfis auditor e
pedantic ficam suprimidos. Local: `pipx run --spec zizmor==1.30.1 zizmor --offline .github`.
