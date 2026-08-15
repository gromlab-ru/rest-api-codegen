# SWR в Next.js App Router

Для базового использования SWR не требует отдельного провайдера. Клиентский хук вызывает сгенерированную операцию через общий браузерный `httpClient`.

## Установка

```bash
npm install swr
```

## Получение и отправка данных

`src/features/pets/pet-swr.ts`:

```ts
"use client";

import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import type { CreatePet } from "../../infra/pet-store-api/generated/data-contracts.js";
import { createPet } from "../../infra/pet-store-api/generated/operations/create-pet.js";
import { getPet } from "../../infra/pet-store-api/generated/operations/get-pet.js";
import { httpClient } from "../../infra/pet-store-api/http-client.js";

const petKey = (id: string) => ["pet", id] as const;

export function usePet(id: string) {
  return useSWR(
    id ? petKey(id) : null,
    ([, petId]) => getPet(httpClient, { id: petId }),
  );
}

export function useCreatePet() {
  return useSWRMutation(
    "pets",
    (_key, { arg }: { arg: CreatePet }) => createPet(httpClient, arg),
  );
}
```

После отправки данных обновите связанные ключи кеша через `mutate`. Авторизация настраивается в `httpClient`, поэтому хуки не читают токен и cookie самостоятельно.

Серверный компонент не может вызывать клиентский хук. Для `GET` на сервере используйте [полный](./full-client.md) или [частичный клиент](./partial-client.md).
