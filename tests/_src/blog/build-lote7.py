#!/usr/bin/env python3
"""Gera nr-1-pequenas-empresas e gro-pgr-nr-1 (lote 7; fator-r em HOLD: 9ce08fb5 NÃO DE ACORDO L131) a partir do artigo.render.html aprovado.
Uso: python3 tests/_src/blog/build-lote7.py AAAA-MM-DD
Aborta se o sha256 do artigo.md ou do artigo.render.html divergir dos hashes finais. O texto do artigo não é editado:
só ids nos títulos, rel/target nos links externos, rolagem nas tabelas e o cabeçalho/rodapé do site.
Selo "Revisão tributária interna" só no fator-r (pacote-tributario.md; DE ACORDO Tributário no 9ce08fb5)."""
import sys,re,json,hashlib,html,os,unicodedata
R=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..','..'))
BASE='/workspace/marketing/plano-20-artigos-lcm/primeiro-lote'
DATA=sys.argv[1]
MES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
y,m,d=DATA.split('-'); DEXT=f'{int(d)} de {MES[int(m)-1]} de {y}'
POSTS=[
 dict(S='nr-1-pequenas-empresas',dir='nr-1-pequenas-empresas',md='097fcd2f6216809ea7c29b7d475faa20011fc8449b2854d9ea521e34bffbea55',html='dbb3de0e41bb9f1f86c8d6bddfeefc74eb650b2b14631fa0110f06d26b243076',
  TITLE='NR-1 para pequenas empresas: MEI, ME e EPP | Conta Certa',
  DESC='Veja o que a NR-1 exige de MEI, ME e EPP: quem precisa de PGR, a dispensa por grau de risco, a declaração de inexistência de riscos e os riscos psicossociais.',selos=['Revisão jurídica interna']),
 dict(S='gro-pgr-nr-1',dir='gro-pgr-nr-1',md='057f7e06a5cc1562303ccc7bebabd7f8566412f67815b1165235cb83ece99b29',html='0caf2a340a35d4be0a4b356bf8af862a9ef8ff04acc5ba60a832bd6145d55afd',
  TITLE='GRO e PGR na NR-1: o que são e o que o PGR deve ter | Conta Certa',
  DESC='Entenda a diferença entre GRO e PGR na NR-1, quem precisa ter PGR, o que o inventário de riscos e o plano de ação devem conter e quando revisar.',selos=['Revisão jurídica interna']),
]
for P in POSTS:
  S=P['S'];SRC=f"{BASE}/{P['dir']}";TITLE=P['TITLE'];DESC=P['DESC']
  for f,s in (('artigo.md',P['md']),('artigo.render.html',P['html'])):
    h=hashlib.sha256(open(f'{SRC}/{f}','rb').read()).hexdigest()
    if h!=s: sys.exit(f'ABORTA {S} {f}: sha256 {h} != aprovado {s}')
  src=open(f'{SRC}/artigo.render.html',encoding='utf-8').read()
  h1=re.search(r'<h1>(.*?)</h1>',src).group(1)
  leit=''.join(f'<li>{x}</li>' for x in re.findall(r'<p>(\d+ min de leitura)</p>',src[:src.index('<h2')]))
  corpo=src[src.index('</ul>',src.index('</h1>'))+5:src.index('</article>')]
  # ids dos h2 pelo "Neste post" do próprio artigo; demais por slug
  toc=dict((html.unescape(t),a) for a,t in re.findall(r'<a href="#([^"]+)">([^<]+)</a>',corpo))
  def slug(t): return re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFKD',t).encode('ascii','ignore').decode().lower()).strip('-')
  FIX={'Resposta direta':'resposta-t','Neste post':'sumario-t','Revisão':'revisao-t'}
  def hid(mo):
      n,t=mo.group(1),mo.group(2); tt=html.unescape(t)
      return f'<h{n} id="{FIX.get(tt) or toc.get(tt) or slug(tt)}">{t}</h{n}>'
  corpo=re.sub(r'<h([23])>(.*?)</h\1>',hid,corpo)
  corpo=corpo.replace('id="conteudo"','id="conteudo-pgr"').replace('href="#conteudo"','href="#conteudo-pgr"')  # id reservado pelo site (Pular para o conteúdo)
  corpo=re.sub(r'<a href="(https?://[^"]+)">',r'<a href="\1" rel="noopener" target="_blank">',corpo)
  corpo=re.sub(r'<table>(.*?)</table>',r'<div class="tab-rolar"><table>\1</table></div>',corpo,flags=re.S)
  cit=[{"@type":"CreativeWork","name":html.unescape(re.sub(r'<[^>]+>','',n)),"url":u} for u,n in re.findall(r'<a href="(https?://[^"]+)" rel="noopener" target="_blank">(.*?)</a>',corpo)]
  tpl=open(f'{R}/blog/como-calcular-markup/index.html',encoding='utf-8').read()
  top=tpl[:tpl.index('<title>')]
  assets=tpl[tpl.index('<meta name="theme-color"'):tpl.index('<link rel="alternate"')]
  style=tpl[tpl.index('<link rel="alternate"'):tpl.index('<script type="application/ld+json">')]
  tail_head=tpl[tpl.index('<link rel="stylesheet" href="/assets/lcm-consent.css'):tpl.index('</head>')]
  body_start=tpl[tpl.index('<body>'):tpl.index('<main id="conteudo"')]
  tail=tpl[tpl.index('<script>/* QA P13-04r'):]
  url=f'https://contacertabr.com.br/blog/{S}/'; e=html.escape
  j=lambda o:'<script type="application/ld+json">'+json.dumps(o,ensure_ascii=False,separators=(',',':'))+'</script>'
  ld=[j({"@context":"https://schema.org","@type":"BlogPosting","headline":html.unescape(h1),"description":DESC,"url":url,"mainEntityOfPage":url,"inLanguage":"pt-BR","datePublished":DATA,"dateModified":DATA,"author":{"@type":"Person","name":"Equipe Conta Certa","jobTitle":"equipe editorial do Conta Certa (LCM Global Services)"},"reviewedBy":{"@type":"Organization","@id":"https://contacertabr.com.br/#organizacao"},"citation":cit,"publisher":{"@id":"https://contacertabr.com.br/#organizacao"},"image":"https://contacertabr.com.br/og/padrao.jpg"}),
      j({"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Início","item":"https://contacertabr.com.br/"},{"@type":"ListItem","position":2,"name":"Blog","item":"https://contacertabr.com.br/blog/"},{"@type":"ListItem","position":3,"name":html.unescape(h1),"item":url}]})]
  tt,dd=e(TITLE),e(DESC)
  headm=f'''<title>{tt}</title>
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
  <meta property="og:image:alt" content="{h1}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{tt}">
  <meta name="twitter:description" content="{dd}">
  <meta name="twitter:image" content="https://contacertabr.com.br/og/padrao.jpg">
  '''
  art=f'''<main id="conteudo" class="caixa">
  <div class="blog post">
  <nav class="migalhas" aria-label="Você está em"><a href="/">Início</a> › <a href="/blog/">Blog</a> › <span aria-current="page">{h1}</span></nav>
  <article>
  <h1>{h1}</h1>
  <ul class="post-meta"><li>Publicado em <time datetime="{DATA}">{DEXT}</time></li><li>Atualizado em <time datetime="{DATA}">{DEXT}</time></li>{leit}<li>Por Equipe Conta Certa, revisão interna</li>{''.join(f'<li>{x}</li>' for x in P['selos'])}</ul>
  <div class="texto">
  {corpo.strip()}
  </div>
  </article>
  </div>
  '''
  out=top+headm+assets+style+'\n'.join(ld)+f'\n<meta property="article:published_time" content="{DATA}">\n<meta property="article:modified_time" content="{DATA}">\n\n'+tail_head+'</head>\n'+body_start+art+tail
  os.makedirs(f'{R}/blog/{S}',exist_ok=True); open(f'{R}/blog/{S}/index.html','w',encoding='utf-8').write(out)
  print(S,'md',P['md'][:8],'html',P['html'][:8],'confere;',len(cit),'fontes')
