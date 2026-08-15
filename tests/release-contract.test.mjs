import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  checkRelease,
  parseReleaseTag,
} from '../scripts/check-release.mjs';

const withPackage = (callback, packageJson = {
  name: '@gromlab/rest-api-codegen',
  version: '5.2.0',
}) => {
  const temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rest-api-codegen-release-'));
  const packagePath = path.join(temporaryDir, 'package.json');

  fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

  try {
    return callback(packagePath);
  } finally {
    fs.rmSync(temporaryDir, { recursive: true, force: true });
  }
};

test('accepts release tags with and without a v prefix', () => {
  assert.deepEqual(parseReleaseTag('5.2.0'), {
    isPrerelease: false,
    version: '5.2.0',
  });
  assert.deepEqual(parseReleaseTag('v5.3.0-beta.1'), {
    isPrerelease: true,
    version: '5.3.0-beta.1',
  });
});

test('rejects unsupported release tags', () => {
  for (const tag of ['', 'release-5.2.0', '5.02.0', '5.2', '5.2.0+build.1']) {
    assert.throws(() => parseReleaseTag(tag), /Release tag/);
  }
});

test('validates a release matching the package version', () => {
  withPackage((packagePath) => {
    assert.deepEqual(checkRelease({
      eventName: 'push',
      packagePath,
      tag: 'v5.2.0',
    }), {
      isPrerelease: false,
      version: '5.2.0',
    });
  });
});

test('rejects a release tag with a different version', () => {
  withPackage((packagePath) => {
    assert.throws(
      () => checkRelease({
        eventName: 'workflow_dispatch',
        packagePath,
        tag: '5.2.1',
      }),
      /does not match package version/,
    );
  });
});

test('identifies a prerelease tag on push', () => {
  withPackage((packagePath) => {
    assert.deepEqual(checkRelease({
      eventName: 'push',
      packagePath,
      tag: '5.3.0-rc.1',
    }), {
      isPrerelease: true,
      version: '5.3.0-rc.1',
    });
  }, {
    name: '@gromlab/rest-api-codegen',
    version: '5.3.0-rc.1',
  });
});

test('supports prerelease versions in manual dispatch', () => {
  withPackage((packagePath) => {
    assert.deepEqual(checkRelease({
      eventName: 'workflow_dispatch',
      packagePath,
      tag: 'v5.3.0-rc.1',
    }), {
      isPrerelease: true,
      version: '5.3.0-rc.1',
    });
  }, {
    name: '@gromlab/rest-api-codegen',
    version: '5.3.0-rc.1',
  });
});

test('rejects an unexpected package', () => {
  withPackage((packagePath) => {
    assert.throws(
      () => checkRelease({
        eventName: 'workflow_dispatch',
        packagePath,
        tag: '5.2.0',
      }),
      /Unexpected package name/,
    );
  }, {
    name: 'another-package',
    version: '5.2.0',
  });
});
