// Empregador em Dia: textos e destino do formulário /empregador-em-dia/orcamento-nr1/ (PR próprio, CPO OK, 28/10).
// O aviso LGPD do Advogado (textos-juridicos/aviso-lgpd-orcamento-nr1.md, MINUTA v3, sha256 17510609b25282c4...)
// já está no HTML, literal, acima do botão Enviar (gerado por tests/_src/empregador/gerar.mjs).
// Placeholders que ainda chegam (tudo entre colchetes):
// Copy do Designer (v4, copy-orcamento-nr1.md, sha256 407baa4a7e699f5f...; aguarda DE ACORDO do Advogado) já está
// no HTML. O aviso LGPD do Advogado prevalece sobre o aviso v2 citado na copy.
//   [TEXTO DO DESIGNER: ...]  -> mensagens de sucesso e de erro (a copy v4 não traz)
//   [ED-ORCAMENTO: ...]       -> action e ids "entry.N" do Google Form dedicado ED-Orcamento (CPO: conta Google
//                                existente; o form é criado fora deste PR). NÃO é o CC-Leads.
// Trava: com FLAGS.ED_CHECKOUT ON, conferirOrcamento() lança erro enquanto houver placeholder
// (tests/empregador.test.mjs). Sem a flag, o form não tem action real nem name nos campos: nada é enviado.
import { FLAGS } from './config.js?v=04a97dcdba';
import { placeholdersAbertos } from './questionario.js?v=40c21a0564';

export const AVISO_VERSAO = 'aviso-orcamento-nr1-v3-20261028';

export const ED_ORCAMENTO = {
  action: '[ED-ORCAMENTO: ACTION DO GOOGLE FORM]',
  campos: {
    nome: '[ED-ORCAMENTO: ENTRY NOME]',
    email: '[ED-ORCAMENTO: ENTRY E-MAIL]',
    telefone: '[ED-ORCAMENTO: ENTRY TELEFONE]',
    empresa: '[ED-ORCAMENTO: ENTRY EMPRESA]',
    cnpj: '[ED-ORCAMENTO: ENTRY CNPJ]',
    faixa: '[ED-ORCAMENTO: ENTRY FAIXA DE FUNCIONÁRIOS]',
    novidades: '[ED-ORCAMENTO: ENTRY NOVIDADES]',
    avisoVersao: '[ED-ORCAMENTO: ENTRY VERSÃO DO AVISO]',
    enviadoEm: '[ED-ORCAMENTO: ENTRY DATA E HORA DO ENVIO]',
  },
};

export const TEXTOS_ORCAMENTO = {
  sucesso: '[TEXTO DO DESIGNER: MENSAGEM DE SUCESSO]',
  erro: '[TEXTO DO DESIGNER: MENSAGEM DE ERRO]',
};

export function conferirOrcamento(t = TEXTOS_ORCAMENTO, destino = ED_ORCAMENTO, flags = FLAGS) {
  const achados = placeholdersAbertos(JSON.stringify([t, destino]));
  if (flags.ED_CHECKOUT && achados.length) throw new Error(`placeholder em aberto: ${achados.join(', ')}`);
  return achados;
}
