import * as path from 'path';
import * as fs from 'fs/promises';

import {
  generateMarkdownReport,
  generateTextReport,
  generateJsonReport,
  writeReport,
} from '@/reporter/reportGenerator';
import type { ReportData } from '@/reporter/reportGenerator';

function makeReportData(overrides: Partial<ReportData> = {}): ReportData {
  return {
    timestamp: '2026-02-09T21:00:00.000Z',
    durationMs: 1234,
    directory: '/tmp/test-project',
    totalFilesScanned: 10,
    filesWithMissing: 2,
    totalMissing: 5,
    totalResolved: 3,
    totalUnresolved: 2,
    dryRun: true,
    entries: [
      {
        file: 'src/app.ts',
        identifier: 'Card',
        importStatement: "import { Card } from '@/components/Card';",
        source: '@/components/Card',
        isDefault: false,
      },
      {
        file: 'src/app.ts',
        identifier: 'formatDate',
        importStatement: "import { formatDate } from '@/utils/date';",
        source: '@/utils/date',
        isDefault: false,
      },
      { file: 'src/page.tsx', identifier: 'UnknownWidget', importStatement: null, source: null, isDefault: false },
    ],
    ...overrides,
  };
}

describe('reportGenerator', () => {
  describe('generateMarkdownReport', () => {
    it('should produce a markdown string with header and summary table', () => {
      const md = generateMarkdownReport(makeReportData());
      expect(md).toContain('# Import Pilot Report');
      expect(md).toContain('| Files scanned | 10 |');
      expect(md).toContain('| Resolved | 3 |');
      expect(md).toContain('| Unresolved | 2 |');
    });

    it('should include resolved imports table', () => {
      const md = generateMarkdownReport(makeReportData());
      expect(md).toContain('## Resolved Imports');
      expect(md).toContain('`Card`');
      expect(md).toContain('`formatDate`');
    });

    it('should include unresolved identifiers table', () => {
      const md = generateMarkdownReport(makeReportData());
      expect(md).toContain('## Unresolved Identifiers');
      expect(md).toContain('`UnknownWidget`');
    });

    it('should omit resolved section when no resolved entries', () => {
      const data = makeReportData({
        totalResolved: 0,
        entries: [{ file: 'x.ts', identifier: 'Foo', importStatement: null, source: null, isDefault: false }],
      });
      const md = generateMarkdownReport(data);
      expect(md).not.toContain('## Resolved Imports');
      expect(md).toContain('## Unresolved Identifiers');
    });

    it('should omit unresolved section when all resolved', () => {
      const data = makeReportData({
        totalUnresolved: 0,
        entries: [
          {
            file: 'x.ts',
            identifier: 'Foo',
            importStatement: "import Foo from './Foo';",
            source: './Foo',
            isDefault: true,
          },
        ],
      });
      const md = generateMarkdownReport(data);
      expect(md).toContain('## Resolved Imports');
      expect(md).not.toContain('## Unresolved Identifiers');
    });

    it('should display dry run mode', () => {
      const md = generateMarkdownReport(makeReportData({ dryRun: true }));
      expect(md).toContain('Dry run');
    });

    it('should display applied mode', () => {
      const md = generateMarkdownReport(makeReportData({ dryRun: false }));
      expect(md).toContain('Applied');
    });

    it('should handle empty entries', () => {
      const md = generateMarkdownReport(makeReportData({ entries: [] }));
      expect(md).toContain('# Import Pilot Report');
      expect(md).not.toContain('## Resolved Imports');
      expect(md).not.toContain('## Unresolved Identifiers');
    });
  });

  describe('generateTextReport', () => {
    it('should produce structured plain text', () => {
      const txt = generateTextReport(makeReportData());
      expect(txt).toContain('IMPORT PILOT REPORT');
      expect(txt).toContain('Files scanned:   10');
      expect(txt).toContain('Resolved:        3');
    });

    it('should include resolved imports section', () => {
      const txt = generateTextReport(makeReportData());
      expect(txt).toContain('RESOLVED IMPORTS');
      expect(txt).toContain('Card');
    });

    it('should include unresolved identifiers section', () => {
      const txt = generateTextReport(makeReportData());
      expect(txt).toContain('UNRESOLVED IDENTIFIERS');
      expect(txt).toContain('UnknownWidget');
    });
  });

  describe('generateJsonReport', () => {
    it('should produce valid JSON matching input data', () => {
      const data = makeReportData();
      const json = generateJsonReport(data);
      const parsed = JSON.parse(json);
      expect(parsed.timestamp).toBe(data.timestamp);
      expect(parsed.totalFilesScanned).toBe(10);
      expect(parsed.entries).toHaveLength(3);
    });

    it('should be parseable', () => {
      const json = generateJsonReport(makeReportData());
      expect(() => JSON.parse(json)).not.toThrow();
    });
  });

  describe('writeReport', () => {
    const tmpDir = path.resolve('tests/.tmp-report-test');

    beforeEach(async () => {
      await fs.mkdir(tmpDir, { recursive: true });
    });

    afterEach(async () => {
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {
        /* cleanup */
      }
    });

    it('should return null for format "none"', async () => {
      const result = await writeReport(tmpDir, 'none', makeReportData());
      expect(result).toBeNull();
    });

    it('should write markdown report file', async () => {
      const result = await writeReport(tmpDir, 'md', makeReportData());
      expect(result).not.toBeNull();
      expect(result).toContain('import-pilot-report.md');
      const content = await fs.readFile(result!, 'utf-8');
      expect(content).toContain('# Import Pilot Report');
    });

    it('should write JSON report file', async () => {
      const result = await writeReport(tmpDir, 'json', makeReportData());
      expect(result).not.toBeNull();
      expect(result).toContain('import-pilot-report.json');
      const content = await fs.readFile(result!, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('should write text report file', async () => {
      const result = await writeReport(tmpDir, 'txt', makeReportData());
      expect(result).not.toBeNull();
      expect(result).toContain('import-pilot-report.txt');
      const content = await fs.readFile(result!, 'utf-8');
      expect(content).toContain('IMPORT PILOT REPORT');
    });

    it('should place report file at project root', async () => {
      const result = await writeReport(tmpDir, 'md', makeReportData());
      expect(path.dirname(result!)).toBe(tmpDir);
    });
  });
});
