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
├── 00_index.md
├── 01_overview.md
├── 02_naming-conventions.md
├── 03_getting-started.md
├── 04_cli.md
├── 05_generated-sdk.md
├── 06_manual-client.md
├── 07_custom-operations.md
├── 08_client-composition.md
├── 09_http-client.md
├── maintainers/
│   ├── index.md
│   ├── architecture.md
│   └── testing.md
└── recipes/
    ├── index.md
    ├── package/
    │   ├── index.md
    │   ├── npm-package.md
    │   ├── monorepo-package.md
    │   ├── exports-tree-shaking.md
    │   ├── generated-with-corrections.md
    │   └── generation-ci.md
    ├── react-vite/
    │   ├── index.md
    │   ├── full-client.md
    │   ├── partial-client.md
    │   ├── manual-client.md
    │   ├── broken-endpoints.md
    │   ├── tanstack-query.md
    │   ├── swr.md
    │   ├── jwt-local-storage.md
    │   ├── cookie-auth.md
    │   ├── refresh-token.md
    │   ├── errors-retry-cancellation.md
    │   └── file-upload.md
    └── nextjs/
        ├── index.md
        ├── full-client.md
        ├── partial-client.md
        ├── manual-client.md
        ├── broken-endpoints.md
        ├── tanstack-query.md
        ├── swr.md
        ├── jwt-local-storage.md
        ├── cookie-auth.md
        └── ssr-cookie-auth.md
```

### Обязательные рецепты

1. Пакет рабочего пространства и отдельный npm-пакет.
2. Публичные точки входа, tree-shaking и `sideEffects: false`.
3. Автоматически сгенерированный пакет с ручными исправлениями.
4. Воспроизводимая генерация пакета в CI.
5. Локальная генерация, ручной API и исправление неверных методов в React + Vite.
6. Локальная генерация, ручной API и исправление неверных методов в Next.js.
7. Полный и частичный API-клиенты в React + Vite и Next.js.
8. Отдельные операции в TanStack Query и SWR для обоих вариантов.
9. Клиентский компонент с `POST` и серверный компонент с `GET` в Next.js App Router.
10. JWT из `localStorage` и cookie-аутентификация в браузере для обоих вариантов.
11. Cookie-аутентификация на сервере Next.js с отдельным API-клиентом для каждого запроса.
12. Обновление токена с объединением одновременных попыток и ограниченным повтором.
13. Загрузка файлов, ошибки, повтор запросов, тайм-аут и отмена.

Ручные исправления никогда не размещаются внутри сгенерированного каталога. Исправленная операция использует публичные типы клиента и заменяет ошибочную операцию при сборке дерева.

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
