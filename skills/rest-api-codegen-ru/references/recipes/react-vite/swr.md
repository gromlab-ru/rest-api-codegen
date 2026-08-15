# SWR в React + Vite

SWR вызывает сгенерированные операции напрямую. Адрес API, авторизация и обработка ошибок остаются в общем `httpClient`.

## Установка

```bash
npm install swr
```

## Получение данных через `useSWR`

`src/features/pets/pet-swr.ts`:

```ts
import useSWR from "swr";
import { getPet } from "../../infra/pet-store-api/generated/operations/get-pet.js";
import { httpClient } from "../../infra/pet-store-api/http-client.js";

const petKey = (id: string) => ["pet", id] as const;

export function usePet(id: string) {
  return useSWR(
    id ? petKey(id) : null,
    ([, petId]) => getPet(httpClient, { id: petId }),
  );
}
```

Ключ `null` отключает запрос. Составной ключ содержит все значения, от которых зависит ответ.

## Отправка данных через `useSWRMutation`

```ts
import useSWRMutation from "swr/mutation";
import type { CreatePet } from "../../infra/pet-store-api/generated/data-contracts.js";
import { createPet } from "../../infra/pet-store-api/generated/operations/create-pet.js";
import { httpClient } from "../../infra/pet-store-api/http-client.js";

export function useCreatePet() {
  return useSWRMutation(
    "pets",
    (_key, { arg }: { arg: CreatePet }) => createPet(httpClient, arg),
  );
}
```

Компонент вызывает `trigger({ name: "Milo" })`. После отправки обновите нужные записи кеша через `mutate`.

SWR и TanStack Query решают похожую задачу, но по-разному управляют кешем и отправкой данных. Обычно достаточно выбрать одну из них для приложения или отдельного крупного раздела.
