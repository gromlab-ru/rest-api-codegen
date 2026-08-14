# SSR и `customFetch`

На сервере создавайте отдельный `HttpClient` для каждого входящего request. Singleton с пользовательскими cookies или tokens может привести к межпользовательской утечке.

```ts
import {
  HttpClient,
} from "@acme/pet-store-rest-sdk/http-client";
import { getPet } from "@acme/pet-store-rest-sdk/operations/get-pet";
import type { Pet } from "@acme/pet-store-rest-sdk";

export function loadPetForSsr(
  incomingRequest: Request,
  rawApiBaseUrl: string,
  id: string,
): Promise<Pet> {
  const baseUrl = rawApiBaseUrl.replace(/\/$/, "");
  const allowedOrigin = new URL(baseUrl).origin;
  const cookie = incomingRequest.headers.get("cookie");

  const http = new HttpClient({
    baseUrl,

    async customFetch(input, init) {
      const target = new URL(
        input instanceof Request ? input.url : input,
      );

      if (target.origin !== allowedOrigin) {
        throw new Error(`Запрещённый API origin: ${target.origin}`);
      }

      const headers = new Headers(init?.headers);
      if (cookie) headers.set("cookie", cookie);

      return fetch(input, {
        ...init,
        headers,
        cache: "no-store",
      });
    },
  });

  return getPet(http, { id });
}
```

## Правила безопасного forwarding

- Node Fetch не пересылает cookie входящего HTTP request автоматически.
- Передавайте только явно разрешённые headers и только на проверенный API origin.
- Не проксируйте `Authorization`, cookie и tracing headers на произвольный URL.
- Upstream `Set-Cookie` не переносится в SSR response автоматически.
- В Node обычно нужен абсолютный URL.

`customFetch` получает уже собранные URL и `RequestInit`. Обёртка обязана сохранить method, body, headers, credentials и особенно `signal`, иначе cancellation перестанет работать.

URL клиента строится простой конкатенацией `baseUrl + path`. Нормализуйте trailing slash в конфигурации, но не изменяйте generated path.

Если framework предоставляет fetch как метод объекта, оберните вызов стрелочной функцией, чтобы сохранить нужный `this` и framework-specific context.
