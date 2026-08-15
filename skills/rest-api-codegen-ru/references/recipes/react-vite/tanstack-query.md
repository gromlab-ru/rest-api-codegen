# TanStack Query в React + Vite

TanStack Query хранит полученные данные, повторяет запросы и отслеживает отправку изменений. Сгенерированные операции передаются в хуки напрямую и используют общий `httpClient` из [базового примера](./full-client.md).

## Установка

```bash
npm install @tanstack/react-query
```

## Подключение к приложению

`src/main.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
```

## Получение данных

`src/features/pets/pet-queries.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { getPet } from "../../infra/pet-store-api/generated/operations/get-pet.js";
import { httpClient } from "../../infra/pet-store-api/http-client.js";

export const petKeys = {
  detail: (id: string) => ["pet", id] as const,
};

export function usePet(id: string) {
  return useQuery({
    queryKey: petKeys.detail(id),
    queryFn: ({ signal }) => getPet(
      httpClient,
      { id },
      { signal },
    ),
    enabled: Boolean(id),
  });
}
```

TanStack Query передаёт `AbortSignal` в `queryFn`, а операция - дальше в `HttpClient`.

## Отправка данных

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreatePet } from "../../infra/pet-store-api/generated/data-contracts.js";
import { createPet } from "../../infra/pet-store-api/generated/operations/create-pet.js";
import { httpClient } from "../../infra/pet-store-api/http-client.js";
import { petKeys } from "./pet-queries.js";

export function useCreatePet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePet) => createPet(httpClient, input),
    onSuccess: (pet) => {
      queryClient.setQueryData(petKeys.detail(pet.id), pet);
    },
  });
}
```

Полный `petStoreApi` и частичные клиенты могут использоваться вместе с этими хуками. Хук для одного запроса не должен импортировать `operationsTree`; для нескольких связанных методов используйте [частичный клиент](./partial-client.md).
