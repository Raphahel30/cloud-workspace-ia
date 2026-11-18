import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from '@playwright/test';

function resolveChromiumPath(): string {
  if (process.env.CHROMIUM_PATH && fs.existsSync(process.env.CHROMIUM_PATH)) {
    return process.env.CHROMIUM_PATH;
  }
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    const cacheDir = path.join(process.env.LOCALAPPDATA, 'ms-playwright');
    if (fs.existsSync(cacheDir)) {
      const dirs = fs
        .readdirSync(cacheDir)
        .filter((d) => d.startsWith('chromium-'))
        .sort()
        .reverse();
      for (const dir of dirs) {
        const candidate = path.join(cacheDir, dir, 'chrome-win64', 'chrome.exe');
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
    }
  }
  return '/usr/bin/chromium';
}

export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:1420',
    headless: true,
    launchOptions: {
      executablePath: resolveChromiumPath(),
      args: [
        '--no-sandbox',
        '--enable-unsafe-swiftshader',
        '--use-gl=angle',
        '--use-angle=swiftshader',
      ],
    },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port 1420 --strictPort',
    url: 'http://127.0.0.1:1420',
    reuseExistingServer: true,
    timeout: 30000,
  },
  reporter: [['list'], ['json', { outputFile: 'docs/codex/e2e-results.json' }]],
});
