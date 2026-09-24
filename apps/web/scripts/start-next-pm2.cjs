const { spawn } = require('child_process');
const path = require('path');

const standaloneServer = path.resolve(__dirname, '../.next/standalone/apps/web/server.js');
const nextProcess = spawn(process.platform === 'win32' ? 'node.exe' : process.execPath, [standaloneServer], {
  cwd: path.dirname(standaloneServer),
  env: { ...process.env, NODE_ENV: 'production' },
  stdio: 'inherit',
  windowsHide: true,
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => nextProcess.kill(signal));
}

nextProcess.on('error', (error) => {
  console.error(error);
  process.exit(1);
});

nextProcess.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 1);
  }
});
