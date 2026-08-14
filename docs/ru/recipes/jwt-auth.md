# JWT через `onRequest`

Generated protected operations передают `secure: true`. Сам `HttpClient` не хранит token: приложение настраивает авторизацию один раз в общем transport module.

`http-client.ts`:

```ts
import { HttpClient } from "@acme/pet-store-rest-sdk/http-client";

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export const httpClient = new HttpClient({
  baseUrl: "https://api.example.com",

  onRequest(request) {
    if (!request.secure) return request;
    if (!accessToken) throw new Error("Требуется access token");

    const headers = new Headers(request.headers);
    headers.set("Authorization", `Bearer ${accessToken}`);

    return { ...request, headers };
  },
});
```

`new Headers(request.headers)` сохраняет headers конструктора и конкретного вызова независимо от формы `HeadersInit`.

Полный, частичный и точечный уровни используют один `httpClient`; повторять interceptor в каждом API module не нужно:

```ts
import { petStoreApi } from "./api.js";
import { setAccessToken } from "./http-client.js";

setAccessToken("eyJ...");
const pet = await petStoreApi.pets.getPet({ id: "42" });
```

`onRequest` запускается заново при `context.retry()`, поэтому повторная попытка получает актуальный token.

## Важные ограничения

- `secure` — только marker из OpenAPI security, а не механизм авторизации.
- Если security в спецификации отсутствует ошибочно, используйте custom operation или исправьте OpenAPI.
- Не логируйте request headers без удаления `Authorization`.
- Для browser-приложения оцените последствия хранения JWT в JavaScript-accessible storage.
- Ошибка из `onRequest` передаётся в `onError`, если interceptor настроен.

Обновление истёкшего token разобрано в рецепте [refresh token](./refresh-token.md).
