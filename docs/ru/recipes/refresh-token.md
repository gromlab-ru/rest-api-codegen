# Refresh token и ограниченный retry

Цель рецепта — повторить защищённый request ровно один раз после `401`, обновив access token. Refresh выполняется отдельным raw Fetch, чтобы не создать рекурсию `onError`.

```ts
import {
  ApiError,
  HttpClient,
} from "@acme/pet-sdk/http-client";

interface RefreshPayload {
  accessToken: string;
}

let accessToken: string | null = null;
let refreshInFlight: Promise<void> | undefined;

async function refreshAccessToken(): Promise<void> {
  const response = await fetch("https://api.example.com/auth/refresh", {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Refresh failed: ${response.status}`);
  }

  const payload = await response.json() as RefreshPayload;
  accessToken = payload.accessToken;
}

function refreshOnce(): Promise<void> {
  return refreshInFlight ??= refreshAccessToken().finally(() => {
    refreshInFlight = undefined;
  });
}

export const petHttpClient = new HttpClient({
  baseUrl: "https://api.example.com",
  credentials: "include",

  onRequest(request) {
    if (!request.secure) return request;

    const headers = new Headers(request.headers);
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    } else {
      headers.delete("Authorization");
    }

    return { ...request, headers };
  },

  async onError(error, context) {
    if (
      !(error instanceof ApiError) ||
      error.status !== 401 ||
      !context.request.secure ||
      context.retryCount >= 1
    ) {
      throw error;
    }

    const failedAuthorization = new Headers(context.request.headers)
      .get("Authorization");
    const currentAuthorization = accessToken
      ? `Bearer ${accessToken}`
      : null;

    if (failedAuthorization === currentAuthorization) {
      await refreshOnce();
    }

    return context.retry();
  },
});
```

Полный, частичный и точечный API layers импортируют этот `petHttpClient`. Refresh policy остаётся единой и не копируется рядом с каждой operation.

## Как работает защита от гонок

`refreshInFlight` объединяет параллельные refresh-запросы. Сравнение Authorization не запускает второй refresh, если другой request уже успел записать новый token.

`context.retryCount` начинается с `0`. Условие `>= 1` допускает одну повторную попытку и предотвращает бесконечный цикл.

`context.retry()` использует исходные request params, но заново вызывает `onRequest`. Поэтому в повторный request попадает новый token.

## Ограничения

- `ApiError` импортируется из того же SDK, что и `HttpClient`.
- Необработанную ошибку нужно бросить. Возврат `undefined` из `onError` считается успешным fallback.
- Повтор mutation безопасен только если сервер гарантирует отсутствие side effect до ответа `401` либо поддерживает idempotency key.
- Timeout начинается заново для каждой попытки и не является общим deadline.
- Не отправляйте refresh token в JavaScript, если он хранится в `HttpOnly` cookie.
- Если refresh endpoint тоже требует этот interceptor, используйте отдельный `HttpClient` без refresh retry.
