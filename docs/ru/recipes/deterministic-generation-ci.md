# Детерминированная генерация в CI

Для воспроизводимой генерации зафиксируйте generator, lockfile, Node.js и локальный JSON input.

## Scripts проекта

```json
{
  "scripts": {
    "generate:api": "rest-api-codegen --input ./openapi/openapi.json --output ./src/generated",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@gromlab/rest-api-codegen": "5.2.0"
  }
}
```

## Проверка committed SDK в GitHub Actions

```yaml
name: Generated SDK

on:
  push:
  pull_request:

jobs:
  generated-sdk:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - run: npm ci
      - run: npm run generate:api

      - name: Проверить committed generated SDK
        shell: bash
        run: |
          changes="$(git status --porcelain=v1 --untracked-files=all -- src/generated)"
          if [[ -n "$changes" ]]; then
            printf '%s\n' "$changes"
            exit 1
          fi

      - run: npm run typecheck
```

`git diff --exit-code` недостаточен: он не обнаруживает новые untracked operation-файлы. `git status --porcelain --untracked-files=all` видит modified, deleted и новые files.

## Правила воспроизводимости

- `src/generated` должен быть tracked и не находиться в `.gitignore`.
- Используйте `npm ci` и committed `package-lock.json`.
- Фиксируйте major Node.js, требуемый генератором.
- Предпочитайте локальный неизменяемый JSON. URL может вернуть другой документ между builds.
- YAML не поддерживается.
- Не запускайте параллельно две генерации в один output: filesystem lock отсутствует.
- Не храните ручной код внутри output.
- Всегда проверяйте exit code генератора, даже если старый output остался на месте.

Одинаковый JSON и версия toolchain дают стабильный output без timestamp. Однако перестановка полей или routes в самой спецификации может дать diff, даже если API семантически не изменился.

Для private remote specification скачивайте документ отдельным CI-шагом с контролируемыми authorization, timeout и retry, затем при необходимости проверяйте checksum и передавайте CLI локальный файл.

Если SDK компилируется в `dist`, очищайте `dist` перед `tsc`, иначе JavaScript и declarations удалённой operation могут остаться после регенерации.
