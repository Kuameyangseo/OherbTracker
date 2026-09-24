const { cpSync, existsSync, readdirSync, rmSync } = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');

const nextCli = path.resolve(__dirname, '../../../node_modules/next/dist/bin/next');
const result = spawnSync(process.execPath, [nextCli, 'build'], {
  cwd: path.resolve(__dirname, '..'),
  env: {
    ...process.env,
    NODE_ENV: 'production',
    NEXT_PHASE: 'phase-production-build',
  },
  stdio: 'inherit',
  windowsHide: true,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const appRoot = path.resolve(__dirname, '..');
const standaloneRoot = path.join(appRoot, '.next', 'standalone', 'apps', 'web');
const staticSource = path.join(appRoot, '.next', 'static');
const staticTarget = path.join(standaloneRoot, '.next', 'static');

if (existsSync(staticSource)) {
  rmSync(staticTarget, { recursive: true, force: true });
  cpSync(staticSource, staticTarget, { recursive: true });
}

const publicSource = path.join(appRoot, 'public');
const publicTarget = path.join(standaloneRoot, 'public');
if (existsSync(publicSource)) {
  cpSync(publicSource, publicTarget, { recursive: true });
}

if (!existsSync(staticTarget) || readdirSync(staticTarget).length === 0) {
  console.error('Production build did not produce Next static assets. Refusing to deploy an incomplete standalone bundle.');
  process.exit(1);
}
