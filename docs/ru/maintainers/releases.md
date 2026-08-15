# Выпуск релиза

GitHub Actions собирает и публикует `@gromlab/rest-api-codegen` при отправке SemVer tag. Ручной запуск workflow `Release` принимает уже существующий Git tag и предназначен для безопасного повтора.

## Первая публикация в npm

Пока пакет отсутствует в npm, Trusted Publisher настроить нельзя. Первую версию опубликуйте локально через обычную npm-сессию или краткоживущий granular access token с `Read and write`, доступом к `All Packages` либо scope `@gromlab` и `Bypass two-factor authentication`:

1. Выполните `npm run verify`, `npm run build` и `npm pack --ignore-scripts`.
2. Опубликуйте проверенный tarball командой `npm publish <tarball> --access public --tag latest`.
3. Настройте Trusted Publisher командой `npm trust github @gromlab/rest-api-codegen --file release.yml --repo gromlab-ru/rest-api-codegen --env npm --allow-publish` либо через настройки пакета на npmjs.com.
4. Отзовите временный token после создания trust-связи.

Для `npm trust` требуется обычная 2FA-сессия: granular token с `Bypass two-factor authentication` для этой операции не принимается. Release workflow не использует npm tokens; разрешение `id-token: write` позволяет npm CLI получить краткоживущие credentials от Trusted Publisher. Для публичного пакета из публичного репозитория публикация также получает npm provenance.

## Подготовка

1. Обновите `package.json` и `package-lock.json` командой `npm version <version> --no-git-tag-version`, затем замените закреплённую версию в документации и source skill.
2. Выполните `npm run build:skills` и закоммитьте обновлённый generated skill.
3. Выполните `npm run verify`.
4. Создайте и отправьте SemVer tag, совпадающий с версией пакета, например `v5.2.3` или `5.2.3`.
5. Отправка tag запустит workflow, который создаст GitHub Release. Версия с суффиксом, например `5.3.0-rc.1`, автоматически создаётся как prerelease.

После отправки tag workflow проверяет commit tag, package name и version, запускает тесты, собирает tarball и публикует его с dist-tag `latest` либо `next`.

## Повторный запуск

Публикация идемпотентна только для того же содержимого. Если версия уже есть в npm, workflow сравнивает integrity локального tarball с опубликованным:

- одинаковый tarball не публикуется повторно;
- другое содержимое с той же версией завершает workflow ошибкой.

К GitHub Release прикладываются npm tarball, `rest-api-codegen-ru.zip` и `SHA256SUMS`.
