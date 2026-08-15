import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const [tarballPath] = process.argv.slice(2);

if (!tarballPath) {
  throw new Error('Expected a package tarball path.');
}

const digest = createHash('sha512').update(readFileSync(tarballPath)).digest('base64');

console.log(`sha512-${digest}`);
