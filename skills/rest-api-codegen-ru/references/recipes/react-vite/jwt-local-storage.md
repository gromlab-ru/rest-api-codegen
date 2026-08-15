# JWT из `localStorage`

В браузерном приложении токен доступа можно хранить в `localStorage`. Общий обработчик `onRequest` добавляет его к защищённым запросам, поэтому компоненты не работают с заголовком Authorization напрямую.

Пути и переменные окружения соответствуют [базовому примеру React + Vite](./full-client.md).

## Результат

```text
src/
└── infra/
    └── pet-store-api/
        ├── generated/
        ├── token-storage.ts
        ├── http-client.ts
        └── api.ts
```

## Хранение токена

`src/infra/pet-store-api/token-storage.ts`:

```ts
const accessTokenKey = "pet-store.access-token";

export function getAccessToken(): string | null {
  return localStorage.getItem(accessTokenKey);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(accessTokenKey, token);
}

export function clearAccessToken(): void {
  localStorage.removeItem(accessTokenKey);
}
```

Этот файл предназначен только для браузера. На сервере `localStorage` недоступен.

## Настройка `HttpClient`

`src/infra/pet-store-api/http-client.ts`:

```ts
import { HttpClient } from "./generated/http-client.js";
import { getAccessToken } from "./token-storage.js";

const baseUrl = import.meta.env.VITE_PET_STORE_API_URL;

if (!baseUrl) {
  throw new Error("Не задан VITE_PET_STORE_API_URL");
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

Токен читается перед каждым защищённым запросом. После входа, выхода или обновления следующий вызов сразу получит актуальное значение.

Защищённые сгенерированные операции передают `secure: true`. Это только признак для `onRequest`; сам по себе он не добавляет авторизацию.

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

После успешного входа сохраните выданный токен доступа, затем используйте обычные методы клиента:

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

Полный клиент, частичные клиенты и отдельные операции могут использовать один `httpClient`. Настройку Authorization не нужно повторять в каждом разделе приложения.

## Ограничения безопасности

- Любой успешно выполненный XSS-код может прочитать JWT из `localStorage`.
- Не храните секреты внутри JWT: обычно его содержимое кодируется, а не шифруется.
- Не записывайте в журнал заголовок Authorization и `ApiError.request` без очистки.
- Задайте короткий срок жизни токена доступа и отдельную стратегию обновления.
- Если OpenAPI не помечает защищённый метод, исправьте спецификацию или временно добавьте ручную замену.

Обновление токена с защитой от параллельных запросов описано в [отдельном рецепте](./refresh-token.md). Для серверной авторизации используйте cookie, а не `localStorage`.
