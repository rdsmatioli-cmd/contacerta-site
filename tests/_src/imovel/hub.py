#!/usr/bin/env python3
"""Gera /imovel/index.html (hub da seção Imóvel) com os guias do manifesto de tests/_src/imovel/posts/.
Uso: python3 tests/_src/imovel/hub.py AAAA-MM-DD (rode depois do build-imovel.py)."""
import sys, os, json, html
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
DATA = sys.argv[1]; y, m, d = DATA.split('-')
M = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'posts', 'manifesto.json'), encoding='utf-8'))
tpl = open(f'{R}/blog/como-calcular-markup/index.html', encoding='utf-8').read()
top = tpl[:tpl.index('<title>')]
assets = tpl[tpl.index('<meta name="theme-color"'):tpl.index('<link rel="alternate"')]
style = tpl[tpl.index('<link rel="alternate"'):tpl.index('<script type="application/ld+json">')]
tail_head = tpl[tpl.index('<link rel="stylesheet" href="/assets/lcm-consent.css'):tpl.index('</head>')]
body_start = tpl[tpl.index('<body>'):tpl.index('<main id="conteudo"')]
tail = tpl[tpl.index('<script>/* QA P13-04r'):]
e = html.escape
j = lambda o: '<script type="application/ld+json">' + json.dumps(o, ensure_ascii=False, separators=(',', ':')) + '</script>'
URL = 'https://contacertabr.com.br/imovel/'
T = 'Imóvel: guias de ITBI, escritura e registro de imóvel'
H1 = 'Imóvel: guias de impostos e documentos na compra e venda'
D = 'Guias do Conta Certa sobre a compra e venda de imóvel: ITBI, quem paga, quando pagar, escritura e registro, com a fonte de cada regra.'
ld = [j({"@context": "https://schema.org", "@type": "CollectionPage", "name": H1, "description": D, "url": URL, "inLanguage": "pt-BR",
         "isPartOf": {"@id": "https://contacertabr.com.br/#site"},
         "mainEntity": {"@type": "ItemList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": 'https://contacertabr.com.br' + p['href'], "name": p['titulo']} for i, p in enumerate(M)]}}),
      j({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Início", "item": "https://contacertabr.com.br/"},
         {"@type": "ListItem", "position": 2, "name": "Imóvel", "item": URL}]})]
headm = f'''<title>{e(T)}</title>
  <meta name="description" content="{e(D)}">
  <link rel="canonical" href="{URL}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:site_name" content="Conta Certa">
  <meta property="og:title" content="{e(T)}">
  <meta property="og:description" content="{e(D)}">
  <meta property="og:url" content="{URL}">
  <meta property="og:image" content="https://contacertabr.com.br/og/padrao.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:alt" content="{e(H1)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{e(T)}">
  <meta name="twitter:description" content="{e(D)}">
  <meta name="twitter:image" content="https://contacertabr.com.br/og/padrao.jpg">
  '''
cards = ''.join(f'<li><a class="post-card" href="{p["href"]}"><small>Imóvel</small><strong>{e(p["titulo"])}</strong><span>{e(p["resumo"])}</span>'
                f'<small>Publicado em <time datetime="{p["data"]}">{p["data"][8:]}/{p["data"][5:7]}/{p["data"][:4]}</time></small></a></li>' for p in M)
main = f'''<main id="conteudo" class="caixa">
<div class="blog">
<nav class="migalhas" aria-label="Você está em"><a href="/">Início</a> › <span aria-current="page">Imóvel</span></nav>
<h1>{e(H1)}</h1>
<p class="lead">Guias curtos sobre os impostos e os documentos da compra e venda de imóvel, com a regra de cada etapa e a fonte oficial. Para simular a parcela do financiamento, use o <a href="/financiamento/">simulador de financiamento</a>.</p>
<ul class="posts">{cards}</ul>
<p>Os guias são informativos e não substituem a orientação de advogado, contador ou do cartório para o seu caso.</p>
</div>
'''
out = top + headm + assets + style + '\n'.join(ld) + '\n\n' + tail_head + '</head>\n' + body_start + main + tail
os.makedirs(f'{R}/imovel', exist_ok=True)
open(f'{R}/imovel/index.html', 'w', encoding='utf-8').write(out)
print('hub ok:', len(M), 'guias')
