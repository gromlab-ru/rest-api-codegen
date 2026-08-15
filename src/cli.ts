#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { clearLine, cursorTo } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { validateConfig, type GeneratorConfig } from './config.js';
import {
  generate,
  type GenerationPhase,
  type GenerationProgress,
  type GenerationResult,
} from './generator.js';
import { fileExists } from './utils/file.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

const program = new Command();

const PHASE_LABELS: Record<GenerationPhase, string> = {
  load: 'Загрузка OpenAPI',
  analyze: 'Анализ схемы',
  contracts: 'Контракты и runtime',
  operations: 'Генерация операций',
  indexes: 'Индексы и дерево операций',
};

function formatDuration(durationMs: number): string {
  return `${(durationMs / 1000).toFixed(durationMs >= 10_000 ? 1 : 2)} с`;
}

function formatProgress(progress: GenerationProgress): string {
  const label = PHASE_LABELS[progress.phase];
  if (progress.current !== undefined && progress.total === undefined) {
    return `${label} (${progress.current} операций)`;
  }
  if (progress.current === undefined || progress.total === undefined || progress.total === 0) {
    return label;
  }

  const ratio = Math.min(progress.current / progress.total, 1);
  const width = 24;
  const completedWidth = Math.round(ratio * width);
  const bar = `${'='.repeat(completedWidth)}${'-'.repeat(width - completedWidth)}`;
  return `${label} [${bar}] ${Math.round(ratio * 100)}% (${progress.current}/${progress.total})`;
}

function createProgressReporter(): {
  report: (progress: GenerationProgress) => void;
  finish: () => void;
} {
  const isTTY = Boolean(process.stdout.isTTY);
  let activePhase: GenerationPhase | undefined;
  let lastRenderedAt = 0;
  let lastNonTtyPercent = -1;
  let hasRenderedTTYLine = false;

  const finish = (): void => {
    if (isTTY && hasRenderedTTYLine) {
      clearLine(process.stdout, 0);
      cursorTo(process.stdout, 0);
      hasRenderedTTYLine = false;
    }
  };

  return {
    report: (progress) => {
      const phaseChanged = progress.phase !== activePhase;
      activePhase = progress.phase;

      if (isTTY) {
        const now = Date.now();
        const isComplete = progress.current !== undefined && progress.current === progress.total;
        if (!phaseChanged && !isComplete && now - lastRenderedAt < 80) {
          return;
        }

        clearLine(process.stdout, 0);
        cursorTo(process.stdout, 0);
        process.stdout.write(chalk.cyan(formatProgress(progress)));
        hasRenderedTTYLine = true;
        lastRenderedAt = now;
        return;
      }

      if (phaseChanged) {
        lastNonTtyPercent = -1;
        console.log(`${PHASE_LABELS[progress.phase]}...`);
      }

      if (progress.current !== undefined && progress.total) {
        const percent = Math.round(progress.current / progress.total * 100);
        const bucket = Math.floor(percent / 25) * 25;
        if (percent === 100 || bucket > lastNonTtyPercent) {
          console.log(`${PHASE_LABELS[progress.phase]}: ${percent}% (${progress.current}/${progress.total})`);
          lastNonTtyPercent = bucket;
        }
      }
    },
    finish,
  };
}

function formatTimingSummary(result: GenerationResult): string {
  return (Object.keys(PHASE_LABELS) as GenerationPhase[])
    .map((phase) => {
      const label = PHASE_LABELS[phase];
      return `${label.charAt(0).toLowerCase()}${label.slice(1)} ${formatDuration(result.timings[phase])}`;
    })
    .join(', ');
}

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
    const progress = createProgressReporter();

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

      const result = await generate(config as GeneratorConfig, { onProgress: progress.report });
      progress.finish();

      console.log(chalk.green('\nREST SDK успешно сгенерирован.'));
      console.log(
        `${result.operationCount} операций, ${result.modelCount} моделей, ` +
          `${result.fileCount} файлов за ${formatDuration(result.durationMs)}.`,
      );
      console.log(chalk.dim(result.outputPath));
      console.log(chalk.dim(`Этапы: ${formatTimingSummary(result)}.\n`));
    } catch (error) {
      progress.finish();
      console.error(chalk.red('\nОшибка:'), error instanceof Error ? error.message : error);
      console.error();
      process.exitCode = 1;
    }
  });

await program.parseAsync();
