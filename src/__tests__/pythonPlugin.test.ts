import { PythonPlugin } from '@/plugins/pythonPlugin';

describe('PythonPlugin', () => {
  const plugin = new PythonPlugin();

  describe('parseImports', () => {
    it('should parse from...import statements', () => {
      const content = `from os.path import join`;
      const imports = plugin.parseImports(content, 'test.py');
      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('os.path');
      expect(imports[0].imports).toEqual(['join']);
      expect(imports[0].isDefault).toBe(false);
    });

    it('should parse multi-name from...import statements', () => {
      const content = `from collections import OrderedDict, defaultdict, namedtuple`;
      const imports = plugin.parseImports(content, 'test.py');
      expect(imports).toHaveLength(1);
      expect(imports[0].imports).toEqual(['OrderedDict', 'defaultdict', 'namedtuple']);
    });

    it('should parse import module statements', () => {
      const content = `import json`;
      const imports = plugin.parseImports(content, 'test.py');
      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('json');
      expect(imports[0].imports).toEqual(['json']);
      expect(imports[0].isDefault).toBe(true);
    });

    it('should parse import module as alias', () => {
      const content = `import numpy as np`;
      const imports = plugin.parseImports(content, 'test.py');
      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('numpy');
      expect(imports[0].imports).toEqual(['np']);
    });

    it('should parse dotted module imports', () => {
      const content = `import os.path`;
      const imports = plugin.parseImports(content, 'test.py');
      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('os.path');
      expect(imports[0].imports).toEqual(['path']);
    });

    it('should parse multiple import statements', () => {
      const content = `from os import getcwd
import sys
from typing import List, Dict`;
      const imports = plugin.parseImports(content, 'test.py');
      expect(imports).toHaveLength(3);
    });

    it('should not parse commented-out imports', () => {
      const content = `# import os
# from sys import argv
from json import dumps`;
      const imports = plugin.parseImports(content, 'test.py');
      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('json');
    });
  });

  describe('findUsedIdentifiers', () => {
    it('should detect PascalCase class instantiation', () => {
      const content = `result = MyClass(arg1, arg2)`;
      const ids = plugin.findUsedIdentifiers(content, 'test.py');
      expect(ids.some((id) => id.name === 'MyClass')).toBe(true);
    });

    it('should detect snake_case function calls', () => {
      const content = `value = calculate_total(items, tax)`;
      const ids = plugin.findUsedIdentifiers(content, 'test.py');
      expect(ids.some((id) => id.name === 'calculate_total')).toBe(true);
    });

    it('should detect type annotations', () => {
      const content = `user: UserModel = get_user()`;
      const ids = plugin.findUsedIdentifiers(content, 'test.py');
      expect(ids.some((id) => id.name === 'UserModel')).toBe(true);
    });

    it('should not detect Python builtins', () => {
      const content = `x = int(val)
y = str(num)
z = list(items)
e = ValueError("bad")`;
      const ids = plugin.findUsedIdentifiers(content, 'test.py');
      expect(ids.some((id) => id.name === 'int')).toBe(false);
      expect(ids.some((id) => id.name === 'str')).toBe(false);
      expect(ids.some((id) => id.name === 'list')).toBe(false);
      expect(ids.some((id) => id.name === 'ValueError')).toBe(false);
    });

    it('should not detect Python keyword functions', () => {
      const content = `print("hello")
n = len(items)
r = range(10)
s = sorted(data)`;
      const ids = plugin.findUsedIdentifiers(content, 'test.py');
      expect(ids.some((id) => id.name === 'print')).toBe(false);
      expect(ids.some((id) => id.name === 'len')).toBe(false);
      expect(ids.some((id) => id.name === 'range')).toBe(false);
      expect(ids.some((id) => id.name === 'sorted')).toBe(false);
    });

    it('should not detect method calls on objects', () => {
      const content = `result = obj.some_method(arg)
data = response.json()`;
      const ids = plugin.findUsedIdentifiers(content, 'test.py');
      expect(ids.some((id) => id.name === 'some_method')).toBe(false);
      expect(ids.some((id) => id.name === 'json')).toBe(false);
    });

    it('should not detect identifiers on comment or import lines', () => {
      const content = `# MyClass is used here
import json
from os import path
actual_call(arg)`;
      const ids = plugin.findUsedIdentifiers(content, 'test.py');
      expect(ids.some((id) => id.name === 'MyClass')).toBe(false);
      expect(ids.some((id) => id.name === 'actual_call')).toBe(true);
    });

    it('should not detect Python language keywords as identifiers', () => {
      const content = `if condition:
    for item in items:
        while running:
            pass`;
      const ids = plugin.findUsedIdentifiers(content, 'test.py');
      expect(ids).toHaveLength(0);
    });
  });

  describe('parseExports', () => {
    it('should detect top-level function definitions', () => {
      const content =
        'def calculate_total(items, tax):\n    return sum(items) * tax\n\ndef format_currency(amount):\n    return amount';
      const exports = plugin.parseExports(content, '/project/utils.py');
      expect(exports.some((e) => e.name === 'calculate_total')).toBe(true);
      expect(exports.some((e) => e.name === 'format_currency')).toBe(true);
    });

    it('should detect top-level class definitions', () => {
      const content = `class UserModel:
    def __init__(self):
        pass

class ProductService(BaseService):
    pass`;
      const exports = plugin.parseExports(content, '/project/models.py');
      expect(exports.some((e) => e.name === 'UserModel')).toBe(true);
      expect(exports.some((e) => e.name === 'ProductService')).toBe(true);
    });

    it('should detect CONSTANT_ASSIGNMENTS', () => {
      const content = `MAX_RETRIES = 3
DEFAULT_TIMEOUT = 30
API_BASE_URL = "https://api.example.com"`;
      const exports = plugin.parseExports(content, '/project/config.py');
      expect(exports.some((e) => e.name === 'MAX_RETRIES')).toBe(true);
      expect(exports.some((e) => e.name === 'DEFAULT_TIMEOUT')).toBe(true);
      expect(exports.some((e) => e.name === 'API_BASE_URL')).toBe(true);
    });

    it('should not detect private functions (underscore prefix)', () => {
      const content = `def public_func():
    pass

def _private_helper():
    pass

def __double_private():
    pass`;
      const exports = plugin.parseExports(content, '/project/utils.py');
      expect(exports.some((e) => e.name === 'public_func')).toBe(true);
      expect(exports.some((e) => e.name === '_private_helper')).toBe(false);
      expect(exports.some((e) => e.name === '__double_private')).toBe(false);
    });

    it('should not detect private classes', () => {
      const content = `class PublicClass:
    pass

class _InternalClass:
    pass`;
      const exports = plugin.parseExports(content, '/project/models.py');
      expect(exports.some((e) => e.name === 'PublicClass')).toBe(true);
      expect(exports.some((e) => e.name === '_InternalClass')).toBe(false);
    });

    it('should not detect indented defs (class methods)', () => {
      const content = `class MyClass:
    def method_one(self):
        pass
    def method_two(self):
        pass

def top_level_func():
    pass`;
      const exports = plugin.parseExports(content, '/project/service.py');
      expect(exports.some((e) => e.name === 'method_one')).toBe(false);
      expect(exports.some((e) => e.name === 'method_two')).toBe(false);
      expect(exports.some((e) => e.name === 'top_level_func')).toBe(true);
      expect(exports.some((e) => e.name === 'MyClass')).toBe(true);
    });

    it('should filter exports by __all__ when present (list with single quotes)', () => {
      const content = `__all__ = ['PublicClass', 'public_func']

class PublicClass:
    pass

class InternalHelper:
    pass

def public_func():
    pass

def another_func():
    pass

MAX_RETRIES = 3`;
      const exports = plugin.parseExports(content, '/project/module.py');
      expect(exports).toHaveLength(2);
      expect(exports.some(e => e.name === 'PublicClass')).toBe(true);
      expect(exports.some(e => e.name === 'public_func')).toBe(true);
      expect(exports.some(e => e.name === 'InternalHelper')).toBe(false);
      expect(exports.some(e => e.name === 'another_func')).toBe(false);
      expect(exports.some(e => e.name === 'MAX_RETRIES')).toBe(false);
    });

    it('should filter exports by __all__ with double quotes', () => {
      const content = `__all__ = ["MyClass", "helper"]

class MyClass:
    pass

def helper():
    pass

def secret():
    pass`;
      const exports = plugin.parseExports(content, '/project/module.py');
      expect(exports).toHaveLength(2);
      expect(exports.some(e => e.name === 'MyClass')).toBe(true);
      expect(exports.some(e => e.name === 'helper')).toBe(true);
      expect(exports.some(e => e.name === 'secret')).toBe(false);
    });

    it('should filter exports by __all__ in tuple form', () => {
      const content = `__all__ = ('ClassA', 'func_b')

class ClassA:
    pass

class ClassB:
    pass

def func_b():
    pass`;
      const exports = plugin.parseExports(content, '/project/module.py');
      expect(exports).toHaveLength(2);
      expect(exports.some(e => e.name === 'ClassA')).toBe(true);
      expect(exports.some(e => e.name === 'func_b')).toBe(true);
      expect(exports.some(e => e.name === 'ClassB')).toBe(false);
    });

    it('should filter exports by multi-line __all__', () => {
      const content = `__all__ = [
    'ModelA',
    'ModelB',
    "CONSTANT_X",
]

class ModelA:
    pass

class ModelB:
    pass

class ModelC:
    pass

CONSTANT_X = 42
CONSTANT_Y = 99`;
      const exports = plugin.parseExports(content, '/project/module.py');
      expect(exports).toHaveLength(3);
      expect(exports.some(e => e.name === 'ModelA')).toBe(true);
      expect(exports.some(e => e.name === 'ModelB')).toBe(true);
      expect(exports.some(e => e.name === 'CONSTANT_X')).toBe(true);
      expect(exports.some(e => e.name === 'ModelC')).toBe(false);
      expect(exports.some(e => e.name === 'CONSTANT_Y')).toBe(false);
    });

    it('should include constants in __all__ filtering', () => {
      const content = `__all__ = ['API_URL']

API_URL = "https://api.example.com"
MAX_RETRIES = 3

def helper():
    pass`;
      const exports = plugin.parseExports(content, '/project/config.py');
      expect(exports).toHaveLength(1);
      expect(exports[0].name).toBe('API_URL');
    });

    it('should export all public symbols when __all__ is absent', () => {
      const content = `class MyClass:
    pass

def my_func():
    pass

MAX_SIZE = 100`;
      const exports = plugin.parseExports(content, '/project/module.py');
      expect(exports).toHaveLength(3);
      expect(exports.some(e => e.name === 'MyClass')).toBe(true);
      expect(exports.some(e => e.name === 'my_func')).toBe(true);
      expect(exports.some(e => e.name === 'MAX_SIZE')).toBe(true);
    });

    it('should return empty when __all__ is empty list', () => {
      const content = `__all__ = []

class MyClass:
    pass

def my_func():
    pass`;
      const exports = plugin.parseExports(content, '/project/module.py');
      expect(exports).toHaveLength(0);
    });
  });

  describe('isBuiltInOrKeyword', () => {
    it('should return true for Python builtins', () => {
      expect(plugin.isBuiltInOrKeyword('int')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('str')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('list')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('dict')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('Exception')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('ValueError')).toBe(true);
    });

    it('should return true for Python keyword functions', () => {
      expect(plugin.isBuiltInOrKeyword('print')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('len')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('range')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('enumerate')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('isinstance')).toBe(true);
    });

    it('should return false for custom identifiers', () => {
      expect(plugin.isBuiltInOrKeyword('my_function')).toBe(false);
      expect(plugin.isBuiltInOrKeyword('MyClass')).toBe(false);
      expect(plugin.isBuiltInOrKeyword('calculate_total')).toBe(false);
    });
  });

  describe('generateImportStatement', () => {
    it('should generate from...import statement', () => {
      const stmt = plugin.generateImportStatement('calculate_total', '/project/src/utils/helpers.py', false);
      expect(stmt).toBe('from utils.helpers import calculate_total');
    });
  });

  describe('getImportInsertPosition', () => {
    it('should insert after last import line', () => {
      const content = `import os
from sys import argv

def main():
    pass`;
      const pos = plugin.getImportInsertPosition(content, 'test.py');
      expect(pos).toBe(2);
    });

    it('should skip over docstrings at file start', () => {
      const content = `"""Module docstring."""

def main():
    pass`;
      const pos = plugin.getImportInsertPosition(content, 'test.py');
      expect(pos).toBe(2);
    });

    it('should skip multi-line docstrings', () => {
      const content = `"""
Multi-line
docstring.
"""

import os

def main():
    pass`;
      const pos = plugin.getImportInsertPosition(content, 'test.py');
      expect(pos).toBe(6);
    });

    it('should return insert position for empty file', () => {
      const pos = plugin.getImportInsertPosition('', 'test.py');
      expect(pos).toBe(1);
    });

    it('should handle file with only comments', () => {
      const content = `#!/usr/bin/env python
# -*- coding: utf-8 -*-

def main():
    pass`;
      const pos = plugin.getImportInsertPosition(content, 'test.py');
      expect(pos).toBe(3);
    });
  });

  describe('insertImports', () => {
    it('should insert imports at correct position', () => {
      const content = `import os

def main():
    pass`;
      const result = plugin.insertImports(content, ['from utils import helper'], 'test.py');
      const lines = result.split('\n');
      expect(lines[0]).toBe('import os');
      expect(lines[1]).toBe('from utils import helper');
      expect(lines[2]).toBe('');
    });

    it('should handle empty file', () => {
      const result = plugin.insertImports('', ['from utils import helper'], 'test.py');
      expect(result).toContain('from utils import helper');
    });
  });

  describe('filePathToModule (private)', () => {
    const filePathToModule = (plugin as any).filePathToModule.bind(plugin);

    it('should convert src-relative paths to dot notation', () => {
      expect(filePathToModule('/project/src/utils/helpers.py')).toBe('utils.helpers');
    });

    it('should convert lib-relative paths to dot notation', () => {
      expect(filePathToModule('/project/lib/core/engine.py')).toBe('core.engine');
    });

    it('should handle paths without src or lib', () => {
      expect(filePathToModule('/project/myapp/utils.py')).toBe('myapp.utils');
    });

    it('should strip .py extension', () => {
      const result = filePathToModule('/project/src/module.py');
      expect(result).not.toContain('.py');
    });

    it('FIX 9: should remove __init__ from module path under src/', () => {
      expect(filePathToModule('/project/src/pkg/__init__.py')).toBe('pkg');
    });

    it('FIX 9: should handle nested __init__.py under src/', () => {
      expect(filePathToModule('/project/src/pkg/sub/__init__.py')).toBe('pkg.sub');
    });
  });

  describe('FIX 6: multi-line parenthesized imports', () => {
    it('should parse parenthesized from...import statements', () => {
      const content = `from collections import (
    OrderedDict,
    defaultdict
)`;
      const imports = plugin.parseImports(content, 'test.py');
      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('collections');
      expect(imports[0].imports).toContain('OrderedDict');
      expect(imports[0].imports).toContain('defaultdict');
    });

    it('should parse parenthesized imports with trailing comma', () => {
      const content = `from typing import (
    List,
    Dict,
    Optional,
)`;
      const imports = plugin.parseImports(content, 'test.py');
      expect(imports).toHaveLength(1);
      expect(imports[0].imports).toContain('List');
      expect(imports[0].imports).toContain('Dict');
      expect(imports[0].imports).toContain('Optional');
    });
  });

  describe('FIX 7: identifiers inside docstrings should be ignored', () => {
    it('should not detect identifiers inside triple-double-quoted strings', () => {
      const content = `"""
MyClass is documented here.
SomeFunction(arg) is called.
"""
actual_call(arg)`;
      const ids = plugin.findUsedIdentifiers(content, 'test.py');
      expect(ids.some((id) => id.name === 'MyClass')).toBe(false);
      expect(ids.some((id) => id.name === 'SomeFunction')).toBe(false);
      expect(ids.some((id) => id.name === 'actual_call')).toBe(true);
    });

    it('should not detect identifiers inside triple-single-quoted strings', () => {
      const content = `'''
MyClass is documented here.
'''
real_func(x)`;
      const ids = plugin.findUsedIdentifiers(content, 'test.py');
      expect(ids.some((id) => id.name === 'MyClass')).toBe(false);
      expect(ids.some((id) => id.name === 'real_func')).toBe(true);
    });
  });

  describe('FIX 8: class/def declaration lines should not be treated as usages', () => {
    it('should not detect class declaration as usage', () => {
      const content = `class MyService(BaseService):
    pass`;
      const ids = plugin.findUsedIdentifiers(content, 'test.py');
      expect(ids.some((id) => id.name === 'MyService')).toBe(false);
    });

    it('should not detect def declaration as usage', () => {
      const content = `def process_data(items):
    return items`;
      const ids = plugin.findUsedIdentifiers(content, 'test.py');
      expect(ids.some((id) => id.name === 'process_data')).toBe(false);
    });
  });
});
