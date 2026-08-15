# Agent skill `rest-api-codegen-ru`

Проект поставляет переносимый skill для coding-агентов, которые настраивают TypeScript REST-клиенты и SDK с `@gromlab/rest-api-codegen`. Skill исследует проект, выбирает generated, manual или mixed сценарий, подготавливает окружение и проверяет интеграцию.

## Что делает skill

- в любом монорепозитории создаёт отдельный workspace SDK-пакет;
- при наличии OpenAPI генерирует SDK из зафиксированной версии CLI;
- при отсутствии OpenAPI создаёт contracts и operations вручную;
- при частично неверной спецификации выносит custom operation за пределы generated output;
- выбирает полный, частичный или точечный способ использования operations;
- учитывает browser, Node.js и SSR auth, errors, timeout, cancellation и retry;
- запускает typecheck, build и доступные contract tests.

Skill предназначен для клиентской REST-интеграции. Он не генерирует сервер и не заменяет проектирование server-side API contract.

## Сборка в этом репозитории

Source хранится в `src/skills/rest-api-codegen-ru`. Публичный каталог `skills/rest-api-codegen-ru` генерируется и не редактируется вручную.

```bash
npm run build:skills
npm run check:skills
```

References копируются из `docs/ru` с сохранением структуры. Поэтому исправления вносятся в документацию, после чего skill собирается заново.

## Установка

Скопируйте каталог `skills/rest-api-codegen-ru` целиком в один из стандартных skill-каталогов:

| Среда | Project scope | User scope |
| --- | --- | --- |
| OpenCode | `.opencode/skills/rest-api-codegen-ru` | `~/.config/opencode/skills/rest-api-codegen-ru` |
| Claude-compatible | `.claude/skills/rest-api-codegen-ru` | `~/.claude/skills/rest-api-codegen-ru` |
| Agents-compatible | `.agents/skills/rest-api-codegen-ru` | `~/.agents/skills/rest-api-codegen-ru` |

После установки перезапустите работающую agent session: skills загружаются при старте и не обязаны обновляться на лету.

## Примеры запросов

```text
Подготовь REST-клиент по openapi/pet-store.openapi.json.
```

```text
Мы в npm monorepo. Создай workspace SDK для billing API и подключи его к приложению.
```

```text
OpenAPI пока нет. Собери типизированный клиент для этих трёх endpoints.
```

```text
Generated endpoint отправляет неверный content type. Добавь временное исправление без редактирования generated-кода.
```

Агент должен сначала исследовать структуру проекта и использовать найденные conventions. Если данных о wire contract, auth или runtime недостаточно и их нельзя получить из репозитория, он задаёт только необходимые уточняющие вопросы.
