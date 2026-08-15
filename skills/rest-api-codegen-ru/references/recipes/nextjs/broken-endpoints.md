# Исправление неверно описанного метода в Next.js

Исправленная операция хранится за пределами сгенерированного каталога. Одно дерево операций используется клиентскими и серверными компонентами, поэтому способ вызова API остаётся одинаковым.

## Структура

```text
src/
└── infra/
    └── pet-store-api/
        ├── generated/
        ├── custom-operations/
        │   └── get-pet-corrected.ts
        ├── http-client.ts
        ├── server-http-client.ts
        ├── operations-tree.ts
        ├── api.ts
        └── server-api.ts
```

## Исправленная операция

`custom-operations/get-pet-corrected.ts`:

```ts
import type {
  ApiRequestClient,
  RequestParams,
} from "../generated/http-client.js";

export interface CorrectPet {
  id: string;
  displayName: string;
}

export const getPetCorrected = (
  http: ApiRequestClient,
  input: { id: string },
  params: RequestParams = {},
) => http.request<CorrectPet>({
  path: `/pets/${encodeURIComponent(input.id)}`,
  method: "GET",
  format: "json",
  ...params,
  secure: true,
});
```

Операция использует типы из сгенерированного клиента. Не подключайте для неё вторую реализацию `HttpClient` из `@gromlab/rest-api-codegen`.

## Исправленное дерево операций

`operations-tree.ts`:

```ts
import { operationsTree as generatedOperationsTree } from "./generated/operations-tree.js";
import { getPetCorrected } from "./custom-operations/get-pet-corrected.js";

export const operationsTree = {
  ...generatedOperationsTree,
  pets: {
    ...generatedOperationsTree.pets,
    getPet: getPetCorrected,
  },
};
```

## Клиенты для браузера и сервера

`api.ts` привязывает исправленное дерево к браузерному `HttpClient`:

```ts
import "client-only";

import { createApiClient } from "./generated/create-api-client.js";
import { httpClient } from "./http-client.js";
import { operationsTree } from "./operations-tree.js";

export const petStoreApi = createApiClient(
  httpClient,
  operationsTree,
);
```

`server-api.ts` использует то же дерево и серверный `HttpClient`:

```ts
import "server-only";

import { createApiClient } from "./generated/create-api-client.js";
import { operationsTree } from "./operations-tree.js";
import { serverHttpClient } from "./server-http-client.js";

export const petStoreServerApi = createApiClient(
  serverHttpClient,
  operationsTree,
);
```

Код приложения продолжает вызывать привычные методы:

```ts
const browserPet = await petStoreApi.pets.getPet({ id: "a/b" });
const serverPet = await petStoreServerApi.pets.getPet({ id: "a/b" });
```

## Частичный клиент и отдельный вызов

Частичный клиент явно выбирает исправленную операцию:

```ts
const catalogApi = createApiClient(httpClient, {
  pets: {
    get: getPetCorrected,
  },
});
```

Хук TanStack Query или SWR импортирует `getPetCorrected` вместо неверной сгенерированной операции. На сервере отдельный хук не нужен: компонент вызывает исправленный метод клиента напрямую.

## Серверный компонент с авторизацией

Если метод использует cookie текущего пользователя, создайте `HttpClient` по [рецепту серверной авторизации](./ssr-cookie-auth.md) и передайте ему то же исправленное дерево. Не записывайте пользовательские cookie в общий `serverHttpClient`.

После исправления OpenAPI верните сгенерированную `getPet` в полное и частичные деревья, замените прямые импорты и удалите ручной файл. Исправление внутри отдельного пакета описано в разделе [Пакет](../package/generated-with-corrections.md).
