# Смешанный сценарий

Смешанный сценарий объединяет generated SDK и одну или несколько ручных operations. Это временный способ исправить или дополнить SDK, когда OpenAPI нельзя оперативно изменить, но клиент уже нужно обновить.

Если OpenAPI ещё нет целиком и весь API описывается вручную, используйте отдельное руководство: [ручное создание API-клиента](./06_manual-client.md).

## Когда нужен смешанный сценарий

- OpenAPI описывает неверный path или HTTP method.
- Schema request или response не соответствует серверу.
- Для endpoint не указан security marker.
- Endpoint временно отсутствует в спецификации.
- Исправление upstream OpenAPI будет доступно позже текущего релиза приложения.

После исправления спецификации и регенерации ручную operation следует удалить. Не превращайте временные подмены в параллельный постоянный API без явной причины.

## Главное правило

Никогда не редактируйте generated-файлы и не добавляйте ручной код внутрь output. Каталог заменяется целиком при следующей успешной генерации.

```text
src/infra/pet-store-api/
├── generated/          # только rest-api-codegen
├── custom-operations/  # временные ручные исправления
├── http-client.ts
├── operations-tree.ts
└── api.ts
```

## Контракт ручной operation

Operation принимает совместимый `ApiRequestClient` первым аргументом:

```ts
import type {
  ApiRequestClient,
  RequestParams,
} from "./generated/index.js";

export interface CorrectPet {
  id: string;
  displayName: string;
}

export interface CorrectProblem {
  message: string;
}

export const getPetCorrected = (
  http: ApiRequestClient,
  input: { id: string; verbose?: boolean },
  params: RequestParams = {},
) =>
  http.request<CorrectPet, CorrectProblem>({
    path: `/pets/${encodeURIComponent(input.id)}`,
    method: "GET",
    query: { verbose: input.verbose },
    format: "json",
    ...params,
    secure: true,
  });
```

В смешанном сценарии transport primitives и типы импортируются из generated SDK, который расширяет operation, а не из `@gromlab/rest-api-codegen`. Так generated и ручные operations используют один runtime и одну identity класса `ApiError`.

`secure: true` расположен после `...params`, поэтому caller не сможет случайно отключить обязательную авторизацию. Для публичного endpoint поле нужно намеренно убрать.

## Подмена leaf в полном дереве

```ts
import {
  createApiClient,
  operationsTree as generatedOperationsTree,
} from "./generated/index.js";
import { getPetCorrected } from "./custom-operations/get-pet-corrected.js";
import { httpClient } from "./http-client.js";

export const operationsTree = {
  ...generatedOperationsTree,
  pets: {
    ...generatedOperationsTree.pets,
    getPet: getPetCorrected,
  },
};

export const petStoreApi = createApiClient(httpClient, operationsTree);
```

Такой spread подключает полное generated-дерево. Он подходит, если приложению действительно нужен полный API-клиент.

## Подмена в частичном клиенте

Если домену нужны только несколько endpoints, соберите небольшое дерево явно:

```ts
import { createApiClient } from "./generated/create-api-client.js";
import { listPets } from "./generated/operations/index.js";
import { getPetCorrected } from "./custom-operations/get-pet-corrected.js";
import { httpClient } from "./http-client.js";

export const petStoreApi = createApiClient(httpClient, {
  pets: {
    get: getPetCorrected,
    list: listPets,
  },
});
```

Прикладной key `pets.get` не зависит от имени реализации. После исправления OpenAPI можно заменить import и сохранить calls домена без изменений.

## Прямой вызов исправленной operation

Временная operation поддерживает и точечный уровень:

```ts
import { httpClient } from "./http-client.js";
import { getPetCorrected } from "./custom-operations/get-pet-corrected.js";

export const getPetFetcher = (id: string) =>
  getPetCorrected(httpClient, { id });
```

## Public facade

Подмена leaf в прикладном дереве не удаляет ошибочную operation из generated root exports. Если исправленная operation должна быть канонической публичной реализацией, соберите facade явными exports и не реэкспортируйте ошибочную generated operation под тем же именем.

Обе реализации можно временно оставить под разными именами:

```ts
export * from "./generated/index.js";
export { getPetCorrected } from "./custom-operations/get-pet-corrected.js";
export { operationsTree } from "./operations-tree.js";
```

Исправленные schema types также храните вне generated-каталога. Не подменяйте generated declarations ручным редактированием.

## Возврат к generated operation

После исправления OpenAPI:

1. Обновите спецификацию и заново сгенерируйте SDK.
2. Проверьте metadata новой operation: path, method, query, body, `type`, `format` и `secure`.
3. Замените import `getPetCorrected` на generated `getPet` в прикладном дереве.
4. Удалите временную operation и исправленные типы, если они больше не используются.
5. Удалите тесты workaround или перенесите нужный контракт в тесты generated SDK.

## Проверки

Ручное исправление полезно тестировать через fake `ApiRequestClient`, без сети:

```ts
import type {
  ApiRequestClient,
  FullRequestParams,
} from "./generated/index.js";
import { getPetCorrected } from "./custom-operations/get-pet-corrected.js";

let captured: FullRequestParams | undefined;

const http: ApiRequestClient = {
  request: async <T>(request: FullRequestParams) => {
    captured = request;
    return request as unknown as T;
  },
};

await getPetCorrected(http, { id: "a/b", verbose: true });

if (captured?.path !== "/pets/a%2Fb") {
  throw new Error("Неверный path временной operation");
}
```

Проверяйте request metadata и отдельно подтверждайте, что после регенерации workaround всё ещё нужен.
