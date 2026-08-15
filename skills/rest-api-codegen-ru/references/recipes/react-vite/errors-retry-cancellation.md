# Ошибки, повтор запросов и отмена

Правило повторной попытки задаётся один раз в `HttpClient`. В примере `GET`-запрос повторяется после временной ошибки сервера, а отдельный вызов можно ограничить по времени или отменить.

## Правило повторной попытки

`src/infra/pet-store-api/http-client.ts`:

```ts
import {
  ApiError,
  HttpClient,
} from "./generated/http-client.js";

const retryableStatuses = new Set([502, 503, 504]);

export const httpClient = new HttpClient({
  baseUrl: "https://api.example.com",

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

`HttpClient` не повторяет запросы автоматически: приложение явно определяет допустимые методы, статусы и количество повторов.

## Полный API-клиент

```ts
import { createApiClient } from "./generated/create-api-client.js";
import { operationsTree } from "./generated/operations-tree.js";
import { httpClient } from "./http-client.js";

export const petStoreApi = createApiClient(
  httpClient,
  operationsTree,
);
```

## Ошибка и отмена отдельного вызова

```ts
import { ApiError } from "../../infra/pet-store-api/generated/http-client.js";
import { petStoreApi } from "../../infra/pet-store-api/api.js";
import { httpClient } from "../../infra/pet-store-api/http-client.js";

const cancelToken = "pets-page";

export async function loadPet(id: string, signal?: AbortSignal) {
  try {
    return await petStoreApi.pets.getPet(
      { id },
      {
        signal,
        timeout: 5_000,
        cancelToken,
      },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(error.status, error.error);
    }

    throw error;
  }
}

export function cancelPetsPageRequests(): void {
  httpClient.abortRequest(cancelToken);
}
```

Компонент передаёт свой `AbortSignal` в `loadPet`. Дополнительный `cancelToken` позволяет отменить сразу все связанные запросы страницы; если это не нужно, не передавайте его.

## Как работает повторная попытка

- `retryCount` первой попытки равен `0`.
- `context.retry()` заново запускает всю обработку запроса, включая `onRequest`.
- Для каждой попытки тайм-аут отсчитывается заново.
- Внешний `AbortSignal` остаётся тем же.
- Задержку между повторами и случайный разброс времени нужно добавлять самостоятельно.
- Запрос, изменяющий данные, нельзя повторять без проверки идемпотентности и серверной семантики.

`onError` получает не только `ApiError`, но и ошибки сети, чтения ответа, обработчиков и отмены. Поэтому не повторяйте запрос без проверки типа ошибки. Необработанную ошибку всегда бросайте: `undefined` означает, что ошибка обработана.

Не отправляйте `ApiError.request` в телеметрию, пока не удалите Authorization, cookie и тело запроса.
