# Проектирование REST-клиента

Этот справочник дополняет возможности `rest-api-codegen` общими правилами клиентской REST-интеграции. Он не означает, что пакет автоматически реализует все перечисленные механизмы. Генератор создаёт contracts и request metadata, `HttpClient` предоставляет transport primitives, а политика API остаётся ответственностью приложения и сервера.

## Сначала зафиксируйте контракт

До генерации или ручной реализации определите:

- base URL, версию API и правила соединения base URL с path;
- HTTP method и path каждого endpoint;
- path, query, header и cookie parameters;
- request и response media types;
- success и error schemas для всех значимых status codes;
- способ аутентификации и среду выполнения: browser, Node.js или SSR;
- pagination, rate limits, retry и idempotency guarantees;
- требования к timeout, cancellation, caching и observability.

OpenAPI должна быть источником этих данных. Если её пока нет, зафиксируйте тот же минимальный контракт рядом с ручной operation и покройте request metadata тестом. Пример ручного слоя приведён в [руководстве без OpenAPI](./06_manual-client.md).

## Семантика HTTP methods

| Method | Safe | Idempotent по HTTP | Практическое правило |
| --- | --- | --- | --- |
| `GET`, `HEAD` | Да | Да | Не изменяйте состояние сервера; допускайте caching и условный retry |
| `PUT` | Нет | Да | Повтор допустим только при неизменном полном representation и подтверждённой серверной семантике |
| `DELETE` | Нет | Да | Повтор может вернуть другой status, хотя требуемое итоговое состояние совпадает |
| `POST` | Нет | Нет | Не повторяйте автоматически без idempotency key или отдельной гарантии сервера |
| `PATCH` | Нет | Не гарантируется | Считайте неидемпотентным, пока API явно не гарантирует обратное |

Идемпотентность метода не делает безопасным любой конкретный endpoint. Учитывайте побочные эффекты, optimistic concurrency и договорённости сервера.

## URL, path и query

- Кодируйте каждое динамическое значение path через `encodeURIComponent`, но не кодируйте весь path целиком.
- Не передавайте access tokens, пароли и другие secrets в query string: URL попадает в историю, proxy logs и telemetry.
- Не теряйте значимые falsy values `0`, `false` и пустую строку.
- Сериализация массивов и вложенных объектов является частью API contract. Повторяющиеся keys, comma-separated values и `deepObject` не взаимозаменяемы.
- Проверяйте границу slash между base URL и path. `HttpClient` соединяет их простой конкатенацией и не нормализует URL.
- Generated path parameters сейчас не кодируются автоматически. Если значение может содержать `/`, `?`, `#` или Unicode, исправьте контракт либо используйте проверенную custom operation.

Стандартный serializer `HttpClient` кодирует массивы повторяющимися keys и не реализует все OpenAPI `style`/`explode` combinations. Для другого wire format задайте `paramsSerializer` и протестируйте фактический URL.

## Request и response media types

- Передавайте `Content-Type`, соответствующий реальному body, и `Accept`, если endpoint поддерживает несколько representations.
- Не задавайте `Content-Type` вручную для `FormData`: boundary должен сформировать runtime.
- Не пытайтесь разбирать `204 No Content` как JSON.
- Учитывайте `201 Created` с `Location`, `202 Accepted` с асинхронным completion flow и `206 Partial Content` для range responses.
- Выбирайте parser по status и фактическому `Content-Type`, если success и error responses используют разные форматы.
- Не считайте TypeScript type runtime-валидацией. Проверяйте недоверенный response отдельным validator, если это является границей безопасности или целостности данных.

Generated operation выбирает один response format из OpenAPI metadata. Для неоднородных ответов настройте content-type-aware `responseParser` на `HttpClient` и закрепите поведение тестом. Одна custom operation задаёт только общий `format` запроса и сама по себе не позволяет разбирать success и error по-разному.

## Ошибки

Разделяйте как минимум четыре класса ошибок:

1. Сетевой сбой, timeout или cancellation до получения HTTP response.
2. HTTP response с non-2xx status.
3. Ошибка разбора response body.
4. Ошибка бизнес-контракта в успешном response.

Для машинно-читаемых HTTP-ошибок предпочтителен стабильный schema, например Problem Details с media type `application/problem+json` по RFC 9457. Клиент не должен определять тип ошибки только по локализованному `message`.

Полезные status groups:

- `401` требует новой аутентификации или обновления credentials;
- `403` означает недостаток прав, а не необходимость бесконечно обновлять token;
- `409` и `412` часто связаны с conflict или optimistic concurrency;
- `422` сообщает об ошибке входных данных, если такой contract принят API;
- `429` требует учитывать `Retry-After` и общую retry policy;
- `5xx` не гарантирует, что изменяющий запрос не был применён.

Не отправляйте `ApiError.request`, authorization headers, cookies и request body в telemetry без явной очистки.

## Аутентификация и среда выполнения

`secure: true` в operation является только marker для `onRequest`. Он не выбирает security scheme и не добавляет credentials самостоятельно.

- В браузере bearer token обычно добавляется через `onRequest`; хранение в `localStorage` остаётся доступным XSS-коду.
- Cookie auth требует корректных CORS, `SameSite`, `Secure`, `Domain`, `Path` и CSRF controls.
- `credentials: "include"` в Node.js не переносит cookies входящего HTTP-запроса автоматически.
- В SSR не храните пользовательские token или cookie в глобальном singleton transport.
- Создавайте отдельный authenticated `HttpClient` для каждого входящего SSR request и передавайте только allowlisted headers/cookies.

Готовые варианты находятся в рецептах [React + Vite](./recipes/react-vite/index.md) и [Next.js](./recipes/nextjs/index.md).

## Timeout, cancellation и retry

Каждый внешний запрос должен иметь понятную стратегию timeout и cancellation. Cancellation по уходу пользователя со страницы не является ошибкой, которую нужно автоматически повторять.

Retry допускается, когда одновременно выполнены условия:

- ошибка является временной;
- method и конкретная операция допускают повтор;
- число попыток строго ограничено;
- учитывается `Retry-After`, если сервер его прислал;
- между попытками применяется backoff, обычно с jitter;
- исходный body можно безопасно отправить повторно;
- общий latency budget пользователя не превышен.

`HttpClient` не повторяет запросы автоматически. `context.retry()` снова выполняет request pipeline, поэтому `onError` обязан ограничивать `retryCount`. Для `POST` и других изменяющих запросов нужен idempotency key или явная серверная гарантия.

Idempotency key создаётся один раз до первой попытки и передаётся в исходных request params. Все попытки отправляют тот же key и неизменный body. Не создавайте новый key в `onRequest`, потому что interceptor запускается повторно. Клиентский key защищает от дублей только если сервер подтверждает deduplication contract, scope и срок хранения ключа.

## Pagination, caching и concurrency

- Не угадывайте pagination: offset, cursor и link-based contracts имеют разные свойства.
- Cursor должен считаться opaque value; не изменяйте и не декодируйте его без требования API.
- Сохраняйте порядок и filters между страницами, иначе данные могут пропускаться или дублироваться.
- Для cacheable `GET` учитывайте `Cache-Control`, `ETag`, `Last-Modified`, `If-None-Match` и `If-Modified-Since`.
- `304 Not Modified` имеет смысл только вместе с ранее сохранённым representation.
- Для конкурентных изменений используйте contract сервера: version field, `ETag`/`If-Match` или другой optimistic locking mechanism.

`rest-api-codegen` не предоставляет cache или pagination layer. Эти механизмы реализуются в приложении либо библиотеке server state поверх отдельных operations.

## Upload и download

- Для multipart не устанавливайте boundary вручную.
- Не включайте отсутствующие поля в `FormData`: generic conversion может превратить `undefined` в строку.
- До загрузки проверяйте ограничения размера и типа файла, но не считайте browser MIME доверенным доказательством.
- Для больших downloads учитывайте streaming, memory usage, progress и cancellation.
- Проверяйте `Content-Disposition` и не используйте полученное имя файла без sanitization.

## Проверки клиента

Минимальный набор проверок:

1. Unit test operation через fake `ApiRequestClient`: method, path, query, headers, body, `type`, `format` и `secure`.
2. Contract test против OpenAPI или контролируемого test server.
3. Проверка success, structured HTTP error, invalid payload, timeout и cancellation.
4. Проверка retry limit и отсутствия retry для неидемпотентных операций.
5. Strict TypeScript typecheck и production build реального consumer.
6. Для generated SDK проверка diff после повторной генерации.
7. Для workspace SDK проверка package `exports` и импорта из собранного `dist`.

## Граница ответственности пакета

`rest-api-codegen` не автоматизирует:

- runtime-валидацию responses;
- получение и хранение credentials;
- retry, rate limiting и circuit breaker policy;
- caching, pagination и optimistic updates;
- API version negotiation;
- исправление семантически неверной OpenAPI;
- создание workspace или npm package metadata.

Агент или разработчик должен настроить эти части явно, не приписывая их generated SDK.
