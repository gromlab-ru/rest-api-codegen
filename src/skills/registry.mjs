import { cp, mkdir, mkdtemp, readFile, readdir, rename, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import restApiCodegenRu from './rest-api-codegen-ru/skill.config.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export const skills = Object.freeze([restApiCodegenRu]);

function resolveInside(base, path, label) {
  const resolved = resolve(base, path);
  const relativePath = relative(base, resolved);
  if (relativePath === '..' || relativePath.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(relativePath)) {
    throw new Error(`${label} должен находиться внутри ${base}: ${path}`);
  }
  return resolved;
}

async function validateConfig(config) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(config.name)) {
    throw new Error(`Некорректное имя skill: ${config.name}`);
  }

  const source = resolveInside(repoRoot, config.source, 'Skill source');
  const output = resolveInside(repoRoot, config.output, 'Skill output');
  if (source.split(/[\\/]/).at(-1) !== 'SKILL.md') {
    throw new Error(`Skill source должен называться SKILL.md: ${config.source}`);
  }
  if (output.split(/[\\/]/).at(-1) !== config.name) {
    throw new Error(`Имя output-каталога должно совпадать с skill name: ${config.output}`);
  }

  const content = await readFile(source, 'utf8');
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!frontmatter || !frontmatter[1].split('\n').includes(`name: ${config.name}`)) {
    throw new Error(`Frontmatter ${config.source} должен содержать name: ${config.name}`);
  }

  for (const reference of config.references) {
    resolveInside(repoRoot, reference.source, 'Reference source');
    resolveInside(output, reference.target, 'Reference target');
  }
}

async function materializeSkill(config, destination) {
  await validateConfig(config);
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

async function readTree(root) {
  const files = new Map();

  const visit = async (directory) => {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath);
      } else if (entry.isFile()) {
        files.set(relative(root, entryPath).replaceAll('\\', '/'), await readFile(entryPath));
      }
    }
  };

  await visit(root);
  return files;
}

async function compareTrees(expectedRoot, actualRoot) {
  let actual;
  try {
    actual = await readTree(actualRoot);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return [`отсутствует каталог ${relative(repoRoot, actualRoot)}`];
    }
    throw error;
  }

  const expected = await readTree(expectedRoot);
  const paths = [...new Set([...expected.keys(), ...actual.keys()])].sort();
  const differences = [];

  for (const path of paths) {
    const expectedContent = expected.get(path);
    const actualContent = actual.get(path);
    if (!expectedContent) {
      differences.push(`лишний файл: ${path}`);
    } else if (!actualContent) {
      differences.push(`отсутствует файл: ${path}`);
    } else if (!expectedContent.equals(actualContent)) {
      differences.push(`изменён файл: ${path}`);
    }
  }

  return differences;
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

export async function checkSkills() {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'rest-api-codegen-skills-'));

  try {
    const errors = [];
    for (const config of skills) {
      const expected = join(temporaryRoot, config.name);
      await materializeSkill(config, expected);
      const differences = await compareTrees(expected, resolve(repoRoot, config.output));
      errors.push(...differences.map((difference) => `${config.name}: ${difference}`));
    }

    if (errors.length > 0) {
      throw new Error(`Generated skills устарели. Запустите npm run build:skills.\n${errors.join('\n')}`);
    }
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [mode = '--build', ...unknownArguments] = process.argv.slice(2);
  if (unknownArguments.length > 0 || !['--build', '--check'].includes(mode)) {
    throw new Error('Использование: node src/skills/registry.mjs [--build|--check]');
  }

  if (mode === '--check') {
    await checkSkills();
    console.log('Generated skills актуальны.');
  } else {
    await buildSkills();
    console.log('Generated skills собраны.');
  }
}
