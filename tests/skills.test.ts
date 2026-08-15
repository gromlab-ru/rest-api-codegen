import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { repoRoot, runProcess } from './helpers/harness.js';

const skillRoot = join(repoRoot, 'skills', 'rest-api-codegen-ru');

async function listMarkdownFiles(root: string): Promise<string[]> {
  const files: string[] = [];

  const visit = async (directory: string): Promise<void> => {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(path);
      }
    }
  };

  await visit(root);
  return files;
}

describe('agent skill', () => {
  test('generated artifact соответствует source и документации', async () => {
    const result = await runProcess(process.execPath, ['src/skills/registry.mjs', '--check']);
    expect(result).toMatchObject({ exitCode: 0, stderr: '' });
    expect(result.stdout).toContain('Generated skills актуальны.');
  });

  test('содержит переносимый frontmatter актуальной версии', async () => {
    const [skill, packageJson] = await Promise.all([
      readFile(join(skillRoot, 'SKILL.md'), 'utf8'),
      readFile(join(repoRoot, 'package.json'), 'utf8').then((content) => JSON.parse(content) as { version: string }),
    ]);

    expect(skill).toMatch(/^---\nname: rest-api-codegen-ru\n/);
    expect(skill).toContain('description: Использовать при настройке TypeScript REST-клиента');
    expect(skill).toContain(`package-version: "${packageJson.version}"`);
    expect(skill).toContain('Если repository является монорепозиторием, всегда создавай отдельный workspace SDK package.');
  });

  test('поставляет core, framework и package references', async () => {
    const requiredReferences = [
      '04_cli.md',
      '06_manual-client.md',
      '10_rest-client-engineering.md',
      '11_agent-skill.md',
      'recipes/package/monorepo-package.md',
      'recipes/react-vite/index.md',
      'recipes/nextjs/index.md',
      'maintainers/architecture.md',
    ];

    await Promise.all(requiredReferences.map((path) => stat(join(skillRoot, 'references', path))));
  });

  test('все локальные Markdown-ссылки остаются внутри artifact и существуют', async () => {
    const markdownFiles = await listMarkdownFiles(skillRoot);
    const failures: string[] = [];
    const linkPattern = /!?\[[^\]]*\]\(([^)\n]+)\)/g;

    for (const file of markdownFiles) {
      const content = await readFile(file, 'utf8');
      for (const match of content.matchAll(linkPattern)) {
        let target = match[1]?.trim() ?? '';
        if (target.startsWith('<') && target.endsWith('>')) {
          target = target.slice(1, -1);
        } else {
          target = target.split(/\s+/, 1)[0] ?? '';
        }

        if (!target || target.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(target)) {
          continue;
        }

        const targetPath = target.split(/[?#]/, 1)[0];
        if (!targetPath) {
          continue;
        }

        let resolvedTarget: string;
        try {
          resolvedTarget = resolve(dirname(file), decodeURIComponent(targetPath));
        } catch {
          failures.push(`${relative(skillRoot, file)}: некорректный URL ${target}`);
          continue;
        }

        const relativeTarget = relative(skillRoot, resolvedTarget);
        if (relativeTarget === '..' || relativeTarget.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(relativeTarget)) {
          failures.push(`${relative(skillRoot, file)}: ссылка выходит за artifact ${target}`);
          continue;
        }

        try {
          await stat(resolvedTarget);
        } catch {
          failures.push(`${relative(skillRoot, file)}: отсутствует ${target}`);
        }
      }
    }

    expect(failures).toEqual([]);
  });
});
