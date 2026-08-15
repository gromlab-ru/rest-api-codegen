# Композиция API-клиента

Источник operations и форма их использования - независимые решения. Сначала выберите [автоматический, ручной или смешанный сценарий](./01_overview.md#как-выбрать-сценарий), затем определяйте способ подключения отдельно для каждого consumer.

Generated и ручные operations поддерживают полный API-клиент, частичный доменный API-клиент и точечный вызов. Эти способы могут сосуществовать в одном приложении.

## Базовые элементы

```text
Types + operations
        │
        ▼
Configured HttpClient
        │
        ├── всё дерево ────────────► полный API-клиент
        ├── выбранное дерево ──────► частичный API-клиент
        └── одна operation ────────► прямой вызов
```

`HttpClient` является transport. API-клиент появляется после привязки дерева operations через `createApiClient`. Точечная operation API-клиент не создаёт и принимает transport напрямую.

## Как выбрать способ

Начинайте не с общего размера SDK, а с потребностей конкретного consumer и его границы чанка:

| Потребность | Обычно подходит | Что учитывать |
| --- | --- | --- |
| Общему API-модулю нужен весь или почти весь API | Полный API-клиент | Module подключит всё переданное дерево |
| Домену нужна связанная группа endpoints | Частичный API-клиент | Дерево собирается явно, зато домен получает ограниченную и понятную поверхность |
| Hook, fetcher или adapter использует один endpoint | Точечная operation | Самый узкий import graph, но без общего дерева methods |

Это рекомендации, а не ограничения API. Небольшое приложение может начать с полного клиента. Большое приложение обычно сочетает полный общий клиент, частичные клиенты доменов и прямые imports в leaf modules.

## Нужен ли `as const`

Для object literal, который сразу передаётся в `createApiClient`, assertion `as const` не требуется:

```ts
export const productApi = createApiClient(httpClient, {
  products: {
    get: getProduct,
  },
});
```

Сигнатура `createApiClient` использует `const TTree`, поэтому TypeScript сохраняет точные keys дерева, аргументы operations и return types. Сам вызов одновременно проверяет совместимость дерева с `ApiTree`.

Generated `operationsTree` объявляется с `as const`, потому что SDK экспортирует его как самостоятельную глубоко readonly структуру и строит точный public type `OperationsTree`. В пользовательском коде `as const` стоит добавлять только тогда, когда readonly-семантика нужна самому объекту, а не для работы `createApiClient`.

## Общий transport

Для generated SDK импортируйте `HttpClient` из generated output:

```ts
import { HttpClient } from "./generated/http-client.js";

export const httpClient = new HttpClient({
  baseUrl: "https://api.example.com",
});
```

Для полностью ручного API импортируйте его из пакета:

```ts
import { HttpClient } from "@gromlab/rest-api-codegen";

export const httpClient = new HttpClient({
  baseUrl: "https://api.example.com",
});
```

Один экземпляр переиспользуется всеми уровнями одного API. На SSR transport с пользовательскими credentials создаётся отдельно на каждый входящий request.

## Полный API-клиент

Полный клиент привязывает всё известное дерево operations к transport.

Generated SDK уже содержит `operationsTree`:

```ts
import { createApiClient } from "./generated/create-api-client.js";
import { operationsTree } from "./generated/operations-tree.js";
import { httpClient } from "./http-client.js";

export const petStoreApi = createApiClient(
  httpClient,
  operationsTree,
);
```

Для ручного API дерево описывается приложением:

```ts
import { createApiClient } from "@gromlab/rest-api-codegen";
import { getPet, listPets } from "./operations/index.js";
import { httpClient } from "./http-client.js";

export const operationsTree = {
  pets: {
    getPet,
    listPets,
  },
};

export const petStoreApi = createApiClient(
  httpClient,
  operationsTree,
);
```

Полный API-клиент удобен как общая точка доступа. Module с полным деревом статически подключает все его operations, поэтому не используйте его как универсальную dependency каждого lazy domain.

## Частичный API-клиент

Большому домену обычно нужны несколько endpoints из API на сотни operations. Он выбирает только нужные функции, группирует их по своим границам и даёт им локальные имена:

```ts
import { createApiClient } from "../../infra/pet-store-api/generated/create-api-client.js";
import {
  getPet,
  listPets,
  readNote,
} from "../../infra/pet-store-api/generated/operations/index.js";
import { httpClient } from "../../infra/pet-store-api/http-client.js";

export const workspaceApi = createApiClient(httpClient, {
  catalog: {
    get: getPet,
    list: listPets,
  },
  notes: {
    get: readNote,
  },
});
```

Ручные operations компонуются точно так же. Меняется только источник imports:

```ts
import { createApiClient } from "@gromlab/rest-api-codegen";
import { getPet, listPets } from "../../infra/pet-store-api/operations/index.js";
```

Особенности частичного клиента:

- transport, authorization и error policy остаются общими;
- домен не импортирует полное `operationsTree`;
- локальные keys скрывают длинные или меняющиеся operation names;
- `createApiClient` сохраняет аргументы и return type каждой operation;
- named ESM imports generated operations позволяют bundler исключить невыбранные modules.

Для packaged SDK пути могут выглядеть так:

```ts
import { createApiClient } from "@acme/pet-store-rest-sdk/create-api-client";
import { getPet, listPets, readNote } from "@acme/pet-store-rest-sdk/operations";
import { httpClient } from "../../infra/pet-store-api/http-client.js";
```

Импортируйте shared transport из конкретного `http-client` module. Barrel, который одновременно реэкспортирует полный клиент, может случайно связать доменный chunk с полным деревом.

## Точечная operation

Для hook, SWR fetcher, lazy module или небольшого adapter отдельное дерево может быть избыточным:

```ts
import { getPet } from "../../infra/pet-store-api/generated/operations/get-pet.js";
import { httpClient } from "../../infra/pet-store-api/http-client.js";

export const getPetFetcher = (id: string) =>
  getPet(httpClient, { id });
```

Ручная operation вызывается по тому же контракту:

```ts
import { getPet } from "../../infra/pet-store-api/operations/get-pet.js";
import { httpClient } from "../../infra/pet-store-api/http-client.js";

export const getPetFetcher = (id: string) =>
  getPet(httpClient, { id });
```

Package-вариант generated SDK использует `@acme/pet-store-rest-sdk/operations/get-pet`.

Точечный вызов по-прежнему использует общий configured `HttpClient`; отдельный transport для каждой operation создавать не нужно.

## Смешанное дерево

Временная ручная operation может заменить неверный generated leaf:

```ts
import { operationsTree as generatedOperationsTree } from "./generated/operations-tree.js";
import { getPetCorrected } from "./custom-operations/get-pet-corrected.js";

export const operationsTree = {
  ...generatedOperationsTree,
  pets: {
    ...generatedOperationsTree.pets,
    getPet: getPetCorrected,
  },
};
```

Для такого дерева используйте `HttpClient`, `createApiClient` и transport types из generated SDK. После исправления OpenAPI верните generated operation и удалите ручную замену. Подробности: [смешанный сценарий](./07_custom-operations.md).

## Где хранить generated SDK

Расположение SDK не влияет на композицию:

| Вариант | Когда подходит |
| --- | --- |
| Каталог приложения | Проект без workspaces, один consumer и нет отдельного package lifecycle |
| Workspace-пакет | Любой монорепозиторий |
| Отдельный npm-пакет | Несколько репозиториев или независимое версионирование API contract |

Меняются import paths и способ распространения, но не contracts operations и API-клиента.
