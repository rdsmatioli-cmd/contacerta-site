/*! lcm-consent.js v1.1.0 - aviso de cookies + GA4 com Consent Mode v2 em modo BLOQUEADO.
 * Regra do CEO (15/10/2026) e parecer 99f570a9 / minuta 0b5e6a6b (via art. 33, VIII): NENHUMA
 * requisicao ao Google antes das DUAS autorizacoes (medicao E transferencia).
 * - Antes das duas: nao cria gtag, nao injeta gtag.js, nao grava cookie, descarta eventos.
 * - "Aceitar medicao" sem a caixa de transferencia NAO carrega o GA4.
 * - As duas verdadeiras: consent default (tudo denied) + update analytics_storage=granted
 *   (ad_* sempre denied), Google Signals e personalizacao de anuncios desligados,
 *   page_location sem query nem fragmento, e so entao injeta https://www.googletagmanager.com/gtag/js.
 * - Recusar nao exige caixa: grava as duas como falsas, apaga cookies _ga*, desliga o GA.
 * - Escolha (as duas decisoes, data e versao) no localStorage por 183 dias. Versao diferente
 *   (AVISO-COOKIES-1.0 incluso) ou formato antigo sem as duas booleans: pergunta de novo.
 * Sem dependencias externas. Configuracao por data-* na propria tag <script>:
 *   data-ga4="G-XXXXXXX"            (obrigatorio para medir; vazio = nao mostra e nada carrega)
 *   data-marca="Conta Certa"
 *   data-controlador="RODRIGO DE SIMONE MATIOLI LTDA (CNPJ 61.193.879/0001-20)"
 *   data-politica="/privacidade/"   (URL da politica)
 *   data-politica-rotulo="Política de Privacidade"  (texto do link, antes de " — " e da versao)
 *   data-secao="a seção 8 da Política de Privacidade"
 *     (complemento de "conforme " na caixa de transferencia; inclui o artigo "a" ou "o")
 *   data-versao="AVISO-COOKIES-1.1" (versao do texto; mudar forca nova pergunta)
 *   data-validade-dias="183"
 *   data-chave="lcm-consent"
 *   data-chaves-legadas="cc-consent-v1"
 */
(function (root) {
  'use strict';

  var VERSAO_PADRAO = 'AVISO-COOKIES-1.1';
  var SECAO_PADRAO = 'a seção 8 da Política de Privacidade';
  var ROTULO_PADRAO = 'Política de Privacidade';
  var CONTROLADOR_PADRAO = 'RODRIGO DE SIMONE MATIOLI LTDA (CNPJ 61.193.879/0001-20)';
  var NOTA_ACEITE = 'A medição só começa com as duas autorizações: marque a caixa de transferência acima e clique de novo em Aceitar medição. Se não quiser autorizar a transferência, clique em Recusar. Recusar não exige caixa marcada, e o site continua disponível.';

  function textoCorpo(marca, controlador) {
    return marca + ', operada por ' + controlador + ', quer usar cookies do Google Analytics, fornecido pelo Google, para medir de forma agregada como o site é usado. Esses dados podem ser tratados pelo Google fora do Brasil. Os cookies só são ativados se você clicar em Aceitar; se recusar, o site funciona normalmente. Não usamos cookies de publicidade. Você pode mudar sua escolha a qualquer momento em "Preferências de cookies", no rodapé. Saiba mais na ';
  }

  function textoTransferencia(secao) {
    return 'Autorizo especificamente a transferência dos dados de medição do Google Analytics 4 para os Estados Unidos e outros países onde o Google e seus suboperadores operam, conforme ' + secao + '. Sei que posso retirar esta autorização a qualquer momento em Preferências de cookies, sem perder o acesso ao site.';
  }

  function registrar(medicao, transferencia, versao, em) {
    var m = medicao === true;
    var t = transferencia === true;
    return {
      v: m && t ? 'aceito' : (!m && !t ? 'recusado' : 'parcial'),
      medicao: m,
      transferencia: t,
      em: em,
      versao: versao
    };
  }

  function normalizarEscolha(bruto, opt) {
    opt = opt || {};
    var versao = opt.versao;
    var validade = opt.validadeDias == null ? 183 : opt.validadeDias;
    var agora = opt.agora == null ? Date.now() : opt.agora;
    if (!bruto || typeof bruto !== 'object') return null;
    if (bruto.versao !== versao) return null;
    if (bruto.medicao !== true && bruto.medicao !== false) return null;
    if (bruto.transferencia !== true && bruto.transferencia !== false) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(bruto.em || '')) return null;
    var t0 = new Date(bruto.em + 'T00:00:00').getTime();
    if (!isFinite(t0)) return null;
    var idade = (agora - t0) / 864e5;
    if (!(idade >= 0) || idade > validade) return null;
    return registrar(bruto.medicao, bruto.transferencia, bruto.versao, bruto.em);
  }

  function podeCarregar(escolha) {
    return !!(escolha && escolha.medicao === true && escolha.transferencia === true);
  }

  var api = {
    VERSAO_PADRAO: VERSAO_PADRAO,
    SECAO_PADRAO: SECAO_PADRAO,
    textoCorpo: textoCorpo,
    textoTransferencia: textoTransferencia,
    registrar: registrar,
    normalizarEscolha: normalizarEscolha,
    podeCarregar: podeCarregar,
    NOTA_ACEITE: NOTA_ACEITE
  };
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (!root || !root.document) return;

  var w = root, d = root.document;
  var me = d.currentScript || d.querySelector('script[data-ga4]');
  function cfg(n, padrao) { var v = me && me.getAttribute('data-' + n); return v === null || v === undefined || v === '' ? padrao : v; }
  var ID = cfg('ga4', '');
  var MARCA = cfg('marca', 'Este site');
  var POLITICA = cfg('politica', '/privacidade/');
  var ROTULO = cfg('politica-rotulo', ROTULO_PADRAO);
  var SECAO = cfg('secao', SECAO_PADRAO);
  var VERSAO = cfg('versao', VERSAO_PADRAO);
  var VALIDADE = parseInt(cfg('validade-dias', '183'), 10) || 183;
  var CONTROLADOR = cfg('controlador', CONTROLADOR_PADRAO);
  var CHAVE = cfg('chave', 'lcm-consent');
  var LEGADAS = cfg('chaves-legadas', '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  var GTAG_SRC = 'https://www.googletagmanager.com/gtag/js?id=';

  var EVENTOS = cfg('eventos', 'generate_lead,sign_up,trial_start,calculo_concluido,cta_click,lista_espera_envio,simulacao_iniciada,cadastro_envio,dossie_gerado').split(',');
  var PARAMS = cfg('params', 'form_id,method,plano,calculadora,destino,perfil,motivo_categoria,origem,area').split(',');
  var PII = [/@/, /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/, /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/, /\+?\d[\d\s().-]{8,}\d/];

  var carregado = false;
  var opcoesLeitura = { versao: VERSAO, validadeDias: VALIDADE };

  function hoje() { var t = new Date(); return t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2); }
  function ler() {
    try {
      LEGADAS.forEach(function (k) { if (k !== CHAVE) w.localStorage.removeItem(k); });
      var raw = w.localStorage.getItem(CHAVE); if (!raw) return null;
      return normalizarEscolha(JSON.parse(raw), opcoesLeitura);
    } catch (e) { return null; }
  }
  function gravar(medicao, transferencia) {
    try { w.localStorage.setItem(CHAVE, JSON.stringify(registrar(medicao, transferencia, VERSAO, hoje()))); } catch (e) {}
  }

  function limparUrl(u) { try { var x = new URL(u, root.location.href); return x.origin + x.pathname; } catch (e) { return ''; } }
  function apagarCookiesGa() {
    var host = root.location.hostname.replace(/^www\./, ''), partes = host.split('.'), dominios = ['', host, '.' + host];
    for (var i = 1; i < partes.length - 1; i++) dominios.push('.' + partes.slice(i).join('.'));
    d.cookie.split(';').forEach(function (c) {
      var n = c.split('=')[0].trim();
      if (/^_ga/.test(n) || /^_gid$/.test(n) || /^_gat/.test(n)) {
        dominios.forEach(function (dm) { d.cookie = n + '=; Max-Age=0; path=/' + (dm ? '; domain=' + dm : ''); });
      }
    });
  }
  function avisar(estado) { try { d.dispatchEvent(new CustomEvent('lcm-consent', { detail: { estado: estado } })); } catch (e) {} }

  function carregarGa() {
    if (!podeCarregar(ler()) || !/^G-[A-Z0-9]{4,16}$/.test(ID)) return;
    w['ga-disable-' + ID] = false;
    if (carregado) {
      if (w.gtag) w.gtag('consent', 'update', { analytics_storage: 'granted' });
      return;
    }
    carregado = true;
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
      page_location: limparUrl(root.location.href),
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

  function track(nome, params) {
    var o = ler();
    if (!podeCarregar(o) || !carregado || !w.gtag) return false;
    if (EVENTOS.indexOf(nome) < 0) return false;
    var limpo = {};
    Object.keys(params || {}).forEach(function (k) {
      if (PARAMS.indexOf(k) < 0) return;
      var v = String(params[k]);
      if (k === 'destino') v = v.split('?')[0].split('#')[0];
      if (v.length > 100 || PII.some(function (r) { return r.test(v); })) return;
      limpo[k] = v;
    });
    limpo.page_location = limparUrl(root.location.href);
    w.gtag('event', nome, limpo);
    return true;
  }

  var banner = null, caixaTransf = null, caixaMed = null, nota = null, prefs = null;
  function el(tag, attrs, txt) { var e = d.createElement(tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (txt) e.textContent = txt; return e; }
  function montar() {
    if (banner) return banner;
    banner = el('section', { 'class': 'lcmc', role: 'region', 'aria-label': 'Aviso de cookies', id: 'lcm-consent' });
    banner.hidden = true;
    var h = el('h2', { id: 'lcmc-titulo' }, 'Cookies de medição');
    var p = el('p', { id: 'lcmc-texto' });
    p.appendChild(d.createTextNode(textoCorpo(MARCA, CONTROLADOR)));
    var a = el('a', { href: POLITICA }, ROTULO + ' — ' + VERSAO);
    p.appendChild(a); p.appendChild(d.createTextNode('.'));

    var destaque = el('div', { 'class': 'lcmc-destaque' });
    var labT = el('label', { 'class': 'lcmc-opcao' });
    caixaTransf = el('input', { type: 'checkbox', 'data-lcmc-transferencia': '' });
    labT.appendChild(caixaTransf);
    labT.appendChild(el('span', {}, textoTransferencia(SECAO)));
    destaque.appendChild(labT);

    nota = el('p', { id: 'lcmc-nota', 'class': 'lcmc-nota', role: 'status', 'aria-live': 'polite' });
    nota.hidden = true;
    nota.tabIndex = -1;

    var acoes = el('div', { 'class': 'lcmc-acoes' });
    var ok = el('button', { type: 'button', 'class': 'lcmc-btn', 'data-lcmc': 'aceitar' }, 'Aceitar medição');
    var no = el('button', { type: 'button', 'class': 'lcmc-btn', 'data-lcmc': 'recusar' }, 'Recusar');
    acoes.appendChild(ok); acoes.appendChild(no);
    var configurar = el('button', { type: 'button', 'class': 'lcmc-btn lcmc-config', 'data-lcmc': 'configurar' }, 'Configurar preferências');

    prefs = el('div', { 'class': 'lcmc-prefs', id: 'lcmc-prefs' });
    prefs.hidden = true;
    var labM = el('label', { 'class': 'lcmc-opcao' });
    caixaMed = el('input', { type: 'checkbox', 'data-lcmc-medicao': '' });
    labM.appendChild(caixaMed);
    labM.appendChild(el('span', {}, 'Medição de audiência (GA4)'));
    var acoesPrefs = el('div', { 'class': 'lcmc-acoes' });
    acoesPrefs.appendChild(el('button', { type: 'button', 'class': 'lcmc-btn', 'data-lcmc': 'salvar' }, 'Salvar preferências'));
    acoesPrefs.appendChild(el('button', { type: 'button', 'class': 'lcmc-btn', 'data-lcmc': 'recusar-medicao' }, 'Recusar medição'));
    prefs.appendChild(labM);
    prefs.appendChild(acoesPrefs);

    var scroll = el('div', { 'class': 'lcmc-scroll' });
    scroll.appendChild(h); scroll.appendChild(p); scroll.appendChild(destaque); scroll.appendChild(nota); scroll.appendChild(prefs);
    var fixo = el('div', { 'class': 'lcmc-fixo' });
    fixo.appendChild(acoes); fixo.appendChild(configurar);
    banner.appendChild(scroll); banner.appendChild(fixo);
    banner.setAttribute('aria-describedby', 'lcmc-texto');
    banner.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-lcmc]') : null; if (!b) return;
      var acao = b.getAttribute('data-lcmc');
      if (acao === 'aceitar') {
        if (!caixaTransf.checked) { mostrarNota(); return; }
        aplicar(true, true);
      } else if (acao === 'recusar' || acao === 'recusar-medicao') {
        aplicar(false, false);
      } else if (acao === 'configurar') {
        nota.hidden = true;
        prefs.hidden = false;
        if (caixaMed) caixaMed.focus({ preventScroll: true });
      } else if (acao === 'salvar') {
        aplicar(caixaMed.checked === true, caixaTransf.checked === true);
      }
    });
    banner.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ler()) fechar(); });
    (d.body || d.documentElement).appendChild(banner);
    return banner;
  }
  function mostrarNota() {
    nota.hidden = false;
    nota.textContent = NOTA_ACEITE;
    nota.focus({ preventScroll: true });
  }
  function aplicar(medicao, transferencia) {
    gravar(medicao, transferencia);
    nota.hidden = true;
    var o = ler();
    fechar();
    if (podeCarregar(o)) { carregarGa(); avisar('aceito'); }
    else { desligarGa(); avisar(o ? o.v : 'recusado'); }
  }
  function sincronizarCaixas() {
    var o = ler();
    if (caixaTransf) caixaTransf.checked = !!(o && o.transferencia);
    if (caixaMed) caixaMed.checked = !!(o && o.medicao);
  }
  function abrir(foco) {
    var b = montar();
    if (prefs) prefs.hidden = true;
    if (nota) nota.hidden = true;
    sincronizarCaixas();
    b.hidden = false;
    if (foco) { var btn = b.querySelector('[data-lcmc="aceitar"]'); btn && btn.focus({ preventScroll: true }); }
  }
  function fechar() { if (banner) banner.hidden = true; }

  function iniciar() {
    if (!ID) return;
    var o = ler();
    if (podeCarregar(o)) carregarGa();
    else if (o) apagarCookiesGa();
    else abrir(false);
    d.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-lcm-consent-abrir],[data-lcm-evento]') : null; if (!t) return;
      if (t.hasAttribute('data-lcm-consent-abrir')) { e.preventDefault(); abrir(true); return; }
      var ps = {}; Array.prototype.forEach.call(t.attributes, function (at) { var m = at.name.match(/^data-lcm-param-(.+)$/); if (m) ps[m[1].replace(/-/g, '_')] = at.value; });
      track(t.getAttribute('data-lcm-evento'), ps);
    });
  }
  w.lcmConsent = {
    abrir: function () { abrir(true); },
    estado: function () { var o = ler(); return o ? o.v : null; },
    track: track,
    versao: '1.1.0',
    podeCarregar: function () { return podeCarregar(ler()); }
  };
  w.lcmTrack = track;
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})(typeof window !== 'undefined' ? window : globalThis);
