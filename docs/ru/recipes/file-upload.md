# FormData и non-JSON responses

В учебном SDK operation `uploadFile` принимает generated object `FileUpload`, а transport преобразует его в `FormData`.

```ts
import {
  readNote,
  uploadFile,
} from "@acme/pet-store-rest-sdk/operations";
import type { FileUpload } from "@acme/pet-store-rest-sdk";
import { httpClient } from "../../infra/pet-store-api/http-client.js";

export function uploadImage(file: File): Promise<Blob> {
  const payload: FileUpload = {
    file,
    metadata: { source: "browser" },
  };

  return uploadFile(httpClient, payload);
}

export function loadNote(id: number): Promise<string> {
  return readNote(httpClient, { id });
}
```

Фактический request type и return type зависят от media types в OpenAPI.

## Готовый `FormData`

Для ручной operation можно сформировать multipart body самостоятельно:

```ts
import { ContentType } from "@acme/pet-store-rest-sdk/http-client";
import { httpClient } from "../../infra/pet-store-api/http-client.js";

export function uploadRaw(file: File): Promise<Blob> {
  const body = new FormData();
  body.append("file", file);
  body.append("metadata", JSON.stringify({ source: "browser" }));

  return httpClient.request<Blob>({
    path: "/files",
    method: "POST",
    body,
    type: ContentType.FormData,
    format: "blob",
    secure: true,
  });
}
```

Не задавайте multipart `Content-Type` с boundary вручную. При `ContentType.FormData` клиент удаляет этот header, а Fetch формирует корректное значение.

Object-to-FormData:

- сохраняет `Blob` и `File`;
- преобразует primitives в строки;
- сериализует вложенные objects и arrays в JSON-строку;
- не реализует все OpenAPI encoding styles;
- преобразует `undefined` в строку `"undefined"`, поэтому удаляйте такие поля заранее.

## Другие response formats

Ручной request может использовать методы Fetch `Body`, например `arrayBuffer`:

```ts
import { httpClient } from "../../infra/pet-store-api/http-client.js";

export function downloadArchive(): Promise<ArrayBuffer> {
  return httpClient.request<ArrayBuffer>({
    path: "/archive",
    method: "GET",
    format: "arrayBuffer",
  });
}
```

Generated mapping сейчас явно поддерживает JSON, text, image/blob и FormData responses. Для неизвестного content kind `format` может отсутствовать, и transport вернёт `null` без чтения body.

Один success format применяется и к non-2xx response. Если success — blob, а ошибка — JSON, задайте `responseParser`, который выбирает parser по `Content-Type`. Он полностью заменяет встроенный parser.

Для `204` generated signature может обещать `void`, тогда как runtime без parser возвращает `null`. Не стройте логику на конкретном runtime-значении пустого ответа.
