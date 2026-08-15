# Частичный API-клиент в Next.js

Раздел приложения выбирает только нужные методы и не импортирует полное `operationsTree`. Для браузера и сервера создаются отдельные файлы, потому что у них разные настройки `HttpClient`.

## Клиентский компонент

`src/features/catalog/catalog-api.ts`:

```ts
import "client-only";

import { createApiClient } from "../../infra/pet-store-api/generated/create-api-client.js";
import {
  createPet,
  getPet,
  readNote,
} from "../../infra/pet-store-api/generated/operations/index.js";
import { httpClient } from "../../infra/pet-store-api/http-client.js";

export const catalogApi = createApiClient(httpClient, {
  pets: {
    create: createPet,
    get: getPet,
  },
  notes: {
    get: readNote,
  },
});
```

Клиентский компонент импортирует `catalogApi`, а не полный `petStoreApi`:

```ts
const pet = await catalogApi.pets.get({ id: "42" });
const createdPet = await catalogApi.pets.create({ name: "Milo" });
const note = await catalogApi.notes.get({ id: 7 });
```

## Серверный компонент

`src/features/catalog/server-catalog-api.ts`:

```ts
import "server-only";

import { createApiClient } from "../../infra/pet-store-api/generated/create-api-client.js";
import {
  getPet,
  readNote,
} from "../../infra/pet-store-api/generated/operations/index.js";
import { serverHttpClient } from "../../infra/pet-store-api/server-http-client.js";

export const serverCatalogApi = createApiClient(serverHttpClient, {
  pets: {
    get: getPet,
  },
  notes: {
    get: readNote,
  },
});
```

Серверный компонент использует только выбранные для раздела операции:

```tsx
import { serverCatalogApi } from "../../features/catalog/server-catalog-api.js";

export default async function CatalogPage() {
  const [pet, note] = await Promise.all([
    serverCatalogApi.pets.get({ id: "42" }),
    serverCatalogApi.notes.get({ id: 7 }),
  ]);

  return (
    <main>
      <h1>{pet.name}</h1>
      <p>{note}</p>
    </main>
  );
}
```

Не импортируйте `server-api.ts` полного клиента только ради `HttpClient`: этот файл уже подключает всё `operationsTree`. Частичный серверный клиент использует отдельный `server-http-client.ts` из [базового примера](./full-client.md).

Для cookie текущего пользователя общий `serverHttpClient` не подходит. Создайте клиент по [рецепту серверной авторизации](./ssr-cookie-auth.md), а затем привяжите к нему такое же частичное дерево.
