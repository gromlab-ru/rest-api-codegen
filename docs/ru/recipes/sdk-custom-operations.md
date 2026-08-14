# Смешанный сценарий поверх ошибочной OpenAPI

Предположим, спецификация содержит неверную schema и не кодирует path parameter, а исправить её до текущего релиза нельзя. Generated-файл не редактируется вручную: следующая генерация всё равно его заменит. Вместо этого SDK временно дополняется исправленной operation, которую нужно удалить после обновления OpenAPI.

## Структура

```text
src/
├── generated/
├── custom-operations/
│   └── get-pet-corrected.ts
├── operations-tree.ts
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
  operationsTree as generatedOperationsTree,
} from "./generated/index.js";
import { getPetCorrected } from "./custom-operations/get-pet-corrected.js";
import { httpClient } from "./http-client.js";

export const operationsTree = {
  ...generatedOperationsTree,
  pets: {
    ...generatedOperationsTree.pets,
    getPet: getPetCorrected,
  },
};

export const petStoreApi = createApiClient(httpClient, operationsTree);
```

Такой spread импортирует полное generated-дерево. Если приложению нужен только один домен, соберите частичное дерево явно:

```ts
import { createApiClient } from "./generated/create-api-client.js";
import { getPetCorrected } from "./custom-operations/get-pet-corrected.js";
import { httpClient } from "./http-client.js";

export const petStoreApi = createApiClient(httpClient, {
  pets: { getPet: getPetCorrected },
});
```

## Public facade

Можно оставить обе реализации под разными именами:

```ts
export * from "./generated/index.js";
export { getPetCorrected } from "./custom-operations/get-pet-corrected.js";
export { operationsTree } from "./operations-tree.js";
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
    return request as unknown as T;
  },
};

await getPetCorrected(http, { id: "a/b", verbose: true });

if (captured?.path !== "/pets/a%2Fb") {
  throw new Error("Неверный path временной operation");
}
```

Проверяйте `path`, method, query, body, `type`, `format` и `secure`. Сетевое поведение отдельно покрывается контрактами `HttpClient`.
