import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { detectProjectLanguages } from '@/detector/languageDetector';

async function createTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'lang-detect-'));
}

async function touch(dir: string, ...filePaths: string[]): Promise<void> {
  for (const filePath of filePaths) {
    const fullPath = path.join(dir, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, '');
  }
}

describe('detectProjectLanguages', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await createTempDir();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should return empty array for empty directory', async () => {
    const result = await detectProjectLanguages(tmpDir);
    expect(result).toEqual([]);
  });

  it('should detect TypeScript from tsconfig.json', async () => {
    await touch(tmpDir, 'tsconfig.json');
    const result = await detectProjectLanguages(tmpDir);
    expect(result).toContain('.ts');
    expect(result).toContain('.tsx');
  });

  it('should detect JavaScript from package.json', async () => {
    await touch(tmpDir, 'package.json');
    const result = await detectProjectLanguages(tmpDir);
    expect(result).toContain('.js');
    expect(result).toContain('.jsx');
  });

  it('should detect Vue from .vue files', async () => {
    await touch(tmpDir, 'src/App.vue');
    const result = await detectProjectLanguages(tmpDir);
    expect(result).toContain('.vue');
  });

  it('should detect Vue from nuxt.config.ts', async () => {
    await touch(tmpDir, 'nuxt.config.ts');
    const result = await detectProjectLanguages(tmpDir);
    expect(result).toContain('.vue');
  });

  it('should detect Svelte from .svelte files', async () => {
    await touch(tmpDir, 'src/App.svelte');
    const result = await detectProjectLanguages(tmpDir);
    expect(result).toContain('.svelte');
  });

  it('should detect Svelte from svelte.config.js', async () => {
    await touch(tmpDir, 'svelte.config.js');
    const result = await detectProjectLanguages(tmpDir);
    expect(result).toContain('.svelte');
  });

  it('should detect Astro from .astro files', async () => {
    await touch(tmpDir, 'src/pages/index.astro');
    const result = await detectProjectLanguages(tmpDir);
    expect(result).toContain('.astro');
  });

  it('should detect Astro from astro.config.mjs', async () => {
    await touch(tmpDir, 'astro.config.mjs');
    const result = await detectProjectLanguages(tmpDir);
    expect(result).toContain('.astro');
  });

  it('should detect Python from requirements.txt', async () => {
    await touch(tmpDir, 'requirements.txt');
    const result = await detectProjectLanguages(tmpDir);
    expect(result).toContain('.py');
  });

  it('should detect Python from pyproject.toml', async () => {
    await touch(tmpDir, 'pyproject.toml');
    const result = await detectProjectLanguages(tmpDir);
    expect(result).toContain('.py');
  });

  it('should detect Python from setup.py', async () => {
    await touch(tmpDir, 'setup.py');
    const result = await detectProjectLanguages(tmpDir);
    expect(result).toContain('.py');
  });

  it('should detect Python from Pipfile', async () => {
    await touch(tmpDir, 'Pipfile');
    const result = await detectProjectLanguages(tmpDir);
    expect(result).toContain('.py');
  });

  it('should detect Elixir from mix.exs', async () => {
    await touch(tmpDir, 'mix.exs');
    const result = await detectProjectLanguages(tmpDir);
    expect(result).toContain('.ex');
    expect(result).toContain('.exs');
  });

  it('should detect Go from go.mod', async () => {
    await touch(tmpDir, 'go.mod');
    const result = await detectProjectLanguages(tmpDir);
    expect(result).toContain('.go');
  });

  it('should detect Rust from Cargo.toml', async () => {
    await touch(tmpDir, 'Cargo.toml');
    const result = await detectProjectLanguages(tmpDir);
    expect(result).toContain('.rs');
  });

  it('should return sorted, deduplicated extensions for multi-language project', async () => {
    await touch(tmpDir, 'tsconfig.json', 'package.json', 'requirements.txt');
    const result = await detectProjectLanguages(tmpDir);
    expect(result).toEqual(['.js', '.jsx', '.py', '.ts', '.tsx']);
  });

  it('should detect from real fixture: sample-project (has tsconfig + package.json)', async () => {
    const fixtureRoot = path.resolve(__dirname, '../../');
    const result = await detectProjectLanguages(fixtureRoot);
    expect(result).toContain('.ts');
    expect(result).toContain('.tsx');
    expect(result).toContain('.js');
    expect(result).toContain('.jsx');
  });

  it('should detect Vue from framework-samples fixture', async () => {
    const fixtureRoot = path.resolve(__dirname, '../../tests/framework-samples');
    const result = await detectProjectLanguages(fixtureRoot);
    expect(result).toContain('.vue');
    expect(result).toContain('.svelte');
    expect(result).toContain('.astro');
  });

  it('should not duplicate extensions when multiple indicators match', async () => {
    await touch(tmpDir, 'requirements.txt', 'pyproject.toml', 'Pipfile');
    const result = await detectProjectLanguages(tmpDir);
    const pyCount = result.filter(ext => ext === '.py').length;
    expect(pyCount).toBe(1);
  });

  it('should return results sorted alphabetically', async () => {
    await touch(tmpDir, 'Cargo.toml', 'go.mod', 'mix.exs');
    const result = await detectProjectLanguages(tmpDir);
    const sorted = [...result].sort();
    expect(result).toEqual(sorted);
  });
});
