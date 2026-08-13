import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import {
  createSandbox,
  fixturePath,
  removeSandbox,
  repoRoot,
  runProcess,
  typescriptCliPath,
} from './helpers/harness.js';

const sandboxes: string[] = [];

afterEach(async () => {
  await Promise.all(sandboxes.splice(0).map(removeSandbox));
});

async function writeJson(path: string, value: unknown) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function findSingleFile(directory: string, suffix: string): Promise<string> {
  const files = (await readdir(directory)).filter((file) => file.endsWith(suffix));
  expect(files).toHaveLength(1);
  return join(directory, files[0] as string);
}

describe('npm package, generated SDK и tree-shaking', () => {
  test('проходят полный внешний consumer contract', async () => {
    const sandbox = await createSandbox('rest-api-codegen-consumer-');
    sandboxes.push(sandbox);
    const artifacts = join(sandbox, 'artifacts');
    const codegenConsumer = join(sandbox, 'codegen-consumer');
    const sdk = join(sandbox, 'sdk');
    const nodeConsumer = join(sandbox, 'node-consumer');
    const reactConsumer = join(sandbox, 'react-consumer');
    await Promise.all([artifacts, codegenConsumer, sdk, nodeConsumer, reactConsumer].map((path) => mkdir(path, { recursive: true })));

    const packCodegen = await runProcess('npm', [
      'pack', '--ignore-scripts', '--json', '--pack-destination', artifacts,
    ], { cwd: repoRoot });
    expect(packCodegen.exitCode, packCodegen.stdout + packCodegen.stderr).toBe(0);
    const codegenPackInfo = JSON.parse(packCodegen.stdout) as Array<{ files: Array<{ path: string }> }>;
    const packageFiles = codegenPackInfo[0]?.files.map(({ path }) => path) ?? [];
    expect(packageFiles).toEqual(expect.arrayContaining([
      'dist/cli.js',
      'dist/index.js',
      'dist/index.d.ts',
      'dist/templates/http-client.ts',
      'dist/templates/operation.ejs',
    ]));
    expect(packageFiles.some((path) => path.startsWith('src/') || path.startsWith('tests/'))).toBe(false);
    const codegenTarball = await findSingleFile(artifacts, '.tgz');

    await writeJson(join(codegenConsumer, 'package.json'), {
      private: true,
      type: 'module',
      scripts: {
        generate: 'rest-api-codegen --input ./openapi.json --output ./generated',
      },
    });
    await cp(fixturePath('core.openapi.json'), join(codegenConsumer, 'openapi.json'));
    const installCodegen = await runProcess('npm', [
      'install', '--ignore-scripts', '--omit=dev', '--no-audit', '--no-fund', '--package-lock=false', codegenTarball,
    ], { cwd: codegenConsumer });
    expect(installCodegen.exitCode, installCodegen.stdout + installCodegen.stderr).toBe(0);
    const installedManifest = JSON.parse(await readFile(
      join(codegenConsumer, 'node_modules', '@gromlab', 'rest-api-codegen', 'package.json'),
      'utf8',
    )) as Record<string, any>;
    expect(installedManifest).toMatchObject({
      name: '@gromlab/rest-api-codegen',
      version: '5.2.0',
      type: 'module',
      sideEffects: false,
      engines: { node: '>=24' },
      bin: { 'rest-api-codegen': 'dist/cli.js' },
    });
    const runtimeSmoke = await runProcess(process.execPath, ['--input-type=module', '-e', `
      import { HttpClient, createApiClient } from '@gromlab/rest-api-codegen';
      if (typeof HttpClient !== 'function' || typeof createApiClient !== 'function') process.exit(1);
    `], { cwd: codegenConsumer });
    expect(runtimeSmoke.exitCode, runtimeSmoke.stdout + runtimeSmoke.stderr).toBe(0);
    const generateSdk = await runProcess('npm', ['run', 'generate'], { cwd: codegenConsumer });
    expect(generateSdk.exitCode, generateSdk.stdout + generateSdk.stderr).toBe(0);

    await cp(join(codegenConsumer, 'generated'), join(sdk, 'src'), { recursive: true });
    await writeJson(join(sdk, 'package.json'), {
      name: '@rest-api-codegen-contract/generated-sdk',
      version: '0.0.0',
      private: true,
      type: 'module',
      sideEffects: false,
      files: ['dist'],
      exports: {
        '.': { types: './dist/index.d.ts', import: './dist/index.js' },
        './operations/*': { types: './dist/operations/*.d.ts', import: './dist/operations/*.js' },
      },
    });
    await writeJson(join(sdk, 'tsconfig.json'), {
      compilerOptions: {
        target: 'ES2024',
        lib: ['ES2024', 'DOM', 'DOM.Iterable'],
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        moduleDetection: 'force',
        verbatimModuleSyntax: true,
        strict: true,
        noUncheckedIndexedAccess: true,
        skipLibCheck: false,
        declaration: true,
        noEmitOnError: true,
        rootDir: 'src',
        outDir: 'dist',
        types: [],
      },
      include: ['src/**/*.ts'],
    });
    const compileSdk = await runProcess(process.execPath, [typescriptCliPath, '-p', join(sdk, 'tsconfig.json')], { cwd: sdk });
    expect(compileSdk.exitCode, compileSdk.stdout + compileSdk.stderr).toBe(0);
    const emittedTree = await readFile(join(sdk, 'dist', 'operations-tree.js'), 'utf8');
    expect(emittedTree).toContain('get-pet.js');
    expect(emittedTree).toContain('create-pet.js');
    expect(emittedTree).toContain('list-pets.js');

    const packSdk = await runProcess('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', artifacts], { cwd: sdk });
    expect(packSdk.exitCode, packSdk.stdout + packSdk.stderr).toBe(0);
    const allTarballs = (await readdir(artifacts)).filter((file) => file.endsWith('.tgz')).sort();
    expect(allTarballs).toHaveLength(2);
    const sdkTarball = join(artifacts, allTarballs.find((file) => file.includes('generated-sdk')) as string);

    await writeJson(join(nodeConsumer, 'package.json'), { private: true, type: 'module' });
    const installSdk = await runProcess('npm', [
      'install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', sdkTarball,
    ], { cwd: nodeConsumer });
    expect(installSdk.exitCode, installSdk.stdout + installSdk.stderr).toBe(0);
    const nodeSmoke = await runProcess(process.execPath, ['--input-type=module', '-e', `
      import { getPet } from '@rest-api-codegen-contract/generated-sdk';
      const request = async (params) => params;
      const result = await getPet({ request }, { id: '42' });
      if (result.path !== '/__rac_selected_route_6a91/pets/42') process.exit(1);
    `], { cwd: nodeConsumer });
    expect(nodeSmoke.exitCode, nodeSmoke.stdout + nodeSmoke.stderr).toBe(0);

    await writeJson(join(reactConsumer, 'package.json'), { private: true, type: 'module' });
    await mkdir(join(reactConsumer, 'src'), { recursive: true });
    await writeFile(join(reactConsumer, 'index.html'), '<div id="root"></div><script type="module" src="/src/main.tsx"></script>');
    await writeFile(join(reactConsumer, 'src', 'main.tsx'), `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { getPet } from '@rest-api-codegen-contract/generated-sdk';

      const client = { request: async (params: unknown) => params };
      function App() {
        void getPet(client, { id: 'selected' });
        return React.createElement('div', null, 'tree-shaking-contract');
      }
      createRoot(document.getElementById('root')!).render(React.createElement(App));
    `);
    await writeFile(join(reactConsumer, 'vite.config.mjs'), `
      import { defineConfig } from ${JSON.stringify(join(repoRoot, 'node_modules', 'vite', 'dist', 'node', 'index.js'))};
      import { writeFileSync } from 'node:fs';
      import { resolve } from 'node:path';

      export default defineConfig({
        build: { minify: 'esbuild', sourcemap: false },
        plugins: [{
          name: 'bundle-report',
          generateBundle(_options, bundle) {
            const report = [];
            for (const item of Object.values(bundle)) {
              if (item.type !== 'chunk') continue;
              report.push({
                fileName: item.fileName,
                modules: Object.fromEntries(Object.entries(item.modules).map(([id, data]) => [id, data.renderedLength])),
              });
            }
            writeFileSync(resolve('bundle-report.json'), JSON.stringify(report, null, 2));
          },
        }],
      });
    `);
    const installReact = await runProcess('npm', [
      'install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false',
      sdkTarball,
      join(repoRoot, 'node_modules', 'react'),
      join(repoRoot, 'node_modules', 'react-dom'),
    ], { cwd: reactConsumer });
    expect(installReact.exitCode, installReact.stdout + installReact.stderr).toBe(0);
    const viteBuild = await runProcess(process.execPath, [join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js'), 'build'], { cwd: reactConsumer });
    expect(viteBuild.exitCode, viteBuild.stdout + viteBuild.stderr).toBe(0);

    const jsFiles = (await readdir(join(reactConsumer, 'dist', 'assets'))).filter((file) => file.endsWith('.js'));
    const bundleText = (await Promise.all(jsFiles.map((file) => readFile(join(reactConsumer, 'dist', 'assets', file), 'utf8')))).join('\n');
    expect(bundleText).toContain('/__rac_selected_route_6a91/pets/');
    expect(bundleText).not.toContain('/__rac_excluded_users_route_8b42/pets');
    expect(bundleText).not.toContain('/__rac_excluded_admin_route_c7d3/admin/pets');
    const report = JSON.parse(await readFile(join(reactConsumer, 'bundle-report.json'), 'utf8')) as Array<{
      modules: Record<string, number>;
    }>;
    const allModules: Record<string, number> = Object.assign({}, ...report.map(({ modules }) => modules));
    const renderedModules = Object.entries(allModules)
      .filter(([, renderedLength]) => renderedLength > 0)
      .map(([id]) => id.replaceAll('\\', '/'));
    expect(renderedModules.some((id) => id.endsWith('/operations/get-pet.js'))).toBe(true);
    expect(renderedModules.some((id) => id.endsWith('/operations/create-pet.js'))).toBe(false);
    expect(renderedModules.some((id) => id.endsWith('/operations/list-pets.js'))).toBe(false);
    expect(renderedModules.some((id) => id.endsWith('/operations-tree.js'))).toBe(false);
  });
});
