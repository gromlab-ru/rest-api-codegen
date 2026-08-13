# Пользовательские operations

## Когда они нужны

Пользовательская operation полезна, если:

- OpenAPI описывает неверный path или HTTP method;
- schema request/response не соответствует серверу;
- не указан security marker;
- endpoint отсутствует в спецификации;
- нужен временный workaround до исправления upstream OpenAPI.

## Главное правило

Никогда не редактируйте generated-файлы и не добавляйте ручной код внутрь output. Каталог заменяется целиком при следующей успешной генерации.

```text
src/
├── generated/          # только rest-api-codegen
├── custom-operations/  # ручной код
├── client-tree.ts
└── index.ts
```

## Контракт operation

Operation — функция, принимающая совместимый `ApiRequestClient` первым аргументом:

```ts
import type {
  ApiRequestClient,
  RequestParams,
} from "@acme/pet-sdk";

export interface CorrectPet {
  id: string;
  displayName: string;
}

export interface CorrectProblem {
  message: string;
}

export const getPetCorrected = (
  http: ApiRequestClient,
  input: { id: string; verbose?: boolean },
  params: RequestParams = {},
) => http.request<CorrectPet, CorrectProblem>({
  path: `/pets/${encodeURIComponent(input.id)}`,
  method: "GET",
  query: { verbose: input.verbose },
  format: "json",
  ...params,
  secure: true,
});
```

Primitives следует импортировать из generated SDK, который расширяет операция. Так manual и generated operations остаются совместимыми с одним transport.

## Сборка собственного дерева

```ts
import {
  createApiClient,
  operationsTree,
} from "@acme/pet-sdk";
import type { ApiRequestClient, RequestParams } from "@acme/pet-sdk";
import { petHttpClient } from "./client.js";

type CorrectPet = { id: string; displayName: string };

const getPetCorrected = (
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

export const clientTree = {
  ...operationsTree,
  pets: {
    ...operationsTree.pets,
    getPet: getPetCorrected,
  },
} as const;

export const api = createApiClient(petHttpClient, clientTree);
```

Подмена leaf в custom tree не удаляет ошибочную operation из generated root exports. Публичный facade собственного SDK должен явно экспортировать исправленную версию под каноническим именем и не предлагать ошибочную как основной API.

## Типы с исправлениями

Если неверна schema, corrected type также хранится вне generated-каталога. Не пытайтесь подменить generated declaration через ручное редактирование.

## Проверки

Для custom operation полезно тестировать не сеть, а request object через fake `ApiRequestClient`:

```ts
import type { ApiRequestClient, FullRequestParams } from "@acme/pet-sdk";

export async function captureRequest(
  operation: (http: ApiRequestClient) => Promise<unknown>,
) {
  let captured: FullRequestParams | undefined;
  const http: ApiRequestClient = {
    request: async <T>(params: FullRequestParams) => {
      captured = params;
      return params as T;
    },
  };

  await operation(http);
  return captured;
}
```

Проверяйте path, method, query, body, format, content type и `secure`. Полный сценарий приведён в рецепте [исправлений поверх generated SDK](./recipes/sdk-custom-operations.md).
