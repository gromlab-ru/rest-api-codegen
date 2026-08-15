# Ручной API-клиент в React + Vite

Если OpenAPI ещё нет, типы и запросы можно описать вручную. Приложение устанавливает пакет, создаёт функции запросов и объединяет их в привычный API-клиент через `createApiClient`.

## Установка

```bash
npm install @gromlab/rest-api-codegen
```

Пакет нужен во время работы приложения, потому что из него импортируются `HttpClient` и `createApiClient`.

## Структура

```text
src/
└── infra/
    └── pet-store-api/
        ├── operations/
        │   ├── get-pet.ts
        │   ├── read-note.ts
        │   └── index.ts
        ├── data-contracts.ts
        ├── http-client.ts
        ├── operations-tree.ts
        └── api.ts
```

Имена повторяют структуру сгенерированного клиента, чтобы позже заменить ручные файлы без изменений в остальном приложении.

## Типы данных

`data-contracts.ts`:

```ts
export interface Pet {
  id: string;
  name: string;
}

export interface ApiProblem {
  message: string;
}
```

## Операции

`operations/get-pet.ts`:

```ts
import type {
  ApiRequestClient,
  RequestParams,
} from "@gromlab/rest-api-codegen";
import type { ApiProblem, Pet } from "../data-contracts.js";

export const getPet = (
  http: ApiRequestClient,
  input: { id: string },
  params: RequestParams = {},
) => http.request<Pet, ApiProblem>({
  path: `/pets/${encodeURIComponent(input.id)}`,
  method: "GET",
  format: "json",
  ...params,
  secure: true,
});
```

`operations/read-note.ts`:

```ts
import type {
  ApiRequestClient,
  RequestParams,
} from "@gromlab/rest-api-codegen";
import type { ApiProblem } from "../data-contracts.js";

export const readNote = (
  http: ApiRequestClient,
  input: { id: number },
  params: RequestParams = {},
) => http.request<string, ApiProblem>({
  path: `/notes/${input.id}`,
  method: "GET",
  format: "text",
  ...params,
  secure: true,
});
```

`operations/index.ts`:

```ts
export { getPet } from "./get-pet.js";
export { readNote } from "./read-note.js";
```

Операция всегда принимает `HttpClient` первым аргументом. После привязки через `createApiClient` остальные аргументы и тип результата сохраняются.

## Настройка `HttpClient`

`http-client.ts`:

```ts
import { HttpClient } from "@gromlab/rest-api-codegen";

const baseUrl = import.meta.env.VITE_PET_STORE_API_URL;

if (!baseUrl) {
  throw new Error("Не задан VITE_PET_STORE_API_URL");
}

export const httpClient = new HttpClient({
  baseUrl,
});
```

## Полный API-клиент

`operations-tree.ts`:

```ts
import { getPet, readNote } from "./operations/index.js";

export const operationsTree = {
  pets: {
    getPet,
  },
  notes: {
    readNote,
  },
};
```

`api.ts`:

```ts
import { createApiClient } from "@gromlab/rest-api-codegen";
import { httpClient } from "./http-client.js";
import { operationsTree } from "./operations-tree.js";

export const petStoreApi = createApiClient(
  httpClient,
  operationsTree,
);
```

Код приложения остаётся минимальным:

```ts
import { petStoreApi } from "./api.js";

const pet = await petStoreApi.pets.getPet({ id: "42" });
const note = await petStoreApi.notes.readNote({ id: 7 });
```

## Частичный и точечный способы

Те же ручные операции можно объединить в небольшое дерево для отдельного раздела приложения:

```ts
import { createApiClient } from "@gromlab/rest-api-codegen";
import { httpClient } from "./http-client.js";
import { getPet } from "./operations/get-pet.js";

const petsApi = createApiClient(httpClient, {
  pets: {
    get: getPet,
  },
});

const pet = await petsApi.pets.get({ id: "42" });
```

Или вызвать напрямую:

```ts
import { httpClient } from "./http-client.js";
import { getPet } from "./operations/get-pet.js";

const pet = await getPet(httpClient, { id: "42" });
```

Когда появится актуальная OpenAPI, замените ручные операции сгенерированными через [CLI](../../cli.md). Настройки `HttpClient`, структура клиентов и вызовы в приложении могут остаться прежними.
