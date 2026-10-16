/* Licitações · opt-in (prévia). Nada é enviado: o envio é simulado e o registro fica só no navegador. */
(function(){
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const form=$('#optin');

/* ---- prazos da amostra: contagem regressiva ao vivo + régua de 30 dias ---- */
function prazos(){
 const now=Date.now();
 $$('.cd').forEach(el=>{
  const ms=new Date(el.dataset.end)-now, d=ms/864e5;
  el.className='pill cd '+(ms<=0?'n':d<3?'r':d<=7?'a':'n');
  if(ms<=0){el.textContent='Encerrado';return}
  const dd=Math.floor(d),hh=Math.floor((ms%864e5)/36e5);
  el.textContent=dd>0?`${dd}d ${hh}h`:`${hh}h ${Math.floor((ms%36e5)/6e4)}min`;
 });
 $$('.ruler').forEach(el=>{
  const d=(new Date(el.dataset.end)-now)/864e5, on=Math.max(0,Math.min(10,Math.ceil(d/3)));
  el.className='ruler '+(d<3?'r':d<=7?'a':'n');
  [...el.children].forEach((i,k)=>i.classList.toggle('on',k<on));
 });
}
prazos(); setInterval(prazos,60000);
if(!form) return;

/* ---- estado inicial da caixa: prova de que NÃO veio marcada ---- */
const cb=$('#OPT_IN'); const caixaInicial=cb.checked; let marcadaEm=null;
cb.checked=false; cb.addEventListener('change',()=>{marcadaEm=cb.checked?new Date().toISOString():null; ok('f-cons',cb.checked||null)});

/* ---- integridade do texto exibido: sha256 do texto da label = versão registrada ---- */
const textoExibido=()=>$('#cons-txt').textContent.replace(/\s+/g,' ').trim();
async function h(s){
 try{ if(crypto&&crypto.subtle){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')} }catch(e){}
 return window.sha256hex(s);
}
let shaExibido=null; h(textoExibido()).then(x=>{shaExibido=x; if(x!==form.dataset.consSha) console.error('Texto de consentimento difere da versão registrada',x)});

/* ---- CNPJ: máscara e dígitos verificadores ---- */
const cnpj=$('#CNPJ');
cnpj.addEventListener('input',()=>{let v=cnpj.value.replace(/\D/g,'').slice(0,14);
 cnpj.value=v.replace(/^(\d{2})(\d)/,'$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3').replace(/\.(\d{3})(\d)/,'.$1/$2').replace(/(\d{4})(\d)/,'$1-$2')});
function cnpjOk(v){v=v.replace(/\D/g,''); if(!v) return true; if(v.length!==14||/^(\d)\1+$/.test(v)) return false;
 const dv=n=>{let s=0,p=n-7;for(let i=0;i<n;i++){s+=+v[i]*p--; if(p<2)p=9} const r=s%11;return r<2?0:11-r};
 return dv(12)==+v[12]&&dv(13)==+v[13]}

/* ---- palavras-chave ---- */
const box=$('#tagbox'),kin=$('#kw-in'),hid=$('#PALAVRAS_CHAVE'); let tags=[];
function render(){ $$('#tagbox .tag').forEach(t=>t.remove());
 tags.forEach((t,i)=>{const s=document.createElement('span');s.className='tag';s.innerHTML=`${t}<button type="button" aria-label="Remover ${t}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M7 7l10 10M17 7L7 17"/></svg></button>`;
  s.querySelector('button').onclick=()=>{tags.splice(i,1);render()}; box.insertBefore(s,kin)});
 hid.value=tags.join(', '); kin.placeholder=tags.length?(tags.length<5?'Adicionar outra':'Limite de 5'):'Ex.: material de limpeza, toner'; kin.disabled=tags.length>=5;
 if(tags.length) ok('f-kw',true)}
function add(v){v=v.replace(/[,;]+/g,' ').replace(/\s+/g,' ').trim().toLowerCase().slice(0,40); if(v&&!tags.includes(v)&&tags.length<5){tags.push(v);render()}}
kin.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===','){e.preventDefault();add(kin.value);kin.value=''} else if(e.key==='Backspace'&&!kin.value&&tags.length){tags.pop();render()}});
kin.addEventListener('blur',()=>{if(kin.value.trim()){add(kin.value);kin.value=''}});
box.addEventListener('click',()=>kin.focus());
$$('.sugs button').forEach(b=>b.onclick=()=>add(b.textContent));

/* ---- UFs ---- */
const ufs=$$('input[name=UFS]'),un=$('#uf-n');
function ufc(){const n=ufs.filter(u=>u.checked).length; un.textContent=n===0?'nenhum selecionado':n===27?'todo o Brasil':n===1?'1 selecionado':n+' selecionados'; if(n) ok('f-uf',true)}
ufs.forEach(u=>u.addEventListener('change',ufc));
$('#uf-all').onclick=()=>{const all=ufs.every(u=>u.checked); ufs.forEach(u=>u.checked=!all); $('#uf-all').textContent=all?'Todo o Brasil':'Limpar'; ufc()};

/* ---- origem (atribuição) ---- */
const q=new URLSearchParams(location.search);
const origem={url:location.origin+location.pathname,referrer:document.referrer||'(direto)',utm_source:q.get('utm_source')||'',utm_medium:q.get('utm_medium')||'',utm_campaign:q.get('utm_campaign')||'',utm_content:q.get('utm_content')||''};
$('#ORIGEM').value=[origem.utm_source,origem.utm_medium,origem.utm_campaign].filter(Boolean).join('/')||'direto';

/* ---- validação ---- */
function ok(id,v){const f=document.getElementById(id); if(v===null) return; f.classList.toggle('bad',!v)}
$('#EMAIL').addEventListener('blur',e=>{if(e.target.value) ok('f-email',/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.target.value.trim()))});
$('#EMPRESA').addEventListener('input',e=>{if(e.target.value.trim().length>1) ok('f-empresa',true)});
cnpj.addEventListener('blur',()=>ok('f-cnpj',cnpjOk(cnpj.value)));

form.addEventListener('submit',async e=>{
 e.preventDefault();
 if(form.dataset.envio==='desativado'){return}  // inscrição desativada até a configuração do Brevo: nada é enviado nem gravado
 const email=$('#EMAIL').value.trim(), emp=$('#EMPRESA').value.trim(), uf=ufs.filter(u=>u.checked).map(u=>u.value);
 const v={'f-email':/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email),'f-empresa':emp.length>1,'f-cnpj':cnpjOk(cnpj.value),'f-kw':tags.length>0,'f-uf':uf.length>0,'f-cons':cb.checked};
 Object.entries(v).forEach(([k,x])=>ok(k,x));
 const first=Object.keys(v).find(k=>!v[k]);
 if(first){document.getElementById(first).scrollIntoView({behavior:'smooth',block:'center'}); const i=document.querySelector('#'+first+' input:not([type=hidden])'); if(i) i.focus({preventScroll:true}); return}
 const sha=shaExibido||await h(textoExibido());
 if(sha!==form.dataset.consSha){alert('O texto de consentimento exibido não corresponde à versão registrada. Envio bloqueado.');return}
 const agora=new Date(), id=(crypto.randomUUID?crypto.randomUUID():'sim-'+agora.getTime().toString(36));
 const registro={
  id, tipo:'optin_formulario', status:'pendente_confirmacao_doi',
  enviado_em_utc:agora.toISOString(),
  enviado_em_local:agora.toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})+' (BRT)',
  titular:{email, empresa:emp, cnpj:cnpj.value||null, palavras_chave:tags, ufs:uf},
  consentimento:{caixa_estado_inicial:caixaInicial?'marcada':'desmarcada', marcada_pelo_usuario_em:marcadaEm, texto_versao:form.dataset.consVer, texto_sha256:sha, texto_confere_com_versao:sha===form.dataset.consSha, texto:textoExibido(), base_legal:'LGPD art. 7º, I, e art. 8º'},
  aviso_privacidade:{versao:form.dataset.avisoVer, sha256:form.dataset.avisoSha},
  origem,
  tecnico:{user_agent:navigator.userAgent, idioma:navigator.language, tela:`${screen.width}x${screen.height}`, ip:'203.0.113.24 (SIMULADO: o IP real só é visto pelo servidor; em produção, registrado pelo Brevo)'},
  double_opt_in:{email_confirmacao:'enviado pelo Brevo (simulado)', link_expira_em:new Date(agora.getTime()+30*864e5).toISOString(), confirmado_em:null},
  destino:{ferramenta:'Brevo', lista:'Radar · opt-in confirmado', formulario:'radar-optin-'+form.dataset.consVer.toLowerCase(), envio_real:false}
 };
 try{localStorage.setItem('radar_optin_prova',JSON.stringify(registro))}catch(_){}
 location.href='/licitacoes/obrigado.html';
});
})();
