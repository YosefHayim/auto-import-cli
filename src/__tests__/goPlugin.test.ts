import { GoPlugin } from '@/plugins/goPlugin';

describe('GoPlugin', () => {
  const plugin = new GoPlugin();

  describe('parseImports', () => {
    it('should parse single-line import', () => {
      const content = `package main\n\nimport "fmt"\n\nfunc main() {}`;
      const imports = plugin.parseImports(content, 'main.go');
      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('fmt');
      expect(imports[0].imports).toEqual(['fmt']);
      expect(imports[0].isDefault).toBe(true);
    });

    it('should parse grouped import block', () => {
      const content = `package main\n\nimport (\n\t"fmt"\n\t"os"\n)\n\nfunc main() {}`;
      const imports = plugin.parseImports(content, 'main.go');
      expect(imports).toHaveLength(2);
      expect(imports[0].source).toBe('fmt');
      expect(imports[1].source).toBe('os');
    });

    it('should parse nested package paths', () => {
      const content = `package main\n\nimport (\n\t"encoding/json"\n\t"net/http"\n)`;
      const imports = plugin.parseImports(content, 'main.go');
      expect(imports).toHaveLength(2);
      expect(imports[0].source).toBe('encoding/json');
      expect(imports[0].imports).toEqual(['json']);
      expect(imports[1].source).toBe('net/http');
      expect(imports[1].imports).toEqual(['http']);
    });

    it('should parse aliased imports', () => {
      const content = `package main\n\nimport (\n\tmux "github.com/gorilla/mux"\n\t"fmt"\n)`;
      const imports = plugin.parseImports(content, 'main.go');
      expect(imports).toHaveLength(2);
      expect(imports[0].imports).toEqual(['mux']);
      expect(imports[0].source).toBe('github.com/gorilla/mux');
    });

    it('should parse single-line aliased import', () => {
      const content = `package main\n\nimport pb "google.golang.org/protobuf"`;
      const imports = plugin.parseImports(content, 'main.go');
      expect(imports).toHaveLength(1);
      expect(imports[0].imports).toEqual(['pb']);
      expect(imports[0].source).toBe('google.golang.org/protobuf');
    });

    it('should handle empty import block', () => {
      const content = `package main\n\nimport ()\n\nfunc main() {}`;
      const imports = plugin.parseImports(content, 'main.go');
      expect(imports).toHaveLength(0);
    });

    it('should not parse commented-out imports', () => {
      const content = `package main\n\n// import "os"\nimport "fmt"`;
      const imports = plugin.parseImports(content, 'main.go');
      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('fmt');
    });

    it('should handle multiple import blocks', () => {
      const content = `package main\n\nimport "fmt"\nimport "os"`;
      const imports = plugin.parseImports(content, 'main.go');
      expect(imports).toHaveLength(2);
    });
  });

  describe('findUsedIdentifiers', () => {
    it('should detect package-qualified calls', () => {
      const content = `package main\n\nfunc main() {\n\tcustom.DoSomething()\n}`;
      const ids = plugin.findUsedIdentifiers(content, 'main.go');
      expect(ids.some(id => id.name === 'custom')).toBe(true);
    });

    it('should detect PascalCase identifiers', () => {
      const content = `package main\n\nfunc main() {\n\tuser := NewUser("test")\n}`;
      const ids = plugin.findUsedIdentifiers(content, 'main.go');
      expect(ids.some(id => id.name === 'NewUser')).toBe(true);
    });

    it('should not detect standard library packages', () => {
      const content = `package main\n\nfunc main() {\n\tfmt.Println("hello")\n\tos.Exit(0)\n}`;
      const ids = plugin.findUsedIdentifiers(content, 'main.go');
      expect(ids.some(id => id.name === 'fmt')).toBe(false);
      expect(ids.some(id => id.name === 'os')).toBe(false);
    });

    it('should not detect Go keywords', () => {
      const content = `package main\n\nfunc main() {\n\tfor i := range items {\n\t\tdefer cleanup()\n\t}\n}`;
      const ids = plugin.findUsedIdentifiers(content, 'main.go');
      expect(ids.some(id => id.name === 'for')).toBe(false);
      expect(ids.some(id => id.name === 'range')).toBe(false);
      expect(ids.some(id => id.name === 'defer')).toBe(false);
    });

    it('should not detect built-in functions', () => {
      const content = `package main\n\nfunc main() {\n\ts := make([]int, 10)\n\tl := len(s)\n\tprintln(l)\n}`;
      const ids = plugin.findUsedIdentifiers(content, 'main.go');
      expect(ids.some(id => id.name === 'make')).toBe(false);
      expect(ids.some(id => id.name === 'len')).toBe(false);
      expect(ids.some(id => id.name === 'println')).toBe(false);
    });

    it('should not detect built-in types', () => {
      const content = `package main\n\nvar x int\nvar y string\nvar z error`;
      const ids = plugin.findUsedIdentifiers(content, 'main.go');
      expect(ids.some(id => id.name === 'int')).toBe(false);
      expect(ids.some(id => id.name === 'string')).toBe(false);
      expect(ids.some(id => id.name === 'error')).toBe(false);
    });

    it('should skip import lines', () => {
      const content = `package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("hi")\n}`;
      const ids = plugin.findUsedIdentifiers(content, 'main.go');
      expect(ids.some(id => id.line === 3)).toBe(false);
    });

    it('should skip comment lines', () => {
      const content = `package main\n\n// CustomService does things\nfunc main() {}`;
      const ids = plugin.findUsedIdentifiers(content, 'main.go');
      expect(ids.some(id => id.name === 'CustomService')).toBe(false);
    });

    it('should not detect method calls after dot as standalone identifiers', () => {
      const content = `package main\n\nfunc main() {\n\tresult := obj.Process()\n}`;
      const ids = plugin.findUsedIdentifiers(content, 'main.go');
      expect(ids.some(id => id.name === 'Process')).toBe(false);
    });
  });

  describe('parseExports', () => {
    it('should detect exported functions', () => {
      const content = `package handlers\n\nfunc HandleRequest(w http.ResponseWriter) {}\n\nfunc ProcessData(data []byte) error { return nil }`;
      const exports = plugin.parseExports(content, '/project/handlers.go');
      expect(exports.some(e => e.name === 'HandleRequest')).toBe(true);
      expect(exports.some(e => e.name === 'ProcessData')).toBe(true);
    });

    it('should not detect unexported functions', () => {
      const content = `package handlers\n\nfunc handleRequest() {}\n\nfunc processData() {}`;
      const exports = plugin.parseExports(content, '/project/handlers.go');
      expect(exports).toHaveLength(0);
    });

    it('should detect exported methods', () => {
      const content = `package models\n\nfunc (u *User) Validate() error { return nil }\n\nfunc (u *User) String() string { return u.Name }`;
      const exports = plugin.parseExports(content, '/project/models.go');
      expect(exports.some(e => e.name === 'Validate')).toBe(true);
    });

    it('should not detect unexported methods', () => {
      const content = `package models\n\nfunc (u *User) validate() error { return nil }`;
      const exports = plugin.parseExports(content, '/project/models.go');
      expect(exports).toHaveLength(0);
    });

    it('should detect exported types', () => {
      const content = `package models\n\ntype User struct {\n\tName string\n}\n\ntype Handler interface {\n\tServe()\n}`;
      const exports = plugin.parseExports(content, '/project/models.go');
      expect(exports.some(e => e.name === 'User')).toBe(true);
      expect(exports.some(e => e.name === 'Handler')).toBe(true);
    });

    it('should not detect unexported types', () => {
      const content = `package models\n\ntype internalUser struct {\n\tname string\n}`;
      const exports = plugin.parseExports(content, '/project/models.go');
      expect(exports).toHaveLength(0);
    });

    it('should detect exported vars', () => {
      const content = `package config\n\nvar DefaultTimeout = 30\nvar MaxRetries = 3`;
      const exports = plugin.parseExports(content, '/project/config.go');
      expect(exports.some(e => e.name === 'DefaultTimeout')).toBe(true);
      expect(exports.some(e => e.name === 'MaxRetries')).toBe(true);
    });

    it('should detect exported vars in grouped block', () => {
      const content = `package config\n\nvar (\n\tDefaultConfig = Config{}\n\tMaxConnections = 100\n)`;
      const exports = plugin.parseExports(content, '/project/config.go');
      expect(exports.some(e => e.name === 'DefaultConfig')).toBe(true);
      expect(exports.some(e => e.name === 'MaxConnections')).toBe(true);
    });

    it('should not detect unexported vars', () => {
      const content = `package config\n\nvar defaultTimeout = 30`;
      const exports = plugin.parseExports(content, '/project/config.go');
      expect(exports).toHaveLength(0);
    });

    it('should detect exported consts', () => {
      const content = `package config\n\nconst MaxRetries = 3`;
      const exports = plugin.parseExports(content, '/project/config.go');
      expect(exports.some(e => e.name === 'MaxRetries')).toBe(true);
    });

    it('should detect exported consts in grouped block', () => {
      const content = `package config\n\nconst (\n\tStatusActive = "active"\n\tStatusInactive = "inactive"\n)`;
      const exports = plugin.parseExports(content, '/project/config.go');
      expect(exports.some(e => e.name === 'StatusActive')).toBe(true);
      expect(exports.some(e => e.name === 'StatusInactive')).toBe(true);
    });

    it('should not detect unexported consts', () => {
      const content = `package config\n\nconst maxRetries = 3`;
      const exports = plugin.parseExports(content, '/project/config.go');
      expect(exports).toHaveLength(0);
    });

    it('should ignore commented-out exports', () => {
      const content = `package models\n\n// func OldHandler() {}\nfunc NewHandler() {}`;
      const exports = plugin.parseExports(content, '/project/models.go');
      expect(exports.some(e => e.name === 'OldHandler')).toBe(false);
      expect(exports.some(e => e.name === 'NewHandler')).toBe(true);
    });
  });

  describe('isBuiltInOrKeyword', () => {
    it('should return true for Go keywords', () => {
      expect(plugin.isBuiltInOrKeyword('func')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('var')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('const')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('type')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('struct')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('interface')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('map')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('chan')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('go')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('defer')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('select')).toBe(true);
    });

    it('should return true for Go built-in functions', () => {
      expect(plugin.isBuiltInOrKeyword('make')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('len')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('cap')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('append')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('copy')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('delete')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('panic')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('recover')).toBe(true);
    });

    it('should return true for Go built-in types', () => {
      expect(plugin.isBuiltInOrKeyword('int')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('string')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('bool')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('error')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('byte')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('rune')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('any')).toBe(true);
    });

    it('should return true for standard library packages', () => {
      expect(plugin.isBuiltInOrKeyword('fmt')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('os')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('io')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('strings')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('strconv')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('errors')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('context')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('sync')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('http')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('json')).toBe(true);
    });

    it('should return false for custom identifiers', () => {
      expect(plugin.isBuiltInOrKeyword('myFunc')).toBe(false);
      expect(plugin.isBuiltInOrKeyword('MyType')).toBe(false);
      expect(plugin.isBuiltInOrKeyword('customPkg')).toBe(false);
      expect(plugin.isBuiltInOrKeyword('handler')).toBe(false);
    });
  });

  describe('generateImportStatement', () => {
    it('should generate import for module path', () => {
      const stmt = plugin.generateImportStatement('Handler', 'github.com/myorg/myapp/handlers', false);
      expect(stmt).toBe('import "github.com/myorg/myapp/handlers"');
    });

    it('should generate import for file path with src', () => {
      const stmt = plugin.generateImportStatement('User', '/project/src/models/user.go', false);
      expect(stmt).toBe('import "models/user"');
    });

    it('should generate import for file path without src', () => {
      const stmt = plugin.generateImportStatement('Config', '/project/pkg/config.go', false);
      expect(stmt).toBe('import "pkg/config"');
    });
  });

  describe('getImportInsertPosition', () => {
    it('should insert after last import line', () => {
      const content = `package main\n\nimport "fmt"\nimport "os"\n\nfunc main() {}`;
      const pos = plugin.getImportInsertPosition(content, 'main.go');
      expect(pos).toBe(4);
    });

    it('should insert after grouped import block', () => {
      const content = `package main\n\nimport (\n\t"fmt"\n\t"os"\n)\n\nfunc main() {}`;
      const pos = plugin.getImportInsertPosition(content, 'main.go');
      expect(pos).toBe(6);
    });

    it('should insert after package declaration when no imports', () => {
      const content = `package main\n\nfunc main() {}`;
      const pos = plugin.getImportInsertPosition(content, 'main.go');
      expect(pos).toBe(1);
    });

    it('should handle file with comments before package', () => {
      const content = `// Package main is the entry point\npackage main\n\nimport "fmt"\n\nfunc main() {}`;
      const pos = plugin.getImportInsertPosition(content, 'main.go');
      expect(pos).toBe(4);
    });

    it('should handle empty file', () => {
      const pos = plugin.getImportInsertPosition('', 'main.go');
      expect(pos).toBe(0);
    });
  });

  describe('insertImports', () => {
    it('should insert imports after existing imports', () => {
      const content = `package main\n\nimport "fmt"\n\nfunc main() {}`;
      const result = plugin.insertImports(content, ['import "os"'], 'main.go');
      const lines = result.split('\n');
      expect(lines[2]).toBe('import "fmt"');
      expect(lines[3]).toBe('import "os"');
    });

    it('should insert imports after package declaration with blank line', () => {
      const content = `package main\n\nfunc main() {}`;
      const result = plugin.insertImports(content, ['import "fmt"'], 'main.go');
      const lines = result.split('\n');
      expect(lines[0]).toBe('package main');
      expect(lines[1]).toBe('');
      expect(lines[2]).toBe('import "fmt"');
    });

    it('should insert after grouped import block', () => {
      const content = `package main\n\nimport (\n\t"fmt"\n)\n\nfunc main() {}`;
      const result = plugin.insertImports(content, ['import "os"'], 'main.go');
      expect(result).toContain('import "os"');
      const lines = result.split('\n');
      const closingParenIdx = lines.indexOf(')');
      expect(lines[closingParenIdx + 1]).toBe('import "os"');
    });

    it('should handle multiple imports to insert', () => {
      const content = `package main\n\nimport "fmt"\n\nfunc main() {}`;
      const result = plugin.insertImports(content, ['import "os"', 'import "io"'], 'main.go');
      expect(result).toContain('import "os"');
      expect(result).toContain('import "io"');
    });
  });

  describe('plugin metadata', () => {
    it('should have correct name', () => {
      expect(plugin.name).toBe('go');
    });

    it('should support .go extension', () => {
      expect(plugin.extensions).toEqual(['.go']);
    });
  });

  describe('filePathToPackage (private)', () => {
    const filePathToPackage = (plugin as any).filePathToPackage.bind(plugin);

    it('should return module paths as-is', () => {
      expect(filePathToPackage('github.com/myorg/myapp/handlers')).toBe('github.com/myorg/myapp/handlers');
    });

    it('should convert src-relative paths', () => {
      expect(filePathToPackage('/project/src/models/user.go')).toBe('models/user');
    });

    it('should strip .go extension', () => {
      const result = filePathToPackage('/project/src/handlers.go');
      expect(result).not.toContain('.go');
    });

    it('should fall back to last two segments', () => {
      expect(filePathToPackage('/project/pkg/config.go')).toBe('pkg/config');
    });
  });
});
