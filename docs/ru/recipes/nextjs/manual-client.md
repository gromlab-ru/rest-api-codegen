# Ручной API-клиент в Next.js

Если OpenAPI ещё нет, типы и запросы можно описать вручную. Одно дерево операций используется и в браузере, и на сервере, но привязывается к разным экземплярам `HttpClient`.

## Установка

```bash
npm install @gromlab/rest-api-codegen
```

Пакет нужен во время работы приложения, поэтому остаётся в обычных зависимостях.

## Структура

```text
src/
└── infra/
    └── pet-store-api/
        ├── operations/
        │   ├── create-pet.ts
        │   ├── get-pet.ts
        │   └── index.ts
        ├── data-contracts.ts
        ├── operations-tree.ts
        ├── http-client.ts
        ├── api.ts
        ├── server-http-client.ts
        └── server-api.ts
```

## Типы данных

`data-contracts.ts`:

```ts
export interface Pet {
  id: string;
  name: string;
}

export interface CreatePetInput {
  name: string;
}

export interface ApiProblem {
  message: string;
}
```

## Ручные операции

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
});
```

`operations/create-pet.ts`:

```ts
import {
  ContentType,
  type ApiRequestClient,
  type RequestParams,
} from "@gromlab/rest-api-codegen";
import type {
  ApiProblem,
  CreatePetInput,
  Pet,
} from "../data-contracts.js";

export const createPet = (
  http: ApiRequestClient,
  body: CreatePetInput,
  params: RequestParams = {},
) => http.request<Pet, ApiProblem>({
  path: "/pets",
  method: "POST",
  body,
  type: ContentType.Json,
  format: "json",
  ...params,
});
```

`operations/index.ts`:

```ts
export { createPet } from "./create-pet.js";
export { getPet } from "./get-pet.js";
```

## Дерево операций

`operations-tree.ts`:

```ts
import { createPet, getPet } from "./operations/index.js";

export const operationsTree = {
  pets: {
    createPet,
    getPet,
  },
};
```

## Клиент для браузера

`http-client.ts` использует публичный адрес API для браузера:

```ts
import "client-only";

import { HttpClient } from "@gromlab/rest-api-codegen";

const baseUrl = process.env.NEXT_PUBLIC_PET_STORE_API_URL;

if (!baseUrl) {
  throw new Error("Не задан NEXT_PUBLIC_PET_STORE_API_URL");
}

export const httpClient = new HttpClient({ baseUrl });
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

Клиентский компонент вызывает ручной метод так же, как сгенерированный:

```ts
import { petStoreApi } from "./api.js";

const createdPet = await petStoreApi.pets.createPet({ name: "Milo" });
```

## Клиент для сервера

`server-http-client.ts`:

```ts
import "server-only";

import { HttpClient } from "@gromlab/rest-api-codegen";

const baseUrl = process.env.PET_STORE_API_URL;

if (!baseUrl) {
  throw new Error("Не задан PET_STORE_API_URL");
}

export const serverHttpClient = new HttpClient({ baseUrl });
```

`server-api.ts`:

```ts
import "server-only";

import { createApiClient } from "@gromlab/rest-api-codegen";
import { operationsTree } from "./operations-tree.js";
import { serverHttpClient } from "./server-http-client.js";

export const petStoreServerApi = createApiClient(
  serverHttpClient,
  operationsTree,
);
```

Серверный компонент выполняет обычный `GET`:

```tsx
import { petStoreServerApi } from "../../infra/pet-store-api/server-api.js";

export default async function PetPage() {
  const pet = await petStoreServerApi.pets.getPet({ id: "42" });

  return <h1>{pet.name}</h1>;
}
```

## Частичный клиент и отдельная операция

Ручные операции можно объединить в дерево для отдельного раздела приложения или передать напрямую в TanStack Query и SWR:

```ts
const petsApi = createApiClient(httpClient, {
  pets: {
    get: getPet,
  },
});

const pet = await getPet(httpClient, { id: "42" });
```

Если нужны cookie текущего пользователя, общий серверный клиент заменяется клиентом из [рецепта серверной авторизации](./ssr-cookie-auth.md). После появления OpenAPI ручные операции можно заменить сгенерированными, не меняя вызовы в приложении.
