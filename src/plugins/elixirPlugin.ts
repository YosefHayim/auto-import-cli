import type { LanguagePlugin } from './languagePlugin.js';
import type { ImportStatement, UsedIdentifier } from '@/parser/astParser.js';
import type { ExportInfo } from '@/resolver/importResolver.js';

export class ElixirPlugin implements LanguagePlugin {
  readonly name = 'elixir';
  readonly extensions = ['.ex', '.exs'];

  parseImports(content: string, _filePath: string): ImportStatement[] {
    const imports: ImportStatement[] = [];
    let match;

    const aliasRegex = /^\s*alias\s+([\w.]+)(?:\s*,\s*as:\s*(\w+))?$/gm;
    while ((match = aliasRegex.exec(content)) !== null) {
      const fullModule = match[1];
      const aliasName = match[2] || fullModule.split('.').pop()!;
      imports.push({ source: fullModule, imports: [aliasName], isDefault: true });
    }

    const importRegex = /^\s*import\s+([\w.]+)(?:\s*,\s*(?:only|except):\s*\[([^\]]*)\])?$/gm;
    while ((match = importRegex.exec(content)) !== null) {
      const fullModule = match[1];
      const onlyList = match[2];
      if (onlyList) {
        const names = onlyList
          .split(',')
          .map(s => s.trim().replace(/:\s*\d+/, '').trim())
          .filter(s => s.length > 0);
        imports.push({ source: fullModule, imports: names, isDefault: false });
      } else {
        const shortName = fullModule.split('.').pop()!;
        imports.push({ source: fullModule, imports: [shortName], isDefault: true });
      }
    }

    const useRegex = /^\s*use\s+([\w.]+)(?:\s*,\s*(.+))?$/gm;
    while ((match = useRegex.exec(content)) !== null) {
      const fullModule = match[1];
      const shortName = fullModule.split('.').pop()!;
      imports.push({ source: fullModule, imports: [shortName], isDefault: true });
    }

    const requireRegex = /^\s*require\s+([\w.]+)$/gm;
    while ((match = requireRegex.exec(content)) !== null) {
      const fullModule = match[1];
      const shortName = fullModule.split('.').pop()!;
      imports.push({ source: fullModule, imports: [shortName], isDefault: true });
    }

    return imports;
  }

  findUsedIdentifiers(content: string, _filePath: string): UsedIdentifier[] {
    const identifiers: UsedIdentifier[] = [];
    const lines = content.split('\n');

    lines.forEach((line, lineIndex) => {
      const trimmed = line.trim();

      if (
        trimmed.startsWith('#') ||
        trimmed === '' ||
        /^\s*(alias|import|use|require|defmodule|defprotocol|defimpl)\s/.test(trimmed)
      ) {
        return;
      }

      const moduleRefRegex = /(?<![.\w])([A-Z][a-zA-Z0-9]*(?:\.[A-Z][a-zA-Z0-9]*)*)\b/g;
      let match;
      while ((match = moduleRefRegex.exec(line)) !== null) {
        const fullRef = match[1];
        const topModule = fullRef.split('.')[0];
        if (!this.isBuiltInOrKeyword(topModule)) {
          identifiers.push({ name: topModule, line: lineIndex + 1, column: match.index });
        }
      }

      const funcCallRegex = /(?<![.\w:])([a-z_][a-z0-9_]*[!?]?)\s*\(/g;
      while ((match = funcCallRegex.exec(line)) !== null) {
        const name = match[1];
        if (!this.isBuiltInOrKeyword(name) && !ELIXIR_COMMON_FUNCTIONS.has(name)) {
          identifiers.push({ name, line: lineIndex + 1, column: match.index });
        }
      }
    });

    return identifiers;
  }

  parseExports(content: string, filePath: string): ExportInfo[] {
    const exports: ExportInfo[] = [];
    let match;

    const defmoduleRegex = /^\s*defmodule\s+([\w.]+)\s+do\b/gm;
    while ((match = defmoduleRegex.exec(content)) !== null) {
      const fullName = match[1];
      const shortName = fullName.split('.').pop()!;
      exports.push({ name: shortName, source: filePath, isDefault: false });
      if (fullName !== shortName) {
        exports.push({ name: fullName, source: filePath, isDefault: false });
      }
    }

    const defRegex = /^\s*def\s+(\w+[!?]?)\s*[(\n,]/gm;
    while ((match = defRegex.exec(content)) !== null) {
      const name = match[1];
      if (!name.startsWith('__')) {
        exports.push({ name, source: filePath, isDefault: false });
      }
    }

    const defmacroRegex = /^\s*defmacro\s+(\w+[!?]?)\s*[(\n,]/gm;
    while ((match = defmacroRegex.exec(content)) !== null) {
      const name = match[1];
      exports.push({ name, source: filePath, isDefault: false });
    }

    return exports;
  }

  isBuiltInOrKeyword(name: string): boolean {
    return ELIXIR_BUILTINS.has(name) || ELIXIR_KEYWORDS.has(name);
  }

  generateImportStatement(identifier: string, source: string, _isDefault: boolean): string {
    const moduleName = this.filePathToModule(source);
    if (/^[A-Z]/.test(identifier)) {
      return `alias ${moduleName}.${identifier}`;
    }
    return `import ${moduleName}, only: [${identifier}: 1]`;
  }

  getImportInsertPosition(content: string, _filePath: string): number {
    const lines = content.split('\n');
    let lastImportLine = -1;
    let afterModuleLine = -1;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      if (/^defmodule\s+/.test(trimmed)) {
        afterModuleLine = i + 1;
        continue;
      }

      if (/^\s*(alias|import|use|require)\s+/.test(lines[i])) {
        lastImportLine = i;
      }
    }

    if (lastImportLine >= 0) {
      return lastImportLine + 1;
    }

    if (afterModuleLine >= 0) {
      return afterModuleLine;
    }

    return 0;
  }

  insertImports(content: string, imports: string[], _filePath: string): string {
    const lines = content.split('\n');
    const insertIndex = this.getImportInsertPosition(content, _filePath);
    lines.splice(insertIndex, 0, ...imports);
    return lines.join('\n');
  }

  private filePathToModule(filePath: string): string {
    let modulePath = filePath.replace(/\.(ex|exs)$/, '');
    modulePath = modulePath.replace(/\\/g, '/');

    const parts = modulePath.split('/');

    const libIdx = parts.indexOf('lib');
    if (libIdx >= 0) {
      return parts
        .slice(libIdx + 1)
        .map(p => this.snakeToPascal(p))
        .join('.');
    }

    const fileName = parts[parts.length - 1];
    const dirName = parts.length >= 2 ? parts[parts.length - 2] : '';
    if (dirName) {
      return `${this.snakeToPascal(dirName)}.${this.snakeToPascal(fileName)}`;
    }
    return this.snakeToPascal(fileName);
  }

  private snakeToPascal(str: string): string {
    return str
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }
}

const ELIXIR_BUILTINS = new Set([
  'Kernel', 'Enum', 'List', 'Map', 'Tuple', 'String', 'Integer', 'Float',
  'IO', 'File', 'Path', 'System', 'Process', 'Agent', 'Task', 'GenServer',
  'Supervisor', 'Application', 'Node', 'Port', 'Registry',
  'Keyword', 'MapSet', 'Range', 'Regex', 'Stream', 'URI', 'Date', 'Time',
  'DateTime', 'NaiveDateTime', 'Calendar', 'Version',
  'Enumerable', 'Collectable', 'Inspect', 'Access', 'Protocol',
  'Code', 'Macro', 'Module', 'Atom', 'Function',
  'ArgumentError', 'ArithmeticError', 'BadArityError', 'BadFunctionError',
  'BadMapError', 'BadStructError', 'CaseClauseError', 'CompileError',
  'CondClauseError', 'FunctionClauseError', 'KeyError', 'MatchError',
  'RuntimeError', 'SystemLimitError', 'UndefinedFunctionError',
  'true', 'false', 'nil',
  'Logger',
  'Base', 'Bitwise', 'Exception', 'Record', 'Behaviour',
  'EEx', 'Mix', 'ExUnit', 'IEx',
  'Erlang',
]);

const ELIXIR_KEYWORDS = new Set([
  'def', 'defp', 'defmodule', 'defprotocol', 'defimpl', 'defstruct',
  'defmacro', 'defmacrop', 'defguard', 'defguardp', 'defdelegate',
  'defexception', 'defoverridable', 'defcallback',
  'do', 'end', 'fn', 'case', 'cond', 'with', 'for', 'if', 'unless',
  'when', 'in', 'not', 'and', 'or', 'raise', 'reraise', 'try',
  'catch', 'rescue', 'after', 'receive', 'send', 'spawn', 'self',
  'throw', 'exit', 'quote', 'unquote', 'super',
  'is_nil', 'is_atom', 'is_binary', 'is_bitstring', 'is_boolean',
  'is_float', 'is_function', 'is_integer', 'is_list', 'is_map',
  'is_number', 'is_pid', 'is_port', 'is_reference', 'is_tuple',
  'hd', 'tl', 'elem', 'put_elem', 'length', 'map_size', 'tuple_size',
  'byte_size', 'bit_size', 'div', 'rem', 'abs', 'round', 'trunc',
  'max', 'min', 'to_string', 'to_charlist', 'inspect',
  'apply', 'make_ref', 'node', 'binary_part',
  'pipe', 'capture',
  'assert', 'refute', 'describe', 'test', 'setup',
]);

const ELIXIR_COMMON_FUNCTIONS = new Set([
  'if', 'unless', 'case', 'cond', 'with', 'for', 'raise', 'throw',
  'try', 'catch', 'rescue', 'receive', 'send', 'spawn', 'self',
  'put_in', 'get_in', 'update_in', 'pop_in',
  'hd', 'tl', 'elem', 'put_elem', 'length', 'map_size', 'tuple_size',
  'byte_size', 'bit_size', 'div', 'rem', 'abs', 'round', 'trunc',
  'max', 'min', 'to_string', 'to_charlist', 'inspect', 'apply',
  'is_nil', 'is_atom', 'is_binary', 'is_boolean', 'is_float',
  'is_function', 'is_integer', 'is_list', 'is_map', 'is_number',
  'is_pid', 'is_port', 'is_reference', 'is_tuple', 'is_bitstring',
  'make_ref', 'node', 'binary_part', 'not',
  'puts', 'gets', 'write', 'read',
  'def', 'defp', 'defmodule', 'defmacro', 'defstruct', 'defprotocol',
  'defimpl', 'defguard', 'defdelegate', 'defexception', 'defoverridable',
  'assert', 'refute', 'describe', 'test', 'setup', 'setup_all',
  'when', 'in',
  'sigil_r', 'sigil_s', 'sigil_w', 'sigil_c',
]);
