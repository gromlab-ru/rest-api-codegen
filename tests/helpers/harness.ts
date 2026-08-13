import { createServer, type Server } from 'node:http';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { generate } from '../../src/generator.js';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const fixturesDir = join(repoRoot, 'tests', 'fixtures');
export const distCliPath = join(repoRoot, 'dist', 'cli.js');
export const typescriptCliPath = join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc');

export type ProcessResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export async function createSandbox(prefix = 'rest-api-codegen-test-'): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix));
}

export async function removeSandbox(path: string): Promise<void> {
  await rm(path, { recursive: true, force: true });
}

export function fixturePath(name: string): string {
  return join(fixturesDir, name);
}

export async function runProcess(
  command: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<ProcessResult> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repoRoot,
      env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', ...options.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.once('error', reject);
    child.once('close', (code) => {
      resolvePromise({ exitCode: code ?? 1, stdout, stderr });
    });
  });
}

export function runCli(args: string[], cwd = repoRoot): Promise<ProcessResult> {
  return runProcess(process.execPath, [distCliPath, ...args], { cwd });
}

export async function generateFixture(
  fixtureName: string,
  outputPath: string,
): Promise<void> {
  await generate({ inputPath: fixturePath(fixtureName), outputPath });
}

export async function readFileTree(root: string): Promise<Map<string, Buffer>> {
  const files = new Map<string, Buffer>();

  const visit = async (directory: string): Promise<void> => {
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

export async function compileGenerated(
  generatedDir: string,
  options: { emit?: boolean; consumerSource?: string } = {},
): Promise<{ outputDir?: string; result: ProcessResult }> {
  const workspace = dirname(generatedDir);
  const outputDir = options.emit ? join(workspace, 'compiled') : undefined;
  const consumerPath = options.consumerSource ? join(workspace, 'consumer.ts') : undefined;

  if (consumerPath && options.consumerSource) {
    await writeFile(consumerPath, options.consumerSource, 'utf8');
  }

  const tsconfigPath = join(workspace, 'tsconfig.generated.json');
  const include = [relative(workspace, generatedDir).replaceAll('\\', '/') + '/**/*.ts'];
  if (consumerPath) {
    include.push(relative(workspace, consumerPath).replaceAll('\\', '/'));
  }

  await writeFile(join(workspace, 'package.json'), JSON.stringify({ private: true, type: 'module' }, null, 2));

  await writeFile(tsconfigPath, JSON.stringify({
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
      declaration: Boolean(options.emit),
      noEmit: !options.emit,
      noEmitOnError: true,
      rootDir: '.',
      outDir: outputDir,
      types: [],
    },
    include,
  }, null, 2));

  const result = await runProcess(process.execPath, [typescriptCliPath, '-p', tsconfigPath], { cwd: workspace });
  return { outputDir, result };
}

export async function importCompiled<T>(outputDir: string, relativePath: string): Promise<T> {
  const moduleUrl = `${pathToFileURL(join(outputDir, relativePath)).href}?test=${Date.now()}-${Math.random()}`;
  return import(moduleUrl) as Promise<T>;
}

export async function startSpecificationServer(options: {
  body: string;
  status?: number;
}): Promise<{ requests: string[]; url: string; close: () => Promise<void> }> {
  const requests: string[] = [];
  const server: Server = createServer((request, response) => {
    requests.push(`${request.method} ${request.url}`);
    response.statusCode = options.status ?? 200;
    response.setHeader('content-type', 'application/json');
    response.end(options.body);
  });

  await new Promise<void>((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolvePromise);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Test HTTP server did not expose a TCP port.');
  }

  return {
    requests,
    url: `http://127.0.0.1:${address.port}/openapi.json`,
    close: () => new Promise<void>((resolvePromise, reject) => {
      server.close((error) => error ? reject(error) : resolvePromise());
    }),
  };
}
