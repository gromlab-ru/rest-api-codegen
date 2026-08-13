# Обзор проекта

## Назначение

`@gromlab/rest-api-codegen` — ESM-пакет и CLI для генерации framework-agnostic TypeScript REST SDK из OpenAPI JSON.

На каждый endpoint создаётся отдельная типизированная operation-функция. SDK также содержит модели данных, Fetch-based `HttpClient`, дерево всех operations и `createApiClient` для привязки дерева к transport.

Обычно приложение один раз настраивает экземпляр `HttpClient`, а затем использует его в трёх формах:

- полный клиент для общего infra-слоя;
- частичный клиент из выбранных operations для отдельного домена;
- точечная operation для hook, lazy chunk или небольшого adapter.

## Основные свойства

- Один фиксированный формат SDK без режимов генерации.
- Отдельный файл на каждую operation.
- Полный, частичный и точечный уровни использования одного SDK.
- Собственный Fetch-based transport внутри generated SDK.
- Interceptors `onRequest`, `onResponse`, `onError`.
- Управляемые retry, timeout, `AbortSignal` и cancel tokens.
- ESM-совместимые `.js` specifiers в generated TypeScript.
- Staged-замена output-каталога с backup и rollback при перехваченной ошибке.
- Проверяемый production tree-shaking выбранных operations в Vite.

## Что не генерируется

Проект намеренно не создаёт:

- React hooks;
- SWR и React Query adapters;
- Axios transport;
- GraphQL client;
- cache, query и mutation слой;
- runtime-валидацию response по OpenAPI schema.

React, Vue, серверные frameworks и библиотеки управления состоянием используют обычные operations и `HttpClient` поверх своего lifecycle.

## Три публичные поверхности

### CLI

CLI читает локальную JSON-спецификацию или HTTP(S)-URL и записывает SDK в указанный каталог. Программный `generate()` не экспортируется из публичного entry point пакета.

### Generated SDK

Generated SDK самодостаточен: он содержит transport, operations и типы и не импортирует runtime-код из `@gromlab/rest-api-codegen`.

Его можно хранить в выделенном каталоге приложения, workspace-пакете монорепозитория или отдельном npm-пакете. Это решение не меняет модель использования клиента, а влияет только на import paths и жизненный цикл SDK.

### Runtime primitives пакета

Корень `@gromlab/rest-api-codegen` экспортирует `HttpClient`, `createApiClient` и связанные типы. Их можно использовать для полностью ручного REST API без code generation.

Не смешивайте без необходимости одноимённые primitives npm-пакета и generated SDK. Для дополнения generated SDK импортируйте primitives из самого SDK; для полностью ручного API — из `@gromlab/rest-api-codegen`.

## Поддерживаемая среда

- Node.js 24 или новее для запуска генератора.
- npm как package manager проекта.
- TypeScript 5+ и ESM.
- Fetch typings (`DOM`, `DOM.Iterable` либо эквивалент).
- OpenAPI или Swagger в JSON.

YAML input сейчас не поддерживается. Полная совместимость со всеми конструкциями OpenAPI 3.1, Swagger 2, external `$ref`, discriminators и произвольными media types не заявляется без отдельных контрактных тестов.

## Следующие шаги

1. Выполните [быстрый старт](./getting-started.md).
2. Выберите уровень API в разделе [композиции клиента](./client-composition.md).
3. Настройте transport по справочнику [`HttpClient`](./http-client.md).
4. Перейдите к [рецептам](./recipes/index.md) для конкретной интеграции.
