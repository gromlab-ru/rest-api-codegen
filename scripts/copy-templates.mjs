import { copyFile, cp, mkdir } from 'node:fs/promises';

const source = new URL('../src/templates/', import.meta.url);
const destination = new URL('../dist/templates/', import.meta.url);

await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });
await Promise.all([
  copyFile(new URL('../src/client/http-client.ts', import.meta.url), new URL('../dist/templates/http-client.ts', import.meta.url)),
  copyFile(
    new URL('../src/client/create-api-client.ts', import.meta.url),
    new URL('../dist/templates/create-api-client.ts', import.meta.url),
  ),
]);
