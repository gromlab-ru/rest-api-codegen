# Обзор проекта

## Назначение

`@gromlab/rest-api-codegen` предоставляет CLI и runtime primitives для создания framework-agnostic TypeScript-клиентов REST API.

CLI создаёт по OpenAPI JSON самодостаточный SDK: модели данных, отдельную operation-функцию на каждый endpoint, Fetch-based `HttpClient`, полное дерево операций и `createApiClient`. Те же runtime primitives доступны из npm-пакета, поэтому API с идентичной архитектурой можно сначала описать вручную, а позже заменить generated-кодом.

## Термины

### SDK

Набор сгенерированных артефактов: contracts, operations, `HttpClient`, `operationsTree` и `createApiClient`. SDK может быть обычным каталогом приложения, workspace-пакетом или отдельным npm-пакетом.

### Transport

Настроенный экземпляр `HttpClient`, который отвечает за URL, headers, serialization, Fetch, interceptors, errors и cancellation.

### Operation

Типизированная функция одного endpoint. Первым аргументом она принимает совместимый `ApiRequestClient`, а остальными - входные данные endpoint и необязательные параметры конкретного запроса.

### API-клиент

Полное или частичное дерево operations, привязанное к transport через `createApiClient`. После привязки transport не нужно передавать в каждый вызов вручную.

## Два независимых решения

Сначала определите, откуда берутся types и operations. Затем для каждого consumer решите, сколько operations ему действительно нужно.

```text
Источник operations

OpenAPI ──────────────► generated SDK ───────────────┐
Ручное описание ──────► manual operations ──────────┼──► operations
Generated + correction ─► временное mixed tree ─────┘         │
                                                               ├──► полный API-клиент
                                                               ├──► частичный API-клиент
                                                               └──► точечная operation
```

Эти решения не зависят друг от друга. Например, generated operation можно вызвать напрямую, а из ручных operations можно собрать полный API-клиент.

## Как выбрать сценарий

Ориентируйтесь на состояние API contract:

```text
Есть актуальная OpenAPI?
    │
    ├── нет ─────────────────────────► ручной сценарий
    │
    └── да
        │
        ├── endpoints описаны верно ─► автоматический сценарий
        │
        └── отдельный endpoint неверен,
            а spec пока нельзя исправить
                                      └─► временный смешанный сценарий
```

| Сценарий | Выбирайте, когда | Что получает приложение |
| --- | --- | --- |
| [Автоматический](./05_generated-sdk.md) | OpenAPI доступна и является источником истины | Самодостаточный generated SDK |
| [Ручной](./06_manual-client.md) | OpenAPI ещё нет, но интеграцию уже нужно разрабатывать | Runtime primitives пакета и написанные приложением types и operations |
| [Смешанный](./07_custom-operations.md) | Generated SDK можно обновить, но отдельную ошибку спецификации пока нельзя исправить | Generated SDK с временной ручной подменой |

Автоматический сценарий обычно требует меньше ручной поддержки. Ручной сценарий позволяет начать раньше и сохранить тот же operation contract. Смешанный не следует выбирать как постоянную альтернативу исправлению OpenAPI: после обновления спецификации workaround удаляется.

## Как выбрать способ использования

Выбор делается для конкретного module, domain или chunk, а не один раз для всего приложения:

```text
Что нужно текущему consumer?
    │
    ├── весь или почти весь API ─────► полный API-клиент
    ├── связанная группа operations ─► частичный API-клиент
    └── один endpoint ───────────────► точечная operation
```

| Способ | Подходит, когда | Компромисс |
| --- | --- | --- |
| Полный API-клиент | Нужна единая общая точка доступа или значительная часть API | Подключается всё переданное дерево operations |
| Частичный API-клиент | У домена своя ограниченная API-поверхность или lazy chunk | Дерево нужно собрать явно, зато import graph остаётся ограниченным |
| Точечная operation | Hook, fetcher или adapter использует один endpoint | Самая строгая граница import graph, но без общего method tree |

Количество operations является ориентиром, а не жёстким правилом. Важнее границы consumer и production chunks. Одно приложение может одновременно иметь полный общий клиент, частичные клиенты доменов и точечные calls поверх одного configured `HttpClient`.

Подробности и примеры: [композиция API-клиента](./08_client-composition.md).

## Матрица сочетаний

| Сценарий | Полный API-клиент | Частичный API-клиент | Точечная operation |
| --- | --- | --- | --- |
| Автоматический | `createApiClient(http, operationsTree)` | Выбранные generated operations | Прямой import одного generated-файла |
| Ручной | Полное дерево ручных operations | Доменное дерево ручных operations | Прямой вызов ручной operation |
| Смешанный | Generated tree с временно заменённым leaf | Generated и ручные operations в одном доменном дереве | Прямой вызов временной исправленной operation |

## Основные свойства

- Один operation на файл в generated SDK.
- Единый operation contract для generated и ручного кода.
- Полный, частичный и точечный способы использования.
- Fetch-based `HttpClient` с interceptors `onRequest`, `onResponse`, `onError`.
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

## Публичные поверхности пакета

### CLI

CLI читает локальную JSON-спецификацию или HTTP(S)-URL и записывает SDK в указанный каталог. Основной способ запуска - `npx` с явно указанной версией пакета. Программный `generate()` не экспортируется из public entry point.

### Runtime primitives

Корень `@gromlab/rest-api-codegen` экспортирует `HttpClient`, `createApiClient`, `ApiError` и связанные типы. Они нужны для ручного API-клиента, когда generated SDK отсутствует.

Generated SDK содержит собственную копию тех же primitives. Для generated и смешанного сценариев импортируйте transport и типы из generated SDK, чтобы не создавать два runtime и две identity класса `ApiError`.

## Поддерживаемая среда

- Node.js 24 или новее.
- npm.
- TypeScript 5+ и ESM.
- Fetch typings (`DOM`, `DOM.Iterable` либо эквивалент).
- Для CLI: OpenAPI или Swagger в JSON.

YAML input сейчас не поддерживается. Полная совместимость со всеми конструкциями OpenAPI 3.1, Swagger 2, external `$ref`, discriminators и произвольными media types не заявляется без отдельных контрактных тестов.

## Следующие шаги

1. Выберите сценарий по таблице выше.
2. Ознакомьтесь с [соглашениями по именованию](./02_naming-conventions.md).
3. Выполните [быстрый старт](./03_getting-started.md) или откройте профильное руководство выбранного сценария.
4. Выберите способ подключения в разделе [композиции клиента](./08_client-composition.md).
5. Настройте transport по справочнику [`HttpClient`](./09_http-client.md).
6. Перейдите к [рецептам](./recipes/index.md) для конкретной интеграции.
