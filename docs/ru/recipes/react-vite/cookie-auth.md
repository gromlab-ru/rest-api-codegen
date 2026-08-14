# Cookie-аутентификация

Если API использует cookie, браузер сам хранит и отправляет её. Достаточно один раз настроить `credentials` в общем `HttpClient`.

Пути и переменные окружения соответствуют [базовому примеру React + Vite](./full-client.md).

## Настройка `HttpClient`

`src/infra/pet-store-api/http-client.ts`:

```ts
import { HttpClient } from "./generated/http-client.js";

const baseUrl = import.meta.env.VITE_PET_STORE_API_URL;

if (!baseUrl) {
  throw new Error("Не задан VITE_PET_STORE_API_URL");
}

export const httpClient = new HttpClient({
  baseUrl,
  credentials: "include",
});
```

`credentials: "include"` требуется, если приложение и API находятся на разных доменах. Для одного домена обычно достаточно значения Fetch по умолчанию.

## Полный API-клиент

`src/infra/pet-store-api/api.ts`:

```ts
import { createApiClient } from "./generated/create-api-client.js";
import { operationsTree } from "./generated/operations-tree.js";
import { httpClient } from "./http-client.js";

export const petStoreApi = createApiClient(
  httpClient,
  operationsTree,
);
```

Все методы используют одинаковые настройки cookie:

```ts
import { petStoreApi } from "./api.js";

const pet = await petStoreApi.pets.getPet({ id: "42" });
const note = await petStoreApi.notes.readNote({ id: 7 });
```

`HttpClient` не читает cookie и не создаёт заголовок Cookie вручную. В браузере это делает Fetch с учётом адреса, `credentials` и настроек cookie.

## Требования к API

Для запросов на другой домен API должен вернуть:

```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Credentials: true
```

Значение `Access-Control-Allow-Origin: *` нельзя использовать вместе с авторизационными данными.

Cookie должна иметь подходящие атрибуты:

- `HttpOnly`, если JavaScript не должен читать значение;
- `Secure` для HTTPS;
- подходящий `SameSite`;
- корректные `Domain` и `Path`.

Cookie-аутентификация не отменяет CSRF-защиту. Для запросов, изменяющих данные, используйте принятую сервером стратегию: CSRF-токен, проверку Origin/Referer, настройку SameSite или их сочетание.

## SSR отличается

В Node.js и серверных компонентах `credentials: "include"` не переносит cookie из входящего запроса автоматически. Для Next.js создавайте отдельный клиент на каждый запрос: [cookie-аутентификация на сервере](../nextjs/ssr-cookie-auth.md).
