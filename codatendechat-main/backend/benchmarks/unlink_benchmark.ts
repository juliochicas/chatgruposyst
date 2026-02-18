import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

const TEMP_DIR = path.join(__dirname, 'temp_benchmark');
const NUM_FILES = 1000;

async function setup() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR);
  }
  // Create enough files for both tests
  for (let i = 0; i < NUM_FILES; i++) {
    fs.writeFileSync(path.join(TEMP_DIR, `file_${i}.txt`), 'some content');
  }
}

function cleanup() {
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
}

async function benchmarkSync() {
  const start = performance.now();
  // Delete first 500 files
  for (let i = 0; i < NUM_FILES / 2; i++) {
    try {
      fs.unlinkSync(path.join(TEMP_DIR, `file_${i}.txt`));
    } catch (e) {}
  }
  const end = performance.now();
  console.log(`Sync deletion (500 files): ${(end - start).toFixed(4)} ms`);
}

async function benchmarkAsyncSequential() {
  const start = performance.now();
  // Delete remaining 500 files
  for (let i = NUM_FILES / 2; i < NUM_FILES; i++) {
    try {
      await fs.promises.unlink(path.join(TEMP_DIR, `file_${i}.txt`));
    } catch (e) {}
  }
  const end = performance.now();
  console.log(`Async deletion (500 files - sequential): ${(end - start).toFixed(4)} ms`);
}

(async () => {
  try {
    console.log('Setting up...');
    await setup();
    console.log('Running Sync Benchmark...');
    await benchmarkSync();
    console.log('Running Async Benchmark (Sequential)...');
    await benchmarkAsyncSequential();
  } catch (error) {
    console.error(error);
  } finally {
    cleanup();
  }
})();
