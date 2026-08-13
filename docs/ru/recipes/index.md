# Рецепты

Рецепты разделяют два независимых решения:

1. Где находится generated SDK: внутри приложения, workspace-пакета или отдельного npm-пакета.
2. Как он используется: как полный клиент, частичный доменный клиент или точечная operation.

Во всех примерах приложение создаёт configured `HttpClient`. Он остаётся общей базой для всех API-клиентов и точечных вызовов.

## Начало работы

- [SDK внутри приложения](./local-sdk.md) — базовый вариант для React/Vite и небольших проектов.
- [SDK как workspace или npm-пакет](./sdk-package.md) — рекомендуемая изоляция для монорепозиториев и нескольких consumers.
- [Полный API-клиент](./full-client.md) — привязка всего `operationsTree` к transport.

## Минимальные чанки

- [Частичный доменный клиент](./partial-client.md) — несколько выбранных operations из одного barrel.
- [Точечная operation](./direct-operation.md) — hook, lazy module или небольшой adapter.

## Расширение и эксплуатация

- [Пользовательские operations поверх ошибочной OpenAPI](./sdk-custom-operations.md).
- [Детерминированная генерация в CI](./deterministic-generation-ci.md).
- [JWT через `onRequest`](./jwt-auth.md).
- [Cookie-аутентификация](./cookie-auth.md).
- [Refresh token и ограниченный retry](./refresh-token.md).
- [React без generated hooks](./react-client.md).
- [FormData и non-JSON responses](./file-upload.md).
- [Ошибки, retry и cancellation](./errors-retry-cancellation.md).
- [SSR и `customFetch`](./ssr-custom-fetch.md).

Общая модель описана в разделе [композиции API-клиента](../client-composition.md), а transport-контракт — в справочнике [`HttpClient`](../http-client.md).
