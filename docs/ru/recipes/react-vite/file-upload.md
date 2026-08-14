# Загрузка файлов и ответы не в JSON

Если OpenAPI описывает `multipart/form-data` и двоичный ответ, сгенерированная операция принимает типизированные данные. `HttpClient` преобразует их в `FormData`, а ответ возвращает как `Blob`.

Используйте готовый `petStoreApi` из [базового примера React + Vite](./full-client.md).

## Загрузка файла

```ts
import type { FileUpload } from "../../infra/pet-store-api/generated/data-contracts.js";
import { petStoreApi } from "../../infra/pet-store-api/api.js";

export function uploadImage(file: File): Promise<Blob> {
  const payload: FileUpload = {
    file,
    metadata: { source: "browser" },
  };

  return petStoreApi.files.uploadFile(payload);
}
```

Тип входных данных и результата определяется OpenAPI. Не задавайте multipart-заголовок `Content-Type` вручную: Fetch сам добавит правильную границу частей (`boundary`) для `FormData`.

При преобразовании объекта в `FormData` клиент:

- сохраняет `Blob` и `File`;
- преобразует примитивные значения в строки;
- сериализует вложенные объекты и массивы в JSON-строку;
- не поддерживает все способы кодирования из OpenAPI;
- преобразует `undefined` в строку `"undefined"`, поэтому такие поля следует удалять заранее.

## Текстовый ответ

Операция с `text/plain` возвращает строку через тот же API-клиент:

```ts
const note = await petStoreApi.notes.readNote({ id: 7 });
```

Генератор поддерживает ответы JSON, текст, изображения, `Blob` и `FormData`. Если успешный ответ и ошибка имеют разные форматы, настройте общий `responseParser`, который выбирает способ чтения по `Content-Type`.

Если OpenAPI неверно описывает multipart-данные, сначала исправьте спецификацию. До этого можно добавить [временную ручную замену](./broken-endpoints.md) за пределами сгенерированного каталога.
