#!/usr/bin/env python3
"""Lote 7: /blog/fator-r-simples-nacional/, /blog/nr-1-pequenas-empresas/ e /blog/gro-pgr-nr-1/ a partir dos artigo.md + artigo.render.html aprovados.
Uso: python3 tests/_src/blog/build-lote7.py AAAA-MM-DD   (data REAL de publicação; rodar de novo no dia)
Aborta se o sha256 do artigo.md ou do artigo.render.html divergir do aprovado. O texto do corpo vem do render
aprovado, sem edição; só a estrutura (seções, FAQ em <details>, cards) segue o template dos posts do blog.
Hashes finais: fator-r 755d7e45/aa35c422 (Advogado ADENDO 83ea0b2b + Tributário DE ACORDO), nr-1 2b817a60/83a0466e (FAQ restaurado), gro 057f7e06/0caf2a34."""
import sys,re,json,hashlib,html,os,glob
from bs4 import BeautifulSoup
R=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..','..'))
SRC='/workspace/marketing/plano-20-artigos-lcm/primeiro-lote'
DATA=sys.argv[1]
MES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
y,m,d=DATA.split('-'); DEXT=f'{int(d)} de {MES[int(m)-1]} de {y}'
POSTS={
 'fator-r-simples-nacional':dict(md='755d7e455f93666c00c3f421d1250c7946037ced1497574564a0f51a3813799c',rd='aa35c4224ea8c5198546389f4897ad8c6028c3b4887e6fccb0e6b0a719eb36a7',
   title='Fator R no Simples Nacional: como calcular e o Anexo III',
   desc='Fator R no Simples Nacional: como calcular folha sobre receita de 12 meses, quando a empresa fica no Anexo III ou no V e o que entra na folha.',
   cat='Impostos e MEI', irmao='pro-labore'),
 'nr-1-pequenas-empresas':dict(md='2b817a60df459eed93363879c3da9c53b0d898ae3007c554759ddf85cb4b0ded',rd='83a0466e10f96edabd39d313e094cda3ccf080ce6d0b233e0bb843f9b3e15772',
   title='NR-1 para pequenas empresas: o que ME, EPP e MEI fazem',
   desc='NR-1 para pequenas empresas: o que vale para MEI, ME e EPP, quando o PGR pode ser dispensado e o que fazer sobre riscos psicossociais.',
   cat='Trabalho e salário', irmao='gro-pgr-nr-1'),
 'gro-pgr-nr-1':dict(md='057f7e06a5cc1562303ccc7bebabd7f8566412f67815b1165235cb83ece99b29',rd='0caf2a340a35d4be0a4b356bf8af862a9ef8ff04acc5ba60a832bd6145d55afd',
   title='GRO e PGR na NR-1: o que são e o que o PGR deve ter',
   desc='Entenda a diferença entre GRO e PGR na NR-1, quem precisa ter PGR, o que o inventário de riscos e o plano de ação devem conter e quando revisar.',
   cat='Trabalho e salário', irmao='nr-1-pequenas-empresas'),
}
SELO='Revisão jurídica interna'
e=html.escape
def cardDe(slug):
    for f in glob.glob(f'{R}/**/index.html',recursive=True):
        mm=re.search(r'<li><a class="card" href="/'+re.escape(slug)+r'/">(?:[^<]|<(?:svg|use|/svg|span|/span|strong|/strong)[^>]*>)*</a></li>',open(f,encoding='utf-8').read())
        if mm: return mm.group(0)
    sys.exit(f'ABORTA: card de /{slug}/ não existe no site')
tpl=open(f'{R}/blog/pro-labore/index.html',encoding='utf-8').read()
head_end=tpl.index('<script type="application/ld+json">'); style=tpl[tpl.index('<link rel="alternate"'):head_end]
tail_head=tpl[tpl.index('<link rel="stylesheet" href="/assets/lcm-consent.css'):tpl.index('</head>')]
body_start=tpl[tpl.index('<body>'):tpl.index('<main id="conteudo"')]
tail=tpl[tpl.index('<script>/* QA P13-04r'):]
top=tpl[:tpl.index('<title>')]
assets=tpl[tpl.index('<meta name="theme-color"'):tpl.index('<link rel="alternate"')]
def inner(t): return ''.join(str(c) for c in t.contents)
def limpa_li(ul):
    for p in ul.select('li > p'):
        if len(p.parent.find_all('p',recursive=False))==1: p.unwrap()
    return ul
for s,c in POSTS.items():
    raw=open(f'{SRC}/{s}/artigo.md','rb').read(); rr=open(f'{SRC}/{s}/artigo.render.html','rb').read()
    for nome,b,ok in (('artigo.md',raw,c['md']),('artigo.render.html',rr,c['rd'])):
        h=hashlib.sha256(b).hexdigest()
        if h!=ok: sys.exit(f'ABORTA {s}: {nome} sha256 {h} != aprovado {ok}')
    a=BeautifulSoup(rr.decode(),'lxml').article
    h1=a.h1.get_text(); blocos=[]; cur=None
    for n in list(a.children):
        if getattr(n,'name',None)=='h2': cur=[n.get_text().strip(),n.get('id'),[]]; blocos.append(cur)
        elif cur and getattr(n,'name',None): cur[2].append(n)
    meta_ul=a.find('ul')
    meta_li=[li.get_text(' ',strip=True) for li in meta_ul.find_all('li')]
    assert SELO in meta_li, meta_li
    url=f'https://contacertabr.com.br/blog/{s}/'
    B={t:(i,ns) for t,i,ns in blocos}
    def ext(x): return re.sub(r'<a href="(https?://[^"]+)">',r'<a href="\1" rel="noopener" target="_blank">',x)
    def corpo(ns):
        out=''
        for n in ns:
            if n.name=='ul': limpa_li(n)
            x=str(n)
            if n.name=='table': x=f'<div class="tab-rolar">{x}</div>'
            out+=x
        return ext(out)
    resp=corpo(B['Resposta direta'][1])
    secs=[];toc=[]; faqs=[]; fontes=''; revisao=''; rel=[]
    from unicodedata import normalize
    def slug(t): return re.sub(r'[^a-z0-9]+','-',normalize('NFKD',t).encode('ascii','ignore').decode().lower()).strip('-')
    for t,i,ns in blocos:
        if t in ('Resposta direta','Neste post'): continue
        if t.startswith('Perguntas frequentes'):
            faq_bruto=corpo(ns); k=0
            while k<len(ns):
                n=ns[k]
                if n.name=='h3': q=n.get_text().strip(); a_=''; k+=1
                    
                elif n.name=='p' and n.find('strong') and n.contents and getattr(n.contents[0],'name',None)=='strong':
                    q=n.contents[0].get_text().strip(); n.contents[0].extract(); a_=inner(n).strip(); k+=1; faqs.append((q,'<p>'+a_+'</p>')); continue
                else: k+=1; continue
                while k<len(ns) and ns[k].name!='h3': a_+=str(ns[k]); k+=1
                faqs.append((q,a_))
            continue
        if t.startswith('Fontes'): fontes=corpo(ns); continue
        if t=='Calculadoras relacionadas':
            for n in ns:
                for l in n.find_all('a'): rel.append(l['href'].strip('/'))
            continue
        i=i or slug(t)
        if t=='Revisão': i='revisao-t'
        toc.append((i,t)); secs.append(f'<section aria-labelledby="{i}"><h2 id="{i}">{e(t)}</h2>{corpo(ns)}</section>')
    # nr-1 097fcd2f: a seção FAQ aprovada só tem respostas (sem perguntas). Sai como texto, sem <details> nem FAQPage.
    assert fontes and rel, (bool(fontes),rel)
    cards=''.join(cardDe(x) for x in rel)
    txt=lambda h_: html.unescape(re.sub(r'<[^>]+>','',h_)).strip()
    cit=[{"@type":"CreativeWork","name":txt(str(l)),"url":l['href']} for l in BeautifulSoup(fontes,'lxml').find_all('a')]
    j=lambda o: '<script type="application/ld+json">'+json.dumps(o,ensure_ascii=False,separators=(',',':'))+'</script>'
    ld=[j({"@context":"https://schema.org","@type":"BlogPosting","headline":h1,"description":c['desc'],"url":url,"mainEntityOfPage":url,"inLanguage":"pt-BR","datePublished":DATA,"dateModified":DATA,"author":{"@type":"Person","name":"Equipe Conta Certa","jobTitle":"equipe editorial do Conta Certa (LCM Global Services)"},"reviewedBy":{"@type":"Organization","@id":"https://contacertabr.com.br/#organizacao"},"citation":cit,"publisher":{"@id":"https://contacertabr.com.br/#organizacao"},"image":"https://contacertabr.com.br/og/padrao.jpg"}),
        j({"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Início","item":"https://contacertabr.com.br/"},{"@type":"ListItem","position":2,"name":"Blog","item":"https://contacertabr.com.br/blog/"},{"@type":"ListItem","position":3,"name":h1,"item":url}]}),
        ]+([j({"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":txt(a_)}} for q,a_ in faqs]})] if faqs else [])
    tt=e(c['title']); dd=e(c['desc'])
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
    toc_h=''.join(f'<li><a href="#{i}">{e(x)}</a></li>' for i,x in toc if i!='revisao-t')+'<li><a href="#faq-t">Perguntas frequentes</a></li><li><a href="#fontes-t">Fontes oficiais</a></li><li><a href="#revisao-t">Revisão</a></li><li><a href="#rel-t">Calculadoras relacionadas</a></li>'
    secs_txt=[x for x in secs if 'id="revisao-t"' not in x]; rev=[x for x in secs if 'id="revisao-t"' in x]
    pm=''.join(f'<li>{e(x)}</li>' for x in meta_li)
    oh1={'nr-1-pequenas-empresas':'NR-1 para pequenas empresas: o que vale para MEI, ME e EPP','gro-pgr-nr-1':'GRO e PGR na NR-1: o que são e o que o PGR deve ter','pro-labore':html.unescape(re.search(r'<h1>([^<]+)</h1>',tpl).group(1))}[c['irmao']]
    art=f'''<main id="conteudo" class="caixa">
<div class="blog post">
<nav class="migalhas" aria-label="Você está em"><a href="/">Início</a> › <a href="/blog/">Blog</a> › <span aria-current="page">{e(h1)}</span></nav>
<article>
<h1>{e(h1)}</h1>
<ul class="post-meta"><li>Publicado em <time datetime="{DATA}">{DEXT}</time></li><li>Atualizado em <time datetime="{DATA}">{DEXT}</time></li>{pm}</ul>
<div class="post-grade">
<section class="resposta" aria-labelledby="resposta-t"><h2 id="resposta-t">Resposta direta</h2>{resp}</section>
<nav class="sumario" aria-labelledby="sumario-t"><h2 id="sumario-t">Neste post</h2><ol>{toc_h}</ol></nav>
<div class="post-corpo">
<div class="texto">
{chr(10).join(secs_txt)}
</div>
<section class="faq" aria-labelledby="faq-t"><h2 id="faq-t">Perguntas frequentes</h2>
{''.join(f'<details><summary>{e(q)}</summary><div>{ext(a_)}</div></details>'+chr(10) for q,a_ in faqs) if faqs else '<div class="texto">'+faq_bruto+'</div>'}</section>
<section class="fontes" aria-labelledby="fontes-t"><h2 id="fontes-t">Fontes oficiais</h2>{fontes}</section>
<div class="texto">{''.join(rev)}</div>
<section class="relacionadas" aria-labelledby="rel-t"><h2 id="rel-t">Calculadoras relacionadas</h2><ul class="cards">{cards}</ul><p>Leia também: <a href="/blog/{c['irmao']}/">{e(oh1)}</a></p></section>
</div>
</div>
</article>
</div>
'''
    out=top+headm+assets+style+'\n'.join(ld)+f'\n<meta property="article:published_time" content="{DATA}">\n<meta property="article:modified_time" content="{DATA}">\n\n'+tail_head+'</head>\n'+body_start+art+tail
    os.makedirs(f'{R}/blog/{s}',exist_ok=True); open(f'{R}/blog/{s}/index.html','w',encoding='utf-8').write(out)
    print(s,'md',c['md'][:8],'html',c['rd'][:8],'confere;',len(secs_txt),'seções',len(faqs),'FAQ',len(cit),'fontes',len(rel),'cards')
