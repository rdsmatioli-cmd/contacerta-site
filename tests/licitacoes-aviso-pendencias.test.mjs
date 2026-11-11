// PR-A1 (Aviso AVISO-LICITACOES-1.13, ordem CEO 11/11/2026 19h17; parecer ADV 96efcc39, item 6). Trava de merge:
// este teste FALHA enquanto licitacoes/politica.html tiver placeholder entre colchetes ([MAIÚSCULAS]) ou marcador
// PENDENTE-*. O ADV não publica o 1.13 com colchetes: A1-2, a 2ª frase do A1-5 e o [LOCAL DA CÓPIA] do A1-7 dependem
// da prova do CEO (nome, contrato ou termos e país do fornecedor da plataforma e da máquina); a última frase do A1-4
// depende da condição B-2; [DATA DA PUBLICAÇÃO] entra no commit do deploy. Só fica verde quando tudo estiver
// preenchido com literal do ADV e os marcadores tiverem saído. Não enfraquecer: é a garantia de que o PR não entra
// incompleto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ARQUIVO = 'licitacoes/politica.html';
const COLCHETE = /\[[A-ZÀ-Ý][A-ZÀ-Ý0-9 _,.\/-]*\]/g;
const MARCADOR = /PENDENTE-[A-Z0-9-]+/g;

export function pendencias(texto) {
  return texto.split('\n').flatMap((l, i) => [
    ...[...l.matchAll(COLCHETE)].map((m) => `${i + 1}: ${m[0]}`),
    ...[...l.matchAll(MARCADOR)].map((m) => `${i + 1}: ${m[0]}`),
  ]);
}

test('PR-A1: aviso do Licitações sem colchete nem marcador PENDENTE (trava de merge do 1.13)', () => {
  const achados = pendencias(readFileSync(new URL('../' + ARQUIVO, import.meta.url), 'utf8'));
  assert.deepEqual(achados, [], `${ARQUIVO} ainda tem pendência do PR-A1 (não mergear):\n${achados.join('\n')}`);
});

test('PR-A1: detector acusa colchete e marcador, ignora checkbox e minúsculas', () => {
  assert.deepEqual(pendencias('a [LOCAL DA CÓPIA] b [ ] c [x]\n<!-- PENDENTE-A1-2: x -->'), ['1: [LOCAL DA CÓPIA]', '2: PENDENTE-A1-2']);
  assert.deepEqual(pendencias('<p>Versão AVISO-LICITACOES-1.13, de 12/11/2026.</p>'), []);
});
