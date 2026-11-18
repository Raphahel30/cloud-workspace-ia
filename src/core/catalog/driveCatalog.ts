import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { ManifestEntryRecord, ProjectRecord, SqliteStore } from '../storage/sqliteStore.ts';

export const DEFAULT_PROJECTS_ROOT = 'G:\\Meu Drive\\Projetos Code\\01 - Projetos';

const STACK_MARKERS: ReadonlyArray<[string, string]> = [
  ['package.json', 'node'],
  ['Cargo.toml', 'rust'],
  ['tsconfig.json', 'typescript'],
  ['pyproject.toml', 'python'],
  ['requirements.txt', 'python'],
  ['composer.json', 'php'],
];

const HASHABLE_EXTS = new Set(['.json', '.md', '.txt', '.toml', '.ts', '.tsx', '.mjs', '.cjs', '.example']);
const MAX_HASH_BYTES = 256 * 1024;

export interface ScannedProject {
  project: ProjectRecord;
  subfolders: string[];
  markers: string[];
  sensitiveCount: number;
  manifest: ManifestEntryRecord[];
}

export interface ScanOptions {
  maxDepth?: number;
  computeSmallHashes?: boolean;
  nowIso?: string;
}

/** Classifies files whose contents must NEVER be read or logged in plain text. */
export function isSensitiveFileName(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  if (lower === '.env.example' || lower === '.env.sample') return false;
  if (lower === '.env' || lower.startsWith('.env.')) return true;
  if (lower.endsWith('.kdbx') || lower.endsWith('.key') || lower.endsWith('.pem') || lower.endsWith('.p12')) {
    return true;
  }
  return (
    lower.includes('credential') ||
    lower.includes('secret') ||
    lower.includes('token') ||
    lower.includes('master_key')
  );
}

function detectMarkers(projectDir: string): { stacks: string[]; markers: string[] } {
  const rootsToCheck = [projectDir, path.join(projectDir, 'Arquivos Navegaveis')];
  const stacks = new Set<string>();
  const markers = new Set<string>();

  for (const dir of rootsToCheck) {
    if (!fs.existsSync(dir)) continue;
    for (const [marker, stack] of STACK_MARKERS) {
      if (fs.existsSync(path.join(dir, marker))) {
        markers.add(marker);
        stacks.add(stack);
      }
    }
    try {
      for (const name of fs.readdirSync(dir)) {
        if (name.toLowerCase().endsWith('.sln')) {
          markers.add(name);
          stacks.add('dotnet');
        }
      }
    } catch {
      // Ignore unreadable directories during read-only scan
    }
  }
  return {
    stacks: stacks.size > 0 ? [...stacks].sort() : ['unknown'],
    markers: [...markers].sort(),
  };
}

function safeHashSmallFile(filePath: string, sizeBytes: number): string | null {
  if (sizeBytes > MAX_HASH_BYTES) return null;
  const ext = path.extname(filePath).toLowerCase();
  if (!HASHABLE_EXTS.has(ext)) return null;
  try {
    const buf = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(buf).digest('hex');
  } catch {
    return null;
  }
}

/**
 * Strictly read-only scanner for Google Drive `Projetos Code/01 - Projetos`
 * (or any test fixture root). Never creates, writes, or deletes files in the scanned tree.
 */
export function scanProjectsRoot(
  rootDir: string = DEFAULT_PROJECTS_ROOT,
  options: ScanOptions = {},
): ScannedProject[] {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const maxDepth = options.maxDepth ?? 4;
  const computeSmallHashes = options.computeSmallHashes ?? false;
  const nowIso = options.nowIso ?? new Date().toISOString();

  const entries = fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .sort((a, b) => a.name.localeCompare(b.name));

  const results: ScannedProject[] = [];

  for (const dir of entries) {
    const slug = dir.name;
    const projectPath = path.join(rootDir, slug);
    const subfolders = fs
      .readdirSync(projectPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();

    const { stacks, markers } = detectMarkers(projectPath);
    const manifest: ManifestEntryRecord[] = [];
    let sensitiveCount = 0;

    const walk = (currentDir: string, depth: number) => {
      if (depth > maxDepth) return;
      let children: fs.Dirent[];
      try {
        children = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const child of children) {
        if (child.name === 'node_modules' || child.name === '.git' || child.name === 'target') {
          continue;
        }
        const fullPath = path.join(currentDir, child.name);
        if (child.isDirectory()) {
          walk(fullPath, depth + 1);
          continue;
        }
        if (!child.isFile()) continue;

        let stat: fs.Stats;
        try {
          stat = fs.statSync(fullPath);
        } catch {
          continue;
        }

        const sensitive = isSensitiveFileName(child.name);
        if (sensitive) sensitiveCount++;

        const relativePath = path.relative(projectPath, fullPath).replaceAll('\\', '/');
        manifest.push({
          projectId: slug,
          relativePath,
          sizeBytes: stat.size,
          checksum:
            !sensitive && computeSmallHashes ? safeHashSmallFile(fullPath, stat.size) : null,
          sensitivity: sensitive ? 'secret-name-only' : 'public',
          lastSyncedAt: stat.mtime.toISOString(),
        });
      }
    };

    walk(projectPath, 0);
    manifest.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

    results.push({
      project: {
        id: slug,
        slug,
        name: slug,
        stack: stacks.join('+'),
        status: 'cataloged',
        localPath: null,
        drivePath: projectPath,
        githubRepo: null,
        reviewStatus: 'pending-review',
        updatedAt: nowIso,
      },
      subfolders,
      markers,
      sensitiveCount,
      manifest,
    });
  }

  return results;
}

/** Persists a read-only catalog scan into SQLite and records an audit event. */
export function syncCatalogToStore(
  store: SqliteStore,
  rootDir: string = DEFAULT_PROJECTS_ROOT,
  options: ScanOptions = {},
): ScannedProject[] {
  const scanned = scanProjectsRoot(rootDir, options);
  const nowIso = options.nowIso ?? new Date().toISOString();

  for (const item of scanned) {
    store.upsertProject(item.project);
    store.replaceProjectManifest(item.project.id, item.manifest);
  }

  store.appendAuditEvent({
    subject: 'core.catalog.driveCatalog',
    action: 'scan_readonly',
    scope: rootDir,
    occurredAt: nowIso,
    status: 'ok',
    safeDetails: `Cataloged ${scanned.length} project(s) without modifying source files.`,
    origin: 'core-01',
  });

  return scanned;
}
