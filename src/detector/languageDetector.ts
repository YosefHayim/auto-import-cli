import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

const CONFIG_FILE_RULES: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['tsconfig.json', ['.ts', '.tsx']],
  ['package.json', ['.js', '.jsx']],

  ['*.vue', ['.vue']],
  ['nuxt.config.js', ['.vue']],
  ['nuxt.config.ts', ['.vue']],
  ['nuxt.config.mjs', ['.vue']],

  ['*.svelte', ['.svelte']],
  ['svelte.config.js', ['.svelte']],
  ['svelte.config.ts', ['.svelte']],
  ['svelte.config.mjs', ['.svelte']],

  ['*.astro', ['.astro']],
  ['astro.config.js', ['.astro']],
  ['astro.config.ts', ['.astro']],
  ['astro.config.mjs', ['.astro']],

  ['requirements.txt', ['.py']],
  ['pyproject.toml', ['.py']],
  ['setup.py', ['.py']],
  ['Pipfile', ['.py']],

  ['mix.exs', ['.ex', '.exs']],
  ['go.mod', ['.go']],
  ['Cargo.toml', ['.rs']],
];

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function hasFilesMatching(projectRoot: string, pattern: string): Promise<boolean> {
  const matches = await glob(`**/${pattern}`, {
    cwd: projectRoot,
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
    nodir: true,
    maxDepth: 3,
  });
  return matches.length > 0;
}

/**
 * Scans a project root for config files and source files to auto-detect
 * which programming languages are used. Returns a sorted, deduplicated
 * array of file extensions (e.g. ['.js', '.jsx', '.ts', '.tsx']).
 */
export async function detectProjectLanguages(projectRoot: string): Promise<string[]> {
  const resolvedRoot = path.resolve(projectRoot);
  const detectedExtensions = new Set<string>();

  for (const [indicator, extensions] of CONFIG_FILE_RULES) {
    const found = indicator.startsWith('*')
      ? await hasFilesMatching(resolvedRoot, indicator)
      : await fileExists(path.join(resolvedRoot, indicator));

    if (found) {
      for (const ext of extensions) {
        detectedExtensions.add(ext);
      }
    }
  }

  return [...detectedExtensions].sort();
}
