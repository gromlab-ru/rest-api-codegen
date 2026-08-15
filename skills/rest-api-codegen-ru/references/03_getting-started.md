# Быстрый старт

Перед началом выберите сценарий по состоянию API contract:

- если есть актуальная OpenAPI, начните с автоматической генерации;
- если OpenAPI пока нет, создайте API вручную на runtime primitives пакета;
- если generated SDK уже используется, но отдельный endpoint описан неверно и спецификацию пока нельзя исправить, примените временный смешанный сценарий.

Это не выбор формы прикладного API. В каждом сценарии доступны полный API-клиент, частичный API-клиент и точечные operations. Способ выбирается отдельно для конкретного consumer по разделу [композиции](./08_client-composition.md).

Подробные критерии и матрица сочетаний приведены в [обзоре](./01_overview.md).

Имена файлов и exports в примерах следуют [соглашениям по именованию](./02_naming-conventions.md).

## Требования

- Node.js `>=24`.
- npm.
- TypeScript 5+ и ESM.
- Fetch typings (`DOM`, `DOM.Iterable` либо эквивалент).
- Для автоматической генерации: OpenAPI-спецификация в JSON.

## Сценарий 1: автоматический

Этот вариант обычно предпочтителен, если спецификация актуальна и является источником истины для API.

### Генерация SDK

Устанавливать генератор в проект не требуется. Запустите зафиксированную версию через `npx`:

```bash
npx --yes @gromlab/rest-api-codegen@5.2.0 \
  --input ./openapi/pet-store.openapi.json \
  --output ./src/infra/pet-store-api/generated
```

Для повторных запусков добавьте npm script:

```json
{
  "scripts": {
    "generate:pet-store-api": "npx --yes @gromlab/rest-api-codegen@5.2.0 --input ./openapi/pet-store.openapi.json --output ./src/infra/pet-store-api/generated"
  }
}
```

```bash
npm run generate:pet-store-api
```

Версия в команде является частью контракта генерации. Не используйте незафиксированный `latest` для committed output и CI.

Получится следующая структура:

```text
src/infra/pet-store-api/
├── generated/
│   ├── operations/
│   ├── create-api-client.ts
│   ├── data-contracts.ts
│   ├── http-client.ts
│   ├── index.ts
│   └── operations-tree.ts
├── http-client.ts
└── api.ts
```

`generated` целиком принадлежит генератору и заменяется при успешной регенерации. Ручной код хранится рядом, но не внутри него.

### Общий transport

Создайте `src/infra/pet-store-api/http-client.ts`:

```ts
import { HttpClient } from "./generated/http-client.js";

export const httpClient = new HttpClient({
  baseUrl: "https://api.example.com",
});
```

Generated SDK содержит собственные runtime primitives и не зависит от установленного `@gromlab/rest-api-codegen`.

### Полный API-клиент

Создайте `src/infra/pet-store-api/api.ts`:

```ts
import { createApiClient } from "./generated/create-api-client.js";
import { operationsTree } from "./generated/operations-tree.js";
import { httpClient } from "./http-client.js";

export const petStoreApi = createApiClient(
  httpClient,
  operationsTree,
);
```

Теперь operation вызывается как обычный метод. В примере используются имена из тестовой OpenAPI-спецификации:

```ts
import { petStoreApi } from "./infra/pet-store-api/api.js";

export async function loadPet(id: string) {
  return petStoreApi.pets.getPet({ id, verbose: true });
}
```

Импорт `api.ts` подключает полное `operationsTree`. Для lazy chunks и отдельных доменов используйте частичный клиент или прямой import operation.

## Сценарий 2: ручной

Этот вариант позволяет не блокировать разработку интеграции ожиданием спецификации. Ручные operations следуют generated-контракту и позже заменяются автоматически созданными implementations.

### Установка runtime primitives

Ручной код импортирует `HttpClient` и `createApiClient` во время выполнения, поэтому пакет устанавливается в обычные dependencies:

```bash
npm install @gromlab/rest-api-codegen
```

### Ручная operation

```ts
import type {
  ApiRequestClient,
  RequestParams,
} from "@gromlab/rest-api-codegen";

export interface Pet {
  id: string;
  name: string;
}

export const getPet = (
  http: ApiRequestClient,
  input: { id: string; verbose?: boolean },
  params: RequestParams = {},
) =>
  http.request<Pet>({
    path: `/pets/${encodeURIComponent(input.id)}`,
    method: "GET",
    query: { verbose: input.verbose },
    format: "json",
    ...params,
  });
```

Это тот же контракт, который использует generated operation: transport передаётся первым аргументом, а настройки конкретного request - последним.

### Transport и API-клиент

```ts
import {
  HttpClient,
  createApiClient,
} from "@gromlab/rest-api-codegen";
import { getPet } from "./operations/get-pet.js";

export const httpClient = new HttpClient({
  baseUrl: "https://api.example.com",
});

export const petStoreApi = createApiClient(httpClient, {
  pets: {
    getPet,
  },
});
```

```ts
const pet = await petStoreApi.pets.getPet({ id: "42", verbose: true });
```

Полный пример структуры, частичных клиентов, прямых вызовов и последующей замены на generated SDK приведён в разделе [ручного создания API-клиента](./06_manual-client.md).

## Сценарий 3: смешанный

Не переводите весь API на ручной сценарий из-за одного ошибочного endpoint и не редактируйте output генератора. Временно напишите исправленную operation рядом с SDK и подмените нужный leaf в прикладном дереве. После исправления OpenAPI удалите ручную замену. Подробности: [смешанный сценарий](./07_custom-operations.md).

## Следующие шаги

- [Сгенерированный SDK](./05_generated-sdk.md) - состав generated output.
- [Ручное создание API-клиента](./06_manual-client.md) - API без OpenAPI.
- [Композиция API-клиента](./08_client-composition.md) - полный, частичный и точечный уровни.
- [`HttpClient`](./09_http-client.md) - transport, interceptors и cancellation.
