import { constants } from 'node:fs';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/**
 * Проверка существования файла
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Чтение файла как текст
 */
export async function readTextFile(path: string): Promise<string> {
  return await readFile(path, 'utf-8');
}

/**
 * Запись файла с автоматическим созданием директорий
 */
export async function writeFileWithDirs(path: string, content: string): Promise<void> {
  const dir = dirname(path);
  await mkdir(dir, { recursive: true });
  await writeFile(path, content, 'utf-8');
}
