import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  CORE_SIDECAR_BINARY_NAME,
  WINDOWS_TARGET_TRIPLE,
  generateSeaConfig,
} from '../src/core/runtime/tauriSidecarRuntime.ts';

const require = createRequire(import.meta.url);
const esbuild = require('esbuild');

const ROOT = process.cwd();
const DIST_CORE = path.join(ROOT, 'dist-core');
const ENTRY_TS = path.join(ROOT, 'src', 'core', 'runtime', 'sidecarCli.ts');
const BUNDLE_CJS = path.join(DIST_CORE, 'sidecar.cjs');
const SEA_CONFIG_PATH = path.join(DIST_CORE, 'sea-config.json');
const OUTPUT_EXE = path.join(
  ROOT,
  'src-tauri',
  'binaries',
  `${CORE_SIDECAR_BINARY_NAME}-${WINDOWS_TARGET_TRIPLE}.exe`,
);

async function buildSidecar() {
  fs.mkdirSync(DIST_CORE, { recursive: true });
  fs.mkdirSync(path.dirname(OUTPUT_EXE), { recursive: true });

  await esbuild.build({
    entryPoints: [ENTRY_TS],
    outfile: BUNDLE_CJS,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node24',
    external: ['node:*'],
    sourcemap: false,
    logLevel: 'info',
  });

  const seaConfig = generateSeaConfig({
    entryBundlePath: BUNDLE_CJS,
    outputExecutablePath: OUTPUT_EXE,
    useCodeCache: false,
  });

  fs.writeFileSync(SEA_CONFIG_PATH, JSON.stringify(seaConfig, null, 2), 'utf8');

  if (fs.existsSync(OUTPUT_EXE)) {
    fs.rmSync(OUTPUT_EXE, { force: true });
  }

  execFileSync(process.execPath, ['--build-sea', SEA_CONFIG_PATH], {
    cwd: ROOT,
    stdio: 'inherit',
  });

  const healthOut = execFileSync(OUTPUT_EXE, ['--healthcheck'], {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 15_000,
  });

  const health = JSON.parse(healthOut.trim());
  if (!health.ok) {
    throw new Error(`Sidecar Windows SEA healthcheck failed: ${healthOut}`);
  }

  const sizeMb = (fs.statSync(OUTPUT_EXE).size / 1024 / 1024).toFixed(2);
  console.log(
    `Built standalone Windows SEA sidecar: ${path.relative(ROOT, OUTPUT_EXE)} (${sizeMb} MB, Node ${health.nodeVersion}, ${health.tablesPresent.length} SQLite tables)`,
  );
}

buildSidecar().catch((err) => {
  console.error(err);
  process.exit(1);
});
