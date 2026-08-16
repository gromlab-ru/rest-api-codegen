# REST API Codegen

Единая среда для создания TypeScript REST API-клиентов: автоматически из OpenAPI или вручную.

## Возможности

- **Автоматическое создание.** Получите из OpenAPI готовый TypeScript API-клиент с моделями, операциями и HTTP-транспортом.
- **Ручное создание.** Пишите операции вручную, используя тот же клиент, а позже заменяйте их сгенерированными.
- **TypeScript из коробки.** Модели, параметры запросов и ответы типизированы как для ручных, так и для сгенерированных операций.
- **Гибкий HTTP-клиент.** Настройте в одном месте авторизацию, перехватчики, ошибки, повторы и отмену запросов.
- **Патчинг клиента.** Исправляйте и добавляйте операции вручную, не изменяя сгенерированные файлы и не ожидая обновления OpenAPI.
- **Клиент как конструктор.** Выбирайте методы и транспорт для каждого клиента и создавайте столько клиентов, сколько нужно приложению.
- **Одна операция.** Импортируйте только нужную операцию и вызывайте её напрямую, не подключая остальной API.
- **Общий SDK.** Вынесите API-клиент в отдельный пакет и используйте его в нескольких приложениях.

[Подробнее о возможностях](./docs/ru/FEATURES.md).

## Agent skill

Добавьте agent skill, чтобы агент понимал архитектуру REST API Codegen и правильно использовал пакет в проекте.

```bash
npx skills add gromlab-ru/rest-api-codegen
```

## Генерация

```bash
npx --yes @gromlab/rest-api-codegen@5.2.4 \
  --input https://petstore.swagger.io/v2/swagger.json \
  --output ./src/infra/pet-store-api/generated
```

В `generated` появится результат генерации: типы, операции и HTTP-клиент.

```text
src/
└── infra/
    └── pet-store-api/
        ├── generated/          # создаётся автоматически
        ├── pet-store-api.ts    # API-клиент приложения
        └── index.ts
```

## Создание API-клиента

`src/infra/pet-store-api/pet-store-api.ts`:

```ts
import { createApiClient, HttpClient, operationsTree } from "./generated";

// Настраиваем общий HTTP-транспорт.
export const httpClient = new HttpClient({
  baseUrl: "https://petstore.swagger.io/v2",
});

// Создаём API-клиент.
export const petStoreApi = createApiClient(httpClient, operationsTree);
```

## Использование
```ts
const pet = await petStoreApi.pets.getPet({ id: "42" });
```

Имена групп, операций и их аргументы определяются OpenAPI-спецификацией.

## Документация

- [Возможности](./docs/ru/FEATURES.md)
- [CLI и структура generated-клиента](./docs/ru/cli.md)
- [`HttpClient`](./docs/ru/http-client.md)
- [Рецепты](./docs/ru/recipes/index.md)
  - [React](./docs/ru/recipes/react/index.md)
    - [Полный API-клиент](./docs/ru/recipes/react/full-client.md)
    - [Ручной клиент без OpenAPI](./docs/ru/recipes/react/manual-client.md)
    - [Исправление generated-операции](./docs/ru/recipes/react/broken-endpoints.md)
    - [SWR](./docs/ru/recipes/react/swr.md)
    - [Cookie-аутентификация](./docs/ru/recipes/react/cookie-auth.md)
    - [JWT из `localStorage`](./docs/ru/recipes/react/jwt-local-storage.md)
    - [Обновление токена](./docs/ru/recipes/react/refresh-token.md)
    - [Повтор запроса](./docs/ru/recipes/react/retry.md)
    - [Загрузка файла](./docs/ru/recipes/react/file-upload.md)
  - [Next.js App Router](./docs/ru/recipes/nextjs/index.md)
    - [Отдельный API-клиент для каждой страницы](./docs/ru/recipes/nextjs/partial-client.md)
    - [Cookie-аутентификация в browser и SSR](./docs/ru/recipes/nextjs/ssr-cookie-auth.md)
  - [SDK-пакеты](./docs/ru/recipes/package/index.md)
    - [Workspace SDK в монорепозитории](./docs/ru/recipes/package/monorepo-package.md)
    - [Отдельный npm SDK](./docs/ru/recipes/package/npm-package.md)
    - [Исправление операции внутри SDK](./docs/ru/recipes/package/generated-with-corrections.md)
- [Разработка и сопровождение](./docs/ru/maintainers/index.md)
  - [Архитектура проекта](./docs/ru/maintainers/architecture.md)
  - [Тестирование проекта](./docs/ru/maintainers/testing.md)
- [npm](https://www.npmjs.com/package/@gromlab/rest-api-codegen)

## Лицензия

[MIT](./LICENSE)
