# SDK как workspace или npm-пакет

Если архитектура позволяет, вынесите generated SDK из приложения в отдельный package. В монорепозитории это обычно private workspace-пакет; для нескольких репозиториев SDK можно публиковать в npm registry.

Это рекомендация, а не требование. Если отдельный package невозможен, используйте [локальный generated SDK](./local-sdk.md): способы композиции API останутся теми же.

## Преимущества

- Generated-файлы скрыты от application-кода за стабильными package exports.
- OpenAPI contract и generator версионируются централизованно.
- Несколько приложений используют один SDK.
- Full, partial и direct imports имеют короткие предсказуемые paths.
- SDK можно отдельно собирать, упаковывать и проверять.

## Структура

```text
packages/pet-sdk/
├── openapi/
│   └── openapi.json
├── src/                  # целиком generated
├── package.json
└── tsconfig.json
```

В простейшем варианте весь `src` принадлежит генератору.

## `package.json`

```json
{
  "name": "@acme/pet-sdk",
  "version": "1.0.0",
  "type": "module",
  "sideEffects": false,
  "files": ["dist"],
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./create-api-client": {
      "types": "./dist/create-api-client.d.ts",
      "import": "./dist/create-api-client.js"
    },
    "./http-client": {
      "types": "./dist/http-client.d.ts",
      "import": "./dist/http-client.js"
    },
    "./operations": {
      "types": "./dist/operations/index.d.ts",
      "import": "./dist/operations/index.js"
    },
    "./operations/*": {
      "types": "./dist/operations/*.d.ts",
      "import": "./dist/operations/*.js"
    },
    "./operations-tree": {
      "types": "./dist/operations-tree.d.ts",
      "import": "./dist/operations-tree.js"
    }
  },
  "scripts": {
    "generate": "rest-api-codegen --input ./openapi/openapi.json --output ./src",
    "clean": "node --input-type=module -e \"import { rmSync } from 'node:fs'; rmSync('dist', { recursive: true, force: true })\"",
    "build": "npm run generate && npm run clean && tsc -p tsconfig.json",
    "prepack": "npm run build"
  },
  "devDependencies": {
    "@gromlab/rest-api-codegen": "5.2.0",
    "typescript": "^5.0.0"
  }
}
```

`sideEffects: false` необходим для предсказуемого tree-shaking, но указывайте его только если это верно для всего package-кода.

## `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2024",
    "lib": ["ES2024", "DOM", "DOM.Iterable"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "moduleDetection": "force",
    "verbatimModuleSyntax": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": false,
    "declaration": true,
    "noEmitOnError": true,
    "rootDir": "src",
    "outDir": "dist",
    "types": []
  },
  "include": ["src/**/*.ts"]
}
```

Generated SDK использует Fetch types, поэтому ему нужны `DOM` и `DOM.Iterable` либо эквивалентные typings.

## Использование в приложении

Сначала создайте общий transport:

```ts
import { HttpClient } from "@acme/pet-sdk/http-client";

export const petHttpClient = new HttpClient({
  baseUrl: "https://api.example.com",
});
```

Полный клиент использует `operations-tree`:

```ts
import { createApiClient } from "@acme/pet-sdk/create-api-client";
import { operationsTree } from "@acme/pet-sdk/operations-tree";
import { petHttpClient } from "./client.js";

export const petRestApi = createApiClient(
  petHttpClient,
  operationsTree,
);
```

Частичный клиент импортирует несколько operations из одной точки:

```ts
import { createApiClient } from "@acme/pet-sdk/create-api-client";
import { getPet, listPets } from "@acme/pet-sdk/operations";
import { petHttpClient } from "./client.js";

export const catalogApi = createApiClient(petHttpClient, {
  pets: {
    get: getPet,
    list: listPets,
  },
} as const);
```

Hook с одним endpoint использует subpath:

```ts
import { getPet } from "@acme/pet-sdk/operations/get-pet";
import { petHttpClient } from "./client.js";

export const getPetFetcher = (id: string) =>
  getPet(petHttpClient, { id });
```

## Workspace package

Private workspace может использовать ту же compiled package-схему без публикации. Некоторые монорепозитории экспортируют TypeScript source напрямую, если bundler приложения гарантированно его обрабатывает; это решение относится к toolchain монорепозитория, а не к codegen-контракту.

## Если нужен ручной код

Не генерируйте поверх всего `src`. Выделите generated-каталог:

```text
src/
├── generated/
├── custom-operations/
├── client-tree.ts
└── index.ts
```

В этом случае package exports указывают на `dist/generated/*`, а корневой `src/index.ts` становится контролируемым public facade. Не экспортируйте ошибочную generated operation как основной API, если она заменена ручной реализацией.

## Практические правила

- Фиксируйте codegen и TypeScript через lockfile.
- Очищайте `dist`: `tsc` не удаляет JavaScript и declarations удалённых operations.
- Не публикуйте OpenAPI автоматически, если она содержит закрытые схемы или внутренние URL.
- Проверяйте установленный tarball через Node ESM и production bundler.
- Не импортируйте `operationsTree` в partial или direct chunk.
- Не используйте namespace `operations.foo` как гарантию tree-shaking; предпочитайте named imports.

Добавление ручных endpoint-ов разобрано в рецепте [пользовательских operations](./sdk-custom-operations.md).
