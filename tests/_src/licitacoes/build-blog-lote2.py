#!/usr/bin/env python3
"""Gera os posts do blog do Licitações (lote 2, rascunhos de 13/11/2026) a partir de tests/_src/licitacoes/blog-lote2/*.md.
Uso: python3 tests/_src/licitacoes/build-blog-lote2.py AAAA-MM-DD
Trava de publicação: só gera o .md com 'situacao: aprovado' (LOTE2_TODOS=1 gera todos, só para conferência fora do site).
Campos id, palavra_chave, secundarias, conferir e caminho_planejado são de controle e não vão ao HTML.
Depois de gerar: card no licitacoes/blog/index.html, URL no sitemap.xml, selo (tests/licitacoes-selo.test.mjs) e
tools/licitacoes-css-inline.mjs, como no lote 1 (commit c95a46a). Copiado de build-blog-lote1.py; o resto é igual.
Template: licitacoes/blog/pregao-material-de-expediente-pncp/index.html (cabeçalho, rodapé com o selo do aviso e o
bloco de CSS, que depois é podado por tools/licitacoes-css-inline.mjs). Escreve licitacoes/blog/<slug>/index.html.
Formato do .md: cabeçalho entre linhas '---' (slug, titulo, h1, descricao), parágrafo de resposta, seções '## ',
'## Fontes oficiais' e '## Perguntas frequentes' (perguntas em '### ') por último."""
import sys, re, json, os, glob, html, math
import markdown
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'blog-lote2')
TODOS = os.environ.get('LOTE2_TODOS') == '1'
DATA = sys.argv[1]
y, m, d = DATA.split('-'); DBR = f'{d}/{m}/{y}'
BASE = 'https://contacertabr.com.br/licitacoes/blog/'
tpl = open(f'{R}/licitacoes/blog/pregao-material-de-expediente-pncp/index.html', encoding='utf-8').read()
texto = lambda h: html.unescape(re.sub(r'<[^>]+>', '', h)).strip()
j = lambda o: '<script type="application/ld+json">' + json.dumps(o, ensure_ascii=False) + '</script>'
SEM_NUMERO = {'Perguntas frequentes', 'Fontes oficiais'}
for arq in sorted(glob.glob(f'{SRC}/*.md')):
    if os.path.basename(arq).upper().startswith('README'): continue
    cab, corpo_md = re.match(r'^---\n(.*?)\n---\n(.*)$', open(arq, encoding='utf-8').read(), re.S).groups()
    P = dict(re.findall(r'^(\w+):\s*(.*)$', cab, re.M))
    if P.get('situacao') != 'aprovado' and not TODOS:
        print(f"pula {os.path.basename(arq)}: situacao {P.get('situacao') or '(vazia)'}"); continue
    for k in ('slug', 'titulo', 'h1', 'descricao'):
        if not P.get(k): sys.exit(f'ABORTA {arq}: falta {k}')
    if len(P['descricao']) > 160: sys.exit(f'ABORTA {arq}: descrição com {len(P["descricao"])} caracteres')
    S, URL = P['slug'], BASE + P['slug'] + '/'
    corpo = markdown.markdown(corpo_md, extensions=['tables', 'sane_lists'], output_format='html')
    n = 0
    def h2(mo):
        global n
        t = mo.group(1)
        if texto(t) in SEM_NUMERO: return f'<h2>{t}</h2>'
        n += 1
        return f'<h2><span class="mono">{n:02d}</span>{t}</h2>'
    corpo = re.sub(r'<h2>(.*?)</h2>', h2, corpo)
    # Tabelas: região rolável focável (CC-SITE-13), rotulada pela seção.
    partes, ultimo = [], 'Tabela'
    for bloco in re.split(r'(<h2>.*?</h2>|<table>.*?</table>)', corpo, flags=re.S):
        if bloco.startswith('<h2>'): ultimo = texto(re.sub(r'<span class="mono">\d+</span>', '', bloco))
        elif bloco.startswith('<table>'):
            bloco = f'<div class="tbl-rolagem" tabindex="0" role="region" aria-label="{html.escape(ultimo)} (role para o lado)">{bloco}</div>'
        partes.append(bloco)
    corpo = ''.join(partes)
    # FAQ (perguntas em h3 depois de "Perguntas frequentes")
    faq_html = corpo.split('<h2>Perguntas frequentes</h2>', 1)[1]
    faqs = re.findall(r'<h3>(.*?)</h3>\s*<p>(.*?)</p>', faq_html, re.S)
    if not 3 <= len(faqs) <= 6: sys.exit(f'ABORTA {S}: {len(faqs)} perguntas')
    palavras = len(texto(corpo).split())
    minutos = max(3, math.ceil(palavras / 200))
    main = (f'<main class="doc"><p class="kicker">Blog Licitações · guia</p><h1>{html.escape(P["h1"])}</h1>\n'
            f'<div class="meta"><span class="pill n">{DBR}</span><span class="pill n">Leitura de {minutos} minutos</span></div>\n'
            + corpo.replace('\n\n', '\n') + '\n</main>')
    ld = (j({'@context': 'https://schema.org', '@type': 'Article', 'headline': P['h1'], 'description': P['descricao'],
             'datePublished': DATA, 'dateModified': DATA, 'image': 'https://contacertabr.com.br/licitacoes/assets/og-licitacoes.png',
             'author': {'@type': 'Organization', 'name': 'Equipe Licitações'}, 'publisher': {'@type': 'Organization', 'name': 'LCM Global Services'},
             'mainEntityOfPage': URL, 'inLanguage': 'pt-BR'})
          + j({'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
              {'@type': 'Question', 'name': texto(q), 'acceptedAnswer': {'@type': 'Answer', 'text': texto(a)}} for q, a in faqs]})
          + '<script type="application/ld+json">' + json.dumps({'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
              {'@type': 'ListItem', 'position': 1, 'name': 'Licitações', 'item': 'https://contacertabr.com.br/licitacoes/'},
              {'@type': 'ListItem', 'position': 2, 'name': 'Blog', 'item': BASE},
              {'@type': 'ListItem', 'position': 3, 'name': P['h1'], 'item': URL}]}, ensure_ascii=False, separators=(',', ':')) + '</script>')
    out = tpl
    t, dsc = html.escape(P['titulo'], quote=False), html.escape(P['descricao'])
    out = re.sub(r'<title>.*?</title>', lambda _: f'<title>{t}</title>', out, count=1)
    out = re.sub(r'<meta name="description" content="[^"]*">', lambda _: f'<meta name="description" content="{dsc}">', out, count=1)
    out = re.sub(r'<link rel="canonical" href="[^"]*">', lambda _: f'<link rel="canonical" href="{URL}">', out, count=1)
    out = re.sub(r'<meta property="og:title" content="[^"]*">', lambda _: f'<meta property="og:title" content="{html.escape(P["titulo"])}">', out, count=1)
    out = re.sub(r'<meta property="og:description" content="[^"]*">', lambda _: f'<meta property="og:description" content="{dsc}">', out, count=1)
    out = re.sub(r'<meta property="og:url" content="[^"]*">', lambda _: f'<meta property="og:url" content="{URL}">', out, count=1)
    a, b = out.index('<script type="application/ld+json">'), out.index('</head>')
    out = out[:a] + ld + out[b:]
    a, b = out.index('<main class="doc">'), out.index('</main>') + len('</main>')
    out = out[:a] + main + out[b:]
    os.makedirs(f'{R}/licitacoes/blog/{S}', exist_ok=True)
    open(f'{R}/licitacoes/blog/{S}/index.html', 'w', encoding='utf-8').write(out)
    print(f'{S}: {palavras} palavras, {len(faqs)} perguntas, título {len(P["titulo"])}, descrição {len(P["descricao"])}')
