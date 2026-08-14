# Сгенерированный SDK

Generated SDK - это полный набор артефактов, созданных CLI: contracts, operations, transport primitives и дерево operations. API-клиентом в этой документации называется полное или частичное дерево, уже привязанное к настроенному transport через `createApiClient`.

SDK самодостаточен и не импортирует runtime-код из `@gromlab/rest-api-codegen`.

Выбирайте автоматический сценарий, когда OpenAPI доступна, актуальна и может служить источником истины. Если OpenAPI пока нет, используйте [ручной API-клиент](./06_manual-client.md). Если неверна только отдельная generated operation и спецификацию пока нельзя исправить, используйте [временный смешанный сценарий](./07_custom-operations.md).

## Структура

```text
generated/
├── create-api-client.ts
├── data-contracts.ts
├── http-client.ts
├── index.ts
├── operations-tree.ts
└── operations/
    ├── index.ts
    └── <operation>.ts
```

| Файл | Содержимое |
| --- | --- |
| `data-contracts.ts` | Schemas, extracted request bodies/params и enum unions. |
| `http-client.ts` | Fetch-based transport и его публичные типы. |
| `operations/*.ts` | Одна typed operation на endpoint. |
| `operations/index.ts` | Named ESM reexports всех operations. |
| `operations-tree.ts` | Полное дерево operations по группам. |
| `create-api-client.ts` | Привязка transport к дереву. |
| `index.ts` | Общий public facade SDK. |

Все относительные TypeScript imports используют `.js`, поэтому SDK компилируется через `module: "NodeNext"`. Нужны TypeScript 5+ и Fetch typings: например, `lib: ["ES2024", "DOM", "DOM.Iterable"]`.

## Термины

### Generated SDK

Все файлы результата генерации: contracts, transport primitives, operations и trees. SDK можно разместить внутри приложения или вынести в пакет.

### Transport

Настроенный приложением экземпляр generated `HttpClient`:

```ts
import { HttpClient } from "./generated/http-client.js";

export const httpClient = new HttpClient({
  baseUrl: "https://api.example.com",
  credentials: "include",
});
```

Transport отвечает за URL, headers, serialization, Fetch, interceptors, errors и cancellation.

### API client

Полное или частичное дерево operations, привязанное к transport через `createApiClient`. Вызовы такого клиента не требуют передавать transport вручную.

Точечный вызов operation API-клиент не создаёт: он передаёт transport первым аргументом напрямую.

## Сигнатура operation

Низкоуровневая generated operation принимает:

1. Совместимый `ApiRequestClient`.
2. Path/query params и body в порядке generated signature.
3. Необязательный `RequestParams` конкретного вызова.

```ts
import type { ApiRequestClient, RequestParams } from "@acme/pet-store-rest-sdk";
import type { GetPetParams, Pet } from "@acme/pet-store-rest-sdk";

export declare const getPet: (
  http: ApiRequestClient,
  input: GetPetParams,
  params?: RequestParams,
) => Promise<Pet>;
```

`createApiClient` привязывает первый аргумент, сохраняя остальные аргументы и return type:

```ts
const pet = await petStoreApi.pets.get({ id: "42" }, { timeout: 3_000 });
```

Path и query обычно объединяются в один object argument. Optional-only query object получает default `{}`. Всегда ориентируйтесь на фактическую generated-сигнатуру.

## Три уровня использования

### Полный клиент

`createApiClient(http, operationsTree)` даёт весь API с generated-группировкой. Это основной общий клиент приложения, но его module подключает все operations.

### Частичный клиент

Приложение выбирает несколько named operations, группирует их по границам домена и привязывает к тому же transport. Это основной способ не тянуть сотни неиспользуемых endpoints в изолированный chunk.

### Точечная operation

Hook, lazy-модуль или небольшой adapter может импортировать один файл operation и вызвать его с общим transport. Это leaf-level инструмент для минимального import graph, а не замена композиции всего API-слоя.

Подробные схемы и примеры: [композиция API-клиента](./08_client-composition.md).

## Tree-shaking

Generated `operations/index.ts` состоит из статических ESM reexports. Пакет или приложение должны сохранять ESM и объявлять `sideEffects: false` только когда это соответствует действительности.

Production contract проекта проверяет Vite-сборки для:

- named operations из одного `operations` barrel в частичном клиенте;
- точечного operation subpath;
- полного `operationsTree`.

Эти проверки доказывают поведение текущей Vite/Rollup-конфигурации, но не заменяют проверку production bundle другого bundler-а.

Не используйте namespace `operations.someOperation` как гарантию минимального bundle: его TypeScript-контракт поддерживается, но property-level tree-shaking зависит от bundler-а.

## Contracts и runtime

OpenAPI-типы существуют только во время TypeScript compilation. Они не проверяют фактический JSON response. Если сервер нарушает schema, клиент вернёт значение с заявленным статическим типом.

Enum генерируются как union literals без runtime-object.

## Security marker

Protected endpoint передаёт `secure: true`. Это только marker для `onRequest`; SDK не добавляет token автоматически. У generated secure operation marker записывается после consumer `RequestParams`, поэтому `{ secure: false }` не отключает защиту.

## Default base URL

Generated `HttpClient` получает первый строковый `servers[0].url`. Его можно переопределить в конструкторе или для отдельного request.

URL строится простой конкатенацией `baseUrl + path`; автоматической нормализации `/` нет.

## Ограничения generated metadata

- Path-параметры вставляются в template literal без автоматического `encodeURIComponent`.
- Query arrays сериализуются повторяющимися keys.
- Response parser выбирается по success response format.
- `204` может иметь статический тип `void`, но transport без parser возвращает `null`.
- Имена operations могут получить безопасные suffixes при коллизиях.

Если OpenAPI содержит ошибку, не редактируйте generated-файл. Используйте [временный смешанный сценарий](./07_custom-operations.md).

Если OpenAPI пока нет целиком, начните с [ручного API-клиента](./06_manual-client.md), используя runtime primitives пакета.
