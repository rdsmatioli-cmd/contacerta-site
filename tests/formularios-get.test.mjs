// Opção A (Diretor Jurídico, 16/10): lista-de-espera, imc e idade sem envio de campos (nada na URL).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
for (const p of ['lista-de-espera', 'imc', 'idade']) {
  const html = readFileSync(new URL(`../${p}/index.html`, import.meta.url), 'utf8');
  const forms = html.match(/<form\b[^]*?<\/form>/gi) || [];
  test(`${p}: nenhum campo com name, botão de envio desabilitado, aviso de indisponível`, () => {
    assert.ok(forms.length >= 1);
    for (const f of forms) {
      assert.equal((f.match(/<(input|select|textarea|button)\b[^>]*\sname=/gi) || []).length, 0);
      assert.doesNotMatch(f, /<input[^>]*type="(submit|image)"/i);
      const subs = f.match(/<button\b(?![^>]*type="button")[^>]*>/gi) || [];
      assert.deepEqual(subs, ['<button type="submit" disabled>']);
      assert.match(f, /<button type="submit" disabled>Temporariamente indisponível<\/button>/);
    }
  });
}
