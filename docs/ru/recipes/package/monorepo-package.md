# Пакет клиента в монорепозитории

Такой вариант подходит, если несколько приложений находятся в одном монорепозитории. Клиент генерируется и собирается один раз, а приложения подключают его через рабочие пространства npm (`workspaces`) без публикации в реестр.

## Результат

```text
apps/
├── admin/
└── storefront/
packages/
└── pet-store-rest-sdk/
    ├── openapi/
    │   └── pet-store.openapi.json
    ├── src/                  # сгенерированный код
    ├── dist/
    ├── package.json
    └── tsconfig.json
package.json
package-lock.json
```

## Настройка монорепозитория

Корневой `package.json`:

```json
{
  "name": "acme-web",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "generate:pet-store-sdk": "npm run generate --workspace @acme/pet-store-rest-sdk",
    "build:pet-store-sdk": "npm run build --workspace @acme/pet-store-rest-sdk"
  }
}
```

Один корневой `package-lock.json` фиксирует версии зависимостей во всём монорепозитории.

## Настройка пакета

`packages/pet-store-rest-sdk/package.json`:

```json
{
  "name": "@acme/pet-store-rest-sdk",
  "version": "1.0.0",
  "private": true,
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
    "generate": "npx --yes @gromlab/rest-api-codegen@5.2.0 --input ./openapi/pet-store.openapi.json --output ./src",
    "clean": "node --input-type=module -e \"import { rmSync } from 'node:fs'; rmSync('dist', { recursive: true, force: true })\"",
    "build": "npm run generate && npm run clean && tsc -p tsconfig.json"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

Используйте тот же `tsconfig.json`, что и для [отдельного npm-пакета](./npm-package.md#tsconfigjson): модули `NodeNext`, декларации типов, библиотеки `DOM`, исходники в `src` и результат в `dist`.

## Подключение к приложению

`apps/storefront/package.json`:

```json
{
  "name": "@acme/storefront",
  "private": true,
  "dependencies": {
    "@acme/pet-store-rest-sdk": "*"
  }
}
```

После запуска `npm install` в корне npm свяжет локальный пакет с приложением. Пути импорта будут такими же, как у опубликованного пакета:

```ts
import { createApiClient } from "@acme/pet-store-rest-sdk/create-api-client";
import { HttpClient } from "@acme/pet-store-rest-sdk/http-client";
import { operationsTree } from "@acme/pet-store-rest-sdk/operations-tree";

const httpClient = new HttpClient({
  baseUrl: "https://api.example.com",
});

export const petStoreApi = createApiClient(
  httpClient,
  operationsTree,
);
```

## Команды

Из корня монорепозитория:

```bash
npm install
npm run generate:pet-store-sdk
npm run build:pet-store-sdk
```

Приложения должны собираться после клиента. Если порядок сборки задаёт отдельный инструмент, укажите эту зависимость в его настройках. Не экспортируйте исходный TypeScript напрямую, если приложения могут собирать его по-разному.

Если клиент понадобится в нескольких репозиториях, уберите `private`, добавьте `publishConfig` и используйте рецепт [отдельного npm-пакета](./npm-package.md).
