# Исправление неверно описанного метода в React + Vite

Если один метод API описан неверно, сгенерированный файл не редактируют. Вместо этого приложение создаёт исправленную операцию рядом и подставляет её в своё дерево API.

Так можно временно исправить путь, HTTP-метод, авторизацию, тип запроса или ответа, а также добавить отсутствующий метод.

## Структура

```text
src/
└── infra/
    └── pet-store-api/
        ├── generated/
        ├── custom-operations/
        │   └── get-pet-corrected.ts
        ├── http-client.ts
        ├── operations-tree.ts
        └── api.ts
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

Типы `HttpClient` импортируются из сгенерированного клиента. Так обычные и исправленные операции используют один контракт `ApiRequestClient` и один класс `ApiError`.

## Полный клиент

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

`api.ts`:

```ts
import { createApiClient } from "./generated/create-api-client.js";
import { httpClient } from "./http-client.js";
import { operationsTree } from "./operations-tree.js";

export const petStoreApi = createApiClient(
  httpClient,
  operationsTree,
);
```

Приложение продолжает вызывать прежний метод:

```ts
import { petStoreApi } from "./api.js";

const pet = await petStoreApi.pets.getPet({ id: "a/b" });
```

## Частичный клиент

Раздел приложения может не импортировать полное дерево:

```ts
import { createApiClient } from "../../infra/pet-store-api/generated/create-api-client.js";
import { readNote } from "../../infra/pet-store-api/generated/operations/read-note.js";
import { getPetCorrected } from "../../infra/pet-store-api/custom-operations/get-pet-corrected.js";
import { httpClient } from "../../infra/pet-store-api/http-client.js";

export const catalogApi = createApiClient(httpClient, {
  pets: {
    get: getPetCorrected,
  },
  notes: {
    get: readNote,
  },
});
```

## TanStack Query и SWR

Хук импортирует исправленную операцию вместо сгенерированного файла с ошибкой:

```ts
const queryFn = ({ signal }: { signal: AbortSignal }) => getPetCorrected(
  httpClient,
  { id: "a/b" },
  { signal },
);
```

После исправления OpenAPI замените `getPetCorrected` на сгенерированную `getPet`. Ключ кеша, имена методов приложения и настройки `HttpClient` можно сохранить.

## Удаление временного исправления

1. Обновите OpenAPI и запустите генерацию заново.
2. Проверьте путь, HTTP-метод, параметры и тип ответа.
3. Верните сгенерированную операцию в дерево приложения.
4. Замените импорты в частичных клиентах и хуках.
5. Удалите ручную операцию и тесты временного исправления.

Исправление внутри отдельного пакета описано в разделе [Пакет](../package/generated-with-corrections.md).
