# Публичные точки входа и tree-shaking

Поле `exports` должно позволять приложению импортировать весь API, несколько операций или только одну операцию. Сигнатуры запросов при этом не меняются.

## Поле `exports`

```json
{
  "sideEffects": false,
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
  }
}
```

## Полный клиент

```ts
import { createApiClient } from "@acme/pet-store-rest-sdk/create-api-client";
import { operationsTree } from "@acme/pet-store-rest-sdk/operations-tree";
import { httpClient } from "./http-client.js";

export const petStoreApi = createApiClient(
  httpClient,
  operationsTree,
);
```

Импорт `operationsTree` подключает всё дерево операций.

## Частичный клиент

```ts
import { createApiClient } from "@acme/pet-store-rest-sdk/create-api-client";
import {
  getPet,
  readNote,
} from "@acme/pet-store-rest-sdk/operations";
import { httpClient } from "./http-client.js";

export const catalogApi = createApiClient(httpClient, {
  pets: {
    get: getPet,
  },
  notes: {
    get: readNote,
  },
});
```

Именованные импорты позволяют сборщику исключить неиспользуемые операции. Не импортируйте в этот же модуль `operationsTree` или файл приложения, который экспортирует полный клиент.

## Отдельная операция

```ts
import { getPet } from "@acme/pet-store-rest-sdk/operations/get-pet";
import { httpClient } from "./http-client.js";

const pet = await getPet(httpClient, { id: "42" });
```

Отдельный путь `operations/get-pet` подключает только нужную операцию. Такой вариант удобен для хука или небольшого вспомогательного модуля.

## `sideEffects`

`sideEffects: false` сообщает сборщику, что неиспользуемые модули можно удалить. Не указывайте это значение, если пакет при импорте меняет глобальное состояние, подключает полифилы или CSS либо запускает инициализацию.

Результат tree-shaking зависит от сборщика приложения, поэтому проверяйте сборку для публикации, а не только результат TypeScript.

## Проверка пакета

```bash
npm run build
npm pack --dry-run
```

Перед публикацией проверьте:

- импорт корневой точки входа в Node.js;
- пути `./http-client`, `./operations` и `./operations/get-pet`;
- декларации TypeScript;
- итоговую сборку для полного, частичного и точечного вариантов;
- отсутствие старых файлов после удаления операции.

Если пакет содержит ручные исправления, публичные пути должны вести через [управляемые точки входа](./generated-with-corrections.md), а не напрямую в сгенерированный файл с ошибкой.
