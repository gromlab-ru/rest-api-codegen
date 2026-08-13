# Композиция API-клиента

Размещение generated SDK и форма его использования — независимые решения.

## Где хранить SDK

| Вариант | Когда подходит |
| --- | --- |
| Каталог приложения | Обычный React/Vite-проект, один consumer, нет отдельного package lifecycle. |
| Workspace-пакет | Рекомендуемый вариант монорепозитория: generated-файлы скрыты за package exports. |
| Отдельный npm-пакет | Несколько репозиториев или независимое версионирование API contract. |

Во всех вариантах результат генерации одинаков. Меняются только import paths и способ распространения.

Если отдельный пакет архитектурно доступен, он обычно делает consumer-код чище. Но пакет не является обязательным: локальный `generated`-каталог поддерживает те же полный, частичный и точечный уровни.

## Общая основа

Один настроенный transport используется всеми уровнями:

```ts
import { HttpClient } from "./generated/http-client.js";

export const petHttpClient = new HttpClient({
  baseUrl: "https://api.example.com",
});
```

```text
OpenAPI JSON
    │
    ▼
Generated SDK
    │
    ▼
Configured HttpClient
    │
    ├── operationsTree ───────────► полный клиент
    ├── выбранные operations ─────► частичный доменный клиент
    └── одна operation ───────────► hook / lazy module / adapter
```

## Полный клиент

```ts
import { createApiClient } from "./generated/create-api-client.js";
import { operationsTree } from "./generated/operations-tree.js";
import { petHttpClient } from "./client.js";

export const petRestApi = createApiClient(
  petHttpClient,
  operationsTree,
);
```

Полный клиент удобен как общая infra-точка и даёт generated namespace API. Module с `operationsTree` подключает все operations, поэтому импортируйте его только там, где действительно допустим полный API graph.

## Частичный клиент

Большому домену обычно нужны несколько endpoints из API на сотни operations. Он собирает собственную поверхность и даёт methods понятные домену:

```ts
import { createApiClient } from "../../infra/pet-api/generated/create-api-client.js";
import {
  getPet,
  listPets,
  readNote,
} from "../../infra/pet-api/generated/operations/index.js";
import { petHttpClient } from "../../infra/pet-api/client.js";

export const workspaceApi = createApiClient(petHttpClient, {
  catalog: {
    get: getPet,
    list: listPets,
  },
  notes: {
    get: readNote,
  },
} as const);
```

Особенности:

- transport, authorization и error policy остаются общими;
- домен не импортирует `operationsTree`;
- локальные keys скрывают длинные generated operation names;
- один named import из `operations/index.js` может содержать любое количество выбранных operations;
- при ESM tree-shaking невыбранные reexports не попадают в chunk.

Для package-варианта меняются только пути:

```ts
import { createApiClient } from "@acme/pet-sdk/create-api-client";
import { getPet, listPets, readNote } from "@acme/pet-sdk/operations";
import { petHttpClient } from "../../infra/pet-api/client.js";
```

Импортируйте shared transport из конкретного `client` module. Barrel, который одновременно реэкспортирует полный клиент, может случайно связать доменный chunk с `operationsTree`.

## Точечная operation

Для hook или leaf-level lazy module отдельное дерево может быть избыточным:

```ts
import { getPet } from "../../infra/pet-api/generated/operations/get-pet.js";
import { petHttpClient } from "../../infra/pet-api/client.js";

export const getPetFetcher = (id: string) =>
  getPet(petHttpClient, { id });
```

Package-вариант использует `@acme/pet-sdk/operations/get-pet`.

Точечный вызов по-прежнему использует общий configured `HttpClient`; отдельный transport для каждой operation создавать не нужно.

## Выбор уровня

| Уровень | Выбирайте, когда | Import graph |
| --- | --- | --- |
| Полный | Нужна значительная часть API или единая infra-точка | Все operations |
| Частичный | Домену нужны несколько operations большого API | Только выбранный набор при tree-shaking |
| Точечный | Hook, lazy chunk, небольшой adapter, один endpoint | Одна operation |

Одно приложение может одновременно использовать все три уровня поверх одного или нескольких configured transports.
