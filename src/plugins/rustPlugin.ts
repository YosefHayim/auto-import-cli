import type { LanguagePlugin } from './languagePlugin.js';
import type { ImportStatement, UsedIdentifier } from '@/parser/astParser.js';
import type { ExportInfo } from '@/resolver/importResolver.js';

export class RustPlugin implements LanguagePlugin {
  readonly name = 'rust';
  readonly extensions = ['.rs'];

  parseImports(content: string, _filePath: string): ImportStatement[] {
    const imports: ImportStatement[] = [];
    const stripped = this.stripCommentsAndStrings(content);

    // Match `use path::to::Item;` and `use path::to::{A, B, C};` and `use path::*;`
    const useRegex = /^[ \t]*use\s+([\w:]+(?:::\{[^}]+\}|::\*|))\s*;/gm;
    let match;

    while ((match = useRegex.exec(stripped)) !== null) {
      const fullPath = match[1].trim();
      this.parseUseStatement(fullPath, imports);
    }

    return imports;
  }

  findUsedIdentifiers(content: string, _filePath: string): UsedIdentifier[] {
    const identifiers: UsedIdentifier[] = [];
    const stripped = this.stripCommentsAndStrings(content);
    const lines = stripped.split('\n');
    const seen = new Set<string>();

    lines.forEach((line, lineIndex) => {
      const trimmed = line.trim();

      // Skip use statements, comments, empty lines, attribute lines
      if (trimmed.startsWith('use ') || trimmed.startsWith('//') ||
          trimmed.startsWith('#[') || trimmed === '' ||
          trimmed.startsWith('mod ') || trimmed.startsWith('pub mod ') ||
          trimmed.startsWith('extern ')) {
        return;
      }

      // PascalCase type usage: MyStruct, MyEnum, MyTrait (not after `struct`, `enum`, `trait`, `type`, `impl`, `fn`)
      const typeRegex = /(?<!\w)(?<!(?:struct|enum|trait|type|impl|fn|mod|use|pub\s+struct|pub\s+enum|pub\s+trait|pub\s+type|pub\s+fn|pub\s+mod)\s)([A-Z][a-zA-Z0-9_]*)\b/g;
      let m;
      while ((m = typeRegex.exec(line)) !== null) {
        const name = m[1];
        // Verify it's not a definition line
        if (this.isDefinitionLine(trimmed, name)) continue;
        if (!this.isBuiltInOrKeyword(name) && !seen.has(name)) {
          seen.add(name);
          identifiers.push({ name, line: lineIndex + 1, column: m.index });
        }
      }

      // Qualified path usage: Vec::new(), HashMap::new(), Type::method()
      const qualifiedRegex = /(?<!\w)([A-Z][a-zA-Z0-9_]*)(?:::\w+)+/g;
      while ((m = qualifiedRegex.exec(line)) !== null) {
        const name = m[1];
        if (this.isDefinitionLine(trimmed, name)) continue;
        if (!this.isBuiltInOrKeyword(name) && !seen.has(name)) {
          seen.add(name);
          identifiers.push({ name, line: lineIndex + 1, column: m.index });
        }
      }

      // Trait bounds: impl MyTrait for ..., where T: MyTrait, fn foo<T: MyTrait>
      const traitBoundRegex = /(?::\s*|:\s*\w+\s*\+\s*|impl\s+)([A-Z][a-zA-Z0-9_]*)\b/g;
      while ((m = traitBoundRegex.exec(line)) !== null) {
        const name = m[1];
        if (this.isDefinitionLine(trimmed, name)) continue;
        if (!this.isBuiltInOrKeyword(name) && !seen.has(name)) {
          seen.add(name);
          identifiers.push({ name, line: lineIndex + 1, column: m.index });
        }
      }

      // Function calls: snake_case_func(...)
      const funcCallRegex = /(?<![.:]\s*)(?<![.\w])([a-z_][a-z0-9_]*)\s*\(/g;
      while ((m = funcCallRegex.exec(line)) !== null) {
        const name = m[1];
        if (this.isBuiltInOrKeyword(name) || seen.has(name)) continue;
        if (RUST_COMMON_FUNCTIONS.has(name)) continue;
        // Skip if preceded by dot (method call) or if it's a definition
        const before = line.substring(0, m.index);
        if (before.trimEnd().endsWith('.') || before.trimEnd().endsWith('::')) continue;
        if (this.isFunctionDefinitionLine(trimmed, name)) continue;
        seen.add(name);
        identifiers.push({ name, line: lineIndex + 1, column: m.index });
      }

      // Macro usage: my_macro!(...)
      const macroRegex = /(?<!\w)([a-z_][a-z0-9_]*)!\s*[\(\[\{]/g;
      while ((m = macroRegex.exec(line)) !== null) {
        const name = m[1];
        if (RUST_BUILTIN_MACROS.has(name) || seen.has(name)) continue;
        seen.add(name);
        identifiers.push({ name, line: lineIndex + 1, column: m.index });
      }
    });

    return identifiers;
  }

  parseExports(content: string, filePath: string): ExportInfo[] {
    const exports: ExportInfo[] = [];
    const stripped = this.stripCommentsAndStrings(content);
    let match;

    // pub fn name
    const pubFnRegex = /^[ \t]*pub(?:\s*\(\s*crate\s*\))?\s+(?:async\s+)?fn\s+(\w+)/gm;
    while ((match = pubFnRegex.exec(stripped)) !== null) {
      exports.push({ name: match[1], source: filePath, isDefault: false });
    }

    // pub struct Name
    const pubStructRegex = /^[ \t]*pub(?:\s*\(\s*crate\s*\))?\s+struct\s+(\w+)/gm;
    while ((match = pubStructRegex.exec(stripped)) !== null) {
      exports.push({ name: match[1], source: filePath, isDefault: false });
    }

    // pub enum Name
    const pubEnumRegex = /^[ \t]*pub(?:\s*\(\s*crate\s*\))?\s+enum\s+(\w+)/gm;
    while ((match = pubEnumRegex.exec(stripped)) !== null) {
      exports.push({ name: match[1], source: filePath, isDefault: false });
    }

    // pub trait Name
    const pubTraitRegex = /^[ \t]*pub(?:\s*\(\s*crate\s*\))?\s+trait\s+(\w+)/gm;
    while ((match = pubTraitRegex.exec(stripped)) !== null) {
      exports.push({ name: match[1], source: filePath, isDefault: false });
    }

    // pub type Name
    const pubTypeRegex = /^[ \t]*pub(?:\s*\(\s*crate\s*\))?\s+type\s+(\w+)/gm;
    while ((match = pubTypeRegex.exec(stripped)) !== null) {
      exports.push({ name: match[1], source: filePath, isDefault: false, isType: true });
    }

    // pub const NAME
    const pubConstRegex = /^[ \t]*pub(?:\s*\(\s*crate\s*\))?\s+const\s+(\w+)/gm;
    while ((match = pubConstRegex.exec(stripped)) !== null) {
      exports.push({ name: match[1], source: filePath, isDefault: false });
    }

    // pub static NAME
    const pubStaticRegex = /^[ \t]*pub(?:\s*\(\s*crate\s*\))?\s+static\s+(?:mut\s+)?(\w+)/gm;
    while ((match = pubStaticRegex.exec(stripped)) !== null) {
      exports.push({ name: match[1], source: filePath, isDefault: false });
    }

    // pub mod name
    const pubModRegex = /^[ \t]*pub(?:\s*\(\s*crate\s*\))?\s+mod\s+(\w+)/gm;
    while ((match = pubModRegex.exec(stripped)) !== null) {
      exports.push({ name: match[1], source: filePath, isDefault: false });
    }

    return exports;
  }

  isBuiltInOrKeyword(name: string): boolean {
    return RUST_STD_TYPES.has(name) || RUST_KEYWORDS.has(name) || RUST_PRIMITIVE_TYPES.has(name);
  }

  generateImportStatement(identifier: string, source: string, _isDefault: boolean): string {
    const modulePath = this.filePathToModule(source);
    return `use crate::${modulePath}::${identifier};`;
  }

  getImportInsertPosition(content: string, _filePath: string): number {
    const lines = content.split('\n');
    let lastUseLine = -1;
    let firstCodeLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      // Skip comments, empty lines, attributes
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') ||
          trimmed.startsWith('*') || trimmed === '' ||
          trimmed.startsWith('#!') || trimmed.startsWith('#[')) {
        firstCodeLine = i + 1;
        continue;
      }

      if (trimmed.startsWith('use ') || trimmed.startsWith('pub use ')) {
        lastUseLine = i;
      } else if (trimmed.length > 0 && lastUseLine === -1) {
        break;
      }
    }

    return lastUseLine >= 0 ? lastUseLine + 1 : firstCodeLine;
  }

  insertImports(content: string, imports: string[], _filePath: string): string {
    const lines = content.split('\n');
    const insertIndex = this.getImportInsertPosition(content, _filePath);
    lines.splice(insertIndex, 0, ...imports);
    return lines.join('\n');
  }

  private parseUseStatement(fullPath: string, imports: ImportStatement[]): void {
    // Handle nested imports: use std::{io, fs, collections::HashMap};
    const nestedMatch = fullPath.match(/^(.+)::\{([^}]+)\}$/);
    if (nestedMatch) {
      const basePath = nestedMatch[1];
      const names = nestedMatch[2].split(',').map(s => s.trim()).filter(s => s.length > 0);
      const resolvedNames: string[] = [];
      for (const name of names) {
        // Handle nested qualified names like collections::HashMap
        const parts = name.split('::');
        resolvedNames.push(parts[parts.length - 1]);
      }
      imports.push({ source: basePath, imports: resolvedNames, isDefault: false });
      return;
    }

    // Handle glob imports: use std::prelude::*;
    const globMatch = fullPath.match(/^(.+)::\*$/);
    if (globMatch) {
      imports.push({ source: globMatch[1], imports: ['*'], isDefault: false, isNamespace: true });
      return;
    }

    // Handle simple imports: use std::collections::HashMap;
    const parts = fullPath.split('::');
    if (parts.length >= 2) {
      const name = parts[parts.length - 1];
      const source = parts.slice(0, -1).join('::');
      imports.push({ source, imports: [name], isDefault: false });
    } else {
      // Single-segment use (rare): use something;
      imports.push({ source: fullPath, imports: [fullPath], isDefault: false });
    }
  }

  private stripCommentsAndStrings(content: string): string {
    // Remove block comments
    let result = content.replace(/\/\*[\s\S]*?\*\//g, '');
    // Remove line comments
    result = result.replace(/\/\/.*$/gm, '');
    // Remove string literals (simple approach)
    result = result.replace(/"(?:[^"\\]|\\.)*"/g, '""');
    result = result.replace(/r#*"[\s\S]*?"#*/g, '""');
    return result;
  }

  private isDefinitionLine(trimmed: string, name: string): boolean {
    const defPatterns = [
      new RegExp(`^pub\\s+(struct|enum|trait|type|fn|mod)\\s+${name}\\b`),
      new RegExp(`^pub\\s*\\(\\s*crate\\s*\\)\\s+(struct|enum|trait|type|fn|mod)\\s+${name}\\b`),
      new RegExp(`^(struct|enum|trait|type|fn|mod)\\s+${name}\\b`),
      new RegExp(`^impl\\s+${name}\\b`),
      new RegExp(`^impl\\s*<[^>]*>\\s+${name}\\b`),
    ];
    return defPatterns.some(p => p.test(trimmed));
  }

  private isFunctionDefinitionLine(trimmed: string, name: string): boolean {
    const defPatterns = [
      new RegExp(`^pub\\s+(?:async\\s+)?fn\\s+${name}\\b`),
      new RegExp(`^pub\\s*\\(\\s*crate\\s*\\)\\s+(?:async\\s+)?fn\\s+${name}\\b`),
      new RegExp(`^(?:async\\s+)?fn\\s+${name}\\b`),
    ];
    return defPatterns.some(p => p.test(trimmed));
  }

  private filePathToModule(filePath: string): string {
    let modulePath = filePath.replace(/\.rs$/, '');
    modulePath = modulePath.replace(/\\/g, '/');

    const parts = modulePath.split('/');
    const srcIdx = parts.indexOf('src');
    const startIdx = srcIdx >= 0 ? srcIdx + 1 : -1;

    if (startIdx > 0) {
      const result = parts.slice(startIdx);
      // Remove mod.rs or lib.rs from the end
      const last = result[result.length - 1];
      if (last === 'mod' || last === 'lib' || last === 'main') {
        result.pop();
      }
      return result.join('::');
    }

    // Fallback: use last two segments
    const fileName = parts[parts.length - 1];
    const dirName = parts.length >= 2 ? parts[parts.length - 2] : '';
    if (fileName === 'mod' || fileName === 'lib' || fileName === 'main') {
      return dirName;
    }
    return dirName ? `${dirName}::${fileName}` : fileName;
  }
}

const RUST_STD_TYPES = new Set([
  // Primitive wrappers and smart pointers
  'Vec', 'String', 'Box', 'Rc', 'Arc', 'Cell', 'RefCell', 'Mutex', 'RwLock',
  // Collections
  'HashMap', 'HashSet', 'BTreeMap', 'BTreeSet', 'VecDeque', 'LinkedList', 'BinaryHeap',
  // Option/Result
  'Option', 'Result', 'Some', 'None', 'Ok', 'Err',
  // Common traits
  'Clone', 'Copy', 'Debug', 'Default', 'Display', 'Drop',
  'Eq', 'PartialEq', 'Ord', 'PartialOrd', 'Hash',
  'Send', 'Sync', 'Sized', 'Unpin',
  'From', 'Into', 'TryFrom', 'TryInto',
  'Iterator', 'IntoIterator', 'ExactSizeIterator', 'DoubleEndedIterator',
  'Fn', 'FnMut', 'FnOnce',
  'AsRef', 'AsMut', 'Borrow', 'BorrowMut', 'ToOwned',
  'ToString', 'Deref', 'DerefMut',
  // IO
  'Read', 'Write', 'Seek', 'BufRead', 'BufReader', 'BufWriter',
  // Error types
  'Error',
  // Cow
  'Cow',
  // Pin
  'Pin',
  // PhantomData
  'PhantomData',
  // Formatting
  'Formatter',
]);

const RUST_KEYWORDS = new Set([
  'fn', 'let', 'mut', 'pub', 'struct', 'enum', 'impl', 'trait', 'where',
  'mod', 'crate', 'self', 'super', 'use', 'as', 'in', 'for', 'loop',
  'while', 'if', 'else', 'match', 'return', 'break', 'continue',
  'const', 'static', 'type', 'unsafe', 'extern', 'ref', 'move',
  'async', 'await', 'dyn', 'true', 'false', 'where', 'yield',
  'abstract', 'become', 'box', 'do', 'final', 'macro', 'override',
  'priv', 'typeof', 'unsized', 'virtual', 'try',
  // Common macros treated as keywords
  'println', 'print', 'eprintln', 'eprint', 'format', 'write', 'writeln',
  'vec', 'panic', 'assert', 'assert_eq', 'assert_ne', 'debug_assert',
  'todo', 'unimplemented', 'unreachable', 'cfg', 'include', 'include_str',
  'include_bytes', 'env', 'option_env', 'concat', 'stringify', 'line',
  'column', 'file', 'module_path',
  // Self type
  'Self',
]);

const RUST_PRIMITIVE_TYPES = new Set([
  'i8', 'i16', 'i32', 'i64', 'i128', 'isize',
  'u8', 'u16', 'u32', 'u64', 'u128', 'usize',
  'f32', 'f64', 'bool', 'char', 'str',
]);

const RUST_COMMON_FUNCTIONS = new Set([
  'main', 'new', 'default', 'from', 'into', 'clone', 'to_string',
  'to_owned', 'as_ref', 'as_mut', 'unwrap', 'expect', 'map',
  'and_then', 'or_else', 'ok', 'err', 'is_some', 'is_none',
  'is_ok', 'is_err', 'iter', 'into_iter', 'collect', 'push',
  'pop', 'len', 'is_empty', 'contains', 'get', 'insert', 'remove',
  'with_capacity', 'capacity', 'reserve', 'shrink_to_fit',
  'extend', 'drain', 'clear', 'sort', 'sort_by', 'sort_by_key',
  'dedup', 'truncate', 'retain', 'split', 'join', 'trim',
  'starts_with', 'ends_with', 'replace', 'find', 'rfind',
  'chars', 'bytes', 'lines', 'as_str', 'as_bytes',
  'to_lowercase', 'to_uppercase', 'parse', 'read', 'write',
  'flush', 'close', 'lock', 'try_lock', 'read_to_string',
  'write_all', 'read_line', 'read_exact',
]);

const RUST_BUILTIN_MACROS = new Set([
  'println', 'print', 'eprintln', 'eprint', 'format', 'write', 'writeln',
  'vec', 'panic', 'assert', 'assert_eq', 'assert_ne', 'debug_assert',
  'debug_assert_eq', 'debug_assert_ne', 'todo', 'unimplemented',
  'unreachable', 'cfg', 'include', 'include_str', 'include_bytes',
  'env', 'option_env', 'concat', 'stringify', 'line', 'column',
  'file', 'module_path', 'matches', 'dbg',
]);
