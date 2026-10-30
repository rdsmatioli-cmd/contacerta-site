// Empregador em Dia: tira os módulos do caminho crítico (QA B-PR42-09). ui.js (e config, motor, orcamento-textos,
// questionario) só é pedido depois do load. Com as flags OFF, a página já vem com o aviso "em preparação" no HTML.
(() => {
  const s = document.currentScript;
  const ir = () => import(s.dataset.ui);
  if (document.readyState === 'complete') ir(); else addEventListener('load', ir, { once: true });
})();
