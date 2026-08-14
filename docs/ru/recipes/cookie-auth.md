# Cookie-аутентификация

Для cross-origin browser requests задайте Fetch option `credentials: "include"` в общем transport:

```ts
import { HttpClient } from "@acme/pet-store-rest-sdk/http-client";

export const httpClient = new HttpClient({
  baseUrl: "https://api.example.com",
  credentials: "include",
});
```

Полный, частичный и точечный уровни поверх `httpClient` будут отправлять credentials одинаково.

По умолчанию клиент использует `credentials: "same-origin"`. Constructor default можно переопределить для отдельного bound-вызова:

```ts
import { petStoreApi } from "./api.js";

const pet = await petStoreApi.pets.getPet(
  { id: "42" },
  { credentials: "omit" },
);
```

## Что остаётся за приложением и сервером

- `HttpClient` не создаёт, не читает и не обновляет cookie.
- Для cross-origin requests сервер должен вернуть явный allowed origin и `Access-Control-Allow-Credentials: true`.
- Cookie должна иметь подходящие `SameSite`, `Secure`, domain и path attributes.
- Cookie-аутентификация требует отдельной CSRF-защиты.
- `HttpOnly` cookie остаётся недоступной JavaScript, но браузер отправляет её согласно cookie policy.

В Node.js и SSR значение `credentials: "include"` не создаёт browser-like cookie jar. Cookie входящего запроса нужно безопасно передать самостоятельно; см. рецепт [SSR и `customFetch`](./ssr-custom-fetch.md).
