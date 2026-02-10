import { ElixirPlugin } from '@/plugins/elixirPlugin';

describe('ElixirPlugin', () => {
  const plugin = new ElixirPlugin();

  describe('parseImports', () => {
    it('should parse alias statements', () => {
      const content = `alias MyApp.Accounts.User`;
      const imports = plugin.parseImports(content, 'test.ex');
      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('MyApp.Accounts.User');
      expect(imports[0].imports).toEqual(['User']);
      expect(imports[0].isDefault).toBe(true);
    });

    it('should parse alias with as: option', () => {
      const content = `alias MyApp.Cache.Store, as: CacheStore`;
      const imports = plugin.parseImports(content, 'test.ex');
      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('MyApp.Cache.Store');
      expect(imports[0].imports).toEqual(['CacheStore']);
    });

    it('should parse import statements', () => {
      const content = `import Ecto.Query`;
      const imports = plugin.parseImports(content, 'test.ex');
      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('Ecto.Query');
      expect(imports[0].imports).toEqual(['Query']);
      expect(imports[0].isDefault).toBe(true);
    });

    it('should parse import with except: as namespace and not list excluded names (#43)', () => {
      const content = `import Foo.Bar, except: [baz: 1, qux: 2]`;
      const imports = plugin.parseImports(content, 'test.ex');
      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('Foo.Bar');
      expect(imports[0].imports).toEqual(['Bar']);
      expect(imports[0].isDefault).toBe(false);
      expect(imports[0].isNamespace).toBe(true);
      expect(imports[0].imports).not.toContain('baz');
      expect(imports[0].imports).not.toContain('qux');
    });

    it('should parse import with only: option', () => {
      const content = `import Ecto.Query, only: [from: 2, where: 3]`;
      const imports = plugin.parseImports(content, 'test.ex');
      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('Ecto.Query');
      expect(imports[0].imports).toEqual(['from', 'where']);
      expect(imports[0].isDefault).toBe(false);
    });

    it('should parse use statements as namespace imports (#44)', () => {
      const content = `use GenServer`;
      const imports = plugin.parseImports(content, 'test.ex');
      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('GenServer');
      expect(imports[0].imports).toEqual(['GenServer']);
      expect(imports[0].isDefault).toBe(false);
      expect(imports[0].isNamespace).toBe(true);
    });

    it('should parse use with options as namespace import (#44)', () => {
      const content = `use Ecto.Schema`;
      const imports = plugin.parseImports(content, 'test.ex');
      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('Ecto.Schema');
      expect(imports[0].imports).toEqual(['Schema']);
      expect(imports[0].isDefault).toBe(false);
      expect(imports[0].isNamespace).toBe(true);
    });

    it('should parse require statements as namespace imports (#44)', () => {
      const content = `require Logger`;
      const imports = plugin.parseImports(content, 'test.ex');
      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('Logger');
      expect(imports[0].imports).toEqual(['Logger']);
      expect(imports[0].isDefault).toBe(false);
      expect(imports[0].isNamespace).toBe(true);
    });

    it('should parse multiple import types together', () => {
      const content = `use GenServer
require Logger
alias MyApp.Accounts.User
import Ecto.Changeset`;
      const imports = plugin.parseImports(content, 'test.ex');
      expect(imports).toHaveLength(4);
    });

    it('should not parse commented-out imports', () => {
      const content = `# alias MyApp.OldModule
alias MyApp.NewModule`;
      const imports = plugin.parseImports(content, 'test.ex');
      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('MyApp.NewModule');
    });

    it('should parse indented imports inside defmodule', () => {
      const content = `defmodule MyApp.Server do
  use GenServer
  alias MyApp.User
end`;
      const imports = plugin.parseImports(content, 'test.ex');
      expect(imports).toHaveLength(2);
      expect(imports.some(i => i.source === 'GenServer')).toBe(true);
      expect(imports.some(i => i.source === 'MyApp.User')).toBe(true);
    });
  });

  describe('findUsedIdentifiers', () => {
    it('should detect PascalCase module references', () => {
      const content = `result = UserService.get_user(id)`;
      const ids = plugin.findUsedIdentifiers(content, 'test.ex');
      expect(ids.some(id => id.name === 'UserService')).toBe(true);
    });

    it('should detect nested module references as top-level module', () => {
      const content = `data = Accounts.User.changeset(user, attrs)`;
      const ids = plugin.findUsedIdentifiers(content, 'test.ex');
      expect(ids.some(id => id.name === 'Accounts')).toBe(true);
    });

    it('should not detect Elixir builtins', () => {
      const content = `items = Enum.map(list, &to_string/1)
result = String.trim(value)
IO.puts("hello")
Map.get(data, :key)`;
      const ids = plugin.findUsedIdentifiers(content, 'test.ex');
      expect(ids.some(id => id.name === 'Enum')).toBe(false);
      expect(ids.some(id => id.name === 'String')).toBe(false);
      expect(ids.some(id => id.name === 'IO')).toBe(false);
      expect(ids.some(id => id.name === 'Map')).toBe(false);
    });

    it('should not detect Elixir keywords', () => {
      const content = `if condition do
  case value do
    :ok -> :ok
  end
end`;
      const ids = plugin.findUsedIdentifiers(content, 'test.ex');
      expect(ids).toHaveLength(0);
    });

    it('should not detect identifiers on alias/import/use/require lines', () => {
      const content = `alias MyApp.Accounts.User
import Ecto.Query
use GenServer
require Logger
UserService.call()`;
      const ids = plugin.findUsedIdentifiers(content, 'test.ex');
      expect(ids.some(id => id.name === 'UserService')).toBe(true);
      expect(ids.filter(id => id.name === 'MyApp' || id.name === 'Ecto' || id.name === 'GenServer' || id.name === 'Logger')).toHaveLength(0);
    });

    it('should not detect identifiers on comment lines', () => {
      const content = `# UserService is used here
actual = RealModule.call()`;
      const ids = plugin.findUsedIdentifiers(content, 'test.ex');
      expect(ids.some(id => id.name === 'UserService')).toBe(false);
      expect(ids.some(id => id.name === 'RealModule')).toBe(true);
    });

    it('should detect function calls that could be imported', () => {
      const content = `result = custom_function(arg1, arg2)`;
      const ids = plugin.findUsedIdentifiers(content, 'test.ex');
      expect(ids.some(id => id.name === 'custom_function')).toBe(true);
    });

    it('should not detect Kernel built-in function calls', () => {
      const content = `len = length(list)
h = hd(list)
t = tl(list)
e = elem(tuple, 0)`;
      const ids = plugin.findUsedIdentifiers(content, 'test.ex');
      expect(ids.some(id => id.name === 'length')).toBe(false);
      expect(ids.some(id => id.name === 'hd')).toBe(false);
      expect(ids.some(id => id.name === 'tl')).toBe(false);
      expect(ids.some(id => id.name === 'elem')).toBe(false);
    });

    it('should not detect identifiers on defmodule lines', () => {
      const content = `defmodule MyApp.Accounts.User do
  CustomModule.call()
end`;
      const ids = plugin.findUsedIdentifiers(content, 'test.ex');
      expect(ids.some(id => id.name === 'MyApp')).toBe(false);
      expect(ids.some(id => id.name === 'CustomModule')).toBe(true);
    });
  });

  describe('parseExports', () => {
    it('should detect defmodule declarations', () => {
      const content = `defmodule MyApp.Accounts.User do
end`;
      const exports = plugin.parseExports(content, '/project/lib/my_app/accounts/user.ex');
      expect(exports.some(e => e.name === 'User')).toBe(true);
      expect(exports.some(e => e.name === 'MyApp.Accounts.User')).toBe(true);
    });

    it('should detect public function definitions', () => {
      const content = `def calculate_total(items) do
  Enum.sum(items)
end

def format_name(first, last) do
  "\#{first} \#{last}"
end`;
      const exports = plugin.parseExports(content, '/project/lib/helpers.ex');
      expect(exports.some(e => e.name === 'calculate_total')).toBe(true);
      expect(exports.some(e => e.name === 'format_name')).toBe(true);
    });

    it('should not detect private function definitions (defp)', () => {
      const content = `def public_func(arg) do
  internal_helper(arg)
end

defp internal_helper(arg) do
  arg
end`;
      const exports = plugin.parseExports(content, '/project/lib/service.ex');
      expect(exports.some(e => e.name === 'public_func')).toBe(true);
      expect(exports.some(e => e.name === 'internal_helper')).toBe(false);
    });

    it('should detect defmacro declarations', () => {
      const content = `defmacro debug_log(msg) do
  quote do
    IO.puts(unquote(msg))
  end
end`;
      const exports = plugin.parseExports(content, '/project/lib/macros.ex');
      expect(exports.some(e => e.name === 'debug_log')).toBe(true);
    });

    it('should not detect defmacrop (private macros)', () => {
      const content = `defmacro public_macro(arg) do
  arg
end

defmacrop private_macro(arg) do
  arg
end`;
      const exports = plugin.parseExports(content, '/project/lib/macros.ex');
      expect(exports.some(e => e.name === 'public_macro')).toBe(true);
      expect(exports.some(e => e.name === 'private_macro')).toBe(false);
    });

    it('should detect functions with bang and question mark', () => {
      const content = `def fetch!(key) do
  Map.fetch!(data, key)
end

def valid?(value) do
  is_binary(value)
end`;
      const exports = plugin.parseExports(content, '/project/lib/utils.ex');
      expect(exports.some(e => e.name === 'fetch!')).toBe(true);
      expect(exports.some(e => e.name === 'valid?')).toBe(true);
    });

    it('should detect simple module name (no dots)', () => {
      const content = `defmodule Router do
  def route(path) do
    path
  end
end`;
      const exports = plugin.parseExports(content, '/project/lib/router.ex');
      expect(exports.some(e => e.name === 'Router')).toBe(true);
      expect(exports.some(e => e.name === 'route')).toBe(true);
    });

    it('should detect defmodule with one-line do: form (#45)', () => {
      const content = `defmodule MyApp.Config, do: use(Application)`;
      const exports = plugin.parseExports(content, '/project/lib/my_app/config.ex');
      expect(exports.some(e => e.name === 'Config')).toBe(true);
      expect(exports.some(e => e.name === 'MyApp.Config')).toBe(true);
    });

    it('should detect zero-arity public functions (#46)', () => {
      const content = `def start do
  :ok
end

def stop do
  :ok
end`;
      const exports = plugin.parseExports(content, '/project/lib/server.ex');
      expect(exports.some(e => e.name === 'start')).toBe(true);
      expect(exports.some(e => e.name === 'stop')).toBe(true);
    });
  });

  describe('isBuiltInOrKeyword', () => {
    it('should return true for Elixir core modules', () => {
      expect(plugin.isBuiltInOrKeyword('Kernel')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('Enum')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('List')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('Map')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('String')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('IO')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('GenServer')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('Supervisor')).toBe(true);
    });

    it('should return true for Elixir keywords', () => {
      expect(plugin.isBuiltInOrKeyword('def')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('defmodule')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('do')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('end')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('if')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('case')).toBe(true);
    });

    it('should return true for Kernel guard functions', () => {
      expect(plugin.isBuiltInOrKeyword('is_nil')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('is_atom')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('is_binary')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('is_list')).toBe(true);
    });

    it('should return true for exception modules', () => {
      expect(plugin.isBuiltInOrKeyword('ArgumentError')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('RuntimeError')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('KeyError')).toBe(true);
    });

    it('should return false for custom identifiers', () => {
      expect(plugin.isBuiltInOrKeyword('MyModule')).toBe(false);
      expect(plugin.isBuiltInOrKeyword('UserService')).toBe(false);
      expect(plugin.isBuiltInOrKeyword('custom_function')).toBe(false);
      expect(plugin.isBuiltInOrKeyword('Accounts')).toBe(false);
    });
  });

  describe('generateImportStatement', () => {
    it('should generate alias for PascalCase module identifiers', () => {
      const stmt = plugin.generateImportStatement('User', '/project/lib/my_app/accounts/user.ex', false);
      expect(stmt).toBe('alias MyApp.Accounts.User');
    });

    it('should generate import with only: for function identifiers', () => {
      const stmt = plugin.generateImportStatement('calculate_total', '/project/lib/my_app/helpers.ex', false);
      expect(stmt).toBe('import MyApp.Helpers, only: [calculate_total: 1]');
    });
  });

  describe('getImportInsertPosition', () => {
    it('should insert after last alias/import/use/require line', () => {
      const content = `defmodule MyApp.Server do
  use GenServer
  alias MyApp.User

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts)
  end
end`;
      const pos = plugin.getImportInsertPosition(content, 'test.ex');
      expect(pos).toBe(3);
    });

    it('should insert after defmodule when no imports exist', () => {
      const content = `defmodule MyApp.Server do
  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts)
  end
end`;
      const pos = plugin.getImportInsertPosition(content, 'test.ex');
      expect(pos).toBe(1);
    });

    it('should return 0 for empty file', () => {
      const pos = plugin.getImportInsertPosition('', 'test.ex');
      expect(pos).toBe(0);
    });

    it('should handle file with only defmodule', () => {
      const content = `defmodule MyApp.Empty do
end`;
      const pos = plugin.getImportInsertPosition(content, 'test.ex');
      expect(pos).toBe(1);
    });
  });

  describe('insertImports', () => {
    it('should insert imports after existing import block', () => {
      const content = `defmodule MyApp.Server do
  use GenServer
  alias MyApp.User

  def start_link(opts) do
    :ok
  end
end`;
      const result = plugin.insertImports(content, ['  alias MyApp.Accounts.Profile'], 'test.ex');
      const lines = result.split('\n');
      expect(lines[3]).toBe('  alias MyApp.Accounts.Profile');
    });

    it('should insert imports after defmodule when no imports exist', () => {
      const content = `defmodule MyApp.Server do
  def start_link(opts) do
    :ok
  end
end`;
      const result = plugin.insertImports(content, ['  use GenServer'], 'test.ex');
      const lines = result.split('\n');
      expect(lines[1]).toBe('  use GenServer');
    });

    it('should handle empty file', () => {
      const result = plugin.insertImports('', ['alias MyApp.User'], 'test.ex');
      expect(result).toContain('alias MyApp.User');
    });
  });

  describe('filePathToModule (private)', () => {
    const filePathToModule = (plugin as any).filePathToModule.bind(plugin);

    it('should convert lib-relative paths to module names', () => {
      expect(filePathToModule('/project/lib/my_app/accounts/user.ex')).toBe('MyApp.Accounts.User');
    });

    it('should convert snake_case to PascalCase', () => {
      expect(filePathToModule('/project/lib/my_app/user_service.ex')).toBe('MyApp.UserService');
    });

    it('should handle paths without lib directory', () => {
      expect(filePathToModule('/project/myapp/utils.ex')).toBe('Myapp.Utils');
    });

    it('should strip .ex extension', () => {
      const result = filePathToModule('/project/lib/module.ex');
      expect(result).not.toContain('.ex');
    });

    it('should strip .exs extension', () => {
      const result = filePathToModule('/project/test/module_test.exs');
      expect(result).not.toContain('.exs');
    });

    it('should handle single file name', () => {
      expect(filePathToModule('helpers.ex')).toBe('Helpers');
    });
  });

  describe('snakeToPascal (private)', () => {
    const snakeToPascal = (plugin as any).snakeToPascal.bind(plugin);

    it('should convert snake_case to PascalCase', () => {
      expect(snakeToPascal('user_service')).toBe('UserService');
    });

    it('should handle single word', () => {
      expect(snakeToPascal('user')).toBe('User');
    });

    it('should handle multiple underscores', () => {
      expect(snakeToPascal('my_app_web')).toBe('MyAppWeb');
    });
  });

  describe('plugin metadata', () => {
    it('should have correct name', () => {
      expect(plugin.name).toBe('elixir');
    });

    it('should support .ex and .exs extensions', () => {
      expect(plugin.extensions).toContain('.ex');
      expect(plugin.extensions).toContain('.exs');
    });
  });
});
