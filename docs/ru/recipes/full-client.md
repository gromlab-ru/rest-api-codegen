# Полный API-клиент

Полный клиент привязывает generated `operationsTree` к одному configured transport. Это основной удобный API общего infra-слоя.

## SDK внутри приложения

`client.ts`:

```ts
import { HttpClient } from "./generated/http-client.js";

export const petHttpClient = new HttpClient({
  baseUrl: "https://api.example.com",
});
```

`rest-api.ts`:

```ts
import { createApiClient } from "./generated/create-api-client.js";
import { operationsTree } from "./generated/operations-tree.js";
import { petHttpClient } from "./client.js";

export const petRestApi = createApiClient(
  petHttpClient,
  operationsTree,
);
```

Вызов использует generated groups и operation names:

```ts
import { petRestApi } from "./infra/pet-api/rest-api.js";

const pet = await petRestApi.pets.getPet({ id: "42" });
const pets = await petRestApi.admin.listPets({ q: "active" });
```

## SDK как пакет

Меняются только import paths:

```ts
import { createApiClient } from "@acme/pet-sdk/create-api-client";
import { operationsTree } from "@acme/pet-sdk/operations-tree";
import { petHttpClient } from "./client.js";

export const petRestApi = createApiClient(
  petHttpClient,
  operationsTree,
);
```

Transport обычно импортирует `HttpClient` из `@acme/pet-sdk/http-client`.

## Граница полного клиента

`operationsTree` статически импортирует все generated operations. Production tree-shaking contract подтверждает, что полный client bundle содержит выбранные и невыбранные endpoints.

Это ожидаемо и полезно, когда:

- infra-слой действительно использует значительную часть API;
- приложение не делит API по lazy chunks;
- важнее единая generated namespace-поверхность, чем минимальный конкретный chunk.

Не используйте полный client module как универсальный dependency каждого домена большого приложения. Для изолированного domain boundary соберите [частичный клиент](./partial-client.md), а для hook с одним endpoint используйте [точечную operation](./direct-operation.md).
