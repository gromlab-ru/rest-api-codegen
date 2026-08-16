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

В репозитории есть русскоязычный agent skill для OpenCode и Claude-compatible агентов.

```bash
npx skills add gromlab-ru/rest-api-codegen --skill rest-api-codegen-ru
```

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

// Настраиваем общий HTTP-транспорт для всех операций.
const httpClient = new HttpClient({
  baseUrl: "https://api.example.com",
});

// Связываем транспорт с полным сгенерированным деревом API.
export const api = createApiClient(httpClient, operationsTree);

// Вызываем операцию через готовый доменный метод.
const pet = await api.pets.getPet({ id: "42" });
```

Имена групп, операций и их аргументы определяются OpenAPI-спецификацией.

## Документация

[CLI](./docs/ru/cli.md) · [`HttpClient`](./docs/ru/http-client.md) · [Рецепты](./docs/ru/recipes/index.md) · [npm](https://www.npmjs.com/package/@gromlab/rest-api-codegen)

## Лицензия

[MIT](./LICENSE)
