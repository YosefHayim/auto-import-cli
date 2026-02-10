import type { ImportStatement, UsedIdentifier } from '@/parser/astParser.js';
import type { ExportInfo } from '@/resolver/importResolver.js';

export interface LanguagePlugin {
  readonly name: string;
  readonly extensions: string[];

  parseImports(content: string, filePath: string): ImportStatement[];
  findUsedIdentifiers(content: string, filePath: string): UsedIdentifier[];
  parseExports(content: string, filePath: string): ExportInfo[];
  isBuiltInOrKeyword(name: string): boolean;
  generateImportStatement(identifier: string, source: string, isDefault: boolean): string;
  getImportInsertPosition(content: string, filePath: string): number;
  insertImports(content: string, imports: string[], filePath: string): string;
}
