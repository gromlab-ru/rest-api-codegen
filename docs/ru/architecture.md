# Архитектура

## Компоненты проекта

```text
OpenAPI JSON
    │
    ▼
rest-api-codegen CLI
    │
    ├── swagger-typescript-api: parsing и metadata
    ├── project templates: contracts и operations
    └── embedded runtime source: HttpClient и createApiClient
    │
    ▼
TypeScript REST SDK
```

## CLI и публичный API пакета

CLI является единственным публичным интерфейсом code generation. Функция `generate()` используется внутри пакета, но не экспортируется через package `exports`.

Корневой runtime API пакета экспортирует:

- `HttpClient`;
- `ApiError`;
- `ContentType`;
- `createApiClient`;
- transport и tree-типы.

Он нужен для полностью ручных REST clients. Generated SDK не зависит от этого runtime во время выполнения.

## Pipeline генерации

1. CLI проверяет аргументы и наличие локального input.
2. Генератор загружает JSON и выполняет минимальную структурную проверку.
3. `swagger-typescript-api` строит model и route metadata в памяти с `output: false`.
4. Проект рендерит contracts и отдельные operations.
5. Исходники `HttpClient` и `createApiClient` копируются из тех же файлов, которые экспортирует runtime-пакет.
6. Все файлы форматируются formatter-ом upstream-библиотеки.
7. Полный SDK записывается в staging-каталог.
8. Готовый staging заменяет прежний output через временный backup и rollback при перехваченной ошибке.

## Почему один operation на файл

Operation — обычная функция с transport первым аргументом:

```ts
import type { ApiRequestClient, RequestParams } from "@acme/pet-sdk";
import type { Pet } from "@acme/pet-sdk";

export const getPetManually = (
  http: ApiRequestClient,
  input: { id: string },
  params: RequestParams = {},
) => http.request<Pet>({
  path: `/pets/${input.id}`,
  method: "GET",
  format: "json",
  ...params,
});
```

Такое устройство:

- не привязывает endpoint к конкретному экземпляру класса;
- позволяет тестировать request object через fake transport;
- даёт прямые импорты;
- позволяет собирать domain-specific дерево;
- упрощает замену неверной generated operation ручной реализацией.

## Embedded runtime

`src/client/http-client.ts` — единый источник для runtime-пакета и generated SDK. При генерации меняется только безопасно сериализованный default `baseUrl`, взятый из первого строкового `servers[0].url`.

Один contract suite прогоняется на исходном и freshly generated `HttpClient`. Это защищает две формы поставки от расхождения.

## Группировка operations

Первый OpenAPI tag определяет группу в `operationsTree`. Без tag upstream-генератор выводит группу из path; operation для корневого `/` может остаться leaf в корне дерева. Reserved identifiers, коллизии, Unicode и проверенные имена из `Object.prototype` преобразуются в безопасные module bindings и keys.

Не угадывайте итоговое имя. Используйте generated exports и строгий TypeScript typecheck.

## Границы ответственности

Генератор отвечает за статический TypeScript contract и request metadata. Он не отвечает за:

- runtime-валидацию ответа;
- хранение tokens и cookies;
- retry policy;
- cache и server state;
- React lifecycle;
- создание `package.json` отдельного SDK;
- исправление семантически неверной OpenAPI.

Соответствующие решения принадлежат приложению или SDK-пакету и описаны в [рецептах](./recipes/index.md).

## Размещение и композиция

Генератор не требует отдельного npm-пакета. Output может находиться в приложении, workspace-пакете или публикуемом SDK-пакете.

После генерации приложение создаёт configured `HttpClient`, а затем выбирает [уровень композиции](./client-composition.md): полный `operationsTree`, частичное domain tree или точечную operation. Эти уровни используют одинаковые generated primitives и могут сосуществовать.
