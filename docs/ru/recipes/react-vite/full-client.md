# Установка в React + Vite

В этом примере клиент генерируется прямо внутри React + Vite приложения. Настройки API хранятся в одном `HttpClient`, а компоненты вызывают готовый `petStoreApi`.

## Результат

```text
openapi/
└── pet-store.openapi.json
src/
├── features/
│   └── pets/
│       └── create-pet-form.tsx
└── infra/
    └── pet-store-api/
        ├── generated/
        ├── http-client.ts
        └── api.ts
```

## Создание приложения

Для нового проекта:

```bash
npm create vite@latest pet-store-web -- --template react-ts
cd pet-store-web
npm install
```

Поместите OpenAPI JSON в `openapi/pet-store.openapi.json` и добавьте команду:

```json
{
  "scripts": {
    "generate:pet-store-api": "npx --yes @gromlab/rest-api-codegen@5.2.3 --input ./openapi/pet-store.openapi.json --output ./src/infra/pet-store-api/generated"
  }
}
```

```bash
npm run generate:pet-store-api
```

Сгенерированный клиент самодостаточен, поэтому устанавливать `@gromlab/rest-api-codegen` в приложение не нужно.

## Переменная окружения

`.env.local`:

```dotenv
VITE_PET_STORE_API_URL=https://api.example.com
```

Переменные с префиксом `VITE_` попадают в браузерную сборку. Не храните в них секреты.

## Настройка `HttpClient`

`src/infra/pet-store-api/http-client.ts`:

```ts
import { HttpClient } from "./generated/http-client.js";

const baseUrl = import.meta.env.VITE_PET_STORE_API_URL;

if (!baseUrl) {
  throw new Error("Не задан VITE_PET_STORE_API_URL");
}

export const httpClient = new HttpClient({ baseUrl });
```

Авторизация, повторы и обработка ошибок настраиваются здесь, а не в компонентах React.

## Полный API-клиент

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

## Отправка данных из React

`src/features/pets/create-pet-form.tsx`:

```tsx
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

Клиент не создаёт React-хуки и не навязывает библиотеку для работы с данными. При необходимости используйте методы `petStoreApi` вместе с TanStack Query или SWR.

## Следующие шаги

- [JWT из localStorage](./jwt-local-storage.md).
- [Cookie-аутентификация](./cookie-auth.md).
- [Частичный клиент](./partial-client.md) для крупного или лениво загружаемого раздела.
- [TanStack Query](./tanstack-query.md) или [SWR](./swr.md) для кеширования данных.
- [Клиент как npm-пакет](../package/npm-package.md), если приложений несколько.
