import { ImportResolver, PathAlias } from '@/resolver/importResolver';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('ImportResolver', () => {
  it('should parse exports from a file', () => {
    const content = `
export function testFunction() {}
export const testConst = 'value';
export class TestClass {}
export interface TestInterface {}
export type TestType = string;
`;

    const resolver = new ImportResolver({ projectRoot: '/test' });

    // Access private method for testing (use type assertion)
    const parseExports = (resolver as any).parseExportsLegacy.bind(resolver);
    const exports = parseExports(content, '/test/file.ts');

    expect(exports).toHaveLength(5);
    expect(exports.some((e: any) => e.name === 'testFunction')).toBe(true);
    expect(exports.some((e: any) => e.name === 'testConst')).toBe(true);
    expect(exports.some((e: any) => e.name === 'TestClass')).toBe(true);
    expect(exports.some((e: any) => e.name === 'TestInterface' && e.isType)).toBe(true);
    expect(exports.some((e: any) => e.name === 'TestType' && e.isType)).toBe(true);
  });

  it('should detect default exports', () => {
    const content = `
export default function MyComponent() {}
`;

    const resolver = new ImportResolver({ projectRoot: '/test' });
    const parseExports = (resolver as any).parseExportsLegacy.bind(resolver);
    const exports = parseExports(content, '/test/file.ts');

    expect(exports[0].isDefault).toBe(true);
    expect(exports[0].name).toBe('MyComponent');
  });

  it('should handle named exports with braces', () => {
    const content = `
const foo = 'bar';
const baz = 'qux';
export { foo, baz };
`;

    const resolver = new ImportResolver({ projectRoot: '/test' });
    const parseExports = (resolver as any).parseExportsLegacy.bind(resolver);
    const exports = parseExports(content, '/test/file.ts');

    expect(exports.some((e: any) => e.name === 'foo')).toBe(true);
    expect(exports.some((e: any) => e.name === 'baz')).toBe(true);
  });

  it('should generate correct relative import paths', () => {
    const resolver = new ImportResolver({ projectRoot: '/test' });
    const getRelativeImportPath = (resolver as any).getRelativeImportPath.bind(resolver);

    // Same directory
    const sameDirPath = getRelativeImportPath('/test/components/Button.tsx', '/test/components/Card.tsx');
    expect(sameDirPath).toBe('./Card');

    // Parent directory
    const parentDirPath = getRelativeImportPath('/test/components/ui/Button.tsx', '/test/components/Card.tsx');
    expect(parentDirPath).toBe('../Card');

    // Subdirectory
    const subDirPath = getRelativeImportPath('/test/components/Card.tsx', '/test/components/ui/Button.tsx');
    expect(subDirPath).toBe('./ui/Button');
  });

  describe('path alias resolution', () => {
    it('should prefer alias paths over relative paths when aliases are loaded', () => {
      const resolver = new ImportResolver({ projectRoot: '/project' });

      (resolver as any).pathAliases = [
        { pattern: '@/*', prefix: '@/', targetPrefix: '/project/src/' },
      ] satisfies PathAlias[];

      const getRelativeImportPath = (resolver as any).getRelativeImportPath.bind(resolver);

      const result = getRelativeImportPath('/project/src/cli/autoImportCli.ts', '/project/src/parser/astParser.ts');
      expect(result).toBe('@/parser/astParser');
    });

    it('should fall back to relative path when no alias matches', () => {
      const resolver = new ImportResolver({ projectRoot: '/project' });

      (resolver as any).pathAliases = [
        { pattern: '@/*', prefix: '@/', targetPrefix: '/project/src/' },
      ] satisfies PathAlias[];

      const getRelativeImportPath = (resolver as any).getRelativeImportPath.bind(resolver);

      const result = getRelativeImportPath('/project/src/cli/autoImportCli.ts', '/project/lib/utils.ts');
      expect(result).toBe('../../lib/utils');
    });

    it('should resolve getAliasImportPath correctly', () => {
      const resolver = new ImportResolver({ projectRoot: '/project' });

      (resolver as any).pathAliases = [
        { pattern: '@components/*', prefix: '@components/', targetPrefix: '/project/src/components/' },
        { pattern: '@/*', prefix: '@/', targetPrefix: '/project/src/' },
      ] satisfies PathAlias[];

      const getAliasImportPath = (resolver as any).getAliasImportPath.bind(resolver);

      expect(getAliasImportPath('/project/src/components/Button.tsx')).toBe('@components/Button');
      expect(getAliasImportPath('/project/src/utils/helpers.ts')).toBe('@/utils/helpers');
      expect(getAliasImportPath('/other/path/file.ts')).toBeNull();
    });

    it('should prefer more specific aliases (longer prefix)', () => {
      const resolver = new ImportResolver({ projectRoot: '/project' });

      (resolver as any).pathAliases = [
        { pattern: '@components/*', prefix: '@components/', targetPrefix: '/project/src/components/' },
        { pattern: '@/*', prefix: '@/', targetPrefix: '/project/src/' },
      ] satisfies PathAlias[];

      const getAliasImportPath = (resolver as any).getAliasImportPath.bind(resolver);

      expect(getAliasImportPath('/project/src/components/Button.tsx')).toBe('@components/Button');
    });

    it('should load aliases from tsconfig.json via buildExportCache', async () => {
      const tmpDir = path.join(process.cwd(), 'tests', '_tmp_alias_test');
      await fs.mkdir(tmpDir, { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            baseUrl: '.',
            paths: {
              '@/*': ['src/*'],
              '@utils/*': ['src/utils/*'],
            },
          },
        }),
      );

      const srcDir = path.join(tmpDir, 'src', 'utils');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(path.join(srcDir, 'helpers.ts'), 'export function helper() {}');

      try {
        const resolver = new ImportResolver({ projectRoot: tmpDir });
        await resolver.buildExportCache();

        const aliases = resolver.getPathAliases();
        expect(aliases.length).toBe(2);
        expect(aliases.some((a) => a.pattern === '@utils/*')).toBe(true);
        expect(aliases.some((a) => a.pattern === '@/*')).toBe(true);

        const resolution = resolver.resolveImport('helper', path.join(tmpDir, 'src', 'app.ts'));
        expect(resolution).not.toBeNull();
        expect(resolution!.source).toBe('@utils/helpers');
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('should skip alias resolution when useAliases is false', async () => {
      const tmpDir = path.join(process.cwd(), 'tests', '_tmp_noalias_test');
      await fs.mkdir(tmpDir, { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            baseUrl: '.',
            paths: { '@/*': ['src/*'] },
          },
        }),
      );

      const srcDir = path.join(tmpDir, 'src');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(path.join(srcDir, 'util.ts'), 'export function doStuff() {}');

      try {
        const resolver = new ImportResolver({ projectRoot: tmpDir, useAliases: false });
        await resolver.buildExportCache();

        expect(resolver.getPathAliases()).toHaveLength(0);

        const resolution = resolver.resolveImport('doStuff', path.join(tmpDir, 'src', 'app.ts'));
        expect(resolution).not.toBeNull();
        expect(resolution!.source).toBe('./util');
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe('FIX 10: JSONC tsconfig support', () => {
    it('should parse tsconfig.json with line comments', async () => {
      const tmpDir = path.join(process.cwd(), 'tests', '_tmp_jsonc_test');
      await fs.mkdir(tmpDir, { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, 'tsconfig.json'),
        `{
  // This is a comment
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"] // inline comment
    }
  }
}`,
      );
      const srcDir = path.join(tmpDir, 'src');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(path.join(srcDir, 'util.ts'), 'export function helper() {}');

      try {
        const resolver = new ImportResolver({ projectRoot: tmpDir });
        await resolver.buildExportCache();
        expect(resolver.getPathAliases().length).toBeGreaterThan(0);
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('should parse tsconfig.json with block comments and trailing commas', async () => {
      const tmpDir = path.join(process.cwd(), 'tests', '_tmp_jsonc_block_test');
      await fs.mkdir(tmpDir, { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, 'tsconfig.json'),
        `{
  /* block comment */
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
    },
  },
}`,
      );
      const srcDir = path.join(tmpDir, 'src');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(path.join(srcDir, 'util.ts'), 'export function helper() {}');

      try {
        const resolver = new ImportResolver({ projectRoot: tmpDir });
        await resolver.buildExportCache();
        expect(resolver.getPathAliases().length).toBeGreaterThan(0);
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe('FIX 11: Windows path separators in alias paths', () => {
    it('should normalize backslashes in alias import paths', () => {
      const resolver = new ImportResolver({ projectRoot: '/project' });
      (resolver as any).pathAliases = [
        { pattern: '@/*', prefix: '@/', targetPrefix: '/project/src/' },
      ] satisfies PathAlias[];

      const getAliasImportPath = (resolver as any).getAliasImportPath.bind(resolver);
      const result = getAliasImportPath('/project/src/utils/helpers.ts');
      expect(result).not.toContain('\\');
      expect(result).toBe('@/utils/helpers');
    });

    it('should normalize backslashes in relative import paths', () => {
      const resolver = new ImportResolver({ projectRoot: '/project' });
      const getRelativeImportPath = (resolver as any).getRelativeImportPath.bind(resolver);
      const result = getRelativeImportPath('/project/components/Button.tsx', '/project/components/Card.tsx');
      expect(result).not.toContain('\\');
    });
  });

  describe('FIX 10: legacy parseExportsLegacy also handles as-split correctly', () => {
    it('should not split hasError via as-regex in legacy parser', () => {
      const resolver = new ImportResolver({ projectRoot: '/test' });
      const parseExports = (resolver as any).parseExportsLegacy.bind(resolver);
      const content = `export { hasError, baseClass };`;
      const exports = parseExports(content, '/test/file.ts');
      expect(exports.some((e: any) => e.name === 'hasError')).toBe(true);
      expect(exports.some((e: any) => e.name === 'baseClass')).toBe(true);
    });
  });

  describe('FIX 21: stripJsonComments respects string literals', () => {
    it('should preserve // inside string literals (URLs)', async () => {
      const tmpDir = path.join(process.cwd(), 'tests', '_tmp_stripjson_url_test');
      await fs.mkdir(tmpDir, { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, 'tsconfig.json'),
        `{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "typeRoots": ["https://example.com/types"]
  }
}`,
      );
      const srcDir = path.join(tmpDir, 'src');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(path.join(srcDir, 'util.ts'), 'export function helper() {}');

      try {
        const resolver = new ImportResolver({ projectRoot: tmpDir });
        await resolver.buildExportCache();
        expect(resolver.getPathAliases().length).toBeGreaterThan(0);
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('should preserve // inside string literals with escaped quotes', async () => {
      const tmpDir = path.join(process.cwd(), 'tests', '_tmp_stripjson_escaped_test');
      await fs.mkdir(tmpDir, { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, 'tsconfig.json'),
        `{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "description": "This is a \\"quoted\\" string with // slashes"
  }
}`,
      );
      const srcDir = path.join(tmpDir, 'src');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(path.join(srcDir, 'util.ts'), 'export function helper() {}');

      try {
        const resolver = new ImportResolver({ projectRoot: tmpDir });
        await resolver.buildExportCache();
        expect(resolver.getPathAliases().length).toBeGreaterThan(0);
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('should strip line comments outside strings', async () => {
      const tmpDir = path.join(process.cwd(), 'tests', '_tmp_stripjson_linecomment_test');
      await fs.mkdir(tmpDir, { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, 'tsconfig.json'),
        `{
  // This comment should be removed
  "compilerOptions": {
    "baseUrl": ".", // inline comment
    "paths": {
      "@/*": ["src/*"]
    }
  }
}`,
      );
      const srcDir = path.join(tmpDir, 'src');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(path.join(srcDir, 'util.ts'), 'export function helper() {}');

      try {
        const resolver = new ImportResolver({ projectRoot: tmpDir });
        await resolver.buildExportCache();
        expect(resolver.getPathAliases().length).toBeGreaterThan(0);
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('should strip block comments outside strings', async () => {
      const tmpDir = path.join(process.cwd(), 'tests', '_tmp_stripjson_blockcomment_test');
      await fs.mkdir(tmpDir, { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, 'tsconfig.json'),
        `{
  /* This is a block comment */
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
  /* Another block comment */
}`,
      );
      const srcDir = path.join(tmpDir, 'src');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(path.join(srcDir, 'util.ts'), 'export function helper() {}');

      try {
        const resolver = new ImportResolver({ projectRoot: tmpDir });
        await resolver.buildExportCache();
        expect(resolver.getPathAliases().length).toBeGreaterThan(0);
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('should remove trailing commas', async () => {
      const tmpDir = path.join(process.cwd(), 'tests', '_tmp_stripjson_trailingcomma_test');
      await fs.mkdir(tmpDir, { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, 'tsconfig.json'),
        `{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
    },
  },
}`,
      );
      const srcDir = path.join(tmpDir, 'src');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(path.join(srcDir, 'util.ts'), 'export function helper() {}');

      try {
        const resolver = new ImportResolver({ projectRoot: tmpDir });
        await resolver.buildExportCache();
        expect(resolver.getPathAliases().length).toBeGreaterThan(0);
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('should handle complex JSONC with all features combined', async () => {
      const tmpDir = path.join(process.cwd(), 'tests', '_tmp_stripjson_complex_test');
      await fs.mkdir(tmpDir, { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, 'tsconfig.json'),
        `{
  /* Main config */
  "compilerOptions": {
    "baseUrl": ".", // base directory
    "paths": {
      "@/*": ["src/*"], // main alias
      "@utils/*": ["src/utils/*"],
    },
    "typeRoots": ["https://example.com/types"], // URL with //
  },
  // End of config
}`,
      );
      const srcDir = path.join(tmpDir, 'src', 'utils');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(path.join(srcDir, 'helper.ts'), 'export function helper() {}');

      try {
        const resolver = new ImportResolver({ projectRoot: tmpDir });
        await resolver.buildExportCache();
        const aliases = resolver.getPathAliases();
        expect(aliases.length).toBeGreaterThan(0);
        expect(aliases.some((a) => a.pattern === '@/*')).toBe(true);
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
