# Lote 9: rascunhos de 13/11/2026 (Conta Certa e Empregador em Dia)

28 textos no formato do lote 8, mais 2 atualizações de posts no ar em `atualizacoes/` (E4 e E8, retidas). Nada aqui está publicado.

## Como publicar
1. Revisar o texto e trocar `situacao: rascunho` por `situacao: aprovado` só nos que vão ao ar.
2. `python3 tests/_src/blog/build-lote9.py AAAA-MM-DD` (gera só os aprovados; o resto é pulado e listado).
3. `node tests/_src/blog/finalizar-lote9.mjs` (índice, categorias, feed, sitemap, llms.txt e home; páginas com `caminho` não entram no índice nem no feed).
4. Commit, PR e merge. Publicar em lotes de 5 a 10 por semana e acompanhar no Search Console.

Campos de controle (não vão ao HTML): `id`, `palavra_chave`, `secundarias`, `situacao`, `conferir`, `revisar_em`. O campo `conferir` diz o que checar antes de aprovar.

## Textos
| ID | Situação | URL | Título (title) | Palavra-chave principal |
|---|---|---|---|---|
| A1 | rascunho | `/salario-minimo-2027/` | Salário mínimo 2027: valor previsto de R$ 1.741 e quando sai | salário mínimo 2027 |
| A4 | rascunho | `/blog/rescisao-por-tempo-de-casa/` | Trabalhei 3 meses: quanto recebo de rescisão? (3, 6 e 12) | trabalhei 3 meses quanto vou receber de rescisão |
| A5 | rascunho | `/blog/rescisao-indireta/` | Rescisão indireta: o que é, como pedir e o que se recebe | rescisão indireta |
| A6 | rascunho | `/blog/salario-bruto-e-liquido/` | Salário bruto e líquido: diferença e conta passo a passo | salário bruto e líquido |
| A7 | rascunho | `/blog/dsr-sobre-hora-extra/` | DSR sobre hora extra: como calcular (com exemplo) | dsr hora extra |
| A9 | rascunho | `/blog/como-dar-entrada-seguro-desemprego/` | Como dar entrada no seguro-desemprego (passo a passo 2026) | como dar entrada no seguro desemprego |
| A10 | retido (até a portaria de 2027) | `/tabela-inss-2027/` | Tabela do INSS 2027: quando sai e como serão as faixas | tabela inss 2027 |
| A14 | rascunho | `/blog/quem-tem-direito-seguro-desemprego/` | Quem tem direito ao seguro-desemprego: regras de 2026 | seguro desemprego quem tem direito |
| A16 | rascunho | `/blog/rescisao-do-contrato-de-trabalho/` | Rescisão do contrato de trabalho: tipos e verbas de cada um | rescisão do contrato de trabalho |
| A17 | rascunho | `/blog/o-que-e-decimo-terceiro/` | O que é o 13º salário e quem tem direito | o que é décimo terceiro |
| A21 | rascunho | `/blog/como-dar-baixa-no-mei/` | Como dar baixa no MEI e o que fazer com as dívidas (2026) | como dar baixa no mei |
| A27 | rascunho | `/blog/obrigado-a-fazer-hora-extra/` | Sou obrigado a fazer hora extra? O que diz a CLT | sou obrigado a fazer hora extra |
| A30 | rascunho | `/blog/hora-extra-salario-minimo/` | Hora extra de quem ganha um salário mínimo: 2026 e 2027 | valor da hora extra de um salário mínimo |
| A31 | rascunho | `/blog/hora-extra-sabado/` | Hora extra no sábado: 50% ou 100%? (com a escala 5x2) | hora extra sabado |
| A33 | rascunho | `/blog/salario-minimo-liquido/` | Salário mínimo líquido: quanto cai na conta em 2026 e 2027 | salario minimo liquido |
| E3 | rascunho | `/blog/escala-6x1-domingos-feriados/` | Escala em domingos e feriados: o que muda depois de 16/12 | escala 6x1 domingos e feriados |
| E5 | retido | `/blog/riscos-psicossociais-exemplos/` | Riscos psicossociais no trabalho: 13 exemplos e prevenção | riscos psicossociais |
| E6 | retido | `/blog/inventario-riscos-psicossociais-exemplo/` | Inventário de riscos psicossociais: exemplo preenchido | tabela de riscos psicossociais |
| E7 | retido | `/blog/questionario-riscos-psicossociais/` | Questionário de riscos psicossociais: perguntas e anonimato | questionário riscos psicossociais no trabalho |
| E10 | rascunho | `/blog/registrar-funcionario-mei/` | Como registrar funcionário no MEI no eSocial: passo a passo | como registrar funcionario no mei |
| E11 | rascunho | `/blog/trct-como-preencher/` | TRCT: o que é e como preencher campo a campo (com exemplo) | trct |
| E12 | rascunho | `/blog/como-registrar-empregada-domestica/` | Como registrar empregada doméstica no eSocial: passo a passo | empregada domestica esocial |
| E13 | rascunho | `/blog/empregada-domestica-direitos/` | Empregada doméstica: direitos em 2026 (FGTS, férias, seguro) | empregada domestica |
| E14 | rascunho | `/blog/seguro-desemprego-empregada-domestica/` | Seguro-desemprego da doméstica: quem tem direito e valor | seguro desemprego empregada domestica |
| E15 | rascunho | `/blog/salario-diarista-3-vezes-por-semana/` | Diarista 3 vezes por semana: salário, vínculo e conta (2026) | empregada domestica 3 vezes por semana salario |
| E16 | rascunho | `/blog/o-que-e-dissidio/` | O que é dissídio e como pagar o retroativo (com exemplo) | dissidio |
| E33 | rascunho | `/blog/banco-de-horas-42-horas/` | Banco de horas: regras, prazos e o que muda com as 42 horas | banco de horas |
| E35 | rascunho | `/blog/escala-12x36-ec-141/` | Escala 12x36: regras e se continua valendo depois da EC 141 | escala 12x36 |

A3 (13º: por que a 2ª parcela vem menor) não tem texto novo: o post no ar `/blog/decimo-terceiro-2026/` já mira esse termo no título, no H1 e numa seção com a base legal.
