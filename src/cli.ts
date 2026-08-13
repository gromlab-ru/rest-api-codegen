#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateConfig, type GeneratorConfig } from './config.js';
import { generate } from './generator.js';
import { fileExists } from './utils/file.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

const program = new Command();

const translateCommanderError = (message: string): string => {
  return message
    .replace(/^error:/, 'ошибка:')
    .replace('unknown option', 'неизвестная опция')
    .replace('too many arguments', 'слишком много аргументов')
    .replace('option', 'опция');
};

program
  .name('rest-api-codegen')
  .configureOutput({
    writeErr: (message) => process.stderr.write(translateCommanderError(message)),
  })
  .description('Генерация TypeScript REST SDK из OpenAPI спецификации')
  .version(pkg.version)
  .option('-i, --input <path>', 'Путь к OpenAPI спецификации (JSON файл или URL)')
  .option('-o, --output <path>', 'Директория для сохранения сгенерированных файлов')
  .action(async (options) => {
    try {
      const config: Partial<GeneratorConfig> = {
        inputPath: options.input,
        outputPath: options.output,
      };

      validateConfig(config);

      if (!config.inputPath!.startsWith('http://') && !config.inputPath!.startsWith('https://')) {
        if (!(await fileExists(config.inputPath!))) {
          throw new Error(`Входной файл не найден: ${config.inputPath}`);
        }
      }

      await generate(config as GeneratorConfig);

      console.log(chalk.green('\nREST SDK успешно сгенерирован.\n'));
    } catch (error) {
      console.error(chalk.red('\nОшибка:'), error instanceof Error ? error.message : error);
      console.error();
      process.exitCode = 1;
    }
  });

await program.parseAsync();
