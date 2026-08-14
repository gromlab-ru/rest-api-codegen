# Частичный доменный API-клиент

Частичный клиент подходит разделу приложения, которому нужно несколько связанных методов, но не весь API. В сборку попадут только выбранные операции.

## Результат

```text
src/
├── infra/
│   └── pet-store-api/
│       ├── generated/
│       └── http-client.ts
└── features/
    └── catalog/
        └── catalog-api.ts
```

## Общий `HttpClient`

`src/infra/pet-store-api/http-client.ts`:

Используйте `httpClient` из [базового примера React + Vite](./full-client.md). Авторизация и обработка ошибок останутся общими для полного и частичного клиентов.

## Клиент для раздела приложения

`src/features/catalog/catalog-api.ts`:

```ts
import { createApiClient } from "../../infra/pet-store-api/generated/create-api-client.js";
import {
  getPet,
  listPets,
  readNote,
} from "../../infra/pet-store-api/generated/operations/index.js";
import { httpClient } from "../../infra/pet-store-api/http-client.js";

export const catalogApi = createApiClient(httpClient, {
  pets: {
    get: getPet,
    list: listPets,
  },
  notes: {
    get: readNote,
  },
});
```

Код приложения вызывает методы в терминах своего раздела:

```ts
import { catalogApi } from "./catalog-api.js";

const pet = await catalogApi.pets.get({ id: "42" });
const pets = await catalogApi.pets.list({ q: "active" });
const note = await catalogApi.notes.get({ id: 7 });
```

Локальные ключи не обязаны повторять имена сгенерированных операций. `createApiClient` сохраняет аргументы и тип результата каждой функции.

## Что попадёт в сборку

Частичному клиенту нужны только:

- `createApiClient`;
- выбранные именованные операции;
- общий настроенный `HttpClient`.

Не импортируйте сюда `operationsTree` или общий файл приложения, который повторно экспортирует полный клиент. Сгенерированный `operations/index.ts` содержит статические ESM-экспорты, поэтому именованные импорты позволяют сборщику исключить невыбранные операции.

Для единственного метода отдельное дерево обычно избыточно: передайте операцию напрямую в [TanStack Query](./tanstack-query.md) или [SWR](./swr.md). Если разделу нужен весь API, используйте [полный клиент](./full-client.md).
