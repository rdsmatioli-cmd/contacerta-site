/*! lcm-consent.js v1.0.0 - aviso de cookies + GA4 com Consent Mode v2 em modo BLOQUEADO (basico).
 * Regra do CEO (15/10/2026): NENHUM script ou requisicao do Google antes do aceite.
 * - Antes do aceite: nao cria gtag, nao injeta gtag.js, nao grava cookie, descarta eventos.
 * - Aceitar: consent default (tudo denied) + update analytics_storage=granted (ad_* sempre denied),
 *   Google Signals e personalizacao de anuncios desligados, page_location sem query nem fragmento,
 *   e so entao injeta https://www.googletagmanager.com/gtag/js.
 * - Recusar: grava a escolha, apaga cookies _ga*, desliga o GA (ga-disable-ID) se ja carregado.
 * - Escolha guardada com data e versao do texto; reexibe apos 183 dias (G-05) ou se a versao mudar.
 * Sem dependencias externas. Configuracao por data-* na propria tag <script>:
 *   data-ga4="G-XXXXXXX"            (obrigatorio para medir; vazio = so mostra nada e nada carrega)
 *   data-marca="Conta Certa"        (nome do site no aviso G-01)
 *   data-politica="/privacidade/"   (URL da politica)
 *   data-versao="AVISO-COOKIES-1.0" (versao do texto; mudar forca nova pergunta)
 *   data-validade-dias="183"
 *   data-controlador="RODRIGO DE SIMONE MATIOLI LTDA (CNPJ 61.193.879/0001-20)"
 *   data-chave="lcm-consent"        (chave do localStorage)
 *   data-chaves-legadas="cc-consent-v1" (chaves antigas a remover; escolha antiga sem data e descartada)
 */
(function () {
  'use strict';
  var w = window, d = document;
  var me = d.currentScript || d.querySelector('script[data-ga4]');
  function cfg(n, padrao) { var v = me && me.getAttribute('data-' + n); return v === null || v === undefined || v === '' ? padrao : v; }
  var ID = cfg('ga4', '');
  var MARCA = cfg('marca', 'Este site');
  var POLITICA = cfg('politica', '/privacidade/');
  var VERSAO = cfg('versao', 'AVISO-COOKIES-1.0');
  var VALIDADE = parseInt(cfg('validade-dias', '183'), 10) || 183;
  var CONTROLADOR = cfg('controlador', 'RODRIGO DE SIMONE MATIOLI LTDA (CNPJ 61.193.879/0001-20)');
  var CHAVE = cfg('chave', 'lcm-consent');
  var LEGADAS = cfg('chaves-legadas', '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  var GTAG_SRC = 'https://www.googletagmanager.com/gtag/js?id=';

  // Eventos e parametros permitidos (nada de e-mail, CNPJ, valores digitados ou texto livre).
  var EVENTOS = cfg('eventos', 'generate_lead,sign_up,trial_start,calculo_concluido,cta_click,lista_espera_envio,simulacao_iniciada,cadastro_envio,dossie_gerado').split(',');
  var PARAMS = cfg('params', 'form_id,method,plano,calculadora,destino,perfil,motivo_categoria,origem,area').split(',');
  var PII = [/@/, /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/, /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/, /\+?\d[\d\s().-]{8,}\d/];

  var carregado = false;

  // ---------- armazenamento da escolha ----------
  function hoje() { var t = new Date(); return t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2); }
  function ler() {
    try {
      LEGADAS.forEach(function (k) { if (k !== CHAVE) w.localStorage.removeItem(k); });
      var raw = w.localStorage.getItem(CHAVE); if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || (o.v !== 'aceito' && o.v !== 'recusado') || !/^\d{4}-\d{2}-\d{2}$/.test(o.em || '')) return null;
      if (o.versao !== VERSAO) return null;
      var idade = (Date.now() - new Date(o.em + 'T00:00:00').getTime()) / 864e5;
      if (!(idade >= 0) || idade > VALIDADE) return null;
      return o;
    } catch (e) { return null; }
  }
  function gravar(v) { try { w.localStorage.setItem(CHAVE, JSON.stringify({ v: v, em: hoje(), versao: VERSAO })); } catch (e) {} }

  // ---------- utilitarios ----------
  function limparUrl(u) { try { var x = new URL(u, location.href); return x.origin + x.pathname; } catch (e) { return ''; } }
  function apagarCookiesGa() {
    var host = location.hostname.replace(/^www\./, ''), partes = host.split('.'), dominios = ['', host, '.' + host];
    for (var i = 1; i < partes.length - 1; i++) dominios.push('.' + partes.slice(i).join('.'));
    d.cookie.split(';').forEach(function (c) {
      var n = c.split('=')[0].trim();
      if (/^_ga/.test(n) || /^_gid$/.test(n) || /^_gat/.test(n)) {
        dominios.forEach(function (dm) { d.cookie = n + '=; Max-Age=0; path=/' + (dm ? '; domain=' + dm : ''); });
      }
    });
  }
  function avisar(estado) { try { d.dispatchEvent(new CustomEvent('lcm-consent', { detail: { estado: estado } })); } catch (e) {} }

  // ---------- carregamento condicional do GA4 (so apos o aceite) ----------
  function carregarGa() {
    if (carregado || !/^G-[A-Z0-9]{4,16}$/.test(ID)) return;
    carregado = true;
    w['ga-disable-' + ID] = false;
    w.dataLayer = w.dataLayer || [];
    w.gtag = function () { w.dataLayer.push(arguments); };
    w.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });
    w.gtag('consent', 'update', { analytics_storage: 'granted' });
    w.gtag('set', 'ads_data_redaction', true);
    w.gtag('set', 'url_passthrough', false);
    w.gtag('js', new Date());
    w.gtag('config', ID, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: limparUrl(location.href),
      page_referrer: d.referrer ? limparUrl(d.referrer) : ''
    });
    var s = d.createElement('script'); s.async = true; s.src = GTAG_SRC + encodeURIComponent(ID);
    d.head.appendChild(s);
  }
  function desligarGa() {
    if (carregado && w.gtag) { w.gtag('consent', 'update', { analytics_storage: 'denied' }); }
    if (ID) w['ga-disable-' + ID] = true;
    apagarCookiesGa();
  }

  // ---------- eventos ----------
  function track(nome, params) {
    var o = ler();
    if (!o || o.v !== 'aceito' || !carregado || !w.gtag) return false;   // antes do aceite: descarta, nao enfileira
    if (EVENTOS.indexOf(nome) < 0) return false;
    var limpo = {};
    Object.keys(params || {}).forEach(function (k) {
      if (PARAMS.indexOf(k) < 0) return;
      var v = String(params[k]);
      if (k === 'destino') v = v.split('?')[0].split('#')[0];
      if (v.length > 100 || PII.some(function (r) { return r.test(v); })) return;
      limpo[k] = v;
    });
    limpo.page_location = limparUrl(location.href);
    w.gtag('event', nome, limpo);
    return true;
  }

  // ---------- aviso ----------
  var banner = null;
  function el(tag, attrs, txt) { var e = d.createElement(tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (txt) e.textContent = txt; return e; }
  function montar() {
    if (banner) return banner;
    banner = el('section', { 'class': 'lcmc', role: 'region', 'aria-label': 'Aviso de cookies', id: 'lcm-consent' });
    banner.hidden = true;
    var h = el('h2', { id: 'lcmc-titulo' }, 'Cookies de medição');
    var p = el('p', { id: 'lcmc-texto' });
    // Texto G-01 (REVISAO_SPEC_GA4_CONSENTIMENTO_2026-10-15), com [MARCA] preenchida.
    p.appendChild(d.createTextNode(MARCA + ', operada por ' + CONTROLADOR + ', quer usar cookies do Google Analytics, fornecido pelo Google, para medir de forma agregada como o site é usado. Esses dados podem ser tratados pelo Google fora do Brasil. Os cookies só são ativados se você clicar em Aceitar; se recusar, o site funciona normalmente. Não usamos cookies de publicidade. Você pode mudar sua escolha a qualquer momento em "Preferências de cookies", no rodapé. Saiba mais na '));
    var a = el('a', { href: POLITICA }, 'Política de Privacidade'); p.appendChild(a); p.appendChild(d.createTextNode('.'));
    var acoes = el('div', { 'class': 'lcmc-acoes' });
    var ok = el('button', { type: 'button', 'class': 'lcmc-btn', 'data-lcmc': 'aceitar' }, 'Aceitar');
    var no = el('button', { type: 'button', 'class': 'lcmc-btn', 'data-lcmc': 'recusar' }, 'Recusar');
    acoes.appendChild(ok); acoes.appendChild(no);
    banner.appendChild(h); banner.appendChild(p); banner.appendChild(acoes);
    banner.setAttribute('aria-describedby', 'lcmc-texto');
    banner.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-lcmc]') : null; if (!b) return;
      if (b.getAttribute('data-lcmc') === 'aceitar') { gravar('aceito'); fechar(); carregarGa(); avisar('aceito'); }
      else { gravar('recusado'); fechar(); desligarGa(); avisar('recusado'); }
    });
    banner.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ler()) fechar(); });
    (d.body || d.documentElement).appendChild(banner);
    return banner;
  }
  function abrir(foco) { montar().hidden = false; if (foco) { var b = banner.querySelector('[data-lcmc="aceitar"]'); b && b.focus({ preventScroll: true }); } }
  function fechar() { if (banner) banner.hidden = true; }

  // ---------- inicio ----------
  function iniciar() {
    if (!ID) return;   // sem ID: nenhum aviso, nenhum script
    var o = ler();
    if (o && o.v === 'aceito') carregarGa();
    else if (o && o.v === 'recusado') apagarCookiesGa();
    else abrir(false);
    d.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-lcm-consent-abrir],[data-lcm-evento]') : null; if (!t) return;
      if (t.hasAttribute('data-lcm-consent-abrir')) { e.preventDefault(); abrir(true); return; }
      var ps = {}; Array.prototype.forEach.call(t.attributes, function (at) { var m = at.name.match(/^data-lcm-param-(.+)$/); if (m) ps[m[1].replace(/-/g, '_')] = at.value; });
      track(t.getAttribute('data-lcm-evento'), ps);
    });
  }
  w.lcmConsent = { abrir: function () { abrir(true); }, estado: function () { var o = ler(); return o ? o.v : null; }, track: track, versao: '1.0.0' };
  w.lcmTrack = track;
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
