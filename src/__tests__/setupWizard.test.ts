import * as path from 'path';
import * as fs from 'fs/promises';

import { detectFileExtensions, generateConfig, loadConfigFile, detectHusky, readPackageJson } from '@/cli/wizardUtils';

describe('SetupWizard utilities', () => {
  describe('detectFileExtensions', () => {
    it('should detect .tsx files in sample-project', async () => {
      const exts = await detectFileExtensions(path.resolve('tests/sample-project'));
      expect(exts).toContain('.tsx');
    });

    it('should detect .py files in python-samples', async () => {
      const exts = await detectFileExtensions(path.resolve('tests/python-samples'));
      expect(exts).toContain('.py');
    });

    it('should return sorted unique extensions', async () => {
      const exts = await detectFileExtensions(path.resolve('tests'));
      const sorted = [...exts].sort();
      expect(exts).toEqual(sorted);
      expect(exts.length).toBe(new Set(exts).size);
    });

    it('should detect multiple extension types in framework-samples', async () => {
      const exts = await detectFileExtensions(path.resolve('tests/framework-samples'));
      expect(exts.length).toBeGreaterThan(0);
    });
  });

  describe('generateConfig', () => {
    it('should generate config with provided extensions', () => {
      const config = generateConfig({ extensions: ['.ts', '.tsx'], ignore: [], useAliases: true });
      expect(config.extensions).toEqual(['.ts', '.tsx']);
      expect(config.useAliases).toBe(true);
      expect(config.dryRun).toBe(false);
      expect(config.verbose).toBe(false);
      expect(config.report).toBe('none');
    });

    it('should accept report format option', () => {
      const config = generateConfig({ extensions: ['.ts'], ignore: [], useAliases: true, report: 'md' });
      expect(config.report).toBe('md');
    });

    it('should default report to none when not provided', () => {
      const config = generateConfig({ extensions: ['.ts'], ignore: [], useAliases: true });
      expect(config.report).toBe('none');
    });

    it('should include default ignore patterns', () => {
      const config = generateConfig({ extensions: ['.ts'], ignore: [], useAliases: false });
      expect(config.ignore).toContain('**/node_modules/**');
      expect(config.ignore).toContain('**/dist/**');
      expect(config.ignore).toContain('**/.git/**');
      expect(config.ignore).toContain('**/coverage/**');
    });

    it('should merge custom ignore patterns with defaults', () => {
      const config = generateConfig({ extensions: ['.ts'], ignore: ['**/custom/**'], useAliases: true });
      expect(config.ignore).toContain('**/custom/**');
      expect(config.ignore).toContain('**/node_modules/**');
    });

    it('should deduplicate ignore patterns', () => {
      const config = generateConfig({ extensions: ['.ts'], ignore: ['**/node_modules/**'], useAliases: true });
      const count = config.ignore.filter((i) => i === '**/node_modules/**').length;
      expect(count).toBe(1);
    });

    it('should handle empty extensions array', () => {
      const config = generateConfig({ extensions: [], ignore: [], useAliases: false });
      expect(config.extensions).toEqual([]);
      expect(config.useAliases).toBe(false);
    });
  });

  describe('loadConfigFile', () => {
    const tmpPath = path.resolve('tests/.tmp-test-config.json');

    afterEach(async () => {
      try {
        await fs.unlink(tmpPath);
      } catch {
        /* cleanup */
      }
    });

    it('should return null for non-existent file', async () => {
      const result = await loadConfigFile('/tmp/nonexistent-auto-import-test-xyz.json');
      expect(result).toBeNull();
    });

    it('should load valid config file', async () => {
      const testConfig = {
        extensions: ['.ts', '.tsx'],
        ignore: ['**/dist/**'],
        useAliases: true,
        verbose: false,
        dryRun: false,
      };
      await fs.writeFile(tmpPath, JSON.stringify(testConfig));
      const result = await loadConfigFile(tmpPath);
      expect(result).toEqual(testConfig);
    });

    it('should return null for invalid JSON', async () => {
      await fs.writeFile(tmpPath, 'not-valid-json{{{');
      const result = await loadConfigFile(tmpPath);
      expect(result).toBeNull();
    });
  });

  describe('readPackageJson', () => {
    it('should read package.json from project root', async () => {
      const pkg = await readPackageJson(path.resolve('.'));
      expect(pkg).not.toBeNull();
      expect(pkg!.name).toBe('import-pilot');
    });

    it('should return null for directory without package.json', async () => {
      const pkg = await readPackageJson(path.resolve('tests/sample-project'));
      expect(pkg).toBeNull();
    });
  });

  describe('detectHusky', () => {
    it('should return installed:false for directories without husky', async () => {
      const result = await detectHusky(path.resolve('tests/sample-project'));
      expect(result.installed).toBe(false);
      expect(result.hasPreCommit).toBe(false);
    });

    it('should return hasPreCommit:false when husky dir missing', async () => {
      const result = await detectHusky(path.resolve('tests/python-samples'));
      expect(result.hasPreCommit).toBe(false);
    });
  });
});
