# SDK внутри приложения

Отдельный пакет не всегда оправдан или доступен. В обычном React/Vite-проекте SDK можно генерировать в выделенный каталог приложения. В примере используется путь `src/infra/commerce-api`, но генератор не предписывает архитектуру каталогов.

## Структура

```text
src/
├── infra/
│   └── commerce-api/
│       ├── generated/       # только rest-api-codegen
│       ├── http-client.ts   # configured HttpClient
│       ├── api.ts           # полный клиент
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
    "generate:commerce-api": "npx --yes @gromlab/rest-api-codegen@5.2.0 --input ./openapi/commerce.openapi.json --output ./src/infra/commerce-api/generated"
  }
}
```

```bash
npm run generate:commerce-api
```

Не добавляйте ручные файлы в `generated`: успешная регенерация заменяет каталог целиком.

Генератор не устанавливается в приложение: `npx` загружает указанную версию для запуска, а generated SDK содержит собственные runtime primitives.

## Общий transport

`src/infra/commerce-api/http-client.ts`:

```ts
import { HttpClient } from "./generated/http-client.js";

export const httpClient = new HttpClient({
  baseUrl: import.meta.env.VITE_COMMERCE_API_URL,
  credentials: "include",
});
```

Именно этот экземпляр переиспользуется полным клиентом, частичными клиентами доменов и точечными operations. Не создавайте новый transport в каждом hook.

## Полный клиент

`src/infra/commerce-api/api.ts`:

```ts
import { createApiClient } from "./generated/create-api-client.js";
import { operationsTree } from "./generated/operations-tree.js";
import { httpClient } from "./http-client.js";

export const commerceApi = createApiClient(
  httpClient,
  operationsTree,
);
```

Этот module подключает полное дерево. Не импортируйте его в lazy feature, которой нужны только несколько endpoints.

## Public facade

```ts
export { commerceApi } from "./api.js";
export { httpClient } from "./http-client.js";
export type * from "./generated/data-contracts.js";
```

Для частичного клиента и hook импортируйте transport прямо из `http-client.ts`, а не из facade, который также реэкспортирует полный клиент. Это сохраняет явную границу чанка.

Следующие шаги:

- [полный клиент](./full-client.md);
- [частичный доменный клиент](./partial-client.md);
- [точечная operation в hook](./direct-operation.md).
