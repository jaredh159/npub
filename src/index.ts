#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import semver, { ReleaseType } from 'semver';
import { c, gray, log, red } from 'x-chalk';
import exec from 'x-exec';

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const input = argv.shift();
  if (!input) {
    red(`ERROR: Missing input string`);
    log(c`usage: {green npub patch|minor|major|prerelease|3.7.3|1.2.0-beta.3}`);
    process.exit(1);
  }

  if (!isReleaseType(input) && !semver.valid(input)) {
    log(c`{red Invalid input:} {yellow ${input}}`);
    process.exit(1);
  }

  let nextVersion = ``;
  const [name, version] = getPkgInfo();
  if (isReleaseType(input)) {
    nextVersion = semver.inc(version, input) ?? `<error>`;
  } else {
    nextVersion = input;
  }

  const gitBranch = exec
    .exit(`git rev-parse --symbolic-full-name --abbrev-ref HEAD`)
    .trim();

  if (gitBranch !== `master` && !argv.includes(`--allow-branch`)) {
    red(`ERROR: Publishing only allowed from branch <master>`);
    log(c`{gray pass flag {green --allow-branch} to override}`);
    process.exit(1);
  }

  let tag = `latest`;
  if (nextVersion.match(/(alpha|beta|rc)/)) {
    tag = `next`;
  }
  for (let i = 0; i < argv.length; i++) {
    if ([`-t`, `--tag`].includes(argv[i] ?? ``) && typeof argv[i + 1] === `string`) {
      tag = argv[i + 1] ?? `error`;
    }
  }

  const doGitOps = !argv.includes(`--no-git`);
  const delay = !argv.includes(`--no-delay`);
  const doCi = !argv.includes(`--no-check`);

  log(
    c`\nAbout to publish {cyan ${name}} -> {yellow ${nextVersion}} with tag {magenta @${tag}}`,
  );
  doGitOps && gray(`git add/commit/tag operations will be made (--no-git to disable)`);
  delay && gray(`You have 5 seconds to abort with <Ctrl-C> (--no-delay to disable)...\n`);
  delay && (await new Promise((res) => setTimeout(res, 5000)));
  !delay && log(``);

  if (doCi) {
    log(
      c`{magenta •} running {green npub:precheck} npm script {gray --no-check to disable}\n`,
    );
    if (!exec.out(`npm run npub:precheck`)) {
      red(`npub:precheck script failed`);
      process.exit(1);
    }
    log(``);
  }

  log(c`{magenta •} setting new version {green ${nextVersion}} in package.json`);
  exec.exit(`npm version --git-tag-version=false --allow-same-version ${nextVersion}`);

  log(c`{magenta •} publishing {green ${nextVersion}@${tag}} to npm\n`);
  if (!exec.out(`npm publish --access public --tag ${tag}`)) {
    red(`npm publish failed`);
    process.exit(1);
  }
  log(``);

  if (doGitOps) {
    log(c`{magenta •} running {green git add .}`);
    exec.out(`git add .`);
    log(c`{magenta •} running {green git commit -am v${nextVersion}}\n`);
    exec.out(`git commit -am v${nextVersion}`);
    log(c`\n{magenta •} running {green git tag v${nextVersion}}`);
    exec.out(`git tag v${nextVersion}`);
    log(c`{magenta •} running {green git push origin ${gitBranch}}\n`);
    exec.out(`git push origin ${gitBranch}`);
    log(c`\n{magenta •} running {green git push origin tag v${nextVersion}}\n`);
    exec.out(`git push origin tag v${nextVersion}`);
    log(``);
  }

  // @TODO consider automating github releases:
  // https://cli.github.com/manual/gh_release_create
}

main();

function getPkgInfo(): [name: string, version: string] {
  const pkgPath = path.join(process.cwd(), `package.json`);
  const contents = fs.readFileSync(pkgPath, `utf-8`);
  const pkg = JSON.parse(contents);
  return [pkg.name, pkg.version];
}

function isReleaseType(string: string): string is ReleaseType {
  const releaseTypes: ReleaseType[] = [`patch`, `minor`, `major`, `prerelease`];
  return releaseTypes.includes(string as ReleaseType);
}
