# JWT из `localStorage` в Next.js

`localStorage` доступен только в браузере. JWT добавляется в браузерном `httpClient`; серверные компоненты, серверные действия (`Server Actions`) и обработчики маршрутов (`Route Handlers`) этот токен не видят.

## Хранение токена

`src/infra/pet-store-api/token-storage.ts`:

```ts
import "client-only";

const accessTokenKey = "pet-store.access-token";

export const getAccessToken = () => localStorage.getItem(accessTokenKey);

export const setAccessToken = (token: string) => {
  localStorage.setItem(accessTokenKey, token);
};

export const clearAccessToken = () => {
  localStorage.removeItem(accessTokenKey);
};
```

## Настройка `HttpClient` для браузера

Замените `http-client.ts` из базового примера:

```ts
import "client-only";

import { HttpClient } from "./generated/http-client.js";
import { getAccessToken } from "./token-storage.js";

const baseUrl = process.env.NEXT_PUBLIC_PET_STORE_API_URL;

if (!baseUrl) {
  throw new Error("Не задан NEXT_PUBLIC_PET_STORE_API_URL");
}

export const httpClient = new HttpClient({
  baseUrl,

  onRequest(request) {
    if (!request.secure) return request;

    const headers = new Headers(request.headers);
    const accessToken = getAccessToken();

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    } else {
      headers.delete("Authorization");
    }

    return { ...request, headers };
  },
});
```

Полный клиент, частичные клиенты, TanStack Query и SWR используют этот `HttpClient`. Токен читается перед каждым защищённым запросом, поэтому после входа или выхода пересоздавать клиент не нужно.

## Вход и выход

Клиентский компонент сохраняет токен после успешного входа и удаляет его при выходе:

```ts
import { petStoreApi } from "./api.js";
import { clearAccessToken, setAccessToken } from "./token-storage.js";

export async function completeLogin(accessToken: string) {
  setAccessToken(accessToken);
  return petStoreApi.pets.getPet({ id: "42" });
}

export function logout(): void {
  clearAccessToken();
}
```

JWT в `localStorage` доступен любому успешно выполненному XSS-коду. Для авторизации на сервере используйте `HttpOnly` cookie и [отдельный клиент для текущего запроса](./ssr-cookie-auth.md).
