# Установка в Next.js App Router

На одной странице показаны два обычных для App Router варианта:

- клиентский компонент отправляет `POST` из браузера;
- серверный компонент выполняет `GET` на сервере.

Оба варианта используют одно сгенерированное дерево операций, но разные экземпляры `HttpClient`. Передача cookie текущего пользователя рассмотрена в [отдельном рецепте](./ssr-cookie-auth.md).

## Результат

```text
openapi/
└── pet-store.openapi.json
src/
├── app/
│   └── pets/
│       ├── create-pet-form.tsx
│       └── page.tsx
└── infra/
    └── pet-store-api/
        ├── generated/
        ├── http-client.ts
        ├── api.ts
        ├── server-http-client.ts
        └── server-api.ts
```

## Создание приложения и генерация клиента

Для нового проекта:

```bash
npx create-next-app@latest pet-store-web --ts --app --src-dir
cd pet-store-web
```

Добавьте OpenAPI JSON и команду генерации:

```json
{
  "scripts": {
    "generate:pet-store-api": "npx --yes @gromlab/rest-api-codegen@5.2.0 --input ./openapi/pet-store.openapi.json --output ./src/infra/pet-store-api/generated"
  }
}
```

```bash
npm run generate:pet-store-api
```

## Переменные окружения

`.env.local`:

```dotenv
NEXT_PUBLIC_PET_STORE_API_URL=https://api.example.com
PET_STORE_API_URL=https://api.internal.example.com
```

`NEXT_PUBLIC_PET_STORE_API_URL` попадает в браузерную сборку, поэтому в нём нельзя хранить секреты. `PET_STORE_API_URL` доступен только серверному коду и может указывать на внутренний адрес API. Если отдельного внутреннего адреса нет, обе переменные могут содержать один публичный URL.

## Клиент для браузера

`src/infra/pet-store-api/http-client.ts`:

```ts
import "client-only";

import { HttpClient } from "./generated/http-client.js";

const baseUrl = process.env.NEXT_PUBLIC_PET_STORE_API_URL;

if (!baseUrl) {
  throw new Error("Не задан NEXT_PUBLIC_PET_STORE_API_URL");
}

export const httpClient = new HttpClient({ baseUrl });
```

`src/infra/pet-store-api/api.ts`:

```ts
import { createApiClient } from "./generated/create-api-client.js";
import { operationsTree } from "./generated/operations-tree.js";
import { httpClient } from "./http-client.js";

export const petStoreApi = createApiClient(
  httpClient,
  operationsTree,
);
```

Общий браузерный клиент существует только в приложении текущего пользователя и не разделяет данные между пользователями.

## Клиентский компонент: `POST`

`src/app/pets/create-pet-form.tsx`:

```tsx
"use client";

import { useState, type FormEvent } from "react";
import type { Pet } from "../../infra/pet-store-api/generated/data-contracts.js";
import { petStoreApi } from "../../infra/pet-store-api/api.js";

export function CreatePetForm() {
  const [name, setName] = useState("");
  const [createdPet, setCreatedPet] = useState<Pet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const pet = await petStoreApi.pets.createPet({
        name: name.trim(),
      });

      setCreatedPet(pet);
      setName("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Не удалось создать питомца",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section>
      <h2>Создать питомца</h2>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <label>
          Имя
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={pending || !name.trim()}>
          {pending ? "Отправка..." : "Создать"}
        </button>
      </form>

      {error && <p role="alert">{error}</p>}
      {createdPet && <p>Создан: {createdPet.name}</p>}
    </section>
  );
}
```

Браузер обращается к API напрямую, поэтому сервер должен проверять входные данные и права доступа независимо от проверки в интерфейсе. Если приложение и API находятся на разных доменах, настройте `credentials` и CORS по [рецепту cookie-аутентификации](./cookie-auth.md).

## Серверный `HttpClient`

`src/infra/pet-store-api/server-http-client.ts`:

```ts
import "server-only";

import { HttpClient } from "./generated/http-client.js";

const baseUrl = process.env.PET_STORE_API_URL;

if (!baseUrl) {
  throw new Error("Не задан PET_STORE_API_URL");
}

export const serverHttpClient = new HttpClient({ baseUrl });
```

## Серверный API-клиент

`src/infra/pet-store-api/server-api.ts`:

```ts
import "server-only";

import { createApiClient } from "./generated/create-api-client.js";
import { operationsTree } from "./generated/operations-tree.js";
import { serverHttpClient } from "./server-http-client.js";

export const petStoreServerApi = createApiClient(
  serverHttpClient,
  operationsTree,
);
```

Такой общий серверный клиент допустим только без cookie и токенов пользователя. Для пользовательской сессии создавайте `HttpClient` и API-клиент отдельно на каждый входящий запрос.

## Серверный компонент: `GET`

`src/app/pets/page.tsx` остаётся серверным компонентом, потому что в файле нет директивы `"use client"`:

```tsx
import { petStoreServerApi } from "../../infra/pet-store-api/server-api.js";
import { CreatePetForm } from "./create-pet-form";

export default async function PetsPage() {
  const pet = await petStoreServerApi.pets.getPet({
    id: "42",
  });

  return (
    <main>
      <h1>{pet.name}</h1>
      <p>{pet.status}</p>
      <CreatePetForm />
    </main>
  );
}
```

`GET` выполняется на сервере, а в браузер передаётся только результат отрисовки. Вложенный `CreatePetForm` является отдельным клиентским компонентом и отправляет `POST` из браузера.

Полный клиент импортирует всё `operationsTree`. Для крупного клиентского компонента или лениво загружаемого раздела используйте [частичный клиент](./partial-client.md).

Если клиент установлен как пакет, замените относительные пути на публичные точки входа `@acme/pet-store-rest-sdk`. Остальная настройка не изменится.
