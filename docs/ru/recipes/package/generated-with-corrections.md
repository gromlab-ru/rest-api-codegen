# Сгенерированный пакет с ручными исправлениями

Пакет можно генерировать автоматически и при этом временно исправлять отдельные операции вручную. Для этого CLI пишет только в `src/generated`, а файлы уровнем выше задают публичные экспорты и итоговое `operationsTree`.

Сгенерированные файлы не редактируются. После исправления OpenAPI ручная замена удаляется, пакет генерируется заново и выпускается новой версией.

## Структура

```text
src/
├── generated/                  # только rest-api-codegen
├── custom-operations/
│   └── get-pet-corrected.ts
├── operations/
│   ├── get-pet.ts              # публичный путь исправленной операции
│   └── index.ts                # общий экспорт операций
├── index.ts                    # корневая точка входа
└── operations-tree.ts          # исправленное полное дерево
package.json
```

Команда генерации направлена во вложенный каталог:

```json
{
  "scripts": {
    "generate": "npx --yes @gromlab/rest-api-codegen@5.2.0 --input ./openapi/pet-store.openapi.json --output ./src/generated"
  }
}
```

## Исправленная операция

`src/custom-operations/get-pet-corrected.ts`:

```ts
import type {
  ApiRequestClient,
  RequestParams,
} from "../generated/http-client.js";

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

Типы `HttpClient` импортируются из сгенерированной части того же пакета. Благодаря этому все операции используют одну реализацию клиента и один класс `ApiError`.

## Управляемые экспорты операций

`src/operations/get-pet.ts` сохраняет прежнее публичное имя операции:

```ts
export {
  getPetCorrected as getPet,
} from "../custom-operations/get-pet-corrected.js";
export type {
  CorrectPet,
  CorrectProblem,
} from "../custom-operations/get-pet-corrected.js";
```

`src/operations/index.ts`:

```ts
export * from "../generated/operations/index.js";
export { getPet } from "./get-pet.js";
```

Явный экспорт `getPet` заменяет одноимённый экспорт из сгенерированного файла. Остальные операции продолжают публиковаться без дополнительных обёрток.

## Исправленное полное дерево

`src/operations-tree.ts`:

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

export type OperationsTree = typeof operationsTree;
```

## Управляемая корневая точка входа

`src/index.ts` повторяет публичные экспорты сгенерированного клиента, но берёт операции и дерево из управляемых файлов:

```ts
export { createApiClient } from "./generated/create-api-client.js";
export type {
  ApiOperation,
  ApiTree,
  BoundApi,
} from "./generated/create-api-client.js";
export {
  ApiError,
  ContentType,
  HttpClient,
} from "./generated/http-client.js";
export type {
  ApiConfig,
  ApiRequestClient,
  CancelToken,
  ErrorInterceptor,
  FetchLike,
  FullRequestParams,
  HttpResponse,
  ParamsSerializer,
  QueryParamsType,
  RequestContext,
  RequestInterceptor,
  RequestParams,
  ResponseFormat,
  ResponseInterceptor,
  ResponseParser,
} from "./generated/http-client.js";
export type * from "./generated/data-contracts.js";
export { operationsTree } from "./operations-tree.js";
export type { OperationsTree } from "./operations-tree.js";
export * as operations from "./operations/index.js";
export * from "./operations/index.js";
```

Корневая точка входа не публикует ошибочное сгенерированное дерево: операции всегда проходят через управляемые файлы.

## Точки входа пакета

Точный путь исправленной операции имеет приоритет над общим шаблоном для остальных сгенерированных операций:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./create-api-client": {
      "types": "./dist/generated/create-api-client.d.ts",
      "import": "./dist/generated/create-api-client.js"
    },
    "./http-client": {
      "types": "./dist/generated/http-client.d.ts",
      "import": "./dist/generated/http-client.js"
    },
    "./operations": {
      "types": "./dist/operations/index.d.ts",
      "import": "./dist/operations/index.js"
    },
    "./operations/get-pet": {
      "types": "./dist/operations/get-pet.d.ts",
      "import": "./dist/operations/get-pet.js"
    },
    "./operations/*": {
      "types": "./dist/generated/operations/*.d.ts",
      "import": "./dist/generated/operations/*.js"
    },
    "./operations-tree": {
      "types": "./dist/operations-tree.d.ts",
      "import": "./dist/operations-tree.js"
    }
  }
}
```

## Использование пакета

Полный клиент получает исправленное дерево:

```ts
import { createApiClient } from "@acme/pet-store-rest-sdk/create-api-client";
import { operationsTree } from "@acme/pet-store-rest-sdk/operations-tree";
import { httpClient } from "./http-client.js";

export const petStoreApi = createApiClient(
  httpClient,
  operationsTree,
);
```

Частичный клиент получает исправленную `getPet` из общего экспорта операций:

```ts
import { getPet, readNote } from "@acme/pet-store-rest-sdk/operations";
```

Отдельный импорт также получает исправленную версию:

```ts
import { getPet } from "@acme/pet-store-rest-sdk/operations/get-pet";

const pet = await getPet(httpClient, { id: "a/b" });
```

## Возврат к сгенерированной операции

После исправления OpenAPI:

1. Обновите OpenAPI и заново создайте `src/generated`.
2. Проверьте новую сгенерированную операцию контрактным тестом.
3. Удалите `get-pet-corrected.ts` и явную замену из общего экспорта.
4. Верните сгенерированную операцию в дерево.
5. Удалите отдельную запись `./operations/get-pet` из `exports`.
6. Выпустите новую версию пакета и удалите тесты временного исправления.

Исправления внутри приложения показаны отдельно для [React + Vite](../react-vite/broken-endpoints.md) и [Next.js](../nextjs/broken-endpoints.md).
