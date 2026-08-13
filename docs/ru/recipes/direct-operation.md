# Точечная operation

Hook, lazy module или небольшой adapter часто использует ровно один endpoint. В таком leaf-module operation импортируется напрямую и вызывается с общим configured transport.

## Локальный generated SDK

```ts
import { getPet } from "../../infra/pet-api/generated/operations/get-pet.js";
import { petHttpClient } from "../../infra/pet-api/client.js";

export const getPetFetcher = (id: string) =>
  getPet(petHttpClient, { id });
```

## SDK-пакет

```ts
import { getPet } from "@acme/pet-sdk/operations/get-pet";
import { petHttpClient } from "../../infra/pet-api/client.js";

export const getPetFetcher = (id: string) =>
  getPet(petHttpClient, { id });
```

Package должен экспортировать wildcard `./operations/*`.

## React hook

SDK не генерирует hooks, но operation подходит для fetcher выбранной state-management библиотеки или собственного hook:

```tsx
import { useEffect, useState } from "react";
import { getPet } from "@acme/pet-sdk/operations/get-pet";
import type { Pet } from "@acme/pet-sdk";
import { petHttpClient } from "../../infra/pet-api/client.js";

export function usePet(id: string) {
  const [pet, setPet] = useState<Pet | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const controller = new AbortController();

    void getPet(
      petHttpClient,
      { id },
      { signal: controller.signal },
    ).then(setPet, (caught) => {
      if (!controller.signal.aborted) setError(caught);
    });

    return () => controller.abort();
  }, [id]);

  return { pet, error };
}
```

Type-only import `Pet` исчезает после compilation и не подключает root runtime facade.

## Почему subpath

Production Vite/Rollup contract подтверждает, что import `@sdk/operations/get-pet` включает выбранную operation и исключает:

- `operations/index.js`;
- остальные operations;
- `operations-tree.js`;
- `create-api-client.js`.

Это наиболее строгая граница для минимального leaf chunk.

## Когда не использовать

Если несколько modules одного домена используют 5–10 endpoints, удобнее один раз собрать [частичный клиент](./partial-client.md). Точечный вызов не должен приводить к созданию отдельного `HttpClient` для каждого endpoint: transport остаётся общим.
