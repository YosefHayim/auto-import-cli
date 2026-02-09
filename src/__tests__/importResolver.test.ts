import { ImportResolver } from '../resolver/importResolver';

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
    const parseExports = (resolver as any).parseExports.bind(resolver);
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
    const parseExports = (resolver as any).parseExports.bind(resolver);
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
    const parseExports = (resolver as any).parseExports.bind(resolver);
    const exports = parseExports(content, '/test/file.ts');
    
    expect(exports.some((e: any) => e.name === 'foo')).toBe(true);
    expect(exports.some((e: any) => e.name === 'baz')).toBe(true);
  });

  it('should generate correct relative import paths', () => {
    const resolver = new ImportResolver({ projectRoot: '/test' });
    const getRelativeImportPath = (resolver as any).getRelativeImportPath.bind(resolver);
    
    // Same directory
    const sameDirPath = getRelativeImportPath(
      '/test/components/Button.tsx',
      '/test/components/Card.tsx'
    );
    expect(sameDirPath).toBe('./Card');
    
    // Parent directory
    const parentDirPath = getRelativeImportPath(
      '/test/components/ui/Button.tsx',
      '/test/components/Card.tsx'
    );
    expect(parentDirPath).toBe('../Card');
    
    // Subdirectory
    const subDirPath = getRelativeImportPath(
      '/test/components/Card.tsx',
      '/test/components/ui/Button.tsx'
    );
    expect(subDirPath).toBe('./ui/Button');
  });
});
