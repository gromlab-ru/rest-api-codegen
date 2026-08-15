# Playground

Каталог предназначен для ручной проверки изменений генератора.

1. Соберите CLI: `npm run build`.
2. Укажите путь к нужной OpenAPI JSON-спецификации напрямую.
3. Генерируйте результат в `playground/generated`:

```bash
node dist/cli.js \
  --input /path/to/openapi.json \
  --output playground/generated
```

```bash
node dist/cli.js \
  --input https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.json \
  --output playground/generated
```

`playground/generated` полностью игнорируется Git и может содержать устаревший результат прошлых ручных запусков. Перед проверкой удалите или заново сгенерируйте его. Спецификации автоматических contract tests находятся в `tests/fixtures`.
