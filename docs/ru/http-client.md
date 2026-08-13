# `HttpClient`

## Назначение

`HttpClient` — Fetch-based transport. Его экземпляр передаётся generated или ручным operations. Обычно приложение создаёт один configured transport на API и переиспользует его в полном клиенте, частичных клиентах и точечных вызовах.

```ts
import { HttpClient } from "@acme/pet-sdk/http-client";

export const petHttpClient = new HttpClient({
  baseUrl: "https://api.example.com",
  credentials: "same-origin",
  timeout: 10_000,
});
```

Generated SDK и корневой npm-пакет содержат одинаковую реализацию transport. Для generated operations используйте `HttpClient` из того же SDK.

## Конфигурация

| Поле | Назначение |
| --- | --- |
| `baseUrl` | Базовый URL. В generated SDK по умолчанию берётся из `servers[0].url`. |
| `customFetch` | Замена global `fetch`. |
| `paramsSerializer` | Полная замена стандартной сериализации query. |
| `responseParser` | Полная замена встроенного response parser. |
| `onRequest` | Изменение request перед fetch. |
| `onResponse` | Обработка успешного parsed response. |
| `onError` | Обработка HTTP, network, parser, interceptor и abort errors. |
| Поддерживаемые `RequestInit` fields | `headers`, `credentials`, `cache`, `mode`, `redirect` и другие defaults, кроме `body`, `method` и `signal`. |
| `timeout` | Default timeout в миллисекундах. |

Constructor намеренно не принимает общий `signal` и `cancelToken`: cancellation относится к конкретному request.

## URL и query

Стандартный serializer:

- пропускает top-level `undefined`;
- пропускает `undefined` внутри массива;
- сериализует массив повторяющимися keys;
- сохраняет `0`, `false` и пустую строку;
- кодирует key и value через `encodeURIComponent`;
- корректно добавляет query перед URL fragment.

```ts
import { HttpClient } from "@acme/pet-sdk/http-client";

const http = new HttpClient({ baseUrl: "https://api.example.com" });

export const result = http.request({
  path: "/search?fixed=1#results",
  method: "GET",
  query: { q: "тест", ids: [1, undefined, 2], enabled: false },
  format: "json",
});
```

`paramsSerializer` должен вернуть query string без ведущего `?`.

## Headers

Headers конструктора и request объединяются без учёта регистра. Более позднее значение побеждает.

`onRequest` получает уже объединённые headers. Если interceptor возвращает собственное поле `headers`, он должен сам сохранить нужные прежние значения, например через `new Headers(request.headers)`. После interceptor transport принудительно выставляет `Content-Type` согласно `type`, а для `FormData` удаляет его, чтобы Fetch добавил multipart boundary.

Для JSON, JSON API, text и URL encoded клиент выставляет соответствующий `Content-Type`. Для `FormData` ручной `Content-Type` удаляется, чтобы Fetch добавил корректный multipart boundary.

## Body formats

| `ContentType` | Поведение |
| --- | --- |
| `Json` | `JSON.stringify`, включая `0` и `false`. |
| `JsonApi` | То же с `application/vnd.api+json`. |
| `Text` | Строка без изменения, остальные значения через `JSON.stringify`. |
| `UrlEncoded` | Стандартный query serializer. |
| `FormData` | Готовый `FormData` либо преобразование object. |

Если body не равен `undefined` или `null`, а `type` отсутствует, body считается JSON.

Object-to-FormData сохраняет `Blob`, строкует primitives и сериализует вложенный object в JSON-строку. Это не универсальная реализация всех OpenAPI styles.

## Response parsing

Встроенные formats соответствуют методам Fetch `Response`: `json`, `text`, `blob`, `formData`, `arrayBuffer` и другие доступные keys `Body`.

Если нет `format` и `responseParser`, клиент возвращает `null` и не читает body.

`responseParser` получает clone исходного `Response` и полностью заменяет встроенный parser:

```ts
import { HttpClient, type ResponseParser } from "@acme/pet-sdk/http-client";

const responseParser: ResponseParser = async (response, format) => {
  if (response.status === 204) return null;
  if (format === "json") return response.json();
  return response.text();
};

export const http = new HttpClient({ responseParser });
```

Response format выбирается по success response и применяется также к non-2xx response. Для API с разными success/error media types используйте custom parser.

## `ApiError`

Non-2xx response превращается в `ApiError` до `onResponse`.

Ошибка содержит:

- `status` и `statusText`;
- исходный `Response`;
- parsed `data` и `error`;
- итоговый request после `onRequest`.

Не отправляйте `ApiError.request` в telemetry без удаления authorization, cookies и body.

## Interceptors

Порядок успешного запроса:

1. Merge defaults и request params.
2. `onRequest`.
3. Fetch.
4. Response parsing.
5. Проверка HTTP status.
6. `onResponse`.
7. Возврат `response.data`.

Любая ошибка pipeline попадает в `onError`, если он задан.

`onError` может:

- бросить ошибку;
- вернуть fallback;
- вернуть `context.retry()`.

Если вернуть `undefined`, ошибка считается обработанной и caller получит `undefined`.

## Retry

Автоматической retry policy нет. `context.retry()` запускает полную новую попытку с исходными request params и снова вызывает `onRequest`.

Всегда ограничивайте retry через `context.retryCount` и учитывайте идемпотентность метода. Готовый пример: [ошибки, retry и cancellation](./recipes/errors-retry-cancellation.md).

## Cancellation

Request поддерживает:

- внешний `AbortSignal`;
- `timeout`;
- `cancelToken` типа `Symbol | string | number`.

Несколько источников cancellation композируются. Причина внешнего abort сохраняется. Вызов `http.abortRequest(token)` отменяет все одновременно активные requests с этим token на данном экземпляре `HttpClient`, включая token `0` и пустую строку.

```ts
import { getPet } from "@acme/pet-sdk/operations/get-pet";
import { petHttpClient } from "./client.js";
const controller = new AbortController();

export const request = getPet(petHttpClient, { id: "42" }, {
  signal: controller.signal,
  timeout: 5_000,
});

controller.abort();
```

`customFetch` обязан передавать `init.signal` дальше, иначе cancellation перестанет работать.

## Авторизация

Transport не хранит token и не управляет cookies. JWT реализуется через `onRequest`, cookie requests — через Fetch `credentials`. См. рецепты [JWT](./recipes/jwt-auth.md) и [cookies](./recipes/cookie-auth.md).
