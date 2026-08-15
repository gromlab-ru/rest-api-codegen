# Ручное создание API-клиента

Ручной сценарий нужен, когда OpenAPI ещё нет, но приложение уже должно работать с REST API. Пакет предоставляет те же runtime primitives, которые входят в generated SDK, поэтому ручные operations строятся по тому же контракту и поддерживают те же способы композиции.

Когда спецификация появится, ручные типы и operations можно заменить generated-артефактами, сохранив общий подход к API-слою.

Выбирайте этот сценарий, если API contract приходится описывать в TypeScript самостоятельно. Если актуальная OpenAPI уже существует, автоматическая генерация обычно потребует меньше поддержки. Если проблема касается только отдельной operation существующего SDK, используйте [смешанный сценарий](./07_custom-operations.md), а не переносите весь API в ручной код.

## Установка

Ручной API импортирует runtime-код пакета, поэтому установите его как обычную dependency:

```bash
npm install @gromlab/rest-api-codegen
```

В отличие от автоматического сценария, одного запуска через `npx` здесь недостаточно: `HttpClient` и `createApiClient` используются приложением во время выполнения.

## Рекомендуемая структура

```text
src/infra/product-api/
├── operations/
│   ├── create-product.ts
│   ├── get-product.ts
│   └── index.ts
├── data-contracts.ts
├── http-client.ts
├── operations-tree.ts
└── api.ts
```

Имена намеренно повторяют структуру generated SDK. Это не обязательное требование, но оно упрощает будущую миграцию.

## Типы данных

`data-contracts.ts`:

```ts
export interface Product {
  id: string;
  name: string;
}

export interface CreateProductInput {
  name: string;
}

export interface Problem {
  message: string;
}
```

Ручные типы являются статическими TypeScript-контрактами и не выполняют runtime-валидацию response.

## Контракт operation

Каждая operation принимает совместимый `ApiRequestClient` первым аргументом:

```ts
import type {
  ApiRequestClient,
  RequestParams,
} from "@gromlab/rest-api-codegen";
import type { Problem, Product } from "../data-contracts.js";

export const getProduct = (
  http: ApiRequestClient,
  input: { id: string },
  params: RequestParams = {},
) =>
  http.request<Product, Problem>({
    path: `/products/${encodeURIComponent(input.id)}`,
    method: "GET",
    format: "json",
    ...params,
    secure: true,
  });
```

Последовательность полей важна:

- `...params` позволяет caller настроить timeout, signal, headers и другие параметры конкретного request;
- обязательные свойства operation, например `secure: true`, размещаются после `...params`, если caller не должен иметь возможность их отключить;
- path parameters кодируются явно, когда endpoint ожидает URL segment;
- generic `http.request<Success, Error>` описывает success и error payload.

Operation с body выглядит аналогично:

```ts
import {
  ContentType,
  type ApiRequestClient,
  type RequestParams,
} from "@gromlab/rest-api-codegen";
import type {
  CreateProductInput,
  Problem,
  Product,
} from "../data-contracts.js";

export const createProduct = (
  http: ApiRequestClient,
  body: CreateProductInput,
  params: RequestParams = {},
) =>
  http.request<Product, Problem>({
    path: "/products",
    method: "POST",
    body,
    type: ContentType.Json,
    format: "json",
    ...params,
    secure: true,
  });
```

## Общий transport

`http-client.ts`:

```ts
import { HttpClient } from "@gromlab/rest-api-codegen";

export const httpClient = new HttpClient({
  baseUrl: "https://api.example.com",

  onRequest(request) {
    if (!request.secure) return request;

    const headers = new Headers(request.headers);
    headers.set("Authorization", "Bearer example-token");
    return { ...request, headers };
  },
});
```

Этот экземпляр переиспользуется полным и частичными API-клиентами, а также прямыми вызовами operations.

## Полный API-клиент

Соберите каноническое дерево всех известных operations в `operations-tree.ts`:

```ts
import {
  createProduct,
  getProduct,
} from "./operations/index.js";

export const operationsTree = {
  products: {
    createProduct,
    getProduct,
  },
};
```

Привяжите дерево к transport в `api.ts`:

```ts
import { createApiClient } from "@gromlab/rest-api-codegen";
import { httpClient } from "./http-client.js";
import { operationsTree } from "./operations-tree.js";

export const productApi = createApiClient(
  httpClient,
  operationsTree,
);
```

```ts
const product = await productApi.products.getProduct({ id: "42" });
```

Полный API-клиент удобен как единая процедурная поверхность всего доступного API.

## Частичный доменный API-клиент

Домен выбирает только нужные operations и может дать им локальные имена:

```ts
import { createApiClient } from "@gromlab/rest-api-codegen";
import {
  createProduct,
  getProduct,
} from "../../infra/product-api/operations/index.js";
import { httpClient } from "../../infra/product-api/http-client.js";

export const catalogApi = createApiClient(httpClient, {
  products: {
    create: createProduct,
    get: getProduct,
  },
});
```

Частичный клиент не зависит от полного `operationsTree`, поэтому домен явно контролирует свою API-поверхность и import graph.

## Точечная operation

Для hook, fetcher или небольшого adapter вызовите operation напрямую:

```ts
import { httpClient } from "../../infra/product-api/http-client.js";
import { getProduct } from "../../infra/product-api/operations/get-product.js";

export const getProductFetcher = (id: string) =>
  getProduct(httpClient, { id });
```

Новый `HttpClient` для точечного вызова не создаётся. Все уровни используют один настроенный transport.

## Переход к generated SDK

Когда OpenAPI станет доступна:

1. Сгенерируйте SDK в отдельный каталог через CLI.
2. Сравните generated contracts и request metadata с ручными implementations.
3. Переключите `http-client.ts`, `createApiClient`, `ContentType` и transport types на exports generated SDK.
4. Заменяйте imports ручных operations на generated operations.
5. Сохраняйте локальные keys частичных деревьев, если прикладной API не должен измениться.
6. После полной миграции удалите runtime dependency `@gromlab/rest-api-codegen`, если приложение больше не импортирует её напрямую.

Пример сохранения прикладной поверхности:

```ts
// Было
import { getProduct } from "./operations/get-product.js";

// Стало
import { getProduct } from "./generated/operations/get-product.js";

export const catalogApi = createApiClient(httpClient, {
  products: { get: getProduct },
});
```

Caller продолжает использовать `catalogApi.products.get(...)`.

Если часть generated metadata неверна, не редактируйте output. Временно примените [смешанный сценарий](./07_custom-operations.md), а затем удалите workaround после исправления спецификации.

## Что тестировать

Operation удобно тестировать через fake `ApiRequestClient`, без сети:

```ts
import type {
  ApiRequestClient,
  FullRequestParams,
} from "@gromlab/rest-api-codegen";
import { getProduct } from "./operations/get-product.js";

let captured: FullRequestParams | undefined;

const http: ApiRequestClient = {
  request: async <T>(request: FullRequestParams) => {
    captured = request;
    return request as unknown as T;
  },
};

await getProduct(http, { id: "a/b" });

if (captured?.path !== "/products/a%2Fb") {
  throw new Error("Неверный path ручной operation");
}
```

Проверяйте `path`, method, query, body, `type`, `format` и `secure`. Поведение transport тестируется отдельно от metadata operation.
