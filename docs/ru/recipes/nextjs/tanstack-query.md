# TanStack Query в Next.js App Router

TanStack Query используется в клиентских компонентах. Хуки вызывают сгенерированные операции напрямую и используют браузерный `httpClient` из [базового примера](./full-client.md).

## Установка

```bash
npm install @tanstack/react-query
```

## Подключение к приложению

`src/app/providers.tsx`:

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const makeQueryClient = () => new QueryClient();

let browserQueryClient: QueryClient | undefined;

function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }

  return browserQueryClient ??= makeQueryClient();
}

export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

`src/app/layout.tsx` остаётся серверным компонентом:

```tsx
import type { ReactNode } from "react";
import { Providers } from "./providers";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
```

На сервере для каждого запроса создаётся новый `QueryClient`, поэтому данные разных пользователей не смешиваются. В браузере сохраняется один экземпляр на время работы приложения, в том числе при повторной отрисовке `Providers`.

## Получение и отправка данных

`src/features/pets/pet-hooks.ts`:

```ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreatePet } from "../../infra/pet-store-api/generated/data-contracts.js";
import { createPet } from "../../infra/pet-store-api/generated/operations/create-pet.js";
import { getPet } from "../../infra/pet-store-api/generated/operations/get-pet.js";
import { httpClient } from "../../infra/pet-store-api/http-client.js";

const petKey = (id: string) => ["pet", id] as const;

export function usePet(id: string) {
  return useQuery({
    queryKey: petKey(id),
    queryFn: ({ signal }) => getPet(httpClient, { id }, { signal }),
    enabled: Boolean(id),
  });
}

export function useCreatePet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePet) => createPet(httpClient, input),
    onSuccess: (pet) => {
      queryClient.setQueryData(petKey(pet.id), pet);
    },
  });
}
```

Хуки не импортируют полный или частичный клиент. Каждый хук подключает только нужные операции.

Обычный `GET` в серверном компоненте выполняйте через серверный клиент без TanStack Query. Предварительную загрузку и передачу кеша в браузер добавляйте только тогда, когда они действительно нужны приложению.
