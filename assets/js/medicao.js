// Ponte de medição (spec a8b6ef52, E-03): só calculo_concluido e cta_click, sempre via lcmTrack,
// que descarta tudo antes do aceite. Nenhum valor digitado, query string ou fragmento sai daqui.
(function () {
  var d = document;
  function t(n, p) { if (window.lcmTrack) window.lcmTrack(n, p); }
  d.addEventListener('cc:calculo-concluido', function (e) {
    var f = e.target; if (f && f.getAttribute) t('calculo_concluido', { calculadora: f.getAttribute('data-calc') });
  });
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a.topo-cta,a.nav-cta,a[rel~="sponsored"]');
    if (!a || a.closest('#lcm-consent')) return;
    try { var u = new URL(a.getAttribute('href'), location.href); t('cta_click', { destino: u.origin === location.origin ? u.pathname : u.hostname }); } catch (x) {}
  });
})();

// Foco com o aviso de cookies aberto (CC-SITE-09 e CC-SITE-10), do lado do site: o componente assets/lcm-consent.js fica
// sem alteração (ac527630, tests/nr1-m01.test.mjs). Este arquivo já é a ponte do site com ele e vem logo depois dele.
// - WCAG 2.4.11: o aviso é fixo embaixo e ocupa até metade da tela. Aberto, o body ganha embaixo o espaço que ele ocupa
//   mais 16 px, e o elemento que recebe o foco fora dele e ficaria atrás dele sobe até 16 px acima (rolagem 'instant': o
//   html tem scroll-behavior:smooth). Uma rolagem suave do navegador ainda em curso (Tab rápido) pode mover a página de
//   novo: até 1 s depois do foco, quando a rolagem para, a conferência se repete. Com o botão do mouse apertado não rola:
//   a página andaria entre o mousedown e o mouseup, e o clique se perderia. Fechado, o espaço sai.
// - WCAG 2.4.3: ao fechar (Aceitar, Recusar ou Esc), se o foco estava no aviso ou caiu no body, ele volta para quem abriu
//   o aviso ("Preferências de cookies", no rodapé) ou, se a escolha veio do teclado, para o último elemento focado fora
//   dele (no toque, devolver o foco a um campo reabriria o teclado virtual).
(function () {
  var d = document, w = window, FOLGA = 16, JANELA = 1000;
  var aviso = null, aberto = false, abridor = null, ultimoFora = null, apertado = false, teclado = false;
  var vigiado = null, prazo = 0, espera = 0;
  var cap = { capture: true, passive: true };
  w.addEventListener('pointerdown', function () { apertado = true; teclado = false; }, cap);
  w.addEventListener('pointerup', function () { apertado = false; }, cap);
  w.addEventListener('pointercancel', function () { apertado = false; }, cap);
  w.addEventListener('keydown', function () { apertado = false; teclado = true; }, cap);
  function visivel() { return !!aviso && !aviso.hidden && aviso.isConnected; }
  function espaco() {
    if (visivel()) d.body.style.paddingBottom = Math.ceil(d.documentElement.clientHeight - aviso.getBoundingClientRect().top + FOLGA) + 'px';
  }
  // Sobe o elemento até 16 px acima do aviso, sem levar o topo dele para baixo do cabeçalho fixo (scroll-padding-top): o
  // que é mais alto que o espaço livre fica com o topo logo abaixo do cabeçalho.
  function desencobrir(el) {
    var a = aviso.getBoundingClientRect(), r = el.getBoundingClientRect();
    if (r.bottom <= a.top || r.right <= a.left || r.left >= a.right || (!r.width && !r.height)) return;
    var sobe = r.bottom - a.top + FOLGA;
    var limite = r.top - (parseFloat(getComputedStyle(d.documentElement).scrollPaddingTop) || 0);
    if (sobe > limite) sobe = Math.max(limite, 0);
    if (sobe > 0) w.scrollBy({ top: sobe, left: 0, behavior: 'instant' });
  }
  function aoFocar(e) {
    var el = e.target;
    if (!visivel() || !el || !el.getBoundingClientRect || el === d.body || aviso.contains(el)) return;
    ultimoFora = el;
    vigiado = null;
    if (apertado) return;
    vigiado = el; prazo = Date.now() + JANELA;
    desencobrir(el);
  }
  function aoRolar() {
    if (!vigiado) return;
    clearTimeout(espera);
    espera = setTimeout(function () {
      var el = vigiado;
      if (!el || Date.now() > prazo + 200) { vigiado = null; return; }
      if (visivel() && d.activeElement === el && !apertado) desencobrir(el);
    }, 80);
  }
  function mudou() {
    if (visivel() === aberto) return;
    aberto = visivel();
    if (aberto) {
      espaco();
      d.addEventListener('focusin', aoFocar);
      w.addEventListener('scroll', aoRolar, { passive: true });
      w.addEventListener('resize', espaco);
      return;
    }
    d.body.style.paddingBottom = '';
    d.removeEventListener('focusin', aoFocar);
    w.removeEventListener('scroll', aoRolar, { passive: true });
    w.removeEventListener('resize', espaco);
    clearTimeout(espera); vigiado = null;
    var foco = d.activeElement, alvo = abridor || (teclado ? ultimoFora : null);
    abridor = null; ultimoFora = null;
    if (alvo && alvo.isConnected && (!foco || foco === d.body || aviso.contains(foco))) alvo.focus();
  }
  function ligar(el) {
    aviso = el;
    new MutationObserver(mudou).observe(aviso, { attributes: true, attributeFilter: ['hidden'] });
    if (w.ResizeObserver) new ResizeObserver(espaco).observe(aviso);
    mudou();
  }
  // Quem abre pelo rodapé recebe o foco de volta. Captura: roda antes do clique do componente, que leva o foco a Aceitar.
  d.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-lcm-consent-abrir]');
    if (b) abridor = b;
  }, true);
  // O componente põe o aviso no fim do body só quando precisa (primeira visita ou reabertura pelo rodapé).
  var achado = d.getElementById('lcm-consent');
  if (achado) ligar(achado);
  else if (d.body) {
    var obs = new MutationObserver(function () {
      var el = d.getElementById('lcm-consent');
      if (el) { obs.disconnect(); ligar(el); }
    });
    obs.observe(d.body, { childList: true });
  }
})();
