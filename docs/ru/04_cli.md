# CLI

CLI используется только для автоматического сценария: он читает OpenAPI JSON и создаёт самодостаточный SDK. Для ручного API пакет импортируется как runtime dependency, а CLI не запускается.

## Запуск через `npx`

Устанавливать генератор в проект не требуется. Основная форма запуска:

```bash
npx --yes @gromlab/rest-api-codegen@5.2.0 \
  --input <openapi.json-or-url> \
  --output <directory>
```

Короткие параметры:

```bash
npx --yes @gromlab/rest-api-codegen@5.2.0 \
  -i ./openapi/openapi.json \
  -o ./src/generated
```

Всегда указывайте точную версию пакета для committed output и CI. Незафиксированный `latest` может изменить generated-файлы без изменения OpenAPI.

Если пакет уже установлен для ручного сценария, binary также доступен как `rest-api-codegen`, но установка только ради генерации не нужна.

## Параметры

| Параметр | Обязательный | Назначение |
| --- | --- | --- |
| `-i, --input <path>` | да | Локальный JSON-файл либо URL с `http://` или `https://`. |
| `-o, --output <path>` | да | Каталог generated SDK. |
| `-V, --version` | нет | Версия CLI. |
| `-h, --help` | нет | Справка. |

Других режимов нет. Опции `--mode`, `--name`, `--single-file` и `--swr` не поддерживаются. Ручное создание API - не режим CLI; для него используются public runtime exports пакета.

## npm script

Для регулярного запуска сохраните полную `npx`-команду:

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

При обновлении генератора версия меняется явно в одном script и проходит code review вместе с generated diff.

## Входная спецификация

CLI всегда разбирает input через `JSON.parse`. YAML не поддерживается.

Перед генерацией проверяется минимальный структурный контракт:

- корень является JSON-объектом;
- присутствует строковое поле `openapi` или `swagger`;
- `info` является объектом;
- `paths` является объектом.

Это не заменяет полноценную семантическую проверку OpenAPI. Ошибочно задокументированный endpoint может дать типизированный, но неверный wire contract. Для временного исправления используйте [смешанный сценарий](./07_custom-operations.md).

## Локальный файл

```bash
npx --yes @gromlab/rest-api-codegen@5.2.0 \
  --input ./openapi/openapi.json \
  --output ./src/generated
```

Если файл не существует, CLI завершится с exit code `1` до генерации.

## URL

```bash
npx --yes @gromlab/rest-api-codegen@5.2.0 \
  --input https://api.example.com/openapi.json \
  --output ./src/generated
```

Документ загружается один раз. CLI не предоставляет параметры headers, authorization, timeout или retry для загрузки private specification. В CI надёжнее заранее получить спецификацию отдельной командой и передать локальный JSON-файл.

## Замена output

Новый SDK сначала полностью формируется в соседнем staging-каталоге. После успешного рендера прежний output переименовывается в backup, а staging - в output. При перехваченной ошибке замены генератор пытается восстановить backup.

Следствия:

- stale generated-файлы удаляются;
- любые ручные файлы внутри output удаляются;
- при ошибке чтения, разбора или генерации предыдущий output сохраняется;
- output должен быть выделенным каталогом, например `src/generated`.

## Exit code и сообщения

- `0` - SDK успешно создан.
- `1` - ошибка аргументов, входного файла, сети, JSON, OpenAPI или записи результата.

Не определяйте успех по наличию старого output. Всегда проверяйте exit code процесса.

## Воспроизводимая генерация

Зафиксируйте версию генератора непосредственно в `npx`-команде и major Node.js в CI. Для проверки committed SDK после генерации учитывайте modified, deleted и untracked files. Подробный сценарий приведён в рецепте [детерминированной генерации](./recipes/deterministic-generation-ci.md).
