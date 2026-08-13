import { join } from 'node:path';
import { afterAll } from 'vitest';
import * as sourceModule from '../src/client/http-client.js';
import { defineHttpClientContract, type HttpClientContractModule } from './contracts/http-client-contract.js';
import {
  compileGenerated,
  createSandbox,
  generateFixture,
  importCompiled,
  removeSandbox,
} from './helpers/harness.js';

let generatedSandbox: string | undefined;
let generatedModule: Promise<HttpClientContractModule> | undefined;

async function loadGenerated(): Promise<HttpClientContractModule> {
  generatedModule ??= (async () => {
    generatedSandbox = await createSandbox('rest-api-codegen-http-contract-');
    const output = join(generatedSandbox, 'generated');
    await generateFixture('core.openapi.json', output);
    const compile = await compileGenerated(output, { emit: true });
    if (compile.result.exitCode !== 0 || !compile.outputDir) {
      throw new Error(compile.result.stdout + compile.result.stderr);
    }
    return importCompiled<HttpClientContractModule>(join(compile.outputDir, 'generated'), 'index.js');
  })();
  return generatedModule;
}

afterAll(async () => {
  if (generatedSandbox) await removeSandbox(generatedSandbox);
});

defineHttpClientContract('source', async () => sourceModule as unknown as HttpClientContractModule);
defineHttpClientContract('generated', loadGenerated);
