# Пользовательские operations поверх ошибочной OpenAPI

Предположим, спецификация содержит неверную schema и не кодирует path parameter. Generated-файл не исправляется вручную: следующая генерация всё равно его заменит.

## Структура

```text
src/
├── generated/
├── custom-operations/
│   └── get-pet-corrected.ts
├── client-tree.ts
└── index.ts
```

## Исправленная operation

```ts
import type {
  ApiRequestClient,
  RequestParams,
} from "../generated/index.js";

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

Transport-типы импортируются из расширяемого SDK, а не из `@gromlab/rest-api-codegen`. Это сохраняет единый runtime и identity класса `ApiError`.

`secure: true` расположен после `...params`, поэтому caller не сможет случайно отключить авторизацию. Для публичного endpoint поле нужно намеренно убрать.

## Замена leaf в дереве

В примере `pets.getPet` — имя из учебной спецификации:

```ts
import {
  createApiClient,
  operationsTree,
} from "./generated/index.js";
import { getPetCorrected } from "./custom-operations/get-pet-corrected.js";
import { petHttpClient } from "./client.js";

export const clientTree = {
  ...operationsTree,
  pets: {
    ...operationsTree.pets,
    getPet: getPetCorrected,
  },
} as const;

export const api = createApiClient(petHttpClient, clientTree);
```

Такой spread импортирует полное generated-дерево. Если приложению нужен только один домен, соберите частичное дерево явно:

```ts
import { createApiClient } from "./generated/create-api-client.js";
import { getPetCorrected } from "./custom-operations/get-pet-corrected.js";
import { petHttpClient } from "./client.js";

export const petApi = createApiClient(petHttpClient, {
  pets: { getPet: getPetCorrected },
} as const);
```

## Public facade

Можно оставить обе реализации под разными именами:

```ts
export * from "./generated/index.js";
export { getPetCorrected } from "./custom-operations/get-pet-corrected.js";
export { clientTree } from "./client-tree.js";
```

Если исправленная operation должна называться `getPet`, соберите facade явными exports и не реэкспортируйте generated `getPet` через `export *`.

## Что тестировать

Передайте fake transport и проверьте сформированный request object:

```ts
import type {
  ApiRequestClient,
  FullRequestParams,
} from "./generated/index.js";
import { getPetCorrected } from "./custom-operations/get-pet-corrected.js";

let captured: FullRequestParams | undefined;

const http: ApiRequestClient = {
  request: async <T>(request: FullRequestParams) => {
    captured = request;
    return request as T;
  },
};

await getPetCorrected(http, { id: "a/b", verbose: true });

if (captured?.path !== "/pets/a%2Fb") {
  throw new Error("Неверный path пользовательской operation");
}
```

Проверяйте `path`, method, query, body, `type`, `format` и `secure`. Сетевое поведение отдельно покрывается контрактами `HttpClient`.
