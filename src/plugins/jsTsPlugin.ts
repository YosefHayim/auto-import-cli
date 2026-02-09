import * as path from 'path';
import type { LanguagePlugin } from './languagePlugin.js';
import { AstParser } from '@/parser/astParser.js';
import { FrameworkParser } from '@/parser/frameworkParser.js';
import type { ImportStatement, UsedIdentifier } from '@/parser/astParser.js';
import type { ExportInfo } from '@/resolver/importResolver.js';

const FRAMEWORK_EXTENSIONS = new Set(['.vue', '.svelte', '.astro']);

export class JsTsPlugin implements LanguagePlugin {
  readonly name = 'javascript-typescript';
  readonly extensions = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte', '.astro'];

  private astParser = new AstParser();
  private frameworkParser = new FrameworkParser();

  parseImports(content: string, filePath: string): ImportStatement[] {
    const scriptContent = this.extractScript(content, filePath);
    return this.astParser.parse(scriptContent).existingImports;
  }

  findUsedIdentifiers(content: string, filePath: string): UsedIdentifier[] {
    const scriptContent = this.extractScript(content, filePath);
    return this.astParser.parse(scriptContent).usedIdentifiers;
  }

  parseExports(content: string, filePath: string): ExportInfo[] {
    const exports: ExportInfo[] = [];
    let match;

    const exportFunctionRegex = /export\s+(async\s+)?function\s+(\w+)/g;
    while ((match = exportFunctionRegex.exec(content)) !== null) {
      exports.push({ name: match[2], source: filePath, isDefault: false });
    }

    const exportVarRegex = /export\s+(const|let|var)\s+(\w+)/g;
    while ((match = exportVarRegex.exec(content)) !== null) {
      exports.push({ name: match[2], source: filePath, isDefault: false });
    }

    const exportClassRegex = /export\s+class\s+(\w+)/g;
    while ((match = exportClassRegex.exec(content)) !== null) {
      exports.push({ name: match[1], source: filePath, isDefault: false });
    }

    const exportInterfaceRegex = /export\s+interface\s+(\w+)/g;
    while ((match = exportInterfaceRegex.exec(content)) !== null) {
      exports.push({ name: match[1], source: filePath, isDefault: false, isType: true });
    }

    const exportTypeRegex = /export\s+type\s+(\w+)/g;
    while ((match = exportTypeRegex.exec(content)) !== null) {
      exports.push({ name: match[1], source: filePath, isDefault: false, isType: true });
    }

    const exportDefaultNameRegex = /export\s+default\s+(class|function)\s+(\w+)/g;
    while ((match = exportDefaultNameRegex.exec(content)) !== null) {
      exports.push({ name: match[2], source: filePath, isDefault: true });
    }

    const exportNamedRegex = /export\s+\{([^}]+)\}/g;
    while ((match = exportNamedRegex.exec(content)) !== null) {
      const names = match[1].split(',').map(s => s.trim()).filter(s => s.length > 0);
      names.forEach(name => {
        const parts = name.split(/\s*as\s*/i);
        exports.push({ name: parts[parts.length - 1], source: filePath, isDefault: false });
      });
    }

    return exports;
  }

  isBuiltInOrKeyword(name: string): boolean {
    return JSTS_BUILTINS.has(name) || JSTS_KEYWORDS.has(name);
  }

  generateImportStatement(identifier: string, source: string, isDefault: boolean): string {
    return isDefault
      ? `import ${identifier} from '${source}';`
      : `import { ${identifier} } from '${source}';`;
  }

  getImportInsertPosition(content: string, filePath: string): number {
    const ext = path.extname(filePath);
    if (FRAMEWORK_EXTENSIONS.has(ext)) {
      const frameworkResult = this.frameworkParser.parseFrameworkFile(content, ext);
      if (frameworkResult.isFrameworkFile) {
        return this.findInsertLineInScript(frameworkResult.scriptContent);
      }
    }
    return this.findInsertLineInScript(content);
  }

  insertImports(content: string, imports: string[], filePath: string): string {
    const ext = path.extname(filePath);
    if (FRAMEWORK_EXTENSIONS.has(ext)) {
      const frameworkResult = this.frameworkParser.parseFrameworkFile(content, ext);
      if (frameworkResult.isFrameworkFile) {
        return this.frameworkParser.insertImportsIntoFramework(content, imports, frameworkResult);
      }
    }

    const lines = content.split('\n');
    const insertIndex = this.findInsertLineInScript(content);
    lines.splice(insertIndex, 0, ...imports);
    return lines.join('\n');
  }

  private extractScript(content: string, filePath: string): string {
    const ext = path.extname(filePath);
    if (FRAMEWORK_EXTENSIONS.has(ext)) {
      const result = this.frameworkParser.parseFrameworkFile(content, ext);
      return result.isFrameworkFile ? result.scriptContent : content;
    }
    return content;
  }

  private findInsertLineInScript(content: string): number {
    const lines = content.split('\n');
    let lastImportLine = -1;
    let firstCodeLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') ||
          trimmed.startsWith('*') || trimmed === '') {
        firstCodeLine = i + 1;
        continue;
      }
      if (trimmed.startsWith('import ')) {
        lastImportLine = i;
      } else if (trimmed.length > 0 && lastImportLine === -1) {
        break;
      }
    }

    return lastImportLine >= 0 ? lastImportLine + 1 : firstCodeLine;
  }
}

const JSTS_BUILTINS = new Set([
  'Array', 'Object', 'String', 'Number', 'Boolean', 'Symbol', 'Date',
  'Error', 'RegExp', 'Map', 'Set', 'Promise', 'JSON', 'Math',
  'Function', 'Infinity', 'NaN', 'undefined', 'null',
]);

const JSTS_KEYWORDS = new Set([
  'React', 'Component', 'Fragment', 'Interface', 'Type', 'Props', 'State', 'Ref',
]);
