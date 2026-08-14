# `@gromlab/rest-api-codegen`

CLI для генерации framework-agnostic TypeScript REST SDK из OpenAPI JSON.

Generated SDK содержит:

- TypeScript contracts;
- отдельную operation для каждого endpoint;
- Fetch-based `HttpClient`;
- полное `operationsTree`;
- `createApiClient` для сборки полного или частичного клиента.

Проект не генерирует React hooks, SWR/React Query adapters, Axios или GraphQL client. Приложение само выбирает framework и server-state слой.

## Требования

- Node.js `>=24`.
- npm.
- TypeScript 5+ и ESM.
- OpenAPI или Swagger в JSON. YAML не поддерживается.

## Быстрый старт

Установите генератор:

```bash
npm install --save-dev @gromlab/rest-api-codegen
```

Добавьте script:

```json
{
  "scripts": {
    "generate:api": "rest-api-codegen --input ./openapi/openapi.json --output ./src/infra/pet-api/generated"
  }
}
```

Создайте общий transport:

```ts
import { HttpClient } from "./generated/http-client.js";

export const petHttpClient = new HttpClient({
  baseUrl: "https://api.example.com",
});
```

Соберите полный API-клиент:

```ts
import { createApiClient } from "./generated/create-api-client.js";
import { operationsTree } from "./generated/operations-tree.js";
import { petHttpClient } from "./client.js";

export const petRestApi = createApiClient(
  petHttpClient,
  operationsTree,
);
```

```ts
const pet = await petRestApi.pets.getPet({ id: "42" });
```

Фактические группы, operations и аргументы определяются вашей OpenAPI-спецификацией.

## Модель использования

Один configured `HttpClient` служит общей базой для трёх уровней API:

```text
Generated SDK
    │
    ▼
Configured HttpClient
    │
    ├── operationsTree ───────────► полный клиент
    ├── выбранные operations ─────► частичный доменный клиент
    └── одна operation ───────────► hook / lazy module / adapter
```

### Полный клиент

Подходит общему infra-слою и подключает всё `operationsTree`.

### Частичный клиент

Домен большого приложения выбирает только нужные endpoints и даёт им понятные локальные имена:

```ts
import { createApiClient } from "./generated/create-api-client.js";
import { getPet, listPets } from "./generated/operations/index.js";
import { petHttpClient } from "./client.js";

export const catalogApi = createApiClient(petHttpClient, {
  pets: {
    get: getPet,
    list: listPets,
  },
} as const);
```

Production Vite/Rollup contract проверяет, что named imports из `operations` barrel не подключают остальные operations и `operationsTree`.

### Точечная operation

Hook или leaf-level lazy module может импортировать один файл:

```ts
import { getPet } from "./generated/operations/get-pet.js";
import { petHttpClient } from "./client.js";

export const getPetFetcher = (id: string) =>
  getPet(petHttpClient, { id });
```

## Где хранить SDK

- Внутри приложения — простой вариант для React/Vite и одного consumer.
- В workspace-пакете — рекомендуемый вариант для монорепозитория.
- В отдельном npm-пакете — для нескольких репозиториев и независимого версионирования API contract.

Размещение SDK не меняет модель использования. Отдельный пакет упрощает imports и скрывает generated-файлы, но не является обязательным.

## Документация

- [Обзор](./docs/ru/01_overview.md).
- [Быстрый старт](./docs/ru/03_getting-started.md).
- [CLI](./docs/ru/04_cli.md).
- [Generated SDK](./docs/ru/05_generated-sdk.md).
- [Композиция API-клиента](./docs/ru/08_client-composition.md).
- [`HttpClient`](./docs/ru/09_http-client.md).
- [Рецепты](./docs/ru/recipes/index.md).
- [Разработка и сопровождение](./docs/ru/maintainers/index.md).

## Важные ограничения

- Input разбирается как JSON; YAML не поддерживается.
- Output-каталог заменяется целиком. Не храните в нём ручной код.
- Программный `generate()` не входит в public API; используйте CLI.
- OpenAPI-типы не валидируют фактический response во время выполнения.
- `operationsTree` намеренно подключает весь API graph.

## Лицензия

MIT.
