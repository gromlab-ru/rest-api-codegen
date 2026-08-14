# Соглашения по именованию

Этот документ фиксирует имена, используемые в примерах документации. Проект не требует от приложения конкретного регистра, структуры каталогов или naming style.

## Имя API

`<api-name>` обозначает стабильное логическое имя конкретного API. В документации используется условное имя `pet-store`, то есть API магазина животных. В реальном проекте вместо него может быть `billing`, `catalog`, `identity` или другое принятое командой имя.

Примеры документации используют следующие формы:

| Контекст | Стиль примеров | `pet-store` |
| --- | --- | --- |
| Файлы, каталоги и npm scripts | kebab-case | `pet-store` |
| TypeScript values | camelCase | `petStore` |
| TypeScript types | PascalCase | `PetStore` |

Это стиль документации, а не требование библиотеки. Пользователь должен следовать соглашениям своего проекта, сохраняя узнаваемую связь между производными именами одного API.

## Имена файлов, scripts и exports

| Назначение | Шаблон | Пример | Почему |
| --- | --- | --- | --- |
| OpenAPI specification | `<api-name>.openapi.json` | `pet-store.openapi.json` | Видны имя API, назначение файла и JSON format |
| Каталог API-модуля | `<api-name>-api/` | `pet-store-api/` | API integration отделена от остальных modules приложения |
| npm script генерации | `generate:<api-name>-api` | `generate:pet-store-api` | Имя содержит действие и конкретную цель |
| Полный API-клиент | `<apiName>Api` | `petStoreApi` | Export обозначает готовый bound API-клиент |
| SDK package | `@<scope>/<api-name>-rest-sdk` | `@acme/pet-store-rest-sdk` | Package содержит распространяемые generated artifacts REST API |

`<scope>` обозначает npm scope пользователя или организации и не является частью имени API. Суффикс `-sdk` используется только для отдельного workspace или npm package. Локальный generated-каталог не обязан оформляться как SDK package.

Путь до `<api-name>-api/` определяет архитектура приложения. В документации используется `src/infra/pet-store-api/`, но генератор не требует слоя `infra` или конкретного расположения API-кода.

## Файлы API-модуля

| Роль | Файл | Export |
| --- | --- | --- |
| Generated SDK | `generated/` | Generated exports |
| Настроенный HTTP transport | `http-client.ts` | `httpClient` |
| Полный API-клиент | `api.ts` | `<apiName>Api`, например `petStoreApi` |
| Ручное или исправленное дерево | `operations-tree.ts` | `operationsTree` |
| Частичный доменный клиент | `<domain>-api.ts` | `<domain>Api`, например `ordersApi` |
| Ручная operation | `<verb>-<entity>.ts` | `<verb><Entity>`, например `getPet` |

Generated-файлы, generated operation names и exports вручную не переименовываются.

## Общие правила

- Выберите одно логическое имя API и последовательно используйте его производные.
- Имя API должно описывать внешний API или систему, а не отдельный endpoint или data model.
- `httpClient` в примерах не получает API-prefix, потому что его контекст задан module path.
- Частичный клиент именуется по consumer или domain, например `ordersApi` или `catalogApi`.
- Environment не включается в имя: конфигурация `dev`, `stage` и `prod` относится к transport settings.
- Версия добавляется только тогда, когда она является частью отдельного API contract.
