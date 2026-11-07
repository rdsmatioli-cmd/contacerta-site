// Matriz do AVISO-COOKIES-1.1: GA4 só com medição E transferência; versão 1.0 não reaproveita aceite;
// escolha fora de 183 dias ou sem as duas booleans não vale. As funções são as do assets/lcm-consent.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  VERSAO_PADRAO, SECAO_PADRAO, textoCorpo, textoTransferencia, registrar, normalizarEscolha, podeCarregar, NOTA_ACEITE,
} = require('../assets/lcm-consent.js');

const VERSAO = 'AVISO-COOKIES-1.1';
const EM = '2026-11-07';
const meiaNoite = (iso) => new Date(iso + 'T00:00:00').getTime();
const ler = (bruto, agora) => normalizarEscolha(bruto, { versao: VERSAO, validadeDias: 183, agora });

test('texto da caixa de transferência é o da minuta, com a seção 8 da Conta Certa', () => {
  assert.equal(VERSAO_PADRAO, VERSAO);
  assert.equal(SECAO_PADRAO, 'a seção 8 da Política de Privacidade');
  assert.equal(
    textoTransferencia(SECAO_PADRAO),
    'Autorizo especificamente a transferência dos dados de medição do Google Analytics 4 para os Estados Unidos e outros países onde o Google e seus suboperadores operam, conforme a seção 8 da Política de Privacidade. Sei que posso retirar esta autorização a qualquer momento em Preferências de cookies, sem perder o acesso ao site.',
  );
  assert.equal(
    textoTransferencia('o item 10 do Aviso de Privacidade'),
    'Autorizo especificamente a transferência dos dados de medição do Google Analytics 4 para os Estados Unidos e outros países onde o Google e seus suboperadores operam, conforme o item 10 do Aviso de Privacidade. Sei que posso retirar esta autorização a qualquer momento em Preferências de cookies, sem perder o acesso ao site.',
  );
});

test('corpo do aviso da Conta Certa permanece o texto atual', () => {
  assert.equal(
    textoCorpo('Conta Certa', 'RODRIGO DE SIMONE MATIOLI LTDA (CNPJ 61.193.879/0001-20)'),
    'Conta Certa, operada por RODRIGO DE SIMONE MATIOLI LTDA (CNPJ 61.193.879/0001-20), quer usar cookies do Google Analytics, fornecido pelo Google, para medir de forma agregada como o site é usado. Esses dados podem ser tratados pelo Google fora do Brasil. Os cookies só são ativados se você clicar em Aceitar; se recusar, o site funciona normalmente. Não usamos cookies de publicidade. Você pode mudar sua escolha a qualquer momento em "Preferências de cookies", no rodapé. Saiba mais na ',
  );
});

test('nota de aceite sem a caixa não esconde a recusa', () => {
  assert.match(NOTA_ACEITE, /marque a caixa de transferência/);
  assert.match(NOTA_ACEITE, /Recusar não exige caixa marcada/);
});

test('matriz: nenhuma, só uma, ou as duas', () => {
  assert.equal(podeCarregar(null), false);
  assert.equal(podeCarregar(ler(null, meiaNoite(EM))), false);
  for (const [medicao, transferencia, carrega, v] of [
    [false, false, false, 'recusado'],
    [true, false, false, 'parcial'],
    [false, true, false, 'parcial'],
    [true, true, true, 'aceito'],
  ]) {
    const bruto = registrar(medicao, transferencia, VERSAO, EM);
    const o = ler(bruto, meiaNoite(EM));
    assert.equal(bruto.v, v);
    assert.equal(o.medicao, medicao);
    assert.equal(o.transferencia, transferencia);
    assert.equal(podeCarregar(o), carrega, `${medicao}/${transferencia}`);
  }
});

test('versão 1.0, formato antigo e versão reescrita sem booleans não carregam o GA4', () => {
  const agora = meiaNoite(EM);
  assert.equal(ler({ v: 'aceito', em: EM, versao: 'AVISO-COOKIES-1.0' }, agora), null);
  assert.equal(ler({ v: 'aceito', em: EM, versao: VERSAO }, agora), null);
  assert.equal(ler({ v: 'aceito', em: EM, versao: VERSAO, medicao: true }, agora), null);
  assert.equal(ler({ v: 'aceito', em: EM, versao: VERSAO, medicao: 'true', transferencia: 'true' }, agora), null);
  const adulterado = { v: 'aceito', em: EM, versao: VERSAO, medicao: false, transferencia: false };
  assert.equal(podeCarregar(ler(adulterado, agora)), false);
});

test('validade de 183 dias e revogação', () => {
  const t0 = meiaNoite(EM);
  const dia = 864e5;
  const ambos = registrar(true, true, VERSAO, EM);
  assert.equal(podeCarregar(ler(ambos, t0 + 183 * dia)), true);
  assert.equal(ler(ambos, t0 + 183 * dia + 1), null);
  assert.equal(ler(ambos, t0 + 184 * dia), null);
  assert.equal(podeCarregar(ler(ambos, t0 + 182 * dia)), true);
  assert.equal(ler(ambos, t0 - 1), null);
  const revogado = registrar(false, false, VERSAO, EM);
  const o = ler(revogado, t0);
  assert.deepEqual(
    { v: o.v, medicao: o.medicao, transferencia: o.transferencia, em: o.em, versao: o.versao },
    { v: 'recusado', medicao: false, transferencia: false, em: EM, versao: VERSAO },
  );
  assert.equal(podeCarregar(o), false);
});
