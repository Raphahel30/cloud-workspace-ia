import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ManifestEntryRecord, ProjectRecord, SqliteStore } from '../storage/sqliteStore.ts';

export const DEFAULT_DRIVE_CODE_ROOT = 'G:\\Meu Drive\\Projetos Code';
export const DEFAULT_PROJECTS_ROOT = 'G:\\Meu Drive\\Projetos Code\\01 - Projetos';
export const DEFAULT_LOCAL_PROJECTS_ROOT = path.join(os.homedir(), 'Projetos');

const STACK_MARKERS: ReadonlyArray<[string, string]> = [
  ['package.json', 'node'],
  ['Cargo.toml', 'rust'],
  ['tsconfig.json', 'typescript'],
  ['pyproject.toml', 'python'],
  ['requirements.txt', 'python'],
  ['composer.json', 'php'],
];

const SKIP_SCAN_DIRS = new Set(['node_modules', '.git', 'target', 'dist', 'gen', '.venv', '__pycache__']);
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

export interface StorageVolumeMetrics {
  path: string;
  available: boolean;
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
}

export interface PackageArchiveInfo {
  name: string;
  sizeBytes: number;
  modifiedAt: string;
}

export interface WorktreeSummary {
  path: string;
  branch: string | null;
  head: string | null;
}

export interface EnrichedProjectCatalogItem {
  id: string;
  slug: string;
  name: string;
  drivePath: string;
  localRepoPath: string | null;
  subfolders: string[];
  topFiles: string[];
  fileCount: number;
  totalBytes: number;
  sensitiveCount: number;
  technologies: string[];
  githubRepo: string | null;
  currentBranch: string | null;
  headSha: string | null;
  dirtyFilesCount: number | null;
  dirtyFilesPreview: string[];
  worktrees: WorktreeSummary[];
  packages: PackageArchiveInfo[];
  backupsCount: number;
  conflictsDetected: string[];
  lastConfirmedSyncAt: string | null;
  projectState: 'ativo-desenvolvimento' | 'catalogado' | 'requer-revisao';
  reviewStatus: string;
}

export interface CompanionDriveFolder {
  name: string;
  fullPath: string;
  fileCount: number;
  totalBytes: number;
  lastModifiedAt: string | null;
}

export interface DriveCatalogReport {
  checkedAt: string;
  driveRoot: string;
  projectsRoot: string;
  driveConnected: boolean;
  readOnlyVerified: true;
  projects: EnrichedProjectCatalogItem[];
  companionFolders: CompanionDriveFolder[];
  storage: {
    ssdLocal: StorageVolumeMetrics;
    googleDrive: StorageVolumeMetrics;
  };
}

function readVolumeMetrics(targetPath: string): StorageVolumeMetrics {
  if (!fs.existsSync(targetPath)) {
    return { path: targetPath, available: false, totalBytes: 0, freeBytes: 0, usedBytes: 0 };
  }
  try {
    const stat = fs.statfsSync(targetPath);
    const bsize = Number(stat.bsize);
    const totalBytes = Number(stat.blocks) * bsize;
    const freeBytes = Number(stat.bavail) * bsize;
    return {
      path: targetPath,
      available: true,
      totalBytes,
      freeBytes,
      usedBytes: Math.max(0, totalBytes - freeBytes),
    };
  } catch {
    return { path: targetPath, available: false, totalBytes: 0, freeBytes: 0, usedBytes: 0 };
  }
}

function detectRichTechnologies(candidateRoots: ReadonlyArray<string>): string[] {
  const techs = new Set<string>();
  for (const dir of candidateRoots) {
    if (!fs.existsSync(dir)) continue;
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      techs.add('Node.js');
      try {
        const raw = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        };
        const deps = { ...(raw.dependencies ?? {}), ...(raw.devDependencies ?? {}) };
        if (deps.react) techs.add('React');
        if (deps['pixi.js']) techs.add('PixiJS 8');
        if (deps['@tauri-apps/api'] || deps['@tauri-apps/cli']) techs.add('Tauri 2');
        if (deps.typescript) techs.add('TypeScript');
        if (deps.vite) techs.add('Vite');
        if (deps.vitest) techs.add('Vitest');
        if (deps['@playwright/test']) techs.add('Playwright');
      } catch {
        // Malformed optional metadata file should not abort scan
      }
    }
    if (fs.existsSync(path.join(dir, 'Cargo.toml')) || fs.existsSync(path.join(dir, 'src-tauri', 'Cargo.toml'))) {
      techs.add('Rust / Tauri 2');
    }
    if (fs.existsSync(path.join(dir, 'pyproject.toml')) || fs.existsSync(path.join(dir, 'requirements.txt'))) {
      techs.add('Python');
    }
    if (fs.existsSync(path.join(dir, 'composer.json'))) {
      techs.add('PHP');
    }
  }
  return techs.size > 0 ? [...techs] : ['Não identificado'];
}

function runReadOnlyGit(cwd: string, args: string[]): string | null {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      windowsHide: true,
      timeout: 3500,
    }).trim();
  } catch {
    return null;
  }
}

function parseGitHubRepo(remoteUrl: string | null): string | null {
  if (!remoteUrl) return null;
  const cleaned = remoteUrl.replace(/\.git$/i, '');
  const match = cleaned.match(/github\.com[:/]([^/]+\/[^/]+)$/i);
  return match ? match[1] : cleaned;
}

function parseWorktreeList(raw: string | null): WorktreeSummary[] {
  if (!raw) return [];
  const blocks = raw.split(/\r?\n\r?\n/).filter((b) => b.trim().length > 0);
  return blocks.map((block) => {
    const lines = block.split(/\r?\n/);
    let wtPath = '';
    let head: string | null = null;
    let branch: string | null = null;
    for (const line of lines) {
      if (line.startsWith('worktree ')) wtPath = line.slice(9).trim();
      else if (line.startsWith('HEAD ')) head = line.slice(5).trim().slice(0, 7);
      else if (line.startsWith('branch ')) branch = line.slice(7).trim().replace(/^refs\/heads\//, '');
    }
    return { path: wtPath, head, branch };
  });
}

function measureDirectoryTree(rootDir: string, maxDepth = 4): {
  fileCount: number;
  totalBytes: number;
  sensitiveCount: number;
  conflictsDetected: string[];
  latestMtimeMs: number;
} {
  let fileCount = 0;
  let totalBytes = 0;
  let sensitiveCount = 0;
  let latestMtimeMs = 0;
  const conflictsDetected: string[] = [];

  const walk = (dir: string, depth: number) => {
    if (depth > maxDepth) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (SKIP_SCAN_DIRS.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
        continue;
      }
      if (!entry.isFile()) continue;
      try {
        const stat = fs.statSync(fullPath);
        fileCount++;
        totalBytes += stat.size;
        if (stat.mtimeMs > latestMtimeMs) latestMtimeMs = stat.mtimeMs;
        if (isSensitiveFileName(entry.name)) sensitiveCount++;
        const lower = entry.name.toLowerCase();
        if (lower.includes('.conflict-') || lower.includes('conflicted copy')) {
          conflictsDetected.push(path.relative(rootDir, fullPath).replaceAll('\\', '/'));
        }
      } catch {
        // Ignore streaming locks/unreachable entries safely
      }
    }
  };

  walk(rootDir, 0);
  return { fileCount, totalBytes, sensitiveCount, conflictsDetected, latestMtimeMs };
}

/**
 * Rich read-only inspection of `G:\Meu Drive\Projetos Code` for Etapa 4 Project Manager.
 * Combines streaming Drive structure, archive packages, technology markers, SSD/Drive capacity,
 * SQLite persisted backups/conflicts, and read-only GitHub/branch verification when a local clone exists.
 */
export function inspectDriveProjectsRoot(options: {
  driveRoot?: string;
  projectsSubdir?: string;
  localProjectsRoot?: string;
  store?: SqliteStore;
} = {}): DriveCatalogReport {
  const driveRoot = options.driveRoot ?? DEFAULT_DRIVE_CODE_ROOT;
  const projectsRoot = options.projectsSubdir ?? path.join(driveRoot, '01 - Projetos');
  const localProjectsRoot = options.localProjectsRoot ?? DEFAULT_LOCAL_PROJECTS_ROOT;
  const checkedAt = new Date().toISOString();
  const driveConnected = fs.existsSync(driveRoot);

  const projects: EnrichedProjectCatalogItem[] = [];
  const companionFolders: CompanionDriveFolder[] = [];

  if (driveConnected && fs.existsSync(projectsRoot)) {
    const dirs = fs
      .readdirSync(projectsRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const dir of dirs) {
      const slug = dir.name;
      const projectDrivePath = path.join(projectsRoot, slug);
      const children = fs.readdirSync(projectDrivePath, { withFileTypes: true });
      const subfolders = children
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort();
      const topFiles = children
        .filter((d) => d.isFile())
        .map((d) => d.name)
        .sort();

      const stats = measureDirectoryTree(projectDrivePath, 4);
      const localRepoCandidate = path.join(localProjectsRoot, slug);
      const localRepoPath = fs.existsSync(path.join(localRepoCandidate, '.git')) ? localRepoCandidate : null;

      const techRoots = [
        projectDrivePath,
        path.join(projectDrivePath, 'Arquivos Navegaveis'),
        ...(localRepoPath ? [localRepoPath] : []),
      ];
      const technologies = detectRichTechnologies(techRoots);

      let githubRepo: string | null = null;
      let currentBranch: string | null = null;
      let headSha: string | null = null;
      let dirtyFilesPreview: string[] = [];
      let dirtyFilesCount: number | null = null;
      let worktrees: WorktreeSummary[] = [];

      if (localRepoPath) {
        githubRepo = parseGitHubRepo(runReadOnlyGit(localRepoPath, ['remote', 'get-url', 'origin']));
        currentBranch = runReadOnlyGit(localRepoPath, ['branch', '--show-current']);
        headSha = runReadOnlyGit(localRepoPath, ['rev-parse', '--short', 'HEAD']);
        worktrees = parseWorktreeList(runReadOnlyGit(localRepoPath, ['worktree', 'list', '--porcelain']));
        const statusOut = runReadOnlyGit(localRepoPath, ['status', '--porcelain']);
        if (statusOut !== null) {
          const lines = statusOut.split(/\r?\n/).filter((l) => l.trim().length > 0);
          dirtyFilesCount = lines.length;
          dirtyFilesPreview = lines.slice(0, 12);
        }
      }

      const packagesDir = path.join(projectDrivePath, 'Pacotes');
      const packages: PackageArchiveInfo[] = [];
      if (fs.existsSync(packagesDir)) {
        for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
          if (!entry.isFile()) continue;
          try {
            const st = fs.statSync(path.join(packagesDir, entry.name));
            packages.push({
              name: entry.name,
              sizeBytes: st.size,
              modifiedAt: st.mtime.toISOString(),
            });
          } catch {
            // Skip unreadable entry safely
          }
        }
        packages.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
      }

      const dbBackups = options.store ? options.store.listBackups(slug).length : 0;
      const syncConflicts = options.store
        ? options.store
            .listSyncJobs()
            .filter((j) => j.state === 'CONFLITO' && (j.sourcePath.includes(slug) || j.targetPath.includes(slug)))
            .map((j) => j.id)
        : [];
      const conflictsDetected = [...stats.conflictsDetected, ...syncConflicts];
      const backupsCount = packages.length + dbBackups;

      const projectState: EnrichedProjectCatalogItem['projectState'] =
        conflictsDetected.length > 0
          ? 'requer-revisao'
          : localRepoPath && githubRepo
            ? 'ativo-desenvolvimento'
            : 'catalogado';

      const lastConfirmedSyncAt = stats.latestMtimeMs > 0 ? new Date(stats.latestMtimeMs).toISOString() : null;

      if (options.store) {
        options.store.upsertProject({
          id: slug,
          slug,
          name: slug,
          stack: technologies.join('+'),
          status: projectState,
          localPath: localRepoPath,
          drivePath: projectDrivePath,
          githubRepo,
          reviewStatus: conflictsDetected.length > 0 ? 'conflict-review' : 'verified-readonly',
          updatedAt: checkedAt,
        });
      }

      projects.push({
        id: slug,
        slug,
        name: slug,
        drivePath: projectDrivePath,
        localRepoPath,
        subfolders,
        topFiles,
        fileCount: stats.fileCount,
        totalBytes: stats.totalBytes,
        sensitiveCount: stats.sensitiveCount,
        technologies,
        githubRepo,
        currentBranch,
        headSha,
        dirtyFilesCount,
        dirtyFilesPreview,
        worktrees,
        packages,
        backupsCount,
        conflictsDetected,
        lastConfirmedSyncAt,
        projectState,
        reviewStatus: conflictsDetected.length > 0 ? 'Conflito preservado para revisão' : 'Leitura segura OK',
      });
    }
  }

  if (driveConnected) {
    for (const entry of fs.readdirSync(driveRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === '01 - Projetos' || entry.name.startsWith('.')) continue;
      const fullPath = path.join(driveRoot, entry.name);
      const stats = measureDirectoryTree(fullPath, 2);
      companionFolders.push({
        name: entry.name,
        fullPath,
        fileCount: stats.fileCount,
        totalBytes: stats.totalBytes,
        lastModifiedAt: stats.latestMtimeMs > 0 ? new Date(stats.latestMtimeMs).toISOString() : null,
      });
    }
    companionFolders.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (options.store) {
    options.store.appendAuditEvent({
      subject: 'core.catalog.driveCatalog',
      action: 'inspect_drive_readonly',
      scope: driveRoot,
      occurredAt: checkedAt,
      status: driveConnected ? 'ok' : 'error',
      safeDetails: driveConnected
        ? `Inspected ${projects.length} project(s) and ${companionFolders.length} companion folder(s) under ${driveRoot} in read-only mode.`
        : `Google Drive root unavailable at ${driveRoot}.`,
      origin: 'core-01',
    });
  }

  const ssdDrive = process.platform === 'win32' ? `${path.parse(localProjectsRoot).root || 'C:\\'}` : '/';
  const gDriveRoot = process.platform === 'win32' ? `${path.parse(driveRoot).root || 'G:\\'}` : driveRoot;

  return {
    checkedAt,
    driveRoot,
    projectsRoot,
    driveConnected,
    readOnlyVerified: true,
    projects,
    companionFolders,
    storage: {
      ssdLocal: readVolumeMetrics(ssdDrive),
      googleDrive: readVolumeMetrics(gDriveRoot),
    },
  };
}
