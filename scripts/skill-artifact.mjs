import fs from 'node:fs';
import path from 'node:path';

export function readTree(directory, prefix = '') {
  const files = new Map();
  if (!fs.existsSync(directory)) return files;
  if (!fs.lstatSync(directory).isDirectory()) {
    throw new Error(`Ожидался обычный каталог: ${directory}`);
  }
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const relativePath = path.posix.join(prefix, entry.name);
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      for (const [name, content] of readTree(filePath, relativePath)) files.set(name, content);
    } else if (entry.isFile()) {
      files.set(relativePath, fs.readFileSync(filePath));
    } else {
      throw new Error(`Ожидался обычный файл или каталог: ${filePath}`);
    }
  }
  return files;
}

export function assertCurrent(expected, directory) {
  const actual = readTree(directory);
  const differences = [];
  for (const [name, content] of expected) {
    if (!actual.has(name)) differences.push(`Отсутствует: ${name}`);
    else if (!content.equals(actual.get(name))) differences.push(`Изменён: ${name}`);
  }
  for (const name of actual.keys()) {
    if (!expected.has(name)) differences.push(`Лишний файл: ${name}`);
  }
  if (differences.length) {
    throw new Error(`Сборка skill устарела: ${directory}\n${differences.sort().join('\n')}`);
  }
}
