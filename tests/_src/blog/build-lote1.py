#!/usr/bin/env python3
"""Gera /blog/como-calcular-markup/ e /blog/juros-compostos-exemplo/ a partir dos artigo.md aprovados.
Uso: python3 tests/_src/blog/build-lote1.py AAAA-MM-DD   (data real de publicação)
Aborta se o sha256 do artigo.md divergir do aprovado."""
import sys,re,json,hashlib,html,unicodedata,os,markdown
R=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..','..'))
SRC='/workspace/marketing/plano-20-artigos-lcm/primeiro-lote'
DATA=sys.argv[1]
MES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
y,m,d=DATA.split('-'); DEXT=f'{int(d)} de {MES[int(m)-1]} de {y}'
POSTS={
 'como-calcular-markup':dict(sha='820879e39d4a1e1cddb16d063ba66541fac20eb0f37eb013fc2e92828632a0e6',
   title='Como calcular markup: fórmula e exemplo | Conta Certa',
   desc='Aprenda a calcular markup divisor e multiplicador com exemplo em reais, tabela de conversão para margem e os erros que fazem você vender no prejuízo.',
   rel=[('/markup/','Calculadora de markup','Preço de venda a partir do custo e dos percentuais.'),('/porcentagem/','Porcentagem','Calcule aumentos, descontos e variações.'),('/custo-funcionario/','Custo de funcionário','Quanto custa um empregado para a empresa.')]),
 'juros-compostos-exemplo':dict(sha='f08b5f26d12405ff4298ae82a4c640078bad14f4038462b644f6ef7d73e5dbf0',
   title='Juros compostos: fórmula e 3 exemplos práticos | Conta Certa',
   desc='Veja a fórmula dos juros compostos e 3 exemplos resolvidos: aplicação, dívida no cartão e aportes mensais. Inclui conversão de taxas e regra do 72.',
   rel=[('/juros-compostos/','Calculadora de juros compostos','Simule aplicações com aportes e taxa mensal ou anual.'),('/investimentos/','Investimentos','Compare rendimentos de aplicações.'),('/financiamento/','Financiamento','Parcelas pela Tabela Price ou SAC.'),('/parcelado-ou-a-vista/','Parcelado ou à vista','Veja qual opção sai mais barata.')]),
}
def slug(t): return re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFKD',t).encode('ascii','ignore').decode().lower()).strip('-')
def md(t): return markdown.markdown(t,extensions=['tables'])
def ext(h): return re.sub(r'<a href="(https?://[^"]+)">',r'<a href="\1" rel="noopener" target="_blank">',h)
def txt(h): return html.unescape(re.sub(r'<[^>]+>','',h)).strip()
tpl=open(f'{R}/blog/pro-labore/index.html',encoding='utf-8').read()
head_end=tpl.index('<script type="application/ld+json">'); style=tpl[tpl.index('<link rel="alternate"'):head_end]
tail_head=tpl[tpl.index('<link rel="stylesheet" href="/assets/lcm-consent.css'):tpl.index('</head>')]
body_start=tpl[tpl.index('<body>'):tpl.index('<main id="conteudo"')]
tail=tpl[tpl.index('<script>/* QA P13-04r'):]
top=tpl[:tpl.index('<title>')]
assets=tpl[tpl.index('<meta name="theme-color"'):tpl.index('<link rel="alternate"')]
for s,c in POSTS.items():
    raw=open(f'{SRC}/{s}/artigo.md','rb').read(); sha=hashlib.sha256(raw).hexdigest()
    if sha!=c['sha']: sys.exit(f'ABORTA {s}: sha256 {sha} != aprovado {c["sha"]}')
    t=raw.decode().split('---',2)[2].strip()
    h1=re.search(r'^# (.+)$',t,re.M).group(1); t=t[t.index('\n',t.index('# '))+1:].strip()
    intro,rest=t.split('\n## ',1); rest='## '+rest
    corpo,faqfont=rest.split('## Perguntas frequentes',1); faq_md,font_md=faqfont.split('## Fontes',1)
    url=f'https://contacertabr.com.br/blog/{s}/'
    paras=[p.strip() for p in intro.split('\n\n') if p.strip()]
    resp=ext(md('\n\n'.join(paras)).replace('<strong>Resumo.</strong>','<strong>Resumo:</strong>'))
    secs=[];toc=[]
    for blk in re.split(r'(?m)^## ',corpo)[1:]:
        tit,b=blk.split('\n',1); i=slug(tit); toc.append((i,tit))
        hb=ext(md(b)); hb=re.sub(r'<table>(.*?)</table>',r'<div class="tab-rolar"><table>\1</table></div>',hb,flags=re.S)
        secs.append(f'<section aria-labelledby="{i}"><h2 id="{i}">{html.escape(tit)}</h2>{hb}</section>')
    faqs=re.findall(r'^\*\*(.+?)\*\* (.+)$',faq_md,re.M)
    fhtml=''.join(f'<details><summary>{html.escape(q)}</summary><div>{ext(md(a))}</div></details>\n' for q,a in faqs)
    fontes=[];cit=[]
    for li in re.findall(r'^- (.+)$',font_md,re.M):
        mm=re.match(r'(.*?): (https?://\S+)(.*)$',li)
        if mm: nome,u,res=mm.groups(); fontes.append(f'<li><a href="{html.escape(u)}" rel="noopener" target="_blank">{html.escape(nome)}</a>{html.escape(res)}</li>'); cit.append({"@type":"CreativeWork","name":re.sub(r'^\[S\d+\] ','',nome).replace('"',''),"url":u})
        else: fontes.append(f'<li>{ext(md(li))[3:-4]}</li>')
    outro=[x for x in POSTS if x!=s][0]; oh1={'como-calcular-markup':'Como calcular markup: fórmula, exemplo e diferença para margem','juros-compostos-exemplo':'Juros compostos: fórmula e 3 exemplos práticos'}[outro]
    cards=''.join(f'<li><a class="card" href="{u}"><span class="tile t-impostos"><svg class="ic" aria-hidden="true" focusable="false"><use href="#i-recibo"/></svg></span><span class="card-txt"><strong>{n}</strong><span>{dsc}</span></span><svg class="ic seta" aria-hidden="true" focusable="false"><use href="#i-seta"/></svg></a></li>' for u,n,dsc in c['rel'])
    j=lambda o: '<script type="application/ld+json">'+json.dumps(o,ensure_ascii=False,separators=(',',':'))+'</script>'
    ld=[j({"@context":"https://schema.org","@type":"BlogPosting","headline":h1,"description":c['desc'],"url":url,"mainEntityOfPage":url,"inLanguage":"pt-BR","datePublished":DATA,"dateModified":DATA,"author":{"@type":"Person","name":"Equipe Conta Certa","jobTitle":"equipe editorial do Conta Certa (LCM Global Services)"},"reviewedBy":{"@type":"Organization","@id":"https://contacertabr.com.br/#organizacao"},"citation":cit,"publisher":{"@id":"https://contacertabr.com.br/#organizacao"},"image":"https://contacertabr.com.br/og/padrao.jpg"}),
        j({"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Início","item":"https://contacertabr.com.br/"},{"@type":"ListItem","position":2,"name":"Blog","item":"https://contacertabr.com.br/blog/"},{"@type":"ListItem","position":3,"name":h1,"item":url}]}),
        j({"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":txt(md(a))}} for q,a in faqs]})]
    e=html.escape; tt=e(c['title']); dd=e(c['desc'])
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
<meta property="og:image:alt" content="{e(h1)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{tt}">
<meta name="twitter:description" content="{dd}">
<meta name="twitter:image" content="https://contacertabr.com.br/og/padrao.jpg">
'''
    toc_h=''.join(f'<li><a href="#{i}">{e(x)}</a></li>' for i,x in toc)+'<li><a href="#faq-t">Perguntas frequentes</a></li><li><a href="#fontes-t">Fontes</a></li><li><a href="#rel-t">Calculadoras relacionadas</a></li>'
    art=f'''<main id="conteudo" class="caixa">
<div class="blog post">
<nav class="migalhas" aria-label="Você está em"><a href="/">Início</a> › <a href="/blog/">Blog</a> › <span aria-current="page">{e(h1)}</span></nav>
<article>
<h1>{e(h1)}</h1>
<ul class="post-meta"><li>Publicado em <time datetime="{DATA}">{DEXT}</time></li><li>Atualizado em <time datetime="{DATA}">{DEXT}</time></li><li>Por Equipe Conta Certa, equipe editorial do Conta Certa (LCM Global Services)</li><li>Revisão jurídica interna</li></ul>
<div class="post-grade">
<section class="resposta" aria-labelledby="resposta-t"><h2 id="resposta-t">Resposta direta</h2>{resp}</section>
<nav class="sumario" aria-labelledby="sumario-t"><h2 id="sumario-t">Neste post</h2><ol>{toc_h}</ol></nav>
<div class="post-corpo">
<div class="texto">
{chr(10).join(secs)}
</div>
<section class="faq" aria-labelledby="faq-t"><h2 id="faq-t">Perguntas frequentes</h2>
{fhtml}</section>
<section class="fontes" aria-labelledby="fontes-t"><h2 id="fontes-t">Fontes</h2><ul>{''.join(fontes)}</ul></section>
<section class="relacionadas" aria-labelledby="rel-t"><h2 id="rel-t">Calculadoras relacionadas</h2><ul class="cards">{cards}</ul><p>Leia também: <a href="/blog/{outro}/">{e(oh1)}</a></p></section>
</div>
</div>
</article>
</div>
'''
    out=top+headm+assets+style+'\n'.join(ld)+f'\n<meta property="article:published_time" content="{DATA}">\n<meta property="article:modified_time" content="{DATA}">\n\n'+tail_head+'</head>\n'+body_start+art+tail
    os.makedirs(f'{R}/blog/{s}',exist_ok=True); open(f'{R}/blog/{s}/index.html','w',encoding='utf-8').write(out)
    print(s,'sha256',sha[:8],'confere;',len(secs),'seções',len(faqs),'FAQ',len(fontes),'fontes')
