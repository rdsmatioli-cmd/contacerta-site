#!/usr/bin/env python3
"""Gera posts a partir de markdown no molde do lote 8.

Uso:
  python3 tests/_src/blog/build-lote8.py AAAA-MM-DD
      Regenera todos os .md de tests/_src/blog/lote8/. datePublished e dateModified
      saem dessa data, salvo se o .md tiver `publicado:` ou `modificado:`.
      Regrava o HTML de todos os slugs do lote, inclusive 05–08.

  python3 tests/_src/blog/build-lote8.py --modificado AAAA-MM-DD --arquivos a.md b.md
      Gera só esses arquivos. Não regrava os outros HTML do lote 8 (A8, A26, A2 e A35
      ficam como estão). Atualiza manifesto.json só nas entradas cujo .md está em lote8/
      e grava tests/_src/blog/onda1-manifesto.json com o que foi pedido.

Template: blog/como-calcular-markup/index.html.
Cabeçalho do .md entre linhas '---' (slug, titulo, h1, descricao, resumo, categoria, ordem,
publicado, modificado, relacionadas = '/caminho/|Texto' separados por ' ;; ').
Corpo: '## Resposta direta', seções, '## Perguntas frequentes' (2 a 6 '###'; E35 tem 2,
o texto revisado não ganha pergunta inventada) e '## Fontes oficiais'.

JSON-LD: sem FAQPage e sem HowTo (o FAQ visível fica no HTML). Autor
{"@type":"Person","name":"Rodrigo Matioli","url":"https://contacertabr.com.br/sobre/"}.
O nó #organizacao vai embutido no publisher, sem parentOrganization e sem #lcm.
"""
import sys, re, json, html, os, glob, unicodedata, math
import markdown
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lote8')
ONDA1 = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'onda1-manifesto.json')
MES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
CATS = {'Trabalho e salário', 'Impostos e MEI', 'Reforma tributária', 'Finanças e investimentos'}
FIX = {'Resposta direta': 'resposta-t', 'Neste post': 'sumario-t', 'Perguntas frequentes': 'faq-t', 'Fontes oficiais': 'fontes-t',
       'Autoria': 'autoria-t', 'Calculadoras relacionadas': 'calculadoras-relacionadas'}
FORA_DO_SUMARIO = {'resposta-t', 'sumario-t', 'autoria-t', 'calculadoras-relacionadas'}
AUTOR = {"@type": "Person", "name": "Rodrigo Matioli", "url": "https://contacertabr.com.br/sobre/"}
# Nó da marca embutido. Sem parentOrganization: #lcm" fora de index.html quebra fonte-seo.test.mjs.
ORGANIZACAO = {"@type": "Organization", "@id": "https://contacertabr.com.br/#organizacao", "name": "Conta Certa", "url": "https://contacertabr.com.br/"}
ISO = re.compile(r'^\d{4}-\d{2}-\d{2}$')

def slug(t):
    return re.sub(r'[^a-z0-9]+', '-', unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode().lower()).strip('-')
def texto(h): return html.unescape(re.sub(r'<[^>]+>', '', h)).strip()
def extenso(iso):
    y, m, d = iso.split('-')
    return f'{int(d)} de {MES[int(m)-1]} de {y}', d, m, y
def partes(iso):
    if not ISO.match(iso or ''): sys.exit(f'ABORTA: data inválida {iso}')
    return iso

def cabecalho(arq):
    bruto = open(arq, encoding='utf-8').read()
    m = re.match(r'^---\n(.*?)\n---\n(.*)$', bruto, re.S)
    if not m:
        # O --- final às vezes veio colado na linha das relacionadas.
        bruto = re.sub(r'^---\n(.*?[^\n])---\n', r'---\n\1\n---\n', bruto, count=1, flags=re.S)
        m = re.match(r'^---\n(.*?)\n---\n(.*)$', bruto, re.S)
    if not m: sys.exit(f'ABORTA {arq}: cabeçalho')
    return m.groups()

def gerar(arq, padrao_pub, padrao_mod, checar_onda1=False):
    cab, corpo_md = cabecalho(arq)
    P = dict(re.findall(r'^(\w+):\s*(.*)$', cab, re.M))
    for k in ('slug', 'titulo', 'h1', 'descricao', 'categoria', 'ordem'):
        if not P.get(k): sys.exit(f'ABORTA {arq}: falta {k}')
    if P['categoria'] not in CATS: sys.exit(f'ABORTA {arq}: categoria {P["categoria"]}')
    if len(P['descricao']) > 160: sys.exit(f'ABORTA {arq}: descrição com {len(P["descricao"])} caracteres')
    pub, mod = partes(P.get('publicado') or padrao_pub), partes(P.get('modificado') or padrao_mod)
    dext_pub, _, _, _ = extenso(pub)
    dext_mod, d, m, y = extenso(mod)
    S = P['slug']; h1 = P['h1']; TITLE = P['titulo']; DESC = P['descricao']; RESUMO = P.get('resumo') or DESC
    if checar_onda1:
        if not 50 <= len(TITLE) <= 60: sys.exit(f'ABORTA {S}: título com {len(TITLE)} caracteres')
        if not 140 <= len(DESC) <= 160: sys.exit(f'ABORTA {S}: descrição com {len(DESC)} caracteres')
        if TITLE == h1: sys.exit(f'ABORTA {S}: título igual ao H1')
        if '16/12' in corpo_md or '16/12' in cab: sys.exit(f'ABORTA {S}: substring 16/12')
    rel = [x.split('|', 1) for x in P.get('relacionadas', '').split(' ;; ') if x.strip()]
    corpo = markdown.markdown(corpo_md, extensions=['tables', 'sane_lists'], output_format='html')
    usados = set()
    def hid(mo):
        n, t = mo.group(1), mo.group(2); tt = texto(t)
        i = FIX.get(tt) or slug(tt)[:60].strip('-')
        if i == 'conteudo': i = 'conteudo-secao'
        if i[:1].isdigit(): i = 'passo-' + i
        base, k = i, 2
        while i in usados: i = f'{base}-{k}'; k += 1
        usados.add(i)
        return f'<h{n} id="{i}">{t}</h{n}>'
    corpo = re.sub(r'<h([23])>(.*?)</h\1>', hid, corpo)
    h2s = re.findall(r'<h2 id="([^"]+)">(.*?)</h2>', corpo)
    itens = [(i, t) for i, t in h2s if i not in FORA_DO_SUMARIO]
    sumario = '<h2 id="sumario-t">Neste post</h2>\n<ul>\n' + '\n'.join(f'<li><a href="#{i}">{t}</a></li>' for i, t in itens) + '\n</ul>\n'
    seg = [m.start() for m in re.finditer(r'<h2 id=', corpo)]
    if len(seg) < 3 or h2s[0][0] != 'resposta-t': sys.exit(f'ABORTA {S}: estrutura sem resposta direta ou com poucas seções')
    corpo = corpo[:seg[1]] + sumario + corpo[seg[1]:]
    corpo += f'\n<h2 id="autoria-t">Autoria</h2>\n<p>Equipe Conta Certa. Normas e valores conferidos nas fontes oficiais citadas em {d}/{m}/{y}. O texto é informativo e não substitui a orientação de advogado ou contador para o seu caso.</p>\n'
    if rel:
        corpo += '<h2 id="calculadoras-relacionadas">Calculadoras relacionadas</h2>\n<ul>\n' + '\n'.join(f'<li><a href="{u.strip()}">{html.escape(t.strip(), quote=False)}</a></li>' for u, t in rel) + '\n</ul>\n'
    corpo = re.sub(r'<a href="(https?://[^"]+)">', r'<a href="\1" rel="noopener" target="_blank">', corpo)
    corpo = re.sub(r'<table>(.*?)</table>', r'<div class="tab-rolar"><table>\1</table></div>', corpo, flags=re.S)
    if 'id="faq-t"' not in corpo or 'id="fontes-t"' not in corpo: sys.exit(f'ABORTA {S}: falta FAQ ou fontes')
    fs = corpo[corpo.index('id="faq-t">'):]; fs = fs[:fs.index('<h2', 5)]
    faqs = [(texto(q), re.sub(r'\s+', ' ', texto(a))) for q, a in re.findall(r'<h3[^>]*>(.*?)</h3>(.*?)(?=<h3|$)', fs, re.S)]
    # O lote 8 pedia 3 a 6. E35 ficou com 2 perguntas no texto revisado; não se cria uma terceira.
    if not 2 <= len(faqs) <= 6: sys.exit(f'ABORTA {S}: FAQ com {len(faqs)} perguntas')
    fontes = corpo[corpo.index('id="fontes-t">'):]; fontes = fontes[:fontes.index('<h2', 5)]
    cit = [{"@type": "CreativeWork", "name": texto(n), "url": html.unescape(u)} for u, n in re.findall(r'<a href="(https?://[^"]+)" rel="noopener" target="_blank">(.*?)</a>', fontes)]
    if not cit: sys.exit(f'ABORTA {S}: fontes sem link oficial')
    palavras = len(texto(corpo).split()); leit = max(3, math.ceil(palavras / 200))
    url = f'https://contacertabr.com.br/blog/{S}/'; e = html.escape
    # FAQ visível permanece no corpo. Sem FAQPage e sem HowTo no JSON-LD.
    ld = [j({"@context": "https://schema.org", "@type": "BlogPosting", "headline": h1, "description": DESC, "url": url, "mainEntityOfPage": url, "inLanguage": "pt-BR",
             "datePublished": pub, "dateModified": mod, "author": AUTOR, "citation": cit,
             "publisher": ORGANIZACAO, "image": "https://contacertabr.com.br/og/padrao.jpg"}),
          j({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Início", "item": "https://contacertabr.com.br/"},
             {"@type": "ListItem", "position": 2, "name": "Blog", "item": "https://contacertabr.com.br/blog/"}, {"@type": "ListItem", "position": 3, "name": h1, "item": url}]})]
    tt, dd, hh = e(TITLE), e(DESC), e(h1)
    headm = f'''<title>{tt}</title>
  <meta name="description" content="{dd}">
  <link rel="canonical" href="{url}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:site_name" content="Conta Certa">
  <meta property="og:title" content="{tt}">
  <meta property="og:description" content="{dd}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="https://contacertabr.com.br/og/padrao.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:alt" content="{hh}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{tt}">
  <meta name="twitter:description" content="{dd}">
  <meta name="twitter:image" content="https://contacertabr.com.br/og/padrao.jpg">
  '''
    art = f'''<main id="conteudo" class="caixa">
  <div class="blog post">
  <nav class="migalhas" aria-label="Você está em"><a href="/">Início</a> › <a href="/blog/">Blog</a> › <span aria-current="page">{hh}</span></nav>
  <article>
  <h1>{hh}</h1>
  <ul class="post-meta"><li>Publicado em <time datetime="{pub}">{dext_pub}</time></li><li>Atualizado em <time datetime="{mod}">{dext_mod}</time></li><li>{leit} min de leitura</li><li>Por Equipe Conta Certa</li></ul>
  <div class="texto">
  {corpo.strip()}
  </div>
  </article>
  </div>
  '''
    out = top + headm + assets + style + '\n'.join(ld) + f'\n<meta property="article:published_time" content="{pub}">\n<meta property="article:modified_time" content="{mod}">\n\n' + tail_head + '</head>\n' + body_start + art + tail
    if 'FAQPage' in out or 'HowTo' in out or '#lcm"' in out or '16/12' in out:
        sys.exit(f'ABORTA {S}: JSON-LD ou data fora da regra')
    os.makedirs(f'{R}/blog/{S}', exist_ok=True); open(f'{R}/blog/{S}/index.html', 'w', encoding='utf-8').write(out)
    print(f'{S}: {palavras} palavras, {len(faqs)} perguntas, {len(cit)} fontes, título {len(TITLE)}, descrição {len(DESC)}, {pub} → {mod}')
    item = dict(href=f'/blog/{S}/', titulo=h1, categoria=P['categoria'], resumo=RESUMO, descricao=DESC, data=pub, ordem=int(P['ordem']), faqs=len(faqs), fontes=len(cit), palavras=palavras)
    return item, dict(item, modificado=mod, arquivo=os.path.relpath(arq, os.path.join(R, 'tests')))

def gravar_json(caminho, obj):
    with open(caminho, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
        f.write('\n')

def uso():
    sys.exit('uso: python3 tests/_src/blog/build-lote8.py AAAA-MM-DD\n'
             '     python3 tests/_src/blog/build-lote8.py --modificado AAAA-MM-DD --arquivos a.md ...')

tpl = open(f'{R}/blog/como-calcular-markup/index.html', encoding='utf-8').read()
top = tpl[:tpl.index('<title>')]
assets = tpl[tpl.index('<meta name="theme-color"'):tpl.index('<link rel="alternate"')]
style = tpl[tpl.index('<link rel="alternate"'):tpl.index('<script type="application/ld+json">')]
tail_head = tpl[tpl.index('<link rel="stylesheet" href="/assets/lcm-consent.css'):tpl.index('</head>')]
body_start = tpl[tpl.index('<body>'):tpl.index('<main id="conteudo"')]
tail = tpl[tpl.index('<script>/* QA P13-04r'):]
j = lambda o: '<script type="application/ld+json">' + json.dumps(o, ensure_ascii=False, separators=(',', ':')) + '</script>'

args = sys.argv[1:]
if len(args) == 1 and ISO.match(args[0]):
    entradas = [gerar(arq, args[0], args[0])[0] for arq in sorted(glob.glob(f'{SRC}/*.md'))]
    entradas.sort(key=lambda x: x['ordem'])
    gravar_json(f'{SRC}/manifesto.json', entradas)
    print(len(entradas), 'posts')
elif args[:1] == ['--modificado'] and '--arquivos' in args:
    i = args.index('--arquivos')
    if i < 2 or not ISO.match(args[1]): uso()
    arquivos = args[i + 1:]
    if not arquivos: uso()
    onda, lote8 = [], {}
    for arq in arquivos:
        base, extra = gerar(os.path.abspath(arq), args[1], args[1], checar_onda1=True)
        onda.append(extra)
        if os.path.abspath(arq).startswith(os.path.abspath(SRC) + os.sep):
            lote8[base['href']] = base
    if lote8 and os.path.isfile(f'{SRC}/manifesto.json'):
        atual = json.load(open(f'{SRC}/manifesto.json', encoding='utf-8'))
        vistos = set()
        saida = []
        for item in atual:
            if item['href'] in lote8:
                saida.append(lote8[item['href']]); vistos.add(item['href'])
            else:
                saida.append(item)
        for href, item in lote8.items():
            if href not in vistos: saida.append(item)
        gravar_json(f'{SRC}/manifesto.json', saida)
    gravar_json(ONDA1, onda)
    print(len(onda), 'posts da onda')
else:
    uso()
