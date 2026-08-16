import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { createSandbox, fixturePath, removeSandbox, runCli } from './helpers/harness.js';

const sandboxes: string[] = [];

afterEach(async () => {
  await Promise.all(sandboxes.splice(0).map(removeSandbox));
});

describe('CLI', () => {
  test('показывает минимальный help без legacy и framework flags', async () => {
    const result = await runCli(['--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Usage: rest-api-codegen [options]');
    expect(result.stdout).toContain('--input <path>');
    expect(result.stdout).toContain('--output <path>');
    for (const removed of ['Usage: api-codegen', '--mode', '--name', '--single-file', '--swr']) {
      expect(result.stdout).not.toContain(removed);
    }
  });

  test('выводит версию package.json', async () => {
    const result = await runCli(['--version']);
    expect(result).toMatchObject({ exitCode: 0, stderr: '' });
    expect(result.stdout.trim()).toBe('5.2.4');
  });

  test('агрегирует отсутствующие input и output', async () => {
    const result = await runCli([]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Не указан путь к OpenAPI спецификации (--input)');
    expect(result.stderr).toContain('Не указана директория для генерации (--output)');
    expect(result.stdout).not.toContain('успешно');
  });

  test.each([
    ['--mode', 'single'],
    ['--name', 'LegacyApi'],
    ['-n', 'LegacyApi'],
    ['--single-file'],
    ['--swr'],
  ])('отклоняет удалённую опцию %s', async (...args) => {
    const result = await runCli(args);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('неизвестная опция');
  });

  test('сообщает о несуществующем локальном input без stack trace', async () => {
    const sandbox = await createSandbox();
    sandboxes.push(sandbox);
    const result = await runCli(['--input', join(sandbox, 'missing.json'), '--output', join(sandbox, 'generated')]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Входной файл не найден');
    expect(result.stderr).not.toContain(' at ');
  });

  test('генерирует SDK собранным CLI', async () => {
    const sandbox = await createSandbox();
    sandboxes.push(sandbox);
    const output = join(sandbox, 'generated');
    const result = await runCli(['--input', fixturePath('core.openapi.json'), '--output', output]);
    expect(result).toMatchObject({ exitCode: 0, stderr: '' });
    expect(result.stdout).toContain('Загрузка OpenAPI');
    expect(result.stdout).toContain('Генерация операций');
    expect(result.stdout).toContain('6 операций');
    expect(result.stdout).toContain('REST SDK успешно сгенерирован');
  });

});
