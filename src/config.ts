/**
 * Конфигурация генератора API
 */
export interface GeneratorConfig {
  /** Путь к файлу OpenAPI спецификации */
  inputPath: string;
  /** Путь для сохранения сгенерированных файлов */
  outputPath: string;
}

/**
 * Валидация конфигурации генератора
 */
export function validateConfig(config: Partial<GeneratorConfig>): config is GeneratorConfig {
  const errors: string[] = [];

  if (!config.inputPath) {
    errors.push('Не указан путь к OpenAPI спецификации (--input)');
  }

  if (!config.outputPath) {
    errors.push('Не указана директория для генерации (--output)');
  }

  if (errors.length > 0) {
    throw new Error(`Ошибка конфигурации:\n${errors.map(e => `  - ${e}`).join('\n')}`);
  }

  return true;
}
