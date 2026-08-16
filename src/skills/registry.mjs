import { cp, mkdir, rename, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import restApiCodegenRu from './rest-api-codegen-ru/skill.config.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export const skills = Object.freeze([restApiCodegenRu]);

async function materializeSkill(config, destination) {
  await mkdir(destination, { recursive: true });
  await cp(resolve(repoRoot, config.source), join(destination, 'SKILL.md'));

  for (const reference of config.references) {
    await cp(
      resolve(repoRoot, reference.source),
      resolve(destination, reference.target),
      { recursive: true },
    );
  }
}

export async function buildSkills() {
  for (const config of skills) {
    const output = resolve(repoRoot, config.output);
    const staging = join(dirname(output), `.${config.name}.tmp-${process.pid}`);
    await rm(staging, { recursive: true, force: true });

    try {
      await materializeSkill(config, staging);
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
  if (unknownArguments.length > 0 || mode !== '--build') {
    throw new Error('Использование: node src/skills/registry.mjs [--build]');
  }

  await buildSkills();
  console.log('Generated skills собраны.');
}
