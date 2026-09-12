import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildSkills } from '../src/skills/registry.mjs';

const source = 'src/skills/rest-api-codegen-ru/SKILL.source.md';
const output = 'skills/rest-api-codegen-ru';

async function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-build-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, content) => {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  };
  const remove = (file) => fs.rmSync(path.join(root, file));
  write(source, '# Исходник\n');
  write('docs/ru/nested/reference.md', '# Документ\n');
  await buildSkills({ root });
  return { root, write, remove };
}

test('проверяет актуальную сборку без записи файлов', async (t) => {
  const { root } = await fixture(t);
  await assert.doesNotReject(() => buildSkills({ root, check: true }));
  assert.equal(fs.readFileSync(path.join(root, output, 'SKILL.md'), 'utf8'), '# Исходник\n');
});

for (const [name, change, error] of [
  ['изменение исходника', ({ write }) => write(source, '# Новый исходник\n'), /Изменён: SKILL.md/],
  ['изменение документа', ({ write }) => write('docs/ru/nested/reference.md', '# Новый документ\n'), /Изменён: references\/nested\/reference.md/],
  ['добавление документа', ({ write }) => write('docs/ru/new.md', '# Новый\n'), /Отсутствует: references\/new.md/],
  ['удаление документа', ({ remove }) => remove('docs/ru/nested/reference.md'), /Лишний файл: references\/nested\/reference.md/],
  ['лишний файл сборки', ({ write }) => write(`${output}/orphan.md`, '# Лишний\n'), /Лишний файл: orphan.md/],
  ['пропавшая точка входа', ({ remove }) => remove(`${output}/SKILL.md`), /Отсутствует: SKILL.md/],
]) {
  test(`обнаруживает устаревшую сборку: ${name}`, async (t) => {
    const context = await fixture(t);
    change(context);
    await assert.rejects(() => buildSkills({ root: context.root, check: true }), error);
    if (fs.existsSync(path.join(context.root, output, 'SKILL.md'))) {
      assert.equal(fs.readFileSync(path.join(context.root, output, 'SKILL.md'), 'utf8'), '# Исходник\n');
    }
  });
}
