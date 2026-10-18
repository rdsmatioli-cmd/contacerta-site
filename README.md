# Conta Certa (contacertabr.com.br)

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
