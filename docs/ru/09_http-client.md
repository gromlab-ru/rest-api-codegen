# `HttpClient`

## Назначение

`HttpClient` выполняет запросы через Fetch. Его экземпляр передаётся сгенерированным или ручным операциям. Обычно приложение создаёт один настроенный `HttpClient` для API и использует его в полном клиенте, частичных клиентах и отдельных вызовах.

```ts
import { HttpClient } from "@acme/pet-store-rest-sdk/http-client";

export const httpClient = new HttpClient({
  baseUrl: "https://api.example.com",
  credentials: "same-origin",
  timeout: 10_000,
});
```

Сгенерированный клиент и корневой npm-пакет содержат одинаковую реализацию `HttpClient`:

- для ручного API без OpenAPI импортируйте `HttpClient` из `@gromlab/rest-api-codegen`;
- для автоматического и смешанного сценариев импортируйте `HttpClient` из сгенерированного клиента.

Не смешивайте две реализации `HttpClient` для одного API без необходимости: в частности, у них будут разные классы `ApiError`.

## Конфигурация

| Поле | Назначение |
| --- | --- |
| `baseUrl` | Базовый URL. В сгенерированном клиенте по умолчанию берётся из `servers[0].url`. |
| `customFetch` | Замена глобального `fetch`. |
| `paramsSerializer` | Полная замена стандартной сериализации параметров строки запроса. |
| `responseParser` | Полная замена встроенного чтения ответа. |
| `onRequest` | Изменение запроса перед вызовом Fetch. |
| `onResponse` | Обработка успешно прочитанного ответа. |
| `onError` | Обработка ошибок HTTP, сети, чтения ответа, обработчиков и отмены. |
| Поддерживаемые поля `RequestInit` | `headers`, `credentials`, `cache`, `mode`, `redirect` и другие значения по умолчанию, кроме `body`, `method` и `signal`. |
| `timeout` | Тайм-аут по умолчанию в миллисекундах. |

Конструктор намеренно не принимает общие `signal` и `cancelToken`: отмена относится к конкретному запросу.

## URL и параметры запроса

Стандартный сериализатор:

- пропускает `undefined` верхнего уровня;
- пропускает `undefined` внутри массива;
- сериализует массив повторяющимися ключами;
- сохраняет `0`, `false` и пустую строку;
- кодирует ключ и значение через `encodeURIComponent`;
- корректно добавляет параметры перед фрагментом URL.

```ts
import { HttpClient } from "@acme/pet-store-rest-sdk/http-client";

const http = new HttpClient({ baseUrl: "https://api.example.com" });

export const result = http.request({
  path: "/search?fixed=1#results",
  method: "GET",
  query: { q: "тест", ids: [1, undefined, 2], enabled: false },
  format: "json",
});
```

`paramsSerializer` должен вернуть строку параметров без ведущего `?`.

## Заголовки

Заголовки конструктора и конкретного запроса объединяются без учёта регистра. Более позднее значение имеет приоритет.

`onRequest` получает уже объединённые заголовки. Если обработчик возвращает собственное поле `headers`, он должен сохранить нужные прежние значения, например через `new Headers(request.headers)`. После обработчика клиент выставляет `Content-Type` согласно `type`, а для `FormData` удаляет его, чтобы Fetch добавил границу частей (`boundary`).

Для JSON, JSON API, текста и данных в формате URL encoded клиент выставляет соответствующий `Content-Type`. Для `FormData` заданный вручную `Content-Type` удаляется, чтобы Fetch добавил корректную границу частей.

## Форматы тела запроса

| `ContentType` | Поведение |
| --- | --- |
| `Json` | `JSON.stringify`, включая `0` и `false`. |
| `JsonApi` | То же с `application/vnd.api+json`. |
| `Text` | Строка без изменения, остальные значения через `JSON.stringify`. |
| `UrlEncoded` | Стандартный query serializer. |
| `FormData` | Готовый `FormData` либо преобразование объекта. |

Если `body` не равен `undefined` или `null`, а `type` отсутствует, тело считается JSON.

При преобразовании объекта в `FormData` клиент сохраняет `Blob`, переводит примитивные значения в строки и сериализует вложенный объект в JSON. Все способы кодирования из OpenAPI не поддерживаются.

## Чтение ответа

Встроенные форматы соответствуют методам Fetch `Response`: `json`, `text`, `blob`, `formData`, `arrayBuffer` и другим доступным ключам `Body`.

Если нет `format` и `responseParser`, клиент возвращает `null` и не читает тело ответа.

`responseParser` получает копию исходного `Response` и полностью заменяет встроенное чтение ответа:

```ts
import { HttpClient, type ResponseParser } from "@acme/pet-store-rest-sdk/http-client";

const responseParser: ResponseParser = async (response, format) => {
  if (response.status === 204) return null;
  if (format === "json") return response.json();
  return response.text();
};

export const http = new HttpClient({ responseParser });
```

Формат выбирается по успешному ответу и применяется также к ответам с другими статусами. Если форматы успешного ответа и ошибки различаются, используйте собственный `responseParser`.

## `ApiError`

Ответ со статусом вне диапазона 2xx превращается в `ApiError` до вызова `onResponse`.

Ошибка содержит:

- `status` и `statusText`;
- исходный `Response`;
- прочитанные `data` и `error`;
- итоговый запрос после `onRequest`.

Не отправляйте `ApiError.request` в телеметрию, пока не удалите данные авторизации, cookie и тело запроса.

## Обработчики

Порядок успешного запроса:

1. Объединение настроек по умолчанию с параметрами запроса.
2. `onRequest`.
3. Вызов Fetch.
4. Чтение ответа.
5. Проверка HTTP-статуса.
6. `onResponse`.
7. Возврат `response.data`.

Любая ошибка этой последовательности попадает в `onError`, если он задан.

`onError` может:

- бросить ошибку;
- вернуть запасной результат;
- вернуть `context.retry()`.

Если вернуть `undefined`, ошибка считается обработанной и вызывающий код получит `undefined`.

## Повтор запроса

Автоматического повтора нет. `context.retry()` запускает новую попытку с исходными параметрами запроса и снова вызывает `onRequest`.

Всегда ограничивайте количество повторов через `context.retryCount` и учитывайте идемпотентность метода. Готовый пример: [ошибки, повтор запросов и отмена](./recipes/react-vite/errors-retry-cancellation.md).

## Отмена

Отдельный запрос поддерживает:

- внешний `AbortSignal`;
- `timeout`;
- `cancelToken` типа `Symbol | string | number`.

Несколько источников отмены работают вместе. Причина внешней отмены сохраняется. Вызов `http.abortRequest(token)` отменяет все активные запросы с этим токеном на данном экземпляре `HttpClient`, включая токен `0` и пустую строку.

```ts
import { getPet } from "@acme/pet-store-rest-sdk/operations/get-pet";
import { httpClient } from "./http-client.js";
const controller = new AbortController();

export const request = getPet(httpClient, { id: "42" }, {
  signal: controller.signal,
  timeout: 5_000,
});

controller.abort();
```

`customFetch` обязан передавать `init.signal` дальше, иначе отмена перестанет работать.

## Авторизация

`HttpClient` не хранит токен и не управляет cookie. JWT добавляется через `onRequest`, а отправка cookie настраивается через Fetch `credentials`. Готовые примеры: [JWT в React + Vite](./recipes/react-vite/jwt-local-storage.md), [cookie в React + Vite](./recipes/react-vite/cookie-auth.md), [JWT в Next.js](./recipes/nextjs/jwt-local-storage.md) и [cookie в Next.js](./recipes/nextjs/cookie-auth.md).
