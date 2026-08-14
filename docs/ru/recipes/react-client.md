# React без generated hooks

SDK не генерирует React hooks и не навязывает библиотеку server state. React-слой использует общий configured transport, а форму API выбирает по границе чанка.

## Query hook с точечной operation

Для hook с одним endpoint используйте operation subpath. В примере `getPet` и `Pet` взяты из учебного SDK:

```tsx
import { useEffect, useState } from "react";
import { getPet } from "@acme/pet-store-rest-sdk/operations/get-pet";
import type { Pet } from "@acme/pet-store-rest-sdk";
import { httpClient } from "../../infra/pet-store-api/http-client.js";

export function PetCard({ id }: { id: string }) {
  const [pet, setPet] = useState<Pet | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const controller = new AbortController();

    setPet(null);
    setError(null);

    void getPet(
      httpClient,
      { id },
      { signal: controller.signal },
    ).then(
      (value) => {
        if (!controller.signal.aborted) setPet(value);
      },
      (caught) => {
        if (!controller.signal.aborted) setError(caught);
      },
    );

    return () => controller.abort();
  }, [id]);

  if (error) {
    return (
      <p role="alert">
        {error instanceof Error ? error.message : "Не удалось загрузить данные"}
      </p>
    );
  }

  if (!pet) return <p>Загрузка...</p>;

  return <article>{pet.name}</article>;
}
```

Cleanup отменяет request при смене `id` или unmount. В development Strict Mode effect может запускаться повторно, поэтому GET должен оставаться идемпотентным.

## Несколько операций feature-модуля

Если feature использует несколько endpoints, соберите один partial client вне компонентов:

```ts
import { createApiClient } from "@acme/pet-store-rest-sdk/create-api-client";
import { createPet, getPet } from "@acme/pet-store-rest-sdk/operations";
import { httpClient } from "../../infra/pet-store-api/http-client.js";

export const petFeatureApi = createApiClient(httpClient, {
  pets: {
    create: createPet,
    get: getPet,
  },
});
```

Mutation вызывается из event handler:

```tsx
import { useState } from "react";
import type { Pet } from "@acme/pet-store-rest-sdk";
import { petFeatureApi } from "./pet-feature-api.js";

export function CreatePetButton() {
  const [created, setCreated] = useState<Pet | null>(null);
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      setCreated(await petFeatureApi.pets.create({ name: "Milo" }));
    } finally {
      setPending(false);
    }
  }

  return (
    <button type="button" disabled={pending} onClick={() => void handleClick()}>
      {created ? `Создан ${created.name}` : pending ? "Создание..." : "Создать"}
    </button>
  );
}
```

Для cache, deduplication, optimistic updates и SSR hydration используйте выбранную библиотеку server state. Её fetcher может вызывать точечную operation или method частичного клиента.

Не импортируйте полный API-клиент в leaf hook, если важен минимальный chunk. Если задан `customFetch`, он обязан передавать `init.signal` в реальный Fetch.
