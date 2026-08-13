# Документация `rest-api-codegen`

`rest-api-codegen` создаёт типизированный TypeScript REST SDK из OpenAPI JSON. Документация разделена на справочные материалы и пошаговые рецепты.

## С чего начать

- [Обзор проекта](./overview.md) — назначение, преимущества и границы генератора.
- [Быстрый старт](./getting-started.md) — установка, генерация и первый запрос.
- [CLI](./cli.md) — входные данные, параметры команды, ошибки и правила регенерации.

## Использование SDK

- [Сгенерированный SDK](./generated-sdk.md) — структура файлов, exports и формы вызова operations.
- [Композиция API-клиента](./client-composition.md) — общий transport, полный клиент, частичные клиенты и точечные operations.
- [`HttpClient`](./http-client.md) — transport, interceptors, ошибки, retry и cancellation.
- [Пользовательские operations](./custom-operations.md) — расширение и исправление SDK без редактирования generated-файлов.
- [Рецепты](./recipes/index.md) — законченные сценарии интеграции.

## Разработка проекта

- [Архитектура](./architecture.md) — устройство пакета и pipeline генерации.
- [Тестирование](./testing.md) — проверки исходного пакета, generated SDK и consumers.

Документация релизов и agent skill будет добавлена после реализации соответствующих механизмов.
