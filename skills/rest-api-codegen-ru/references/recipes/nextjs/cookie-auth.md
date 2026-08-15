# Cookie-аутентификация в клиентских компонентах Next.js

Браузер сам хранит и отправляет cookie. Достаточно один раз настроить `credentials` в браузерном `HttpClient`:

```ts
import "client-only";

import { HttpClient } from "./generated/http-client.js";

const baseUrl = process.env.NEXT_PUBLIC_PET_STORE_API_URL;

if (!baseUrl) {
  throw new Error("Не задан NEXT_PUBLIC_PET_STORE_API_URL");
}

export const httpClient = new HttpClient({
  baseUrl,
  credentials: "include",
});
```

Полный клиент, частичные клиенты, TanStack Query и SWR используют один `HttpClient` и одинаковые настройки cookie.

Для запросов на другой домен API должен вернуть конкретный `Access-Control-Allow-Origin` и `Access-Control-Allow-Credentials: true`. У cookie должны быть подходящие `SameSite`, `Secure`, `Domain` и `Path`; изменяющие данные запросы требуют защиты от CSRF.

Этот пример относится только к запросам из браузера. Для серверного компонента используйте [`await cookies()` и отдельный клиент на каждый запрос](./ssr-cookie-auth.md).
