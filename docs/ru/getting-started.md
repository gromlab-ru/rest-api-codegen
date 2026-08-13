# Быстрый старт

Базовый сценарий генерирует SDK прямо внутри приложения, создаёт общий transport и собирает полный типизированный API-клиент. Вынесение SDK в отдельный пакет является рекомендацией, но не требованием.

## Требования

- Node.js `>=24`.
- npm.
- TypeScript 5+ и ESM.
- Fetch typings (`DOM`, `DOM.Iterable` либо эквивалент).
- OpenAPI-спецификация в JSON.

## Установка

```bash
npm install --save-dev @gromlab/rest-api-codegen
```

Храните генератор в `devDependencies` и lockfile. Не полагайтесь на случайную глобальную или `latest`-версию.

## Генерация SDK

Добавьте script в `package.json`:

```json
{
  "scripts": {
    "generate:api": "rest-api-codegen --input ./openapi/openapi.json --output ./src/infra/pet-api/generated"
  }
}
```

Запустите:

```bash
npm run generate:api
```

Получится следующая структура:

```text
src/infra/pet-api/
├── generated/
│   ├── operations/
│   ├── create-api-client.ts
│   ├── data-contracts.ts
│   ├── http-client.ts
│   ├── index.ts
│   └── operations-tree.ts
├── client.ts
└── rest-api.ts
```

`generated` целиком принадлежит генератору и заменяется при успешной регенерации. Ручной код хранится рядом, но не внутри него.

## Общий transport

Создайте `src/infra/pet-api/client.ts`:

```ts
import { HttpClient } from "./generated/http-client.js";

export const petHttpClient = new HttpClient({
  baseUrl: "https://api.example.com",
});
```

В этом модуле настраиваются общий base URL, credentials, authorization interceptors, error handling и custom Fetch. Один transport можно использовать для полного клиента, нескольких частичных клиентов и точечных operations.

## Полный API-клиент

Создайте `src/infra/pet-api/rest-api.ts`:

```ts
import { createApiClient } from "./generated/create-api-client.js";
import { operationsTree } from "./generated/operations-tree.js";
import { petHttpClient } from "./client.js";

export const petRestApi = createApiClient(
  petHttpClient,
  operationsTree,
);
```

Теперь operation вызывается как обычный метод. В примере используются имена из тестовой OpenAPI-спецификации:

```ts
import { petRestApi } from "./infra/pet-api/rest-api.js";

export async function loadPet(id: string) {
  return petRestApi.pets.getPet({ id, verbose: true });
}
```

Импорт `rest-api.ts` подключает полное `operationsTree`. Это удобно для общего infra-слоя, но не всегда подходит lazy chunks и изолированным доменам большого приложения.

## Следующие шаги

- [Композиция API-клиента](./client-composition.md) — когда выбирать полный, частичный или точечный уровень.
- [SDK внутри приложения](./recipes/local-sdk.md) — рекомендуемая структура React/Vite-проекта.
- [SDK как отдельный пакет](./recipes/sdk-package.md) — workspace и npm package.
- [`HttpClient`](./http-client.md) — transport, interceptors и cancellation.
