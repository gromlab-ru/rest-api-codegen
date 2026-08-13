import { describe, expect, test } from 'vitest';
import { validateConfig } from '../src/config.js';

describe('validateConfig', () => {
  test('принимает только inputPath и outputPath', () => {
    const config = { inputPath: 'openapi.json', outputPath: 'generated' };
    expect(validateConfig(config)).toBe(true);
  });

  test('агрегирует отсутствующие обязательные параметры в стабильном порядке', () => {
    expect(() => validateConfig({})).toThrowError(
      'Ошибка конфигурации:\n' +
      '  - Не указан путь к OpenAPI спецификации (--input)\n' +
      '  - Не указана директория для генерации (--output)',
    );
  });

  test.each([
    [{ outputPath: 'generated' }, '--input'],
    [{ inputPath: 'openapi.json' }, '--output'],
  ])('отклоняет неполную конфигурацию %#', (config, marker) => {
    expect(() => validateConfig(config)).toThrowError(marker);
  });
});
