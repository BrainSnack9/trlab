import { execSync } from 'node:child_process';

const ports = [5173, 5174];

for (const port of ports) {
  for (const pid of findPids(port)) {
    try {
      process.kill(Number(pid), 'SIGTERM');
      console.log(`Stopped process ${pid} on port ${port}`);
    } catch (error) {
      if (error.code !== 'ESRCH') {
        console.warn(`Could not stop process ${pid} on port ${port}: ${error.message}`);
      }
    }
  }
}

function findPids(port) {
  if (process.platform === 'win32') {
    return findWindowsPids(port);
  }

  try {
    return execSync(`lsof -ti tcp:${port}`, { encoding: 'utf8' })
      .split('\n')
      .map((pid) => pid.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function findWindowsPids(port) {
  try {
    return execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', shell: 'cmd.exe' })
      .split('\n')
      .map((line) => line.trim().split(/\s+/).at(-1))
      .filter((pid, index, pids) => pid && pids.indexOf(pid) === index);
  } catch {
    return [];
  }
}
