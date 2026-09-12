import { cp, mkdir, readFile, rename, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertCurrent, readTree } from '../../scripts/skill-artifact.mjs';
import restApiCodegenRu from './rest-api-codegen-ru/skill.config.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export const skills = Object.freeze([restApiCodegenRu]);

async function materializeSkill(config, destination, root) {
  await mkdir(destination, { recursive: true });
  await cp(resolve(root, config.source), join(destination, 'SKILL.md'));

  for (const reference of config.references) {
    await cp(
      resolve(root, reference.source),
      resolve(destination, reference.target),
      { recursive: true },
    );
  }
}

export async function buildSkills({ root = repoRoot, check = false } = {}) {
  for (const config of skills) {
    const output = resolve(root, config.output);
    if (check) {
      const expected = new Map([['SKILL.md', await readFile(resolve(root, config.source))]]);
      for (const reference of config.references) {
        const source = resolve(root, reference.source);
        if ((await stat(source)).isDirectory()) {
          for (const [name, content] of readTree(source, reference.target)) expected.set(name, content);
        } else {
          expected.set(reference.target, await readFile(source));
        }
      }
      assertCurrent(expected, output);
      continue;
    }
    const staging = join(dirname(output), `.${config.name}.tmp-${process.pid}`);
    await rm(staging, { recursive: true, force: true });

    try {
      await materializeSkill(config, staging, root);
      await rm(output, { recursive: true, force: true });
      await rename(staging, output);
    } finally {
      await rm(staging, { recursive: true, force: true });
    }
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [mode = '--build', ...unknownArguments] = process.argv.slice(2);
  if (unknownArguments.length > 0 || !['--build', '--check'].includes(mode)) {
    throw new Error('Использование: node src/skills/registry.mjs [--build|--check]');
  }

  await buildSkills({ check: mode === '--check' });
  console.log(mode === '--check' ? 'Сборка skills актуальна.' : 'Skills собраны.');
}
