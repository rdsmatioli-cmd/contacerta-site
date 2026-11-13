# Imóvel, lote 2: 18 rascunhos (13/11/2026)

Rascunhos dos itens prioritários do mapa de artigos que faltavam na seção /imovel/. Nada aqui vai ao ar sozinho: `build-imovel-lote2.py` só gera o arquivo com `situacao: aprovado`.

| ID | Situação | URL | Título (title) | Palavra-chave |
|---|---|---|---|---|
| I2 | rascunho | `/imovel/itbi/` | ITBI por cidade: alíquotas de 2026 e como simular o valor | itbi |
| I3 | rascunho | `/imovel/itbi/campinas/` | ITBI Campinas: alíquota de 2,7% e o que muda com a nova lei | itbi campinas |
| I4 | rascunho | `/imovel/itbi/porto-alegre/` | ITBI Porto Alegre 2026: 3% e 0,5% no financiamento | itbi porto alegre |
| I5 | rascunho | `/imovel/itbi/rio-de-janeiro/` | ITBI Rio de Janeiro 2026: alíquota de 3% e como calcular | itbi rio de janeiro |
| I6 | rascunho | `/imovel/itbi/belo-horizonte/` | ITBI Belo Horizonte 2026: alíquota de 3% e como calcular | itbi belo horizonte |
| I7 | rascunho | `/imovel/itbi/curitiba/` | ITBI Curitiba 2026: alíquota de 2,7% e como calcular | itbi curitiba |
| I8 | rascunho | `/imovel/itbi/sao-paulo/` | ITBI São Paulo 2026: 3% e 0,5% no financiamento | itbi são paulo |
| I9 | rascunho | `/imovel/imposto-venda-imovel/` | Ganho de capital na venda de imóvel: como calcular em 2026 | ganho de capital venda de imóvel |
| I10 | rascunho | `/imovel/blog/isencao-180-dias/` | Isenção de 180 dias no ganho de capital de imóvel: regras | isenção ganho de capital imóvel 180 dias |
| I11 | retido | `/imovel/locador-2027/` | Imposto sobre aluguel em 2027: quem paga IBS e CBS | imposto sobre aluguel |
| I12 | rascunho | `/imovel/blog/declarar-aluguel-irpf/` | Como declarar aluguel recebido no IRPF 2027 (carnê-leão) | como declarar aluguel recebido no imposto de renda |
| I13 | rascunho | `/imovel/custo-de-compra/` | Quanto custa a escritura de um imóvel: o que entra na conta | escritura de imovel |
| I18 | rascunho | `/imovel/blog/guia-itbi/` | Guia do ITBI: como emitir, pagar e contestar o valor | guia itbi |
| I19 | rascunho | `/imovel/blog/valor-do-itbi-capitais/` | Qual o valor do ITBI? Quanto custa em reais, com exemplos | qual o valor do itbi |
| I29 | rascunho | `/imovel/blog/reforma-tributaria-imoveis/` | Reforma tributária e imóveis: compra, venda e aluguel | reforma tributária imóveis |
| I33 | rascunho | `/imovel/blog/certidao-de-onus-reais/` | Certidão de ônus reais: o que é, como pedir e quanto vale | certidão de ônus reais |
| I34 | rascunho | `/imovel/blog/certidao-de-inteiro-teor/` | Certidão de inteiro teor do imóvel: o que é e como pedir | certidão de inteiro teor |
| I38 | rascunho | `/imovel/blog/iptu-2027/` | IPTU 2027: quando sai o carnê e como pagar com desconto | iptu 2027 |

## Campos do cabeçalho

- `slug`, `titulo` (≤ 60 caracteres), `h1`, `descricao` (≤ 158; o build aborta acima de 160), `resumo`, `ordem`, `relacionadas`: os mesmos do lote 1.
- `caminho` (opcional): página fora de `/imovel/blog/`. As páginas por cidade ficam em `/imovel/itbi/<cidade>/`, com a trilha Início › Imóvel › ITBI por cidade.
- `id`, `palavra_chave`, `secundarias`, `situacao`, `conferir`, `revisar_em`: controle editorial. Não aparecem na página.
- O build gera BlogPosting, BreadcrumbList e FAQPage. Autoria: Equipe Conta Certa (Organization). Sem avaliação (aggregateRating) e sem revisor.

## Como publicar

1. Resolver o campo `conferir` do arquivo e trocar `situacao: rascunho` por `situacao: aprovado`. Títulos com "2026" passam a "2027" se a publicação for depois de 01/01/2027 (e as alíquotas forem reconferidas).
2. `python3 tests/_src/imovel/build-imovel-lote2.py AAAA-MM-DD`, depois `node tests/_src/imovel/sprite.mjs`.
3. Hub: `hub.py` lê só `posts/manifesto.json`. Somar `posts-lote2/manifesto.json` antes de rodar (só os itens com `pagina: false` entram como cards do blog; as páginas com `caminho` entram num bloco próprio ou como cards, a decidir).
4. `sitemap.xml` e `llms.txt`: acrescentar as URLs, como no commit b088751.
5. Testes: `npm test`.

## Ordem e dependências

- I2 (`/imovel/itbi/`) vai antes das cidades: as páginas por cidade apontam para ela na trilha. Ao publicar as cidades, acrescentar no I2 o link de cada uma (hoje o I2 não linka nenhuma, porque ainda não existem).
- I11: retido até o Senado fixar a alíquota de referência da CBS (prazo 15/12/2026).
- I12: publicar quando a Receita divulgar as regras da declaração de 2027.
- I38: publicar em dezembro, com o calendário das capitais.
- I3: depende da 2ª votação e da sanção do projeto de Campinas.
- I2 e I9 foram pensados como ferramentas (simulador). Sem a calculadora pronta, saem como guias.
- Os links internos do corpo apontam só para páginas que já estão no ar.
