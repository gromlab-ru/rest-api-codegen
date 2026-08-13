# План подготовки `rest-api-codegen`

## Зафиксированный контракт

| Область | Решение |
| --- | --- |
| Репозиторий | `gromlab-ru/rest-api-codegen`, новая история |
| npm-пакет | `@gromlab/rest-api-codegen` |
| CLI | `rest-api-codegen` |
| Первая версия | `5.2.0` |
| Runtime | Node.js `>=24` |
| Package manager | npm |
| Формат пакета | ESM |
| Генерация | Один фиксированный формат TypeScript REST SDK |
| Transport | Fetch-based `HttpClient` |
| Runtime interceptors | Сохраняются `onRequest`, `onResponse`, `onError`, retry и cancellation |
| Framework integrations | Не генерируются SWR, React hooks, React Query, Axios, GraphQL и другие adapters |
| Документация на первом этапе | Только русская |
| Корневой пользовательский документ | `README_RU.md`; `README.md` появится вместе с английской версией |
| Русский skill | `rest-api-codegen-ru` |
| Английский skill | `rest-api-codegen`, добавляется позже |
| Playground | Только ручная генерация; результат всегда игнорируется Git |
| Тестовый стек | Vitest |

Текущие README, skills и тесты не являются источником для новых материалов. Они удаляются, а соответствующие части проекта создаются заново после стабилизации кода.

## Статус реализации

- [x] Этап 1. Очистка
- [x] Этап 2. Полностью новое покрытие тестами
- [ ] Этап 3. Полностью новая документация и skills

## Этап 1. Очистка

### Цели

1. Переименовать продукт, пакет и CLI в `rest-api-codegen`.
2. Удалить Bun и перейти на Node.js 24, npm и TypeScript compiler.
3. Удалить `single`, `mode`, `--name`, `--single-file` и весь class-based output.
4. Оставить единственную структуру SDK: contracts, Fetch transport, отдельные operations, `operationsTree` и `createApiClient`.
5. Удалить старые тесты, документацию, skills, workflows, release scripts и локальные generated artifacts.
6. Удалить неиспользуемые шаблоны и зависимости.
7. Создать минимальный `playground/` с полностью игнорируемым generated output.

### Контрольная точка

- `npm ci`, typecheck и build проходят на Node.js 24.
- Собранный CLI вручную генерирует SDK из локальной спецификации.
- В tracked-файлах нет Bun, legacy-режимов и старого имени продукта.
- Generated SDK не содержит SWR, React Query, React hooks, Axios или GraphQL adapters.
- `HttpClient` и его runtime interceptors сохранены.
- Release временно отсутствует до создания нового проверенного контура.

## Этап 2. Полностью новое покрытие тестами

### Инфраструктура

- Vitest и `@vitest/coverage-v8`.
- Новые OpenAPI fixtures без переноса старого набора.
- Локальные HTTP-серверы вместо публичных сетевых API.
- Strict consumer typecheck с помощью `tsc`.
- React/Vite consumer fixture только для автоматической проверки tree-shaking.

### Контрактные области

1. CLI: help, version, обязательные аргументы, exit codes и ошибки.
2. Явное отклонение удалённых `--mode`, `--name`, `--single-file`, `--swr`.
3. Точная структура generated SDK и детерминированная регенерация.
4. Schemas, enums, path/query/body, response types и content types.
5. Naming, reserved words, коллизии и Unicode.
6. Группировка и полнота `operationsTree`.
7. Локальный и URL input, причём URL загружается ровно один раз.
8. Корректная компиляция generated SDK и Node ESM imports.
9. Отсутствие framework-specific output.
10. Runtime `HttpClient`: headers, serializers, body formats и response parsing.
11. Interceptors, retry, timeout, signal и cancel token.
12. JWT и Cookie authentication.
13. `npm pack`, установка tarball и запуск установленного CLI.
14. Упаковка generated SDK как отдельного npm-пакета.
15. React production build и доказательство tree-shaking отдельных operations.
16. Общий transport contract для ручного и generated `HttpClient`.

### Контрольная точка

Одна команда `npm run verify` выполняет typecheck, тесты, coverage, build, consumer compilation, tree-shaking и package smoke.

## Этап 3. Полностью новая документация и skills

### Корневой документ

До английской локализации создаётся только `README_RU.md`. Он кратко объясняет назначение, преимущества, установку skill и базовое использование, но не дублирует техническую документацию.

### Структура русской документации

```text
docs/ru/
├── index.md
├── overview.md
├── getting-started.md
├── cli.md
├── architecture.md
├── generated-sdk.md
├── http-client.md
├── custom-operations.md
├── testing.md
├── release.md
└── recipes/
    ├── index.md
    ├── sdk-package.md
    ├── sdk-custom-operations.md
    ├── react-client.md
    ├── jwt-auth.md
    ├── cookie-auth.md
    ├── partial-client.md
    ├── direct-operation.md
    ├── refresh-token.md
    ├── file-upload.md
    ├── errors-and-retry.md
    └── ssr-custom-fetch.md
```

### Обязательные рецепты

1. Создание SDK как отдельного npm-пакета.
2. Добавление исправленных custom operations поверх generated SDK при ошибочной OpenAPI-документации.
3. Использование generated клиента в React без generated React hooks.
4. JWT-авторизация через `onRequest`.
5. Cookie-авторизация через `credentials: "include"`.
6. Полный, частичный и точечный клиент.
7. Refresh token с ограниченным retry.
8. File upload через `FormData`.
9. Timeout и отмена запросов.
10. SSR и `customFetch`.
11. Tree-shaking и `sideEffects: false`.
12. Детерминированная регенерация SDK в CI.

Ручные исправления никогда не размещаются внутри generated-каталога. Custom operation использует публичные primitives SDK и подменяет ошибочную operation при сборке дерева клиента.

### Skills

```text
src/skills/
├── registry.mjs
└── rest-api-codegen-ru/
    ├── SKILL.md
    └── skill.config.mjs

skills/
└── rest-api-codegen-ru/
    ├── SKILL.md
    └── references/
```

- `src/skills` является source.
- `skills/rest-api-codegen-ru` является generated и закоммиченным артефактом.
- References собираются из `docs/ru`, а не поддерживаются отдельными копиями.
- Сборка детерминирована и проверяется в CI побайтово.
- Английские `docs/en`, `README.md` и skill `rest-api-codegen` до отдельного этапа не создаются.

### CI и release

Новые workflows создаются после стабилизации тестов и документации. Они используют только Node.js 24 и npm, проверяют package tarball, generated skill, внутренние Markdown-ссылки, npm provenance и release asset `rest-api-codegen-ru.zip`.

## Будущий английский этап

После завершения русской версии:

1. Создать английскую документацию как основную.
2. Создать английский `README.md` и сохранить русский `README_RU.md`.
3. Добавить основной skill `rest-api-codegen`.
4. Переключить public landing и release materials на английский язык.

## История нового репозитория

Новый репозиторий создаётся без истории `api-codegen`. Предлагаемые смысловые commits:

1. `chore: очистить и переименовать rest-api-codegen`
2. `test: создать новый контрактный тестовый набор`
3. `docs: добавить русскую документацию и skill`
