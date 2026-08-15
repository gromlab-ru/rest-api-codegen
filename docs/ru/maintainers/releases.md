# Выпуск релиза

GitHub Actions собирает и публикует `@gromlab/rest-api-codegen` по событию `release.published`. Ручной запуск workflow `Release` принимает уже существующий Git tag и предназначен для безопасного повтора.

## Первая публикация в npm

Пока пакет отсутствует в npm, для первой публикации нужен granular access token с правом публикации пакетов scope `@gromlab`:

1. Создайте GitHub Environment с именем `npm`.
2. Добавьте в него secret `NPM_TOKEN` со значением npm-токена.
3. После первой успешной публикации откройте настройки пакета на npm и добавьте GitHub Actions Trusted Publisher: organization/user `gromlab-ru`, repository `rest-api-codegen`, workflow `release.yml`, environment `npm`, allowed action `npm publish`.
4. Удалите `NPM_TOKEN` из GitHub после проверки следующего релиза через OIDC.

Workflow имеет разрешение `id-token: write`, поэтому npm CLI автоматически использует Trusted Publisher, когда он настроен. Для публичного пакета из публичного репозитория публикация также получает npm provenance.

## Подготовка

1. Обновите `package.json` и `package-lock.json` командой `npm version <version> --no-git-tag-version`, затем замените закреплённую версию в документации и source skill.
2. Выполните `npm run build:skills` и закоммитьте обновлённый generated skill.
3. Выполните `npm run verify`.
4. Создайте и отправьте SemVer tag, совпадающий с версией пакета, например `v5.2.0` или `5.2.0`.
5. Создайте GitHub Release из этого tag. Для версии с суффиксом, например `5.3.0-rc.1`, отметьте release как prerelease.

После публикации GitHub Release workflow повторно проверяет commit tag, package name, version и prerelease status, запускает тесты, собирает tarball и публикует его с dist-tag `latest` либо `next`.

## Повторный запуск

Публикация идемпотентна только для того же содержимого. Если версия уже есть в npm, workflow сравнивает integrity локального tarball с опубликованным:

- одинаковый tarball не публикуется повторно;
- другое содержимое с той же версией завершает workflow ошибкой.

К GitHub Release прикладываются npm tarball, `rest-api-codegen-ru.zip` и `SHA256SUMS`.
