# Частичный доменный клиент

Если generated SDK содержит сотни operations, отдельному домену обычно нужны только несколько из них. Частичный клиент сохраняет удобный bound API, но не импортирует полный `operationsTree`.

Тот же способ работает с ручными operations. Различается только источник imports и `createApiClient`; решение о частичном клиенте определяется границей домена, а не способом создания operations.

## Пример большого домена

Ниже используются условные generated-имена commerce SDK. В реальном проекте возьмите exports из своего `operations/index.ts`.

```ts
import { createApiClient } from "../../infra/commerce-api/generated/create-api-client.js";
import {
  cancelOrder,
  createOrder,
  getCities,
  getOrderedProducts,
  getOrders,
  getProduct,
  getProductPrice,
  getSkuPharmacies,
} from "../../infra/commerce-api/generated/operations/index.js";
import { httpClient } from "../../infra/commerce-api/http-client.js";

export const ordersApi = createApiClient(httpClient, {
  orders: {
    cancel: cancelOrder,
    create: createOrder,
    getOrderedProducts,
    list: getOrders,
  },
  pharmacies: {
    getCities,
    getSkuPharmacies,
  },
  productCatalog: {
    getProduct,
    getProductPrice,
  },
});
```

Домен вызывает короткие, осмысленные methods:

```ts
const orders = await ordersApi.orders.list({ page: 1 });
const product = await ordersApi.productCatalog.getProduct({ id: "42" });
await ordersApi.orders.cancel({ id: "123" });
```

Локальные keys не обязаны повторять длинные generated names. `createApiClient` сохраняет точные аргументы и return types каждой operation.

## Один import из operations barrel

Не нужно создавать восемь import paths к отдельным файлам. Generated `operations/index.ts` содержит статические ESM reexports, поэтому выбранные operations можно импортировать одним statement.

Production Vite/Rollup contract проекта проверяет эту форму: partial client с named imports из `operations` barrel включает выбранные operation modules, исключает остальные и не подключает `operations-tree.js`.

Для package SDK код выглядит так:

```ts
import { createApiClient } from "@acme/commerce-sdk/create-api-client";
import {
  cancelOrder,
  createOrder,
  getOrders,
  getProduct,
} from "@acme/commerce-sdk/operations";
import { httpClient } from "../../infra/commerce-api/http-client.js";

export const ordersApi = createApiClient(httpClient, {
  orders: {
    cancel: cancelOrder,
    create: createOrder,
    list: getOrders,
  },
  catalog: {
    getProduct,
  },
});
```

Для такого import package должен экспортировать `./operations`, сохранять ESM и корректно объявлять `sideEffects: false`.

## Не импортируйте полный facade

Частичному клиенту нужны только:

- `createApiClient`;
- выбранные operations;
- configured transport.

Не импортируйте `operationsTree` и не берите transport из application barrel, который реэкспортирует полный API-клиент. Используйте конкретный `client` module:

```ts
import { httpClient } from "../../infra/commerce-api/http-client.js";
```

## Когда использовать

- Домену нужны 2–20 operations большого API.
- Домен имеет отдельный lazy chunk.
- Нужны понятные domain-oriented names.
- Несколько adapters должны использовать одну минимальную API-поверхность.

Для единственного endpoint отдельное дерево может быть избыточным: используйте [точечную operation](./direct-operation.md).
