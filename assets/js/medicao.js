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
