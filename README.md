# `@gromlab/rest-api-codegen`

**Из OpenAPI в типизированный TypeScript SDK без привязки к фреймворку и навязанной архитектуре.**

`rest-api-codegen` создаёт самодостаточный SDK: типы данных, отдельную operation-функцию для каждого endpoint, Fetch-based `HttpClient` и инструменты композиции. Подключайте весь API, небольшой доменный срез или ровно один запрос с едиными настройками transport.

Если OpenAPI ещё нет или отдельный endpoint временно описан неверно, разработку не нужно останавливать: ручные и generated operations используют один контракт и свободно работают в одном API-слое.

[Быстрый старт](./docs/ru/03_getting-started.md) · [Документация](./docs/ru/00_index.md) · [Рецепты](./docs/ru/recipes/index.md) · [Agent skill](./docs/ru/11_agent-skill.md) · [npm](https://www.npmjs.com/package/@gromlab/rest-api-codegen)

## Не «всё или ничего»

OpenAPI определяет contracts и request metadata. `HttpClient` отвечает за transport policy. Приложение само решает, какую API-поверхность дать конкретному разделу:

```text
OpenAPI JSON ───────► generated operations ─────┐
Manual TypeScript ─► manual operations ────────┤
                                                │
                         configured HttpClient ─┤
                                                │
                                                ├──► полный API-клиент
                                                ├──► доменный API-клиент
                                                └──► одна operation
```

Полный клиент, несколько доменных клиентов и точечные вызовы могут одновременно использовать один настроенный transport.

## Что отличает проект

| Возможность | Практический эффект |
| --- | --- |
| Одна operation на endpoint | Прямые imports и явные границы между разделами приложения. |
| Полное и частичные деревья | API можно собрать под задачу, не меняя generated-код. |
| Общий контракт generated и ручных operations | Интеграцию можно начать до появления OpenAPI и постепенно перевести на генерацию. |
| Временная замена отдельной operation | Ошибку спецификации можно обойти без fork и ручного редактирования output. |
| Самодостаточный generated SDK | Приложению не нужна runtime-зависимость от `@gromlab/rest-api-codegen`. |
| Один Fetch-based transport | Base URL, headers, authorization, parsing, errors, timeout, retry policy и cancellation настраиваются централизованно. |

## Быстрый взгляд

Устанавливать генератор в проект не требуется. Зафиксируйте его версию прямо в команде:

```bash
npx --yes @gromlab/rest-api-codegen@5.2.0 \
  --input ./openapi/pet-store.openapi.json \
  --output ./src/infra/pet-store-api/generated
```

Один generated SDK можно подключить на трёх уровнях:

```ts
import { createApiClient } from "./generated/create-api-client.js";
import { HttpClient } from "./generated/http-client.js";
import { getPet, listPets } from "./generated/operations/index.js";
import { operationsTree } from "./generated/operations-tree.js";

const httpClient = new HttpClient({
  baseUrl: "https://api.example.com",
});

// Весь API.
export const petStoreApi = createApiClient(httpClient, operationsTree);

// Только поверхность конкретного домена.
export const catalogApi = createApiClient(httpClient, {
  pets: {
    get: getPet,
    list: listPets,
  },
});

// Ровно один endpoint.
export const loadPet = (id: string) => getPet(httpClient, { id });
```

Фактические имена, группы и аргументы определяются вашей OpenAPI-спецификацией.

## Когда OpenAPI ещё не идеальна

| Состояние API contract | Подход |
| --- | --- |
| Есть актуальная OpenAPI | [Сгенерировать самодостаточный SDK](./docs/ru/05_generated-sdk.md). |
| OpenAPI пока нет | [Описать types и operations вручную](./docs/ru/06_manual-client.md), сохранив ту же модель композиции. |
| Один endpoint описан неверно | [Временно заменить только нужную operation](./docs/ru/07_custom-operations.md) и удалить workaround после исправления спецификации. |

Это не три разных архитектуры. Во всех сценариях остаются те же operations, `HttpClient` и `createApiClient`.

## Проверяемые гарантии

- Generated SDK компилируется в строгом режиме `NodeNext` и проверяется нативным ESM-импортом в Node.js.
- Полный, частичный и точечный варианты проходят production-сборки React + Vite.
- Tree-shaking именованных imports и operation subpaths проверяется по Rollup module graph.
- Один набор transport-контрактов проверяет и runtime пакета, и `HttpClient` из свежесгенерированного SDK.
- Новый SDK сначала создаётся во временном каталоге; при обрабатываемой ошибке прежний output сохраняется или восстанавливается.

## Осознанные границы

Проект не генерирует React hooks, TanStack Query или SWR adapters, cache layer, Axios transport и runtime-валидацию response. Эти решения остаются у приложения, а SDK не зависит от UI-фреймворка и библиотеки server state.

Текущие требования и ограничения:

- Node.js `>=24`, npm, TypeScript 5+ и ESM;
- Fetch typings (`DOM`, `DOM.Iterable` либо эквивалент);
- OpenAPI или Swagger в JSON; YAML сейчас не поддерживается;
- `operationsTree` намеренно подключает полный API graph;
- generated-каталог целиком принадлежит генератору.

## Релизы

Публикация npm-пакета и release artifacts выполняется GitHub Actions из SemVer tag. Настройка первой публикации, Trusted Publisher и порядок выпуска описаны в [инструкции для maintainers](./docs/ru/maintainers/releases.md).

## Документация

- [Документация `rest-api-codegen`](./docs/ru/00_index.md)
  - **Начало работы**
    - [Обзор проекта](./docs/ru/01_overview.md)
    - [Соглашения по именованию](./docs/ru/02_naming-conventions.md)
    - [Быстрый старт](./docs/ru/03_getting-started.md)
  - **Сценарии и устройство клиента**
    - [CLI](./docs/ru/04_cli.md)
    - [Сгенерированный SDK](./docs/ru/05_generated-sdk.md)
    - [Ручное создание API-клиента](./docs/ru/06_manual-client.md)
    - [Смешанный сценарий](./docs/ru/07_custom-operations.md)
    - [Композиция API-клиента](./docs/ru/08_client-composition.md)
    - [`HttpClient`](./docs/ru/09_http-client.md)
    - [Проектирование REST-клиента](./docs/ru/10_rest-client-engineering.md)
    - [Agent skill `rest-api-codegen-ru`](./docs/ru/11_agent-skill.md)
  - [Рецепты](./docs/ru/recipes/index.md)
    - [React + Vite](./docs/ru/recipes/react-vite/index.md)
      - [Полный API-клиент](./docs/ru/recipes/react-vite/full-client.md)
      - [Частичный доменный API-клиент](./docs/ru/recipes/react-vite/partial-client.md)
      - [Ручной клиент без OpenAPI](./docs/ru/recipes/react-vite/manual-client.md)
      - [Исправление неверно описанного endpoint](./docs/ru/recipes/react-vite/broken-endpoints.md)
      - [TanStack Query](./docs/ru/recipes/react-vite/tanstack-query.md)
      - [SWR](./docs/ru/recipes/react-vite/swr.md)
      - [JWT из `localStorage`](./docs/ru/recipes/react-vite/jwt-local-storage.md)
      - [Cookie-аутентификация](./docs/ru/recipes/react-vite/cookie-auth.md)
      - [Обновление access token](./docs/ru/recipes/react-vite/refresh-token.md)
      - [Ошибки, retry и cancellation](./docs/ru/recipes/react-vite/errors-retry-cancellation.md)
      - [Загрузка файлов и ответы не в JSON](./docs/ru/recipes/react-vite/file-upload.md)
    - [Next.js App Router](./docs/ru/recipes/nextjs/index.md)
      - [Полный API-клиент для браузера и сервера](./docs/ru/recipes/nextjs/full-client.md)
      - [Частичный API-клиент](./docs/ru/recipes/nextjs/partial-client.md)
      - [Ручной клиент без OpenAPI](./docs/ru/recipes/nextjs/manual-client.md)
      - [Исправление неверно описанного endpoint](./docs/ru/recipes/nextjs/broken-endpoints.md)
      - [TanStack Query](./docs/ru/recipes/nextjs/tanstack-query.md)
      - [SWR](./docs/ru/recipes/nextjs/swr.md)
      - [JWT из `localStorage`](./docs/ru/recipes/nextjs/jwt-local-storage.md)
      - [Cookie-аутентификация в браузере](./docs/ru/recipes/nextjs/cookie-auth.md)
      - [Cookie-аутентификация на сервере](./docs/ru/recipes/nextjs/ssr-cookie-auth.md)
    - [SDK-пакет](./docs/ru/recipes/package/index.md)
      - [Пакет в монорепозитории](./docs/ru/recipes/package/monorepo-package.md)
      - [Отдельный npm-пакет](./docs/ru/recipes/package/npm-package.md)
      - [Публичные exports и tree-shaking](./docs/ru/recipes/package/exports-tree-shaking.md)
      - [Generated-пакет с ручными исправлениями](./docs/ru/recipes/package/generated-with-corrections.md)
      - [Воспроизводимая генерация в CI](./docs/ru/recipes/package/generation-ci.md)
  - [Для maintainers](./docs/ru/maintainers/index.md)
    - [Архитектура проекта](./docs/ru/maintainers/architecture.md)
    - [Тестирование и contract suites](./docs/ru/maintainers/testing.md)
    - [Выпуск релиза](./docs/ru/maintainers/releases.md)

## Лицензия

[MIT](./LICENSE)
