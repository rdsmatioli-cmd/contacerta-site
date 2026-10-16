// Opção A (Diretor Jurídico, 16/10) + M-PR17-01 (Advogado): sem campos com name no HTML (nada na URL sem JS).
// imc/idade seguem o padrão NR1-M01 (data-name + botão data-requer-js disabled); lista-de-espera fica indisponível.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
for (const p of ['lista-de-espera', 'imc', 'idade']) {
  const html = readFileSync(new URL(`../${p}/index.html`, import.meta.url), 'utf8');
  const forms = html.match(/<form\b[^]*?<\/form>/gi) || [];
  test(`${p}: nenhum campo com name, único botão de envio desabilitado sem JS`, () => {
    assert.ok(forms.length >= 1);
    for (const f of forms) {
      assert.equal((f.match(/<(input|select|textarea|button)\b[^>]*\sname=/gi) || []).length, 0);
      assert.doesNotMatch(f, /<input[^>]*type="(submit|image)"/i);
      const subs = f.match(/<button\b(?![^>]*type="button")[^>]*>/gi) || [];
      if (p === 'lista-de-espera') {
        assert.deepEqual(subs, ['<button type="submit" disabled>']);
        assert.match(f, /<button type="submit" disabled>Temporariamente indisponível<\/button>/);
      } else {
        assert.deepEqual(subs, ['<button type="submit" data-requer-js disabled>']);
        assert.deepEqual([...f.matchAll(/data-name="([^"]+)"/g)].map((m) => m[1]), p === 'imc' ? ['peso', 'altura'] : ['nascimento', 'referencia']);
      }
    }
  });
}
