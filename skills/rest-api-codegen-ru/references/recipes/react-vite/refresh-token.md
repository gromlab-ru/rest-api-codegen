# Обновление токена доступа и повтор запроса

Этот пример дополняет [JWT из `localStorage`](./jwt-local-storage.md): после ответа `401` клиент один раз обновляет токен доступа и повторяет исходный запрос. Одновременные ошибки ждут одно общее обновление токена.

Предполагается, что токен доступа хранится в `localStorage`, а токен обновления - в `HttpOnly` cookie и отправляется только на метод обновления.

## Настройка `HttpClient`

`src/infra/pet-store-api/http-client.ts`:

```ts
import {
  ApiError,
  HttpClient,
} from "./generated/http-client.js";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "./token-storage.js";

interface RefreshPayload {
  accessToken: string;
}

const baseUrl = import.meta.env.VITE_PET_STORE_API_URL?.replace(/\/$/, "");

if (!baseUrl) {
  throw new Error("Не задан VITE_PET_STORE_API_URL");
}

let refreshInFlight: Promise<void> | undefined;

async function refreshAccessToken(): Promise<void> {
  const response = await fetch(`${baseUrl}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    clearAccessToken();
    throw new Error(`Не удалось обновить токен: ${response.status}`);
  }

  const payload = await response.json() as RefreshPayload;
  setAccessToken(payload.accessToken);
}

function refreshOnce(): Promise<void> {
  return refreshInFlight ??= refreshAccessToken().finally(() => {
    refreshInFlight = undefined;
  });
}

export const httpClient = new HttpClient({
  baseUrl,
  credentials: "include",

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
    const accessToken = getAccessToken();
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

## Полный API-клиент

`api.ts` остаётся обычным:

```ts
import { createApiClient } from "./generated/create-api-client.js";
import { operationsTree } from "./generated/operations-tree.js";
import { httpClient } from "./http-client.js";

export const petStoreApi = createApiClient(
  httpClient,
  operationsTree,
);
```

Любой защищённый метод использует общие настройки:

```ts
const pet = await petStoreApi.pets.getPet({ id: "42" });
```

## Как исключаются повторные обновления

`refreshInFlight` объединяет одновременные попытки обновления. Если другой запрос уже сохранил новый токен, второй запрос на обновление не запускается. `context.retry()` снова вызывает `onRequest`, поэтому повтор использует актуальный токен доступа.

`context.retryCount >= 1` разрешает только один повтор и предотвращает бесконечный цикл.

## Ограничения

- Обновление выполняется отдельным вызовом Fetch, чтобы снова не запустить тот же `onError`.
- Необработанную ошибку из `onError` нужно бросить; `undefined` означает, что ошибка обработана.
- Запрос, изменяющий данные, можно повторять только при безопасной серверной семантике или с ключом идемпотентности.
- Тайм-аут отсчитывается заново для каждой попытки и не ограничивает общее время выполнения.
- Если обновить токен не удалось, приложение должно завершить пользовательскую сессию и показать форму входа.
