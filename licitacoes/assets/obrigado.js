(function(){
let r=null; try{r=JSON.parse(localStorage.getItem('radar_optin_prova'))}catch(_){}
if(!r) return;
const t=r.titular, esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
document.getElementById('ty-mail').textContent=t.email;
document.getElementById('mc-to').textContent=t.email;
document.getElementById('ty-kw').textContent=t.palavras_chave.map(k=>'“'+k+'”').join(', ');
document.getElementById('ty-uf').textContent=t.ufs.length===27?'todo o Brasil':t.ufs.join(', ');
const show={id:r.id,status:r.status,enviado_em_utc:r.enviado_em_utc,enviado_em_local:r.enviado_em_local,
 email:t.email,empresa:t.empresa,consentimento:{caixa_estado_inicial:r.consentimento.caixa_estado_inicial,marcada_em:r.consentimento.marcada_pelo_usuario_em,versao:r.consentimento.texto_versao,sha256:r.consentimento.texto_sha256,confere:r.consentimento.texto_confere_com_versao},
 aviso:r.aviso_privacidade.versao+' · '+r.aviso_privacidade.sha256.slice(0,16),
 origem:r.origem.utm_source?`${r.origem.utm_source}/${r.origem.utm_medium}/${r.origem.utm_campaign}`:r.origem.referrer,
 ip:r.tecnico.ip,user_agent:r.tecnico.user_agent,
 double_opt_in:{link_expira_em:r.double_opt_in.link_expira_em,confirmado_em:r.double_opt_in.confirmado_em},envio_real:false};
const j=JSON.stringify(show,null,2);
document.getElementById('proof-json').innerHTML=esc(j).replace(/"([^"]+)":/g,'<span class="k">"$1"</span>:').replace(/: "([^"]*)"/g,': <span class="s">"$1"</span>');
})();
