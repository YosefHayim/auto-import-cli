import * as path from 'path';
import type { LanguagePlugin } from './languagePlugin.js';
import { AstParser } from '@/parser/astParser.js';
import { FrameworkParser } from '@/parser/frameworkParser.js';
import type { ImportStatement, UsedIdentifier } from '@/parser/astParser.js';
import type { ExportInfo } from '@/resolver/importResolver.js';
import { JSTS_BUILTINS, JSTS_KEYWORDS } from '@/constants/jstsKeywords.js';

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
    const scriptContent = this.extractScript(content, filePath);
    const exports: ExportInfo[] = [];
    let match;

    const exportFunctionRegex = /export\s+(async\s+)?function\s+(\w+)/g;
    while ((match = exportFunctionRegex.exec(scriptContent)) !== null) {
      exports.push({ name: match[2], source: filePath, isDefault: false });
    }

    const exportVarRegex = /export\s+(const|let|var)\s+(\w+)/g;
    while ((match = exportVarRegex.exec(scriptContent)) !== null) {
      exports.push({ name: match[2], source: filePath, isDefault: false });
    }

    const exportClassRegex = /export\s+class\s+(\w+)/g;
    while ((match = exportClassRegex.exec(scriptContent)) !== null) {
      exports.push({ name: match[1], source: filePath, isDefault: false });
    }

    const exportInterfaceRegex = /export\s+interface\s+(\w+)/g;
    while ((match = exportInterfaceRegex.exec(scriptContent)) !== null) {
      exports.push({ name: match[1], source: filePath, isDefault: false, isType: true });
    }

    const exportTypeRegex = /export\s+type\s+(\w+)/g;
    while ((match = exportTypeRegex.exec(scriptContent)) !== null) {
      exports.push({ name: match[1], source: filePath, isDefault: false, isType: true });
    }

    const exportDefaultNameRegex = /export\s+default\s+(async\s+)?(class|function)\s+(\w+)/g;
    while ((match = exportDefaultNameRegex.exec(scriptContent)) !== null) {
      exports.push({ name: match[3], source: filePath, isDefault: true });
    }

    const exportNamedRegex = /export\s+\{([^}]+)\}/g;
    while ((match = exportNamedRegex.exec(scriptContent)) !== null) {
      const names = match[1]
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      names.forEach((name) => {
        const stripped = name.replace(/^type\s+/, '');
        const parts = stripped.split(/\s+as\s+/);
        const exportedName = parts[parts.length - 1].replace(/^type\s+/, '');
        exports.push({ name: exportedName, source: filePath, isDefault: false });
      });
    }

    return exports;
  }

  isBuiltInOrKeyword(name: string): boolean {
    return JSTS_BUILTINS.has(name) || JSTS_KEYWORDS.has(name);
  }

  generateImportStatement(identifier: string, source: string, isDefault: boolean): string {
    return isDefault ? `import ${identifier} from '${source}';` : `import { ${identifier} } from '${source}';`;
  }

  getImportInsertPosition(content: string, filePath: string): number {
    const ext = path.extname(filePath);
    if (FRAMEWORK_EXTENSIONS.has(ext)) {
      const frameworkResult = this.frameworkParser.parseFrameworkFile(content, ext);
      if (frameworkResult.isFrameworkFile) {
        const scriptRelativeLine = this.findInsertLineInScript(frameworkResult.scriptContent);
        const rawScript = content.substring(frameworkResult.scriptStart, frameworkResult.scriptEnd);
        const leadingWhitespace = rawScript.substring(0, rawScript.length - rawScript.trimStart().length);
        const leadingNewlines = (leadingWhitespace.match(/\n/g) || []).length;
        const scriptStartLine = content.substring(0, frameworkResult.scriptStart).split('\n').length - 1;
        return scriptStartLine + leadingNewlines + scriptRelativeLine;
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
    let inBlockComment = false;
    const startIndex = lines.length > 0 && lines[0].trimStart().startsWith('#!') ? 1 : 0;

    if (startIndex === 1) {
      firstCodeLine = 1;
    }

    for (let i = startIndex; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      if (inBlockComment) {
        firstCodeLine = i + 1;
        if (trimmed.includes('*/')) {
          inBlockComment = false;
        }
        continue;
      }

      if (trimmed.startsWith('/*')) {
        firstCodeLine = i + 1;
        if (!trimmed.includes('*/')) {
          inBlockComment = true;
        }
        continue;
      }

      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed === '') {
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
