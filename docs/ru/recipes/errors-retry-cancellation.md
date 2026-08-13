# Ошибки, retry и cancellation

`HttpClient` не навязывает retry policy. Приложение явно определяет retryable statuses, методы и лимит попыток.

```ts
import {
  ApiError,
  HttpClient,
} from "@acme/pet-sdk/http-client";

const retryableStatuses = new Set([502, 503, 504]);

export const petHttpClient = new HttpClient({
  onError(error, context) {
    if (
      error instanceof ApiError &&
      context.request.method === "GET" &&
      retryableStatuses.has(error.status) &&
      context.retryCount < 1
    ) {
      return context.retry();
    }

    throw error;
  },
});
```

Retry policy настраивается один раз в общем `client.ts`. В leaf module можно использовать точечную operation и тот же transport:

```ts
import { ApiError } from "@acme/pet-sdk/http-client";
import { getPet } from "@acme/pet-sdk/operations/get-pet";
import { petHttpClient } from "../../infra/pet-api/client.js";

const petToken = (id: string) => `pet:${id}`;

export async function loadPet(
  id: string,
  signal?: AbortSignal,
) {
  try {
    return await getPet(petHttpClient, { id }, {
      signal,
      timeout: 5_000,
      cancelToken: petToken(id),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(error.status, error.error);
    }

    throw error;
  }
}

export function cancelPet(id: string): void {
  petHttpClient.abortRequest(petToken(id));
}
```

## Ошибки

`ApiError` создаётся для non-2xx response и содержит status, исходный `Response`, parsed error payload и итоговый request после `onRequest`.

`onError` также получает network, parser, interceptor и abort errors. Поэтому retry нельзя включать для любой ошибки без проверки её типа.

Не отправляйте `ApiError.request` в telemetry без удаления Authorization, cookies и body.

## Retry

- `retryCount` первой попытки равен `0`.
- `context.retry()` полностью повторяет pipeline и снова вызывает `onRequest`.
- Каждая попытка получает новый timeout.
- Внешний `AbortSignal` остаётся тем же.
- Backoff и jitter встроенно не реализованы.
- Для mutation учитывайте idempotency и возможность уже выполненного side effect.

Если `onError` вернёт `undefined`, caller получит `undefined`, хотя тип operation этого может не отражать. Необработанную ошибку всегда бросайте.

## Cancellation

`AbortSignal`, timeout и cancel token композируются. Один `cancelToken` на одном экземпляре `HttpClient` может соответствовать нескольким активным requests; `abortRequest(token)` отменит их все.

Допустимы `Symbol`, строки и числа, включая пустую строку и `0`. Метод `abortRequest` принадлежит конкретному `HttpClient` и не входит в минимальный интерфейс `ApiRequestClient`.

Если задан `customFetch`, он обязан передать `init.signal` дальше.
