# @gromlab/rest-api-codegen

Генератор типизированных TypeScript REST-клиентов из OpenAPI. Создаёт модели данных, отдельные функции запросов, `HttpClient` на базе Fetch и готовое дерево API.

Сгенерированный клиент не зависит от пакета и не привязан к фреймворку.

## Генерация

Требования: Node.js 24+, TypeScript 5+, ESM и OpenAPI/Swagger в формате JSON.

```bash
npx --yes @gromlab/rest-api-codegen@5.2.3 \
  --input ./openapi.json \
  --output ./src/generated
```

`--input` принимает локальный файл или HTTP(S)-адрес. Каталог `--output` полностью управляется генератором и заменяется целиком.

## Использование

```ts
import {
  createApiClient,
  HttpClient,
  operationsTree,
} from "./generated/index.js";

const httpClient = new HttpClient({
  baseUrl: "https://api.example.com",
});

export const api = createApiClient(httpClient, operationsTree);

const pet = await api.pets.getPet({ id: "42" });
```

Имена групп, операций и их аргументы определяются OpenAPI-спецификацией.

## Документация

[CLI](./docs/ru/cli.md) · [`HttpClient`](./docs/ru/http-client.md) · [Рецепты](./docs/ru/recipes/index.md) · [npm](https://www.npmjs.com/package/@gromlab/rest-api-codegen)

## Лицензия

[MIT](./LICENSE)
