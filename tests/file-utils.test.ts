import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { fileExists, readTextFile, writeFileWithDirs } from '../src/utils/file.js';
import { createSandbox, removeSandbox } from './helpers/harness.js';

describe('file utilities', () => {
  test('создаёт родительские каталоги и читает UTF-8', async () => {
    const sandbox = await createSandbox();
    const path = join(sandbox, 'nested', 'файл.txt');

    try {
      expect(await fileExists(path)).toBe(false);
      await writeFileWithDirs(path, 'данные');
      expect(await fileExists(path)).toBe(true);
      expect(await readTextFile(path)).toBe('данные');
    } finally {
      await removeSandbox(sandbox);
    }
  });
});
