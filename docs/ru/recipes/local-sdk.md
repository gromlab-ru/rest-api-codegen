# SDK внутри приложения

Отдельный пакет не всегда оправдан или доступен. В обычном React/Vite-проекте SDK можно генерировать в выделенный infra-каталог приложения.

## Структура

```text
src/
├── infra/
│   └── commerce-api/
│       ├── generated/       # только rest-api-codegen
│       ├── client.ts        # configured HttpClient
│       ├── rest-api.ts      # полный клиент
│       └── index.ts
└── features/
    └── orders/
        ├── orders-api.ts    # частичный клиент
        └── use-order.ts     # точечная operation
```

## Генерация

```json
{
  "scripts": {
    "generate:api": "rest-api-codegen --input ./openapi/commerce.json --output ./src/infra/commerce-api/generated"
  },
  "devDependencies": {
    "@gromlab/rest-api-codegen": "5.2.0"
  }
}
```

```bash
npm run generate:api
```

Не добавляйте ручные файлы в `generated`: успешная регенерация заменяет каталог целиком.

## Общий transport

`src/infra/commerce-api/client.ts`:

```ts
import { HttpClient } from "./generated/http-client.js";

export const commerceHttpClient = new HttpClient({
  baseUrl: import.meta.env.VITE_COMMERCE_API_URL,
  credentials: "include",
});
```

Именно этот экземпляр переиспользуется полным клиентом, частичными клиентами доменов и точечными operations. Не создавайте новый transport в каждом hook.

## Полный клиент

`src/infra/commerce-api/rest-api.ts`:

```ts
import { createApiClient } from "./generated/create-api-client.js";
import { operationsTree } from "./generated/operations-tree.js";
import { commerceHttpClient } from "./client.js";

export const commerceRestApi = createApiClient(
  commerceHttpClient,
  operationsTree,
);
```

Этот module подключает полное дерево. Не импортируйте его в lazy feature, которой нужны только несколько endpoints.

## Public facade

```ts
export { commerceHttpClient } from "./client.js";
export { commerceRestApi } from "./rest-api.js";
export type * from "./generated/data-contracts.js";
```

Для частичного клиента и hook импортируйте transport прямо из `client.ts`, а не из facade, который также реэкспортирует полный клиент. Это сохраняет явную границу чанка.

Следующие шаги:

- [полный клиент](./full-client.md);
- [частичный доменный клиент](./partial-client.md);
- [точечная operation в hook](./direct-operation.md).
