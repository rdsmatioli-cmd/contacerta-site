// Google Analytics 4 com consentimento via componente consent/ (lcm-consent.js, sha256 ac527630…86d0, sem alteração).
// Decisão do CEO (15/10/2026) e CP-01 a CP-07 da CONFERENCIA_GA4_PUBLICADO_2026-10-15 (sha256 1562e4ae…e43d).
// Espelha o PR #5 (b774831). O componente: nada do Google antes do aceite; G-01; escolha {v, em, versao} por 183 dias;
// allow_google_signals:false e allow_ad_personalization_signals:false; page_location sem query. Eventos (spec a8b6ef52, E-03):
// só calculo_concluido e cta_click, pela ponte src/static/assets/js/medicao.js. Só gera algo com cfg.ga4Id preenchido.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const okId = (id) => /^G-[A-Z0-9]{4,}$/.test(String(id || '').trim());
export const ga4Ativo = (cfg) => okId(cfg.ga4Id);
export const linkPreferencias = (cfg) => (ga4Ativo(cfg) ? '<button type="button" class="cc-rever" data-lcm-consent-abrir>Preferências de cookies</button>' : '');
const v = (rel) => createHash('sha256').update(readFileSync(new URL(`../static/assets/${rel}`, import.meta.url))).digest('hex').slice(0, 10);
export function headGa4(cfg) {
  if (!ga4Ativo(cfg)) return '';
  const id = String(cfg.ga4Id).trim();
  return `<link rel="stylesheet" href="/assets/lcm-consent.css?v=${v('lcm-consent.css')}">
<script src="/assets/lcm-consent.js?v=${v('lcm-consent.js')}" defer data-ga4="${id}" data-marca="${cfg.nome}" data-politica="/privacidade/" data-versao="AVISO-COOKIES-1.0" data-validade-dias="183" data-chaves-legadas="cc-consent-v1" data-eventos="calculo_concluido,cta_click" data-params="calculadora,destino"></script>
<script src="/assets/js/medicao.js?v=${v('js/medicao.js')}" defer></script>
`;
}
// O aviso agora é montado pelo componente; nada no corpo da página.
export const blocoGa4 = () => '';
