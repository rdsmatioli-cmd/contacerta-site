// Google Analytics 4 com consentimento (LGPD + Google Consent Mode v2).
// Só gera algo quando cfg.ga4Id está preenchido em site.config.mjs; vazio = HTML idêntico ao anterior.
// O gtag.js só é baixado depois de "Aceitar". Nenhum valor digitado é enviado: os eventos levam apenas
// o nome da calculadora, o destino do link interno ou o fato de a busca ter sido usada.
const okId = (id) => /^G-[A-Z0-9]{4,}$/.test(String(id || '').trim());
export const ga4Ativo = (cfg) => okId(cfg.ga4Id);
export const linkPreferencias = (cfg) => (ga4Ativo(cfg) ? '<button type="button" class="cc-rever" data-cookies-rever>Preferências de cookies</button>' : '');

// CSS do banner: em src/css/style.css (bloco "Banner de cookies"), carregado no <head>.

// Script: consent default denied; carrega gtag.js só após aceite; eventos sem dados digitados.
const js = (id) => `(function(){var ID='${id}',K='cc-consent-v1',w=window,d=document,b=d.getElementById('cc-banner');w.dataLayer=w.dataLayer||[];function g(){w.dataLayer.push(arguments)}w.gtag=g;g('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});var ok=false;function ler(){try{return localStorage.getItem(K)}catch(e){return null}}function gravar(v){try{localStorage.setItem(K,v)}catch(e){}}function carregar(){if(ok)return;ok=true;g('consent','update',{analytics_storage:'granted'});g('js',new Date());g('config',ID,{anonymize_ip:true});var s=d.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+ID;d.head.appendChild(s)}function ev(n,p){if(ok)g('event',n,p||{})}function folga(){d.body.style.paddingBottom=(b.hidden||getComputedStyle(b).position!=='fixed')?'':(b.offsetHeight+16)+'px'}var pl=d.querySelector('.pular');d.body.insertBefore(b,pl?pl.nextSibling:d.body.firstChild);w.addEventListener('resize',folga);function mostrar(){b.hidden=false;folga();var a=b.querySelector('.cc-aceitar');a&&a.focus({preventScroll:true})}var v=ler();if(v==='aceito')carregar();else if(v!=='recusado'){b.hidden=false;folga()}b.addEventListener('click',function(e){var t=e.target.closest('button');if(!t)return;if(t.classList.contains('cc-aceitar')){gravar('aceito');b.hidden=true;folga();carregar()}else if(t.classList.contains('cc-recusar')){gravar('recusado');b.hidden=true;folga();if(ok){g('consent','update',{analytics_storage:'denied'});try{d.cookie.split(';').forEach(function(c){var n=c.split('=')[0].trim();if(/^_ga/.test(n))d.cookie=n+'=;Max-Age=0;path=/;domain=.'+location.hostname.replace(/^www\\./,'')})}catch(x){}}}});b.addEventListener('keydown',function(e){if(e.key==='Escape'&&ler()){b.hidden=true;folga()}});d.addEventListener('click',function(e){var r=e.target.closest('[data-cookies-rever]');if(r){e.preventDefault();mostrar();return}var a=e.target.closest('a[href^="/"]');if(a&&!b.contains(a)){var m=a.getAttribute('href').match(/^\\/([a-z0-9-]+)\\/$/);if(m)ev('link_interno',{destino:m[1],origem:location.pathname,area:a.closest('.rodape')?'rodape':a.closest('[data-busca]')?'busca':'conteudo'})}});d.addEventListener('submit',function(e){var f=e.target;if(f.matches('form[data-calc]'))ev('calcular',{calculadora:f.getAttribute('data-calc'),pagina:location.pathname});else if(f.matches('[data-busca]'))ev('busca_home',{origem:'enviar'})},true);var bu=d.querySelector('[data-busca] input'),usou=false;if(bu)bu.addEventListener('input',function(){if(!usou&&bu.value.trim()){usou=true;ev('busca_home',{origem:'digitar'})}})})();`;

export function blocoGa4(cfg) {
  if (!ga4Ativo(cfg)) return '';
  const id = String(cfg.ga4Id).trim();
  return `
<section id="cc-banner" class="cc-banner" role="dialog" aria-modal="false" aria-labelledby="cc-t" aria-describedby="cc-d" hidden>
<h2 id="cc-t">Cookies de medição</h2>
<p id="cc-d">Usamos o Google Analytics, só se você aceitar, para saber quais calculadoras são mais usadas. Os valores que você digita nunca são enviados. <a href="/privacidade/">Política de privacidade</a>.</p>
<div class="cc-acoes"><button type="button" class="cc-aceitar">Aceitar</button><button type="button" class="cc-recusar">Recusar</button></div>
</section>
<script>${js(id)}</script>`;
}
