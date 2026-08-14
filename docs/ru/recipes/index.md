# Рецепты

Перед выбором рецепта определите две независимые вещи:

1. Откуда берутся types и operations.
2. Какой объём API нужен конкретному consumer.

Общая схема выбора приведена в [обзоре](../01_overview.md), а имена файлов и exports - в [соглашениях](../02_naming-conventions.md). Во всех вариантах один configured `HttpClient` остаётся общей базой для API-клиентов и точечных вызовов.

## Выбрать сценарий

- [Generated SDK](../05_generated-sdk.md) - актуальная OpenAPI является источником истины.
- [Ручное создание API-клиента](../06_manual-client.md) - OpenAPI пока нет.
- [Смешанный сценарий](../07_custom-operations.md) - отдельная generated operation временно исправляется вручную.
- [Смешанный сценарий поверх ошибочной OpenAPI](./sdk-custom-operations.md) - законченный пример временной подмены.

## Выбрать способ использования

- [Полный API-клиент](./full-client.md) - весь API доступен через одно привязанное дерево.
- [Частичный доменный клиент](./partial-client.md) - domain получает только связанную группу operations.
- [Точечная operation](./direct-operation.md) - hook, lazy module или adapter использует один endpoint.

Способы не исключают друг друга. Выбирайте их на уровне consumer и import boundary, а не один раз для всего приложения.

## Разместить generated SDK

- [SDK внутри приложения](./local-sdk.md) - базовый вариант для React/Vite и одного consumer.
- [SDK как workspace или npm-пакет](./sdk-package.md) - несколько consumers или независимый package lifecycle.

## Настроить transport

- [JWT через `onRequest`](./jwt-auth.md).
- [Cookie-аутентификация](./cookie-auth.md).
- [Refresh token и ограниченный retry](./refresh-token.md).
- [Ошибки, retry и cancellation](./errors-retry-cancellation.md).
- [SSR и `customFetch`](./ssr-custom-fetch.md).
- [FormData и non-JSON responses](./file-upload.md).

## Интегрировать и эксплуатировать

- [React без generated hooks](./react-client.md).
- [Детерминированная генерация в CI](./deterministic-generation-ci.md).

Подробный transport-контракт описан в справочнике [`HttpClient`](../09_http-client.md).
