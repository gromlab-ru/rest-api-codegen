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

`playground/generated` полностью игнорируется Git. Спецификации для автоматических проверок будут храниться в `tests/fixtures` после создания нового тестового набора на втором этапе.
