import os from 'node:os';
import path from 'node:path';
import { SqliteStore } from '../storage/sqliteStore.ts';

export const CORE_SIDECAR_BINARY_NAME = 'cloud-workspace-core';
export const WINDOWS_TARGET_TRIPLE = 'x86_64-pc-windows-msvc';

export const ALLOWED_TAURI_ORIGINS: ReadonlyArray<string> = [
  'http://127.0.0.1:1420',
  'http://localhost:1420',
  'http://tauri.localhost',
  'tauri://localhost',
  'https://tauri.localhost',
];

export const REQUIRED_SQLITE_TABLES: ReadonlyArray<string> = [
  'agents',
  'agent_events',
  'approvals',
  'audit_events',
  'backup_records',
  'project_files_manifest',
  'projects',
  'sync_jobs',
  'tasks',
  'workspaces',
];

export interface NodeSeaConfig {
  main: string;
  output: string;
  disableExperimentalSEAWarning: boolean;
  useSnapshot: boolean;
  useCodeCache: boolean;
  assets?: Record<string, string>;
}

export interface SidecarRuntimeConfig {
  packagingMode: 'tauri-sidecar-node-sea';
  fallbackMode: 'bundled-portable-node';
  binaryName: string;
  targetTriple: string;
  externalBinEntry: string;
  sidecarExecutableRelPath: string;
  localDataRoot: string;
  dbPath: string;
  workspacesRoot: string;
  snapshotsRoot: string;
  bindHost: '127.0.0.1';
  allowedOrigins: ReadonlyArray<string>;
  transports: ReadonlyArray<'stdio' | 'http-loopback'>;
  requiresManualNodeInstall: false;
  requiresManualSqliteInstall: false;
}

export interface EmbeddedSqliteHealth {
  ok: boolean;
  nodeVersion: string;
  dbPath: string;
  sqliteWalEnabled: boolean;
  foreignKeysEnabled: boolean;
  tablesPresent: string[];
  missingTables: string[];
  checkedAt: string;
}

/**
 * Checks whether a path points to the Google Drive virtual drive (G:\)
 * or any Google Drive / DriveFS synchronized folder where temporary databases
 * and active agent workspaces must NEVER be placed.
 */
export function isGoogleDriveOrSyncedPath(
  candidatePath: string,
  extraForbiddenRoots: ReadonlyArray<string> = [],
): boolean {
  const normalized = candidatePath.trim().replaceAll('/', '\\').toLowerCase();
  if (/^g:\\?$/.test(normalized) || normalized.startsWith('g:\\') || normalized.startsWith('g:')) {
    return true;
  }
  if (
    normalized.includes('\\meu drive\\') ||
    normalized.endsWith('\\meu drive') ||
    normalized.includes('\\my drive\\') ||
    normalized.endsWith('\\my drive') ||
    normalized.includes('\\drivefs\\') ||
    normalized.includes('google drive')
  ) {
    return true;
  }
  for (const extra of extraForbiddenRoots) {
    const forbidden = extra.trim().replaceAll('/', '\\').toLowerCase().replace(/\\+$/, '');
    if (forbidden && (normalized === forbidden || normalized.startsWith(`${forbidden}\\`))) {
      return true;
    }
  }
  return false;
}

/**
 * Resolves the local Windows runtime paths for the Tauri-managed Node/SQLite sidecar.
 * Enforces that SQLite databases, temporary workspaces, and snapshots stay outside G:\.
 */
export function resolveSidecarConfig(options: {
  env?: Record<string, string | undefined>;
  dbPathOverride?: string;
  workspacesRootOverride?: string;
  snapshotsRootOverride?: string;
  forbiddenRoots?: ReadonlyArray<string>;
} = {}): SidecarRuntimeConfig {
  const env = options.env ?? process.env;
  const fallbackLocalAppData = path.join(os.homedir(), 'AppData', 'Local');
  const localAppData = env.LOCALAPPDATA?.trim() || env.XDG_DATA_HOME?.trim() || fallbackLocalAppData;
  const localDataRoot = path.join(localAppData, 'CloudWorkspaceIA');

  const dbPath = options.dbPathOverride ?? path.join(localDataRoot, 'data', 'workspace.sqlite');
  const workspacesRoot = options.workspacesRootOverride ?? path.join(localDataRoot, 'Workspaces');
  const snapshotsRoot = options.snapshotsRootOverride ?? path.join(localDataRoot, 'Snapshots');

  const forbidden = options.forbiddenRoots ?? [];
  for (const [label, target] of [
    ['dbPath', dbPath],
    ['workspacesRoot', workspacesRoot],
    ['snapshotsRoot', snapshotsRoot],
  ] as const) {
    if (isGoogleDriveOrSyncedPath(target, forbidden)) {
      throw new Error(`Security policy violation: ${label} cannot reside inside Google Drive (${target}).`);
    }
  }

  return {
    packagingMode: 'tauri-sidecar-node-sea',
    fallbackMode: 'bundled-portable-node',
    binaryName: CORE_SIDECAR_BINARY_NAME,
    targetTriple: WINDOWS_TARGET_TRIPLE,
    externalBinEntry: `binaries/${CORE_SIDECAR_BINARY_NAME}`,
    sidecarExecutableRelPath: `src-tauri/binaries/${CORE_SIDECAR_BINARY_NAME}-${WINDOWS_TARGET_TRIPLE}.exe`,
    localDataRoot,
    dbPath,
    workspacesRoot,
    snapshotsRoot,
    bindHost: '127.0.0.1',
    allowedOrigins: ALLOWED_TAURI_ORIGINS,
    transports: ['stdio', 'http-loopback'],
    requiresManualNodeInstall: false,
    requiresManualSqliteInstall: false,
  };
}

/**
 * Generates the Node 26 Single Executable Application (`node --build-sea`) configuration
 * used during Windows release packaging so the final installer embeds Node + built-in `node:sqlite`.
 */
export function generateSeaConfig(options: {
  entryBundlePath: string;
  outputExecutablePath: string;
  useCodeCache?: boolean;
}): NodeSeaConfig {
  if (!options.entryBundlePath.trim() || !options.outputExecutablePath.trim()) {
    throw new Error('entryBundlePath and outputExecutablePath are required to generate SEA config.');
  }
  return {
    main: options.entryBundlePath,
    output: options.outputExecutablePath,
    disableExperimentalSEAWarning: true,
    useSnapshot: false,
    useCodeCache: options.useCodeCache ?? true,
  };
}

/**
 * Performs an initialization self-check of the embedded `node:sqlite` database,
 * verifying WAL mode (for file-backed DBs), foreign key enforcement, and all core tables.
 */
export function verifyEmbeddedSqliteHealth(dbPath = ':memory:'): EmbeddedSqliteHealth {
  if (dbPath !== ':memory:' && isGoogleDriveOrSyncedPath(dbPath)) {
    throw new Error(`Refusing to initialize SQLite inside Google Drive: ${dbPath}`);
  }
  const store = new SqliteStore(dbPath);
  try {
    const journalMode = String(store.pragma('journal_mode') ?? '').toLowerCase();
    const foreignKeysEnabled = Number(store.pragma('foreign_keys')) === 1;
    const tablesPresent = store.listTableNames();
    const missingTables = REQUIRED_SQLITE_TABLES.filter((t) => !tablesPresent.includes(t));
    const sqliteWalEnabled = dbPath === ':memory:' ? true : journalMode === 'wal';
    const checkedAt = new Date().toISOString();

    store.appendAuditEvent({
      subject: 'core.runtime.tauriSidecar',
      action: 'healthcheck',
      scope: 'embedded-sqlite',
      occurredAt: checkedAt,
      status: missingTables.length === 0 && sqliteWalEnabled && foreignKeysEnabled ? 'ok' : 'error',
      safeDetails: `Node ${process.versions.node}; journal=${journalMode}; fk=${foreignKeysEnabled}; tables=${tablesPresent.length}`,
      origin: 'core-sidecar',
    });

    return {
      ok: missingTables.length === 0 && sqliteWalEnabled && foreignKeysEnabled,
      nodeVersion: process.versions.node,
      dbPath,
      sqliteWalEnabled,
      foreignKeysEnabled,
      tablesPresent,
      missingTables,
      checkedAt,
    };
  } finally {
    store.close();
  }
}
