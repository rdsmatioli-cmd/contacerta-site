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
   Precisa do clone completo (`git fetch --unshallow` se for raso). Página nova entra no sitemap à mão.
4. Testes (abaixo) e o html-validate do `.github/workflows/ci.yml`.
5. PR para a main, com o CI verde.

`--conferir` nos dois scripts só confere e sai com 1 se algo divergir.

## Testes

Os testes exigem **Node 22** (ver `.nvmrc`). Rode na raiz do repositório:

```sh
node --test 'tests/*.test.mjs'
```

## Lighthouse

O job `lighthouse` do CI roda o Lighthouse 13.5.0 (`npx --yes lighthouse@13.5.0`) em 9 URLs, nos perfis mobile e
desktop, e falha se SEO ou Acessibilidade ficarem abaixo de 0,95, se o CLS chegar a 0,1 ou se o audit `llms-txt`
(categoria agentic-browsing) não passar. URLs e metas ficam em `tests/lighthouse/metas.mjs`. Para rodar local:

```sh
python3 -m http.server 8080 --bind 127.0.0.1 &
node tests/lighthouse/rodar.mjs --base http://127.0.0.1:8080 --saida /tmp/lighthouse
```

`CHROME_PATH` escolhe o Chrome. `--perfis mobile` roda só um perfil; `--so-verificar` só confere os JSON já gerados.
