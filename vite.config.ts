import os from 'node:os';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { CoreSidecarServer } from './src/core/runtime/coreSidecarServer.ts';

function coreSidecarVitePlugin(): Plugin {
  let coreServer: CoreSidecarServer | null = null;

  const ensureCoreServer = () => {
    if (!coreServer) {
      const localDataRoot =
        process.env.CW_LOCAL_DATA_ROOT?.trim() || path.join(os.tmpdir(), 'cloud-workspace-ia-dev');
      coreServer = new CoreSidecarServer({
        localDataRootOverride: localDataRoot,
      });
    }
    return coreServer;
  };

  return {
    name: 'cloud-workspace-core-sidecar',
    configureServer(server) {
      const core = ensureCoreServer();
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '/';
        if (!url.startsWith('/api/core') && url !== '/mcp') {
          next();
          return;
        }
        void core.handleNodeRequest(req, res).then((handled) => {
          if (!handled) next();
        });
      });
      server.httpServer?.once('close', () => {
        void core.stop();
        coreServer = null;
      });
    },
    configurePreviewServer(server) {
      const core = ensureCoreServer();
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '/';
        if (!url.startsWith('/api/core') && url !== '/mcp') {
          next();
          return;
        }
        void core.handleNodeRequest(req, res).then((handled) => {
          if (!handled) next();
        });
      });
      server.httpServer?.once('close', () => {
        void core.stop();
        coreServer = null;
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), coreSidecarVitePlugin()],
  clearScreen: false,
  server: {
    host: '127.0.0.1',
    port: 1420,
    strictPort: true,
    watch: {
      ignored: [
        '**/src-tauri/target/**',
        '**/src-tauri/binaries/**',
        '**/dist-core/**',
        '**/dist-win-test/**',
        '**/test-results/**',
        '**/playwright-report/**',
      ],
    },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: { target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'es2022' },
});
