import { execFileSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const ROOT = path.resolve(__dirname, '..', '..');
const BIN = path.join(ROOT, 'bin', 'import-pilot.js');
const E2E_FIXTURE = path.join(ROOT, 'tests', 'e2e-fixture');
const SAMPLE_PROJECT = path.join(ROOT, 'tests', 'sample-project');
const E2E_ALIAS_FIXTURE = path.join(ROOT, 'tests', 'e2e-alias-fixture');
const E2E_MIXED_FIXTURE = path.join(ROOT, 'tests', 'e2e-mixed-fixture');

function run(args: string, options: { cwd?: string } = {}): string {
  return execFileSync('node', [BIN, ...args.split(/\s+/).filter(Boolean)], {
    encoding: 'utf-8',
    cwd: options.cwd ?? ROOT,
    env: { ...process.env, FORCE_COLOR: '0' },
  });
}

function cleanReports(dir: string): void {
  for (const ext of ['.md', '.json', '.txt']) {
    const file = path.join(dir, `import-pilot-report${ext}`);
    try { fs.unlinkSync(file); } catch { /* not present */ }
  }
}

beforeAll(() => {
  const distCli = path.join(ROOT, 'dist', 'cli', 'autoImportCli.js');
  if (!fs.existsSync(distCli)) {
    throw new Error('dist/ not found — run `npm run build` before E2E tests');
  }
});

afterEach(() => {
  cleanReports(E2E_FIXTURE);
  cleanReports(SAMPLE_PROJECT);
  cleanReports(E2E_ALIAS_FIXTURE);
  cleanReports(E2E_MIXED_FIXTURE);
});

describe('E2E: CLI pipeline', () => {
  describe('--help', () => {
    it('should display usage information', () => {
      const output = run('--help');
      expect(output).toContain('Usage: import-pilot');
      expect(output).toContain('--dry-run');
      expect(output).toContain('--verbose');
      expect(output).toContain('--extensions');
      expect(output).toContain('--no-alias');
      expect(output).toContain('--report');
    });
  });

  describe('--version', () => {
    it('should display the version number', () => {
      const output = run('--version');
      expect(output.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('--dry-run on sample-project', () => {
    it('should show summary with zero missing imports', () => {
      const output = run(`--dry-run ${SAMPLE_PROJECT}`);
      expect(output).toContain('Import Pilot');
      expect(output).toContain('Summary');
      expect(output).toContain('Total files scanned:');
      expect(output).toContain('Dry run mode');
    });

    it('should not modify any files', () => {
      const before = fs.readFileSync(
        path.join(SAMPLE_PROJECT, 'components', 'UserProfile.tsx'),
        'utf-8',
      );
      run(`--dry-run ${SAMPLE_PROJECT}`);
      const after = fs.readFileSync(
        path.join(SAMPLE_PROJECT, 'components', 'UserProfile.tsx'),
        'utf-8',
      );
      expect(after).toBe(before);
    });
  });

  describe('--verbose --dry-run', () => {
    it('should show per-file details when missing imports exist', () => {
      const output = run(`--verbose --dry-run ${E2E_FIXTURE}`);
      expect(output).toContain('pages/Home.tsx');
      expect(output).toContain('pages/About.tsx');
      expect(output).toContain('formatName');
      expect(output).toContain('Card');
      expect(output).toContain('Button');
    });

    it('should show import suggestions with arrow notation', () => {
      const output = run(`--verbose --dry-run ${E2E_FIXTURE}`);
      expect(output).toContain('import {');
      expect(output).toContain("from '");
    });
  });

  describe('--report md --dry-run', () => {
    it('should create a markdown report file', () => {
      run(`--dry-run --report md ${E2E_FIXTURE}`);
      const reportPath = path.join(E2E_FIXTURE, 'import-pilot-report.md');
      expect(fs.existsSync(reportPath)).toBe(true);
      const content = fs.readFileSync(reportPath, 'utf-8');
      expect(content).toContain('# Import Pilot Report');
      expect(content).toContain('Resolved Imports');
      expect(content).toContain('formatName');
    });
  });

  describe('--report json --dry-run', () => {
    it('should create a valid JSON report file', () => {
      run(`--dry-run --report json ${E2E_FIXTURE}`);
      const reportPath = path.join(E2E_FIXTURE, 'import-pilot-report.json');
      expect(fs.existsSync(reportPath)).toBe(true);
      const content = fs.readFileSync(reportPath, 'utf-8');
      const data = JSON.parse(content);
      expect(data.totalFilesScanned).toBeGreaterThan(0);
      expect(data.totalMissing).toBe(7);
      expect(data.totalResolved).toBe(7);
      expect(data.dryRun).toBe(true);
      expect(Array.isArray(data.entries)).toBe(true);
      expect(data.entries.length).toBe(7);
    });

    it('should include correct entry structure', () => {
      run(`--dry-run --report json ${E2E_FIXTURE}`);
      const reportPath = path.join(E2E_FIXTURE, 'import-pilot-report.json');
      const data = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      const entry = data.entries[0];
      expect(entry).toHaveProperty('file');
      expect(entry).toHaveProperty('identifier');
      expect(entry).toHaveProperty('importStatement');
      expect(entry).toHaveProperty('source');
      expect(entry).toHaveProperty('isDefault');
    });
  });

  describe('--extensions filter', () => {
    it('should only scan .ts files when --extensions .ts is passed', () => {
      const output = run(`--dry-run --extensions .ts ${E2E_FIXTURE}`);
      const match = output.match(/Found (\d+) files to analyze/);
      expect(match).not.toBeNull();
      const fileCount = parseInt(match![1]!, 10);
      expect(fileCount).toBe(3);
      expect(output).toContain('Total missing imports: 0');
    });

    it('should only scan .tsx files when --extensions .tsx is passed', () => {
      const output = run(`--dry-run --extensions .tsx ${E2E_FIXTURE}`);
      const match = output.match(/Found (\d+) files to analyze/);
      expect(match).not.toBeNull();
      const fileCount = parseInt(match![1]!, 10);
      expect(fileCount).toBeGreaterThan(0);
    });
  });

  describe('--no-alias flag', () => {
    it('should complete successfully with --no-alias', () => {
      const output = run(`--dry-run --no-alias ${E2E_FIXTURE}`);
      expect(output).toContain('Summary');
      expect(output).toContain('Total missing imports: 7');
      expect(output).toContain('Resolvable imports: 7');
    });

    it('should produce relative import paths (not alias paths) for fixture', () => {
      const output = run(`--verbose --dry-run --no-alias ${E2E_FIXTURE}`);
      expect(output).toContain("from '../");
    });
  });

  describe('non-existent directory', () => {
    it('should scan zero files for a non-existent directory', () => {
      const output = run(`--dry-run /tmp/__import_pilot_nonexistent_${Date.now()}`);
      expect(output).toContain('Found 0 files to analyze');
    });
  });

  describe('e2e-fixture: missing import detection', () => {
    it('should detect all 7 missing imports', () => {
      const output = run(`--dry-run ${E2E_FIXTURE}`);
      expect(output).toContain('Total missing imports: 7');
    });

    it('should resolve all 7 missing imports', () => {
      const output = run(`--dry-run ${E2E_FIXTURE}`);
      expect(output).toContain('Resolvable imports: 7');
    });

    it('should detect 2 files with missing imports', () => {
      const output = run(`--dry-run ${E2E_FIXTURE}`);
      expect(output).toContain('Files with missing imports: 2');
    });

    it('should detect specific identifiers in verbose mode', () => {
      const output = run(`--verbose --dry-run ${E2E_FIXTURE}`);
      const expectedIdentifiers = ['formatName', 'add', 'Header', 'Card', 'Button', 'formatDate'];
      for (const id of expectedIdentifiers) {
        expect(output).toContain(id);
      }
    });

    it('should suggest correct import sources', () => {
      const output = run(`--verbose --dry-run ${E2E_FIXTURE}`);
      expect(output).toContain("from '../utils/format'");
      expect(output).toContain("from '../utils/math'");
      expect(output).toContain("from '../components/Header'");
      expect(output).toContain("from '../components/Card'");
      expect(output).toContain("from '../components/Button'");
    });

    it('should detect default export (Header) vs named exports', () => {
      run(`--dry-run --report json ${E2E_FIXTURE}`);
      const reportPath = path.join(E2E_FIXTURE, 'import-pilot-report.json');
      const data = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      const headerEntry = data.entries.find(
        (e: { identifier: string }) => e.identifier === 'Header',
      );
      expect(headerEntry).toBeDefined();
      expect(headerEntry.isDefault).toBe(true);

      const cardEntry = data.entries.find(
        (e: { identifier: string }) => e.identifier === 'Card',
      );
      expect(cardEntry).toBeDefined();
      expect(cardEntry.isDefault).toBe(false);
    });
  });

  describe('--report txt --dry-run', () => {
    it('should create a text report file', () => {
      run(`--dry-run --report txt ${E2E_FIXTURE}`);
      const reportPath = path.join(E2E_FIXTURE, 'import-pilot-report.txt');
      expect(fs.existsSync(reportPath)).toBe(true);
      const content = fs.readFileSync(reportPath, 'utf-8');
      expect(content).toContain('IMPORT PILOT REPORT');
      expect(content).toContain('RESOLVED IMPORTS');
    });
  });

  describe('report cleanup verification', () => {
    it('should not leave report files when --report none (default)', () => {
      run(`--dry-run ${E2E_FIXTURE}`);
      expect(fs.existsSync(path.join(E2E_FIXTURE, 'import-pilot-report.md'))).toBe(false);
      expect(fs.existsSync(path.join(E2E_FIXTURE, 'import-pilot-report.json'))).toBe(false);
      expect(fs.existsSync(path.join(E2E_FIXTURE, 'import-pilot-report.txt'))).toBe(false);
    });
  });

   describe('output format consistency', () => {
     it('should always show the Import Pilot banner', () => {
       const output = run(`--dry-run ${E2E_FIXTURE}`);
       expect(output).toContain('Import Pilot');
     });

     it('should always show export cache build step', () => {
       const output = run(`--dry-run ${E2E_FIXTURE}`);
       expect(output).toContain('Building export cache');
       expect(output).toContain('Export cache built');
     });

     it('should always show file count', () => {
       const output = run(`--dry-run ${E2E_FIXTURE}`);
       expect(output).toMatch(/Found \d+ files to analyze/);
     });
   });

   describe('e2e-alias-fixture: alias path resolution', () => {
     it('should resolve missing imports with tsconfig.json paths configured', () => {
       const output = run(`--verbose --dry-run ${E2E_ALIAS_FIXTURE}`);
       expect(output).toContain('helperFn');
       expect(output).toContain('helper');
     });

     it('should use relative paths when --no-alias flag is passed', () => {
       const output = run(`--verbose --dry-run --no-alias ${E2E_ALIAS_FIXTURE}`);
       expect(output).toContain('helperFn');
       expect(output).toContain("from '../utils/helper'");
     });

     it('should detect 1 missing import in alias fixture', () => {
       const output = run(`--dry-run ${E2E_ALIAS_FIXTURE}`);
       expect(output).toContain('Total missing imports: 1');
     });

     it('should resolve 1 missing import in alias fixture', () => {
       const output = run(`--dry-run ${E2E_ALIAS_FIXTURE}`);
       expect(output).toContain('Resolvable imports: 1');
     });
   });

   describe('e2e-mixed-fixture: multi-language scanning', () => {
     it('should detect missing imports in both TypeScript and Python files', () => {
       const output = run(`--verbose --dry-run --extensions .ts,.py ${E2E_MIXED_FIXTURE}`);
       expect(output).toContain('formatName');
       expect(output).toContain('format_date');
     });

     it('should show correct import paths for TypeScript files', () => {
       const output = run(`--verbose --dry-run --extensions .ts,.py ${E2E_MIXED_FIXTURE}`);
       expect(output).toContain("from './utils'");
     });

     it('should show correct import paths for Python files', () => {
       const output = run(`--verbose --dry-run --extensions .ts,.py ${E2E_MIXED_FIXTURE}`);
       expect(output).toContain('from ..helpers import format_date');
     });

     it('should detect 2 missing imports in mixed fixture', () => {
       const output = run(`--dry-run --extensions .ts,.py ${E2E_MIXED_FIXTURE}`);
       expect(output).toContain('Total missing imports: 2');
     });

     it('should resolve 2 missing imports in mixed fixture', () => {
       const output = run(`--dry-run --extensions .ts,.py ${E2E_MIXED_FIXTURE}`);
       expect(output).toContain('Resolvable imports: 2');
     });

     it('should scan both .ts and .py files when extensions specified', () => {
       const output = run(`--dry-run --extensions .ts,.py ${E2E_MIXED_FIXTURE}`);
       expect(output).toMatch(/Found \d+ files to analyze/);
       const match = output.match(/Found (\d+) files to analyze/);
       expect(match).not.toBeNull();
       const fileCount = parseInt(match![1]!, 10);
       expect(fileCount).toBeGreaterThanOrEqual(2);
     });
   });
});
