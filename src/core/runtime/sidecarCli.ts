import { CoreSidecarServer } from './coreSidecarServer.ts';
import { resolveSidecarConfig, verifyEmbeddedSqliteHealth } from './tauriSidecarRuntime.ts';

function parseArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  return undefined;
}

async function main(): Promise<void> {
  const healthcheck = process.argv.includes('--healthcheck');
  const dbPathArg = parseArg('--db-path');
  const dataRootArg = parseArg('--data-root');

  if (healthcheck) {
    const cfg = resolveSidecarConfig({
      dbPathOverride:
        dbPathArg ??
        (dataRootArg ? `${dataRootArg}\\data\\workspace.sqlite` : ':memory:'),
    });
    const health = verifyEmbeddedSqliteHealth(dbPathArg ? cfg.dbPath : ':memory:');
    process.stdout.write(`${JSON.stringify(health)}\n`);
    process.exit(health.ok ? 0 : 1);
  }

  const port = Number(parseArg('--port') ?? '0');
  const tokenArg = parseArg('--ui-token');
  const server = new CoreSidecarServer({
    localDataRootOverride: dataRootArg,
    dbPathOverride: dbPathArg,
    uiTokenOverride: tokenArg,
  });

  const started = await server.start(Number.isFinite(port) ? port : 0);
  // Emit a single sanitized JSON ready line consumed by Tauri / tests (never includes tokens!)
  process.stdout.write(
    `${JSON.stringify({
      type: 'cw_sidecar_ready',
      pid: process.pid,
      baseUrl: started.baseUrl,
      port: started.port,
      mcpUrl: started.mcpUrl,
      recoveredTasks: server.lastRecovery.recoveredTasks.length,
      recoveredWorkspaces: server.lastRecovery.recoveredWorkspaces.length,
    })}\n`,
  );

  const shutdown = async () => {
    await server.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });
  // Clean exit when parent Tauri process closes stdin pipe
  process.stdin.resume();
  process.stdin.on('end', () => {
    void shutdown();
  });
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
