# Cookie-аутентификация на сервере Next.js

Серверный компонент может вызвать API от имени текущего пользователя, передав разрешённую `HttpOnly` cookie. Для каждого входящего запроса создаётся отдельный `HttpClient`, к которому привязывается полное дерево операций.

Страница получает готовый `petStoreApi`; ей не нужно вручную передавать cookie или оборачивать каждый метод API.

## Результат

```text
src/
├── app/
│   └── pets/
│       └── page.tsx
└── infra/
    └── pet-store-api/
        ├── generated/
        └── server-api.ts
```

Серверный адрес API не должен попадать в браузерную сборку:

`.env.local`:

```dotenv
PET_STORE_API_URL=https://api.internal.example.com
```

## Клиент для текущего запроса

`src/infra/pet-store-api/server-api.ts`:

```ts
import "server-only";

import { cookies } from "next/headers";
import { createApiClient } from "./generated/create-api-client.js";
import { HttpClient } from "./generated/http-client.js";
import { operationsTree } from "./generated/operations-tree.js";

function getApiBaseUrl(): string {
  const baseUrl = process.env.PET_STORE_API_URL;

  if (!baseUrl) {
    throw new Error("Не задан PET_STORE_API_URL");
  }

  return baseUrl;
}

export async function createPetStoreServerApi() {
  const cookieStore = await cookies();
  const session = cookieStore.get("pet-store-session");
  const headers = new Headers();

  if (session) {
    headers.set(
      "Cookie",
      `${session.name}=${encodeURIComponent(session.value)}`,
    );
  }

  const httpClient = new HttpClient({
    baseUrl: getApiBaseUrl(),
    headers,
    cache: "no-store",
  });

  return createApiClient(httpClient, operationsTree);
}
```

Функция вызывается один раз при отрисовке страницы или макета (`layout`). Она не хранит cookie пользователя в общем состоянии процесса.

`cache: "no-store"` выбран для персональных данных. Для публичных запросов можно создать отдельный серверный клиент с другой настройкой кеша.

## Серверный компонент

`src/app/pets/page.tsx`:

```tsx
import { createPetStoreServerApi } from "../../infra/pet-store-api/server-api.js";

export default async function PetsPage() {
  const petStoreApi = await createPetStoreServerApi();

  const [pet, note] = await Promise.all([
    petStoreApi.pets.getPet({ id: "42" }),
    petStoreApi.notes.readNote({ id: 7 }),
  ]);

  return (
    <main>
      <h1>{pet.name}</h1>
      <p>{note}</p>
    </main>
  );
}
```

Страница работает только с методами API. Чтение cookie, адрес сервера и настройка `HttpClient` остаются в `server-api.ts`.

## Почему нельзя использовать общий клиент

Один процесс Next.js может одновременно обслуживать разных пользователей. Если записать cookie или токен в общий `HttpClient`, данные одного запроса могут попасть в другой. Общий серверный клиент безопасен только без пользовательских данных.

## Безопасная передача cookie

- Передавайте только cookie, которые действительно предназначены API.
- Не используйте `cookieStore.toString()`, если приложение хранит другие конфиденциальные cookie.
- Не принимайте `baseUrl` из параметров URL, заголовков или пользовательского ввода.
- Серверный Fetch не переносит cookie из браузера автоматически.
- Ответ `Set-Cookie` от API не устанавливает cookie в ответе Next.js автоматически; делайте это в обработчике маршрута (`Route Handler`) или серверном действии (`Server Action`).
- `credentials: "include"` само по себе не переносит cookie в Node.js.

## Если клиент установлен как пакет

Для опубликованного пакета меняются только пути импорта:

```ts
import { createApiClient } from "@acme/pet-store-rest-sdk/create-api-client";
import { HttpClient } from "@acme/pet-store-rest-sdk/http-client";
import { operationsTree } from "@acme/pet-store-rest-sdk/operations-tree";
```

Обычные клиенты для браузера и сервера описаны в [базовом примере Next.js](./full-client.md). Отправка cookie из браузера разобрана в [отдельном рецепте](./cookie-auth.md).
