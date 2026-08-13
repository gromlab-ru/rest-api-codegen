# CLI

## Синтаксис

```text
rest-api-codegen --input <openapi.json-or-url> --output <directory>
```

Короткая форма:

```bash
rest-api-codegen -i ./openapi/openapi.json -o ./src/generated
```

## Параметры

| Параметр | Обязательный | Назначение |
| --- | --- | --- |
| `-i, --input <path>` | да | Локальный JSON-файл либо URL с `http://` или `https://`. |
| `-o, --output <path>` | да | Каталог generated SDK. |
| `-V, --version` | нет | Версия CLI. |
| `-h, --help` | нет | Справка. |

Других режимов нет. Опции `--mode`, `--name`, `--single-file` и `--swr` не поддерживаются.

## Входная спецификация

CLI всегда разбирает input через `JSON.parse`. YAML не поддерживается.

Перед генерацией проверяется минимальный структурный контракт:

- корень является JSON-объектом;
- присутствует строковое поле `openapi` или `swagger`;
- `info` является объектом;
- `paths` является объектом.

Это не заменяет полноценную семантическую проверку OpenAPI. Ошибочно задокументированный endpoint может дать типизированный, но неверный wire contract. Для таких случаев используйте [пользовательские operations](./custom-operations.md).

## Локальный файл

```bash
rest-api-codegen \
  --input ./openapi/openapi.json \
  --output ./src/generated
```

Если файл не существует, CLI завершится с exit code `1` до генерации.

## URL

```bash
rest-api-codegen \
  --input https://api.example.com/openapi.json \
  --output ./src/generated
```

Документ загружается один раз. CLI не предоставляет параметры headers, authorization, timeout или retry для загрузки private specification. В CI надёжнее заранее получить спецификацию отдельной командой и передать локальный JSON-файл.

## Замена output

Новый SDK сначала полностью формируется в соседнем staging-каталоге. После успешного рендера прежний output переименовывается в backup, а staging — в output. При перехваченной ошибке замены генератор пытается восстановить backup.

Следствия:

- stale generated-файлы удаляются;
- любые ручные файлы внутри output удаляются;
- при ошибке чтения, разбора или генерации предыдущий output сохраняется;
- output должен быть выделенным каталогом, например `src/generated`.

## Exit code и сообщения

- `0` — SDK успешно создан.
- `1` — ошибка аргументов, входного файла, сети, JSON, OpenAPI или записи результата.

Не определяйте успех по наличию старого output. Всегда проверяйте exit code процесса.

## Воспроизводимая генерация

Храните версию генератора в `devDependencies` и lockfile. Для CI используйте `npm ci`, затем запускайте один и тот же npm script. Подробный сценарий приведён в рецепте [детерминированной генерации](./recipes/deterministic-generation-ci.md).
