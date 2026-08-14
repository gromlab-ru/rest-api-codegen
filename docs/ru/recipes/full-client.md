# Полный API-клиент

Полный клиент привязывает generated `operationsTree` к одному configured transport. Это основной общий API приложения.

Ниже показан generated SDK. Для ручного сценария приложение описывает полное дерево самостоятельно и передаёт его в тот же `createApiClient`; пример приведён в [руководстве по ручному API](../06_manual-client.md#полный-api-клиент).

## SDK внутри приложения

`http-client.ts`:

```ts
import { HttpClient } from "./generated/http-client.js";

export const httpClient = new HttpClient({
  baseUrl: "https://api.example.com",
});
```

`api.ts`:

```ts
import { createApiClient } from "./generated/create-api-client.js";
import { operationsTree } from "./generated/operations-tree.js";
import { httpClient } from "./http-client.js";

export const petStoreApi = createApiClient(
  httpClient,
  operationsTree,
);
```

Вызов использует generated groups и operation names:

```ts
import { petStoreApi } from "./infra/pet-store-api/api.js";

const pet = await petStoreApi.pets.getPet({ id: "42" });
const pets = await petStoreApi.admin.listPets({ q: "active" });
```

## SDK как пакет

Меняются только import paths:

```ts
import { createApiClient } from "@acme/pet-store-rest-sdk/create-api-client";
import { operationsTree } from "@acme/pet-store-rest-sdk/operations-tree";
import { httpClient } from "./http-client.js";

export const petStoreApi = createApiClient(
  httpClient,
  operationsTree,
);
```

Transport обычно импортирует `HttpClient` из `@acme/pet-store-rest-sdk/http-client`.

## Граница полного клиента

`operationsTree` статически импортирует все generated operations. Production tree-shaking contract подтверждает, что полный client bundle содержит выбранные и невыбранные endpoints.

Это ожидаемо и полезно, когда:

- общий API-модуль действительно использует значительную часть endpoints;
- приложение не делит API по lazy chunks;
- важнее единая generated namespace-поверхность, чем минимальный конкретный chunk.

Не используйте полный client module как универсальный dependency каждого домена большого приложения. Для изолированного domain boundary соберите [частичный клиент](./partial-client.md), а для hook с одним endpoint используйте [точечную operation](./direct-operation.md).
