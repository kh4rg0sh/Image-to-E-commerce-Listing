const { exec } = require('child_process');

const fastAPI = exec('uvicorn backend.api.api:app --reload', {
  cwd: process.cwd(),
});

fastAPI.stdout.on('data', (data) => {
  console.log(`[Backend] ${data}`);
});

fastAPI.stderr.on('data', (data) => {
  console.error(`[Backend] ${data}`);
});

const frontend = exec('npm install && npm run dev', {
  cwd: `${process.cwd()}/client`,
});

frontend.stdout.on('data', (data) => {
  console.log(`[Frontend] ${data}`);
});

frontend.stderr.on('data', (data) => {
  console.error(`[Frontend ERROR] ${data}`);
});