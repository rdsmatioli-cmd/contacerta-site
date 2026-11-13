#!/usr/bin/env python3
"""Gera os posts do lote 9 (rascunhos de 13/11/2026) a partir dos .md em tests/_src/blog/lote9/.
Uso: python3 tests/_src/blog/build-lote9.py AAAA-MM-DD
Trava de publicação: só gera o .md com 'situacao: aprovado'. Rascunho e retido ficam fora (LOTE9_TODOS=1 gera todos, só
para conferência fora do site). Campo opcional 'caminho' (ex.: /salario-minimo-2027/): página de tabela fora do /blog/,
com trilha Início › Tabelas. Campos id, palavra_chave, secundarias, conferir e revisar_em são de controle e não vão ao HTML.
Copiado de build-lote8.py; o resto é igual.
Template e cabeçalho: os mesmos do lote 7 (blog/como-calcular-markup/index.html). Escreve blog/<slug>/index.html e
tests/_src/blog/lote9/manifesto.json (ordem do índice: a do campo 'ordem' de cada .md).
Formato do .md: bloco de cabeçalho entre linhas '---' (slug, titulo, h1, descricao, resumo, categoria, ordem,
relacionadas = '/caminho/|Texto' separados por ' ;; '), depois o corpo em Markdown com '## Resposta direta',
seções, '## Perguntas frequentes' (3 a 6 perguntas em '###') e '## Fontes oficiais'."""
import sys, re, json, html, os, glob, unicodedata, math
import markdown
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lote9')
TODOS = os.environ.get('LOTE9_TODOS') == '1'
DATA = sys.argv[1]
MES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
y, m, d = DATA.split('-'); DEXT = f'{int(d)} de {MES[int(m)-1]} de {y}'
CATS = {'Trabalho e salário', 'Impostos e MEI', 'Reforma tributária', 'Finanças e investimentos'}
FIX = {'Resposta direta': 'resposta-t', 'Neste post': 'sumario-t', 'Perguntas frequentes': 'faq-t', 'Fontes oficiais': 'fontes-t',
       'Autoria': 'autoria-t', 'Calculadoras relacionadas': 'calculadoras-relacionadas'}
FORA_DO_SUMARIO = {'resposta-t', 'sumario-t', 'autoria-t', 'calculadoras-relacionadas'}
def slug(t):
    return re.sub(r'[^a-z0-9]+', '-', unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode().lower()).strip('-')
def texto(h): return html.unescape(re.sub(r'<[^>]+>', '', h)).strip()
tpl = open(f'{R}/blog/como-calcular-markup/index.html', encoding='utf-8').read()
top = tpl[:tpl.index('<title>')]
assets = tpl[tpl.index('<meta name="theme-color"'):tpl.index('<link rel="alternate"')]
style = tpl[tpl.index('<link rel="alternate"'):tpl.index('<script type="application/ld+json">')]
tail_head = tpl[tpl.index('<link rel="stylesheet" href="/assets/lcm-consent.css'):tpl.index('</head>')]
body_start = tpl[tpl.index('<body>'):tpl.index('<main id="conteudo"')]
tail = tpl[tpl.index('<script>/* QA P13-04r'):]
j = lambda o: '<script type="application/ld+json">' + json.dumps(o, ensure_ascii=False, separators=(',', ':')) + '</script>'
manifesto = []
for arq in sorted(glob.glob(f'{SRC}/*.md')):
    if os.path.basename(arq).upper().startswith('README'): continue
    bruto = open(arq, encoding='utf-8').read()
    cab, corpo_md = re.match(r'^---\n(.*?)\n---\n(.*)$', bruto, re.S).groups()
    P = dict(re.findall(r'^(\w+):\s*(.*)$', cab, re.M))
    if P.get('situacao') != 'aprovado' and not TODOS:
        print(f"pula {os.path.basename(arq)}: situacao {P.get('situacao') or '(vazia)'}"); continue
    for k in ('slug', 'titulo', 'h1', 'descricao', 'categoria', 'ordem'):
        if not P.get(k): sys.exit(f'ABORTA {arq}: falta {k}')
    if P['categoria'] not in CATS: sys.exit(f'ABORTA {arq}: categoria {P["categoria"]}')
    if len(P['descricao']) > 160: sys.exit(f'ABORTA {arq}: descrição com {len(P["descricao"])} caracteres')
    S = P['slug']; h1 = P['h1']; TITLE = P['titulo']; DESC = P['descricao']; RESUMO = P.get('resumo') or DESC
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
    # Sumário depois da resposta direta (antes do 2º h2)
    h2s = re.findall(r'<h2 id="([^"]+)">(.*?)</h2>', corpo)
    itens = [(i, t) for i, t in h2s if i not in FORA_DO_SUMARIO]
    sumario = '<h2 id="sumario-t">Neste post</h2>\n<ul>\n' + '\n'.join(f'<li><a href="#{i}">{t}</a></li>' for i, t in itens) + '\n</ul>\n'
    seg = [m.start() for m in re.finditer(r'<h2 id=', corpo)]
    if len(seg) < 3 or h2s[0][0] != 'resposta-t': sys.exit(f'ABORTA {S}: estrutura sem resposta direta ou com poucas seções')
    corpo = corpo[:seg[1]] + sumario + corpo[seg[1]:]
    # Autoria e calculadoras relacionadas no fim
    corpo += f'\n<h2 id="autoria-t">Autoria</h2>\n<p>Equipe Conta Certa. Normas e valores conferidos nas fontes oficiais citadas em {d}/{m}/{y}. O texto é informativo e não substitui a orientação de advogado ou contador para o seu caso.</p>\n'
    if rel:
        corpo += '<h2 id="calculadoras-relacionadas">Calculadoras relacionadas</h2>\n<ul>\n' + '\n'.join(f'<li><a href="{u.strip()}">{html.escape(t.strip(), quote=False)}</a></li>' for u, t in rel) + '\n</ul>\n'
    corpo = re.sub(r'<a href="(https?://[^"]+)">', r'<a href="\1" rel="noopener" target="_blank">', corpo)
    corpo = re.sub(r'<table>(.*?)</table>', r'<div class="tab-rolar"><table>\1</table></div>', corpo, flags=re.S)
    # FAQ
    if 'id="faq-t"' not in corpo or 'id="fontes-t"' not in corpo: sys.exit(f'ABORTA {S}: falta FAQ ou fontes')
    fs = corpo[corpo.index('id="faq-t">'):]; fs = fs[:fs.index('<h2', 5)]
    faqs = [(texto(q), re.sub(r'\s+', ' ', texto(a))) for q, a in re.findall(r'<h3[^>]*>(.*?)</h3>(.*?)(?=<h3|$)', fs, re.S)]
    if not 3 <= len(faqs) <= 6: sys.exit(f'ABORTA {S}: FAQ com {len(faqs)} perguntas')
    fontes = corpo[corpo.index('id="fontes-t">'):]; fontes = fontes[:fontes.index('<h2', 5)]
    cit = [{"@type": "CreativeWork", "name": texto(n), "url": html.unescape(u)} for u, n in re.findall(r'<a href="(https?://[^"]+)" rel="noopener" target="_blank">(.*?)</a>', fontes)]
    if not cit: sys.exit(f'ABORTA {S}: fontes sem link oficial')
    palavras = len(texto(corpo).split()); leit = max(3, math.ceil(palavras / 200))
    CAM = (P.get('caminho') or '').strip('/')
    url = f'https://contacertabr.com.br/{CAM}/' if CAM else f'https://contacertabr.com.br/blog/{S}/'; e = html.escape
    meio = ('Tabelas', 'https://contacertabr.com.br/tabelas-oficiais-2026/', '/tabelas-oficiais-2026/') if CAM else ('Blog', 'https://contacertabr.com.br/blog/', '/blog/')
    ld = [j({"@context": "https://schema.org", "@type": "BlogPosting", "headline": h1, "description": DESC, "url": url, "mainEntityOfPage": url, "inLanguage": "pt-BR",
             "datePublished": DATA, "dateModified": DATA, "author": {"@type": "Organization", "name": "Equipe Conta Certa"}, "citation": cit,
             "publisher": {"@id": "https://contacertabr.com.br/#organizacao"}, "image": "https://contacertabr.com.br/og/padrao.jpg"}),
          j({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Início", "item": "https://contacertabr.com.br/"},
             {"@type": "ListItem", "position": 2, "name": meio[0], "item": meio[1]}, {"@type": "ListItem", "position": 3, "name": h1, "item": url}]}),
          j({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faqs]})]
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
  <nav class="migalhas" aria-label="Você está em"><a href="/">Início</a> › <a href="{meio[2]}">{meio[0]}</a> › <span aria-current="page">{hh}</span></nav>
  <article>
  <h1>{hh}</h1>
  <ul class="post-meta"><li>Publicado em <time datetime="{DATA}">{DEXT}</time></li><li>Atualizado em <time datetime="{DATA}">{DEXT}</time></li><li>{leit} min de leitura</li><li>Por Equipe Conta Certa</li></ul>
  <div class="texto">
  {corpo.strip()}
  </div>
  </article>
  </div>
  '''
    out = top + headm + assets + style + '\n'.join(ld) + f'\n<meta property="article:published_time" content="{DATA}">\n<meta property="article:modified_time" content="{DATA}">\n\n' + tail_head + '</head>\n' + body_start + art + tail
    destino = CAM or f'blog/{S}'
    os.makedirs(f'{R}/{destino}', exist_ok=True); open(f'{R}/{destino}/index.html', 'w', encoding='utf-8').write(out)
    manifesto.append(dict(href=f'/{destino}/', pagina=bool(CAM), titulo=h1, categoria=P['categoria'], resumo=RESUMO, descricao=DESC, data=DATA, ordem=int(P['ordem']), faqs=len(faqs), fontes=len(cit), palavras=palavras))
    print(f'{S}: {palavras} palavras, {len(faqs)} perguntas, {len(cit)} fontes, título {len(TITLE)}, descrição {len(DESC)}')
manifesto.sort(key=lambda x: x['ordem'])
json.dump(manifesto, open(f'{SRC}/manifesto.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(manifesto), 'posts')
