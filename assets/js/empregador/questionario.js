// Empregador em Dia: abertura do questionário de 12 fatores (P-08 v4, mockup 3e03e516 p. 2; DE ACORDO do Advogado
// 34e72bad). UI atrás de FLAGS.ED_QUIZ_12 (OFF). [PRAZO] preenchido com o texto literal do parecer 1da103db (opção A).
// [CONTATO DO ENCARREGADO] e [CANAL DA EMPRESA / CIPA] seguem em aberto: com placeholder, renderizar falha.
import { FLAGS } from './config.js?v=7827cd31ce';

export const PRAZO_RETENCAO = 'até 30 dias depois que a empresa recebe o resultado do grupo (no máximo 90 dias depois que o questionário fecha)';
export const PLACEHOLDER = /\[[^\]\n]*[A-ZÇÃÕÁÉÍÓÚ]{3,}[^\]\n]*\]/;
export const placeholdersAbertos = (txt) => [...String(txt).matchAll(new RegExp(PLACEHOLDER.source, 'g'))].map((m) => m[0]);

export function textosAbertura({ empresa, razaoSocial, encarregado = '[CONTATO DO ENCARREGADO]', canal = '[CANAL DA EMPRESA / CIPA]' }) {
  return {
    cabecalho: `Questionário confidencial · ${empresa}`,
    titulo: 'Como está o seu trabalho?',
    intro: 'São 12 perguntas sobre as condições e a organização do seu trabalho. Leva uns 3 minutos.',
    regras: [
      'Suas respostas não ficam ligadas a você: não pedimos nome, e-mail nem matrícula, não guardamos seu IP nem o horário exato, e o link é de uso único. A empresa só vê o resultado do grupo, e só se o grupo tiver 5 ou mais respostas.',
      'É voluntário: você pode parar ou pular perguntas.',
      'Participar ou não participar não traz nenhuma consequência no seu trabalho. A empresa não sabe quem respondeu.',
      'Avalia as condições de trabalho. Não é avaliação psicológica.',
    ],
    denuncia: `Este questionário não é canal de denúncia e ninguém vai investigar a partir dele. Para relatar assédio ou discriminação, use ${canal}. Você também pode procurar o Ministério Público do Trabalho (mpt.mp.br), o Disque 100 ou, em caso de violência contra a mulher, o Ligue 180. Em emergência, ligue 190.`,
    privacidade: `Quem usa estas respostas: ${razaoSocial}, para avaliar os riscos do trabalho, como exige a NR-1. A Conta Certa processa as respostas em nome da empresa. Base legal: cumprimento de obrigação legal (LGPD, art. 11, II, a), não o seu consentimento. A empresa e o contador veem apenas médias do grupo, nunca respostas individuais. As respostas individuais são apagadas ${PRAZO_RETENCAO} e só o resultado do grupo fica guardado com o inventário de riscos. Você pode pedir informações sobre seus dados em ${encarregado}. Mais detalhes em Privacidade.`,
  };
}

// Trava de produção: com a flag ON, nenhum texto pode ter colchete de placeholder.
export function conferirTextos(t, flags = FLAGS) {
  const achados = placeholdersAbertos(JSON.stringify(t));
  if (flags.ED_QUIZ_12 && achados.length) throw new Error(`placeholder em aberto: ${achados.join(', ')}`);
  return achados;
}

// S-02/S-03: aviso no fluxo normal (sem altura fixa nem overflow escondido), antes do botão Começar, com o mesmo
// corpo de letra do texto principal (.ed-q-priv, mín. 14 px em ed.css). Só monta com a flag ON.
export function renderAbertura(raiz, dados, flags = FLAGS) {
  if (!flags.ED_QUIZ_12) return false;
  const t = textosAbertura(dados);
  conferirTextos(t, flags);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; };
  const sec = el('section', 'ed-q');
  sec.append(el('p', 'ed-q-cab', t.cabecalho), el('p', 'ed-rotulo', 'Antes de começar'), el('h1', null, t.titulo), el('p', null, t.intro));
  const ul = el('ul', 'ed-lista'); t.regras.forEach((r) => ul.append(el('li', null, r))); sec.append(ul);
  sec.append(el('p', 'ed-q-priv', t.denuncia), el('p', 'ed-q-priv', t.privacidade));
  const b = el('button', 'btn', 'Começar'); b.type = 'button'; sec.append(b);
  raiz.replaceChildren(sec);
  return true;
}
