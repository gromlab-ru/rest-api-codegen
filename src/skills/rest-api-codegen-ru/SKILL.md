---
name: rest-api-codegen-ru
description: Использовать при настройке TypeScript REST-клиента или SDK с @gromlab/rest-api-codegen, OpenAPI, Swagger, HttpClient, createApiClient, operationsTree, ручными operations, workspace/монорепозиторием, React + Vite или Next.js; skill исследует проект, выбирает архитектуру, готовит окружение, реализует клиент и проверяет интеграцию.
license: MIT
compatibility: "OpenCode и Claude-compatible agents; для CLI требуется Node.js 24+"
metadata:
  language: ru
  package: "@gromlab/rest-api-codegen"
  package-version: "5.2.3"
---

# REST API Codegen Expert

## Задача

Доводи клиентскую REST-интеграцию до рабочего кода. Не пересказывай документацию вместо работы. Исследуй repository, выбери подход, подготовь environment, внеси изменения и выполни доступные проверки. Если пользователь просит только объяснение или план, не изменяй файлы.

Skill отвечает за TypeScript REST-клиенты и SDK. Он не генерирует серверную реализацию и не заменяет проектирование server-side API.

## Источники истины

Используй источники в таком порядке:

1. `package.json`, workspace config, lockfile и `tsconfig` текущего проекта.
2. OpenAPI и существующий API-код текущего проекта.
3. Freshly generated output и результаты typecheck/tests.
4. Подходящий документ из `references/`.
5. Общие предположения.

Если работа ведётся в repository самого `rest-api-codegen`, реализация и tests важнее документационного примера. Не считай `dist/`, `coverage/` и `playground/generated/` актуальным source.

Не загружай все references заранее. Сначала выбери ветку решения, затем прочитай только связанные документы.

## Обязательная диагностика

До изменения файлов определи:

- package manager по lockfile и `packageManager`;
- Node.js и TypeScript versions, module system и compiler options;
- является ли repository монорепозиторием или workspace;
- принятые package locations, scopes, scripts и naming conventions;
- наличие локальной или remote OpenAPI/Swagger specification;
- JSON это или YAML, доступна ли remote specification без credentials;
- browser, Node.js или SSR runtime;
- base URL, auth mechanism и error contract;
- нужен весь API, доменная группа или одна operation;
- есть ли существующий generated output и ручные файлы внутри него.

Сначала ищи ответы в проекте. Спрашивай пользователя только о неизвестных данных, без которых нельзя безопасно определить wire contract, доступ к specification, package boundary или требуемую API-поверхность consumer.

## Выбор архитектуры

Применяй решения последовательно: topology, источник operations, способ потребления.

### 1. Topology

**Если repository является монорепозиторием, всегда создавай отдельный workspace SDK package.** Не оставляй REST-клиент внутри одного приложения, даже если consumer пока один.

CLI генерирует только TypeScript source. `package.json`, `tsconfig.json`, workspace registration, build scripts и package `exports` создаёт агент.

Если repository не является монорепозиторием, размещай API-модуль внутри приложения, если пользователь явно не запросил публикуемый npm package.

### 2. Источник operations

| Состояние contract | Решение |
| --- | --- |
| Есть актуальная OpenAPI JSON | Сгенерировать SDK зафиксированной версией CLI |
| Есть OpenAPI YAML | Получить воспроизводимый локальный JSON по правилам ниже, затем генерировать |
| OpenAPI нет | Написать contracts и transport-first operations вручную |
| Отдельный endpoint OpenAPI неверен | Сначала исправить specification; custom operation использовать только если source временно нельзя изменить |

Для YAML сначала ищи существующий pinned OpenAPI bundler и project config. Если есть external `$ref` или их отсутствие не доказано, нужен bundle в самодостаточный JSON, а не простое синтаксическое преобразование. Если подходящего toolchain нет, запроси разрешение добавить version-pinned bundler либо попроси готовый bundled JSON. Не используй случайную transitive dependency. После conversion проверь JSON parse, поля `openapi`/`swagger`, `info`, `paths`, затем сгенерируй SDK во временный output и выполни typecheck до замены рабочего результата.

Для protected remote specification сначала определи auth scheme, разрешённый источник credentials и политику хранения файла. Используй существующий downloader с non-2xx failure, timeout и secret из environment/secret store; не помещай credential в repository, command output или generated script. Проверь, что ответ является ожидаемым JSON document с минимальной OpenAPI structure. Только затем передавай локальный файл CLI. Если способ доступа неизвестен, остановись и задай один конкретный вопрос. Не выдумывай CLI flags для headers, timeout или auth.

### 3. Способ потребления

| Потребность consumer | Решение |
| --- | --- |
| Один endpoint | Прямой import и вызов operation с общим transport |
| Связанная группа endpoints | Локальное частичное дерево и `createApiClient` |
| Нужен весь или почти весь API | Generated `operationsTree` и полный client |

Это не режимы генератора. CLI всегда создаёт полный generated SDK. «Минимальный» вариант означает прямое использование одной operation или небольшой ручной модуль, а не `--mode` или partial generation.

## Ветка: workspace SDK

Прочитай [рецепт монорепозитория](references/recipes/package/monorepo-package.md), [package exports](references/recipes/package/exports-tree-shaking.md) и при необходимости [публикуемый npm package](references/recipes/package/npm-package.md).

Соблюдай следующий contract:

1. Следуй существующему workspace manager и package naming проекта.
2. Создай отдельный package наподобие `packages/<api-name>-rest-sdk`.
3. Используй ESM, strict TypeScript, `NodeNext`, declarations и Fetch typings.
4. Публикуй compiled `dist`, а не raw TypeScript.
5. Определи явные `exports` для root, transport, operations и operation subpaths.
6. Ставь `sideEffects: false` только при отсутствии import-time side effects.
7. Разделяй `generate` и `build`; generation обновляет source, build компилирует существующий source.
8. Настрой build order так, чтобы SDK собирался раньше consumers.

При актуальной OpenAPI pure generated package может отдавать генератору весь `src`. Если package содержит wrappers или custom operations, генерируй в `src/generated`, а ручной код храни рядом.

При отсутствии OpenAPI package зависит от `@gromlab/rest-api-codegen` как runtime library. Создай public facades `src/http-client.ts` и `src/create-api-client.ts`, которые re-export соответствующие values/types runtime package; SDK не должен содержать configured base URL, token или consumer-specific singleton. Экспортируй manual contracts, operations и `operationsTree` через те же package subpaths, что будет использовать generated SDK. Подробный contract находится в рецепте монорепозитория.

## Ветка: generated SDK

Прочитай [CLI и устройство generated SDK](references/cli.md), затем подходящий framework/package recipe.

Поддерживаемый вызов имеет только два обязательных параметра:

```bash
npx --yes @gromlab/rest-api-codegen@5.2.3 \
  --input ./openapi/api.openapi.json \
  --output ./src/infra/api/generated
```

Команда показана для npm. В проекте с другим package manager используй его one-shot equivalent и не создавай второй lockfile; package name, зафиксированная version и CLI arguments остаются теми же.

Правила:

- input является OpenAPI/Swagger JSON;
- версия CLI фиксируется в script, не используй `latest`;
- output является отдельным каталогом, целиком принадлежащим генератору;
- не выбирай root repository, общий `src` приложения или каталог с ручными файлами;
- не запускай конкурентные generation processes в один output;
- generated-файлы не редактируются и не переименовываются;
- transport configuration хранится вне generated output;
- после generation читай фактические exports, operation names и signatures;
- добавь воспроизводимый script и проверку generated diff в CI.

Не используй `--mode`, `--name`, `--single-file`, `--swr` или config file: такой поверхности у CLI нет. Не импортируй внутренний `generate()` из `dist` как public API.

## Ветка: ручной клиент

Прочитай [`HttpClient`](references/http-client.md) и подходящий ручной сценарий: [React + Vite](references/recipes/react-vite/manual-client.md), [Next.js](references/recipes/nextjs/manual-client.md) или [workspace SDK](references/recipes/package/monorepo-package.md).

Установи `@gromlab/rest-api-codegen` как runtime dependency. Повторяй contract generated operations:

- `ApiRequestClient` является первым аргументом;
- typed endpoint input/body следуют после transport;
- `RequestParams = {}` является последним аргументом;
- operation вызывает `http.request<Success, Error>`;
- path parameters кодируются через `encodeURIComponent`;
- явно задаются method, query, body, request `type` и response `format`;
- обязательный `secure: true` располагается после `...params`, чтобы caller не мог снять protection;
- один configured `HttpClient` переиспользуется всеми operations.

Не придумывай response types по названию endpoint. Получи schema, примеры или подтверждение пользователя. Если media type известен, но schema отсутствует, используй `unknown` и не обращайся к полям результата. Если consumer требует структуру response, остановись и запроси contract вместо создания ложного type.

Тестируй operation через fake `ApiRequestClient`, проверяя весь request metadata без реальной сети.

## Ветка: custom operation

Прочитай подходящий сценарий исправления: [React + Vite](references/recipes/react-vite/broken-endpoints.md), [Next.js](references/recipes/nextjs/broken-endpoints.md) или [SDK package](references/recipes/package/generated-with-corrections.md).

Сначала проверь, можно ли исправить каноническую OpenAPI сейчас. Если можно, измени specification, регенерируй SDK и не создавай workaround. Следующие правила применяются только когда source contract временно недоступен для исправления:

- не изменяй generated output;
- храни исправление в `custom-operations/` или другом ручном модуле;
- импортируй `ApiRequestClient`, `RequestParams`, `ContentType` и `ApiError` из того же generated SDK;
- замени только ошибочный leaf в пользовательском дереве;
- не импортируй полный `operationsTree` ради одной точечной operation;
- добавь metadata test и условие удаления workaround после исправления OpenAPI.

Не смешивай без необходимости generated runtime с runtime root package: разные копии `ApiError` имеют разную class identity.

## Transport и REST policy

Всегда прочитай [`HttpClient`](references/http-client.md) и подходящий recipe, если задача затрагивает auth, errors, retry, uploads, pagination, caching или SSR.

Проверяй:

- корректное соединение base URL и path;
- path encoding и фактический query wire format;
- `Content-Type`, `Accept` и response parser;
- success/error status codes и responses без body;
- timeout и cancellation;
- ограниченный retry только для допустимых операций;
- `Retry-After`, backoff и idempotency keys;
- один и тот же idempotency key и неизменный body во всех попытках изменяющего запроса;
- отсутствие credentials и request bodies в logs/telemetry;
- runtime validation на недоверенной границе, если она требуется;
- pagination, caching и concurrency contract сервера.

`secure: true` является marker, а не готовой авторизацией. Реализуй credentials через `onRequest`.

Не генерируй новый idempotency key внутри `onRequest`: `context.retry()` запускает interceptor повторно. Создай key до первой попытки, передай его в исходных request params и используй только при подтверждённой server-side deduplication policy.

Для SSR создавай отдельный authenticated transport на каждый входящий request. Не сохраняй пользовательские tokens/cookies в module-level singleton и не пересылай все входящие headers без allowlist.

## Framework routing

После выбора core architecture загружай только релевантные recipes:

- React + Vite: [index](references/recipes/react-vite/index.md);
- Next.js App Router: [index](references/recipes/nextjs/index.md);
- TanStack Query или SWR: соответствующий recipe внутри framework directory;
- browser JWT/cookie, refresh token, uploads, retry и cancellation: соответствующий React recipe;
- SSR cookie auth: [Next.js SSR recipe](references/recipes/nextjs/ssr-cookie-auth.md);
- generated package с исправлениями: [package recipe](references/recipes/package/generated-with-corrections.md);
- generation drift в CI: [CI recipe](references/recipes/package/generation-ci.md).

Не добавляй framework adapter, cache layer или hooks, если пользователь их не запросил: package их не генерирует.

## Проверка результата

Считай работу завершённой после релевантных проверок:

1. Generated или ручной код проходит strict TypeScript typecheck.
2. Реальный consumer проходит production build.
3. Operation tests проверяют wire metadata и error path.
4. Workspace package собирается до consumers, а public imports работают из `dist` через `exports`.
5. Повторная generation не удаляет ручные файлы, потому что они находятся вне output.
6. Generated diff просмотрен, включая удалённые и новые untracked files.
7. Auth, retry и SSR решения не создают утечки credentials или cross-request state.

Используй существующие project commands. Для repository самого `rest-api-codegen` основной gate — `npm run verify`.

В финальном ответе кратко укажи выбранную ветку, созданные package/API boundaries, выполненные проверки и оставшиеся данные contract, если они действительно отсутствуют.
