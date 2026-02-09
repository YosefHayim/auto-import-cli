import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

export interface AutoImportConfig {
  extensions: string[];
  ignore: string[];
  useAliases: boolean;
  verbose: boolean;
  dryRun: boolean;
}

const DEFAULT_IGNORE = [
  '**/node_modules/**', '**/dist/**', '**/build/**', '**/.next/**',
  '**/.git/**', '**/coverage/**', '**/__pycache__/**', '**/.venv/**', '**/venv/**',
];

const SCAN_IGNORE = [
  ...DEFAULT_IGNORE, '**/.nuxt/**', '**/.output/**',
];

export async function detectFileExtensions(directory: string): Promise<string[]> {
  const files = await glob('**/*.*', {
    cwd: directory,
    ignore: SCAN_IGNORE,
    nodir: true,
  });

  const exts = new Set<string>();
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    if (ext) exts.add(ext);
  }
  return [...exts].sort();
}

export async function readPackageJson(directory: string): Promise<Record<string, any> | null> {
  try {
    const raw = await fs.readFile(path.join(directory, 'package.json'), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function detectHusky(directory: string): Promise<{ installed: boolean; hasPreCommit: boolean }> {
  const pkg = await readPackageJson(directory);
  const huskyDir = path.join(directory, '.husky');

  let dirExists = false;
  try { await fs.access(huskyDir); dirExists = true; } catch { /* noop */ }

  const inDeps = !!(pkg?.devDependencies?.husky || pkg?.dependencies?.husky);
  const installed = dirExists || inDeps;

  let hasPreCommit = false;
  if (dirExists) {
    try { await fs.access(path.join(huskyDir, 'pre-commit')); hasPreCommit = true; } catch { /* noop */ }
  }

  return { installed, hasPreCommit };
}

export function generateConfig(options: {
  extensions: string[];
  ignore: string[];
  useAliases: boolean;
}): AutoImportConfig {
  return {
    extensions: options.extensions,
    ignore: [...new Set([...DEFAULT_IGNORE, ...options.ignore])],
    useAliases: options.useAliases,
    verbose: false,
    dryRun: false,
  };
}

export async function loadConfigFile(configPath: string): Promise<AutoImportConfig | null> {
  try {
    const raw = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(raw) as AutoImportConfig;
  } catch {
    return null;
  }
}
