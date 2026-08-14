# Детерминированная генерация в CI

Для воспроизводимой генерации зафиксируйте версию generator непосредственно в `npx`-команде, major Node.js и локальный JSON input.

## Scripts проекта

```json
{
  "scripts": {
    "generate:pet-store-api": "npx --yes @gromlab/rest-api-codegen@5.2.0 --input ./openapi/pet-store.openapi.json --output ./src/infra/pet-store-api/generated",
    "typecheck": "tsc --noEmit"
  }
}
```

Устанавливать `@gromlab/rest-api-codegen` в `devDependencies` только ради CLI не требуется. Точная версия в script делает обновление генератора явным и проверяемым изменением.

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
      - run: npm run generate:pet-store-api

      - name: Проверить committed generated SDK
        shell: bash
        run: |
          changes="$(git status --porcelain=v1 --untracked-files=all -- src/infra/pet-store-api/generated)"
          if [[ -n "$changes" ]]; then
            printf '%s\n' "$changes"
            exit 1
          fi

      - run: npm run typecheck
```

`npm ci` устанавливает зависимости самого consumer-проекта. Codegen при этом запускается отдельно через `npx` в версии, указанной в `generate:pet-store-api`.

`git diff --exit-code` недостаточен: он не обнаруживает новые untracked operation-файлы. `git status --porcelain --untracked-files=all` видит modified, deleted и новые files.

## Правила воспроизводимости

- Указывайте точную версию `@gromlab/rest-api-codegen` в `npx`-команде.
- Фиксируйте major Node.js, требуемый генератором.
- Используйте committed `package-lock.json` и `npm ci` для зависимостей consumer-проекта.
- `src/infra/pet-store-api/generated` должен быть tracked и не находиться в `.gitignore`, если CI проверяет committed SDK.
- Предпочитайте локальный неизменяемый JSON. URL может вернуть другой документ между builds.
- YAML не поддерживается.
- Не запускайте параллельно две генерации в один output: filesystem lock отсутствует.
- Не храните ручной код внутри output.
- Всегда проверяйте exit code генератора, даже если старый output остался на месте.

Одинаковый JSON, точная версия generator и одинаковый major Node.js дают стабильный output без timestamp. Однако перестановка полей или routes в самой спецификации может дать diff, даже если API семантически не изменился.

Для private remote specification скачивайте документ отдельным CI-шагом с контролируемыми authorization, timeout и retry, затем при необходимости проверяйте checksum и передавайте CLI локальный файл.

Если SDK компилируется в `dist`, очищайте `dist` перед `tsc`, иначе JavaScript и declarations удалённой operation могут остаться после регенерации.
