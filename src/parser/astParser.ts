export interface ImportStatement {
  source: string;
  imports: string[];
  isDefault?: boolean;
  isNamespace?: boolean;
}

export interface UsedIdentifier {
  name: string;
  line: number;
  column: number;
}

export interface ParseResult {
  existingImports: ImportStatement[];
  usedIdentifiers: UsedIdentifier[];
  missingImports: string[];
}

export class AstParser {
  /**
   * Simple regex-based parser for detecting imports and identifiers
   * This is a lightweight approach that works for most common cases
   */
  parse(content: string): ParseResult {
    const existingImports = this.parseImports(content);
    const usedIdentifiers = this.findUsedIdentifiers(content);
    const importedNames = this.getImportedNames(existingImports);
    
    // Find identifiers that are used but not imported
    const missingImports = usedIdentifiers
      .map(id => id.name)
      .filter((name, index, self) => self.indexOf(name) === index) // unique
      .filter(name => !importedNames.has(name))
      .filter(name => !this.isBuiltIn(name))
      .filter(name => !this.isKeyword(name));

    return {
      existingImports,
      usedIdentifiers,
      missingImports,
    };
  }

  private parseImports(content: string): ImportStatement[] {
    const imports: ImportStatement[] = [];
    
    // Match: import { x, y } from 'module'
    const namedImportRegex = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = namedImportRegex.exec(content)) !== null) {
      const importNames = match[1]
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      imports.push({
        source: match[2],
        imports: importNames,
        isDefault: false,
      });
    }

    // Match: import x from 'module'
    const defaultImportRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
    while ((match = defaultImportRegex.exec(content)) !== null) {
      // Skip if this is part of a named import
      if (!content.substring(match.index - 10, match.index).includes('{')) {
        imports.push({
          source: match[2],
          imports: [match[1]],
          isDefault: true,
        });
      }
    }

    // Match: import * as x from 'module'
    const namespaceImportRegex = /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
    while ((match = namespaceImportRegex.exec(content)) !== null) {
      imports.push({
        source: match[2],
        imports: [match[1]],
        isNamespace: true,
      });
    }

    return imports;
  }

  private findUsedIdentifiers(content: string): UsedIdentifier[] {
    const identifiers: UsedIdentifier[] = [];
    const lines = content.split('\n');
    
    // Pattern to find JSX components (capitalized) and function calls
    // Only match when used in JSX context or called as functions
    const jsxComponentRegex = /<([A-Z][a-zA-Z0-9]*)/g;
    const functionCallRegex = /(?<![.\w])([a-z][a-zA-Z0-9]*)\s*\(/g;
    
    lines.forEach((line, lineIndex) => {
      // Skip import/export lines and comments
      if (line.trim().startsWith('import ') || 
          line.trim().startsWith('export ') || 
          line.trim().startsWith('//') ||
          line.trim().startsWith('/*')) {
        return;
      }
      
      // Find JSX components
      let match;
      while ((match = jsxComponentRegex.exec(line)) !== null) {
        identifiers.push({
          name: match[1],
          line: lineIndex + 1,
          column: match.index,
        });
      }
      
      // Find function calls (camelCase starting with lowercase)
      // Skip if preceded by a dot (method calls)
      const functionsInLine = [];
      while ((match = functionCallRegex.exec(line)) !== null) {
        const name = match[1];
        const beforeChar = match.index > 0 ? line[match.index - 1] : ' ';
        
        // Skip if it's a method call (preceded by .)
        if (beforeChar !== '.' && !this.isCommonMethod(name)) {
          functionsInLine.push({
            name,
            line: lineIndex + 1,
            column: match.index,
          });
        }
      }
      
      identifiers.push(...functionsInLine);
    });

    return identifiers;
  }

  private getImportedNames(imports: ImportStatement[]): Set<string> {
    const names = new Set<string>();
    imports.forEach(imp => {
      imp.imports.forEach(name => names.add(name));
    });
    return names;
  }

  private isBuiltIn(name: string): boolean {
    const builtIns = [
      'Array', 'Object', 'String', 'Number', 'Boolean', 'Symbol', 'Date',
      'Error', 'RegExp', 'Map', 'Set', 'Promise', 'JSON', 'Math',
      'Function', 'Infinity', 'NaN', 'undefined', 'null',
    ];
    return builtIns.includes(name);
  }

  private isKeyword(name: string): boolean {
    const keywords = [
      // React
      'React', 'Component', 'Fragment', 'Interface', 'Type', 'Props', 'State', 'Ref',
      // Angular
      'Injectable', 'NgModule', 'Input', 'Output', 'EventEmitter',
      'OnInit', 'OnDestroy', 'OnChanges', 'AfterViewInit',
      'ViewChild', 'ViewChildren', 'ContentChild', 'ContentChildren',
      'Pipe', 'Directive', 'HostListener', 'HostBinding',
      'Inject', 'Optional', 'Self', 'SkipSelf',
      'ChangeDetectorRef', 'ElementRef', 'TemplateRef', 'Renderer2',
      'FormBuilder', 'FormGroup', 'FormControl', 'Validators',
      'ActivatedRoute', 'Router', 'HttpClient',
      'Observable', 'Subject', 'BehaviorSubject', 'Subscription',
      // Vue
      'defineProps', 'defineEmits', 'defineExpose', 'defineSlots', 'withDefaults',
      // Svelte
      'SvelteComponent', 'SvelteComponentDev',
      // Next.js / Nuxt
      'GetServerSideProps', 'GetStaticProps', 'GetStaticPaths',
      'NextPage', 'NextApiRequest', 'NextApiResponse',
    ];
    return keywords.includes(name);
  }

  private isCommonMethod(name: string): boolean {
    const commonMethods = [
      'console', 'log', 'error', 'warn', 'info', 'debug',
      'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
      'require', 'include', 'return', 'if', 'else', 'for', 'while',
    ];
    return commonMethods.includes(name);
  }
}
