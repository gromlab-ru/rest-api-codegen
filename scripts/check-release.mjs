import { appendFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?$/;

export const parseReleaseTag = (tag) => {
  if (typeof tag !== 'string' || tag.trim() === '') {
    throw new Error('Release tag must be a non-empty string.');
  }

  const normalizedTag = tag.trim();
  const version = normalizedTag.startsWith('v')
    ? normalizedTag.slice(1)
    : normalizedTag;

  if (!semverPattern.test(version)) {
    throw new Error(`Release tag is not a supported SemVer: ${tag}`);
  }

  return {
    isPrerelease: version.includes('-'),
    version,
  };
};

export const checkRelease = ({
  eventName,
  githubPrerelease,
  packagePath,
  tag,
}) => {
  if (!['release', 'workflow_dispatch'].includes(eventName)) {
    throw new Error(`Unsupported release event: ${eventName}`);
  }

  const { isPrerelease, version } = parseReleaseTag(tag);
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));

  if (packageJson.name !== '@gromlab/rest-api-codegen') {
    throw new Error(`Unexpected package name: ${packageJson.name}`);
  }

  if (packageJson.version !== version) {
    throw new Error(`Release tag version ${version} does not match package version ${packageJson.version}.`);
  }

  if (eventName === 'release' && githubPrerelease !== isPrerelease) {
    throw new Error('GitHub prerelease flag does not match release tag.');
  }

  return { isPrerelease, version };
};

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const result = checkRelease({
    eventName: process.env.EVENT_NAME,
    githubPrerelease: process.env.IS_GITHUB_PRERELEASE === 'true',
    packagePath: path.resolve('package.json'),
    tag: process.env.RELEASE_TAG,
  });

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `release-version=${result.version}\nis-prerelease=${result.isPrerelease}\n`,
    );
  }

  console.log(`Validated @gromlab/rest-api-codegen@${result.version} for tag ${process.env.RELEASE_TAG}`);
}
