import { JsTsPlugin } from '@/plugins/jsTsPlugin';

describe('JsTsPlugin', () => {
  const plugin = new JsTsPlugin();

  describe('parseImports', () => {
    it('should parse named imports', () => {
      const content = `import { useState, useEffect } from 'react';`;
      const imports = plugin.parseImports(content, 'test.ts');
      expect(imports.length).toBeGreaterThanOrEqual(1);
      const reactImport = imports.find(i => i.source === 'react');
      expect(reactImport).toBeDefined();
    });

    it('should parse default imports', () => {
      const content = `import React from 'react';`;
      const imports = plugin.parseImports(content, 'test.ts');
      expect(imports.length).toBeGreaterThanOrEqual(1);
    });

    it('should parse imports from Vue SFC script blocks', () => {
      const content = `<template><div>{{ msg }}</div></template>
<script setup>
import { ref } from 'vue';
const msg = ref('hello');
</script>`;
      const imports = plugin.parseImports(content, 'test.vue');
      expect(imports.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('findUsedIdentifiers', () => {
    it('should detect JSX component usage', () => {
      const content = `function App() {
  return <Card><Button>Click</Button></Card>;
}`;
      const ids = plugin.findUsedIdentifiers(content, 'test.tsx');
      expect(ids.some(id => id.name === 'Card')).toBe(true);
      expect(ids.some(id => id.name === 'Button')).toBe(true);
    });

    it('should detect function calls', () => {
      const content = `const result = formatName('John');
const valid = validateEmail('test@test.com');`;
      const ids = plugin.findUsedIdentifiers(content, 'test.ts');
      expect(ids.some(id => id.name === 'formatName')).toBe(true);
      expect(ids.some(id => id.name === 'validateEmail')).toBe(true);
    });

    it('should not detect JS builtins', () => {
      const content = `const arr = Array.from(items);
const obj = Object.keys(data);
const p = Promise.resolve(42);`;
      const ids = plugin.findUsedIdentifiers(content, 'test.ts');
      expect(ids.some(id => id.name === 'Array')).toBe(false);
      expect(ids.some(id => id.name === 'Object')).toBe(false);
      expect(ids.some(id => id.name === 'Promise')).toBe(false);
    });
  });

  describe('parseExports', () => {
    it('should detect export function', () => {
      const content = `export function myFunc() {}`;
      const exports = plugin.parseExports(content, 'test.ts');
      expect(exports.some(e => e.name === 'myFunc')).toBe(true);
    });

    it('should detect export async function', () => {
      const content = `export async function fetchData() {}`;
      const exports = plugin.parseExports(content, 'test.ts');
      expect(exports.some(e => e.name === 'fetchData')).toBe(true);
    });

    it('should detect export const', () => {
      const content = `export const API_URL = 'http://example.com';`;
      const exports = plugin.parseExports(content, 'test.ts');
      expect(exports.some(e => e.name === 'API_URL')).toBe(true);
    });

    it('should detect export class', () => {
      const content = `export class UserService {}`;
      const exports = plugin.parseExports(content, 'test.ts');
      expect(exports.some(e => e.name === 'UserService')).toBe(true);
    });

    it('should detect export default function with name', () => {
      const content = `export default function MyComponent() {}`;
      const exports = plugin.parseExports(content, 'test.tsx');
      expect(exports.some(e => e.name === 'MyComponent' && e.isDefault)).toBe(true);
    });

    it('should detect export default class with name', () => {
      const content = `export default class AppController {}`;
      const exports = plugin.parseExports(content, 'test.ts');
      expect(exports.some(e => e.name === 'AppController' && e.isDefault)).toBe(true);
    });

    it('should detect named exports with braces', () => {
      const content = `const foo = 1;
const bar = 2;
export { foo, bar };`;
      const exports = plugin.parseExports(content, 'test.ts');
      expect(exports.some(e => e.name === 'foo')).toBe(true);
      expect(exports.some(e => e.name === 'bar')).toBe(true);
    });

    it('should detect export interface with isType flag', () => {
      const content = `export interface UserProps { name: string; }`;
      const exports = plugin.parseExports(content, 'test.ts');
      const match = exports.find(e => e.name === 'UserProps');
      expect(match).toBeDefined();
      expect(match!.isType).toBe(true);
    });

    it('should detect export type with isType flag', () => {
      const content = `export type UserId = string;`;
      const exports = plugin.parseExports(content, 'test.ts');
      const match = exports.find(e => e.name === 'UserId');
      expect(match).toBeDefined();
      expect(match!.isType).toBe(true);
    });
  });

  describe('generateImportStatement', () => {
    it('should generate named import', () => {
      const stmt = plugin.generateImportStatement('Card', './Card', false);
      expect(stmt).toBe(`import { Card } from './Card';`);
    });

    it('should generate default import', () => {
      const stmt = plugin.generateImportStatement('React', 'react', true);
      expect(stmt).toBe(`import React from 'react';`);
    });
  });

  describe('isBuiltInOrKeyword', () => {
    it('should return true for JS builtins', () => {
      expect(plugin.isBuiltInOrKeyword('Array')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('Object')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('Promise')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('Map')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('Set')).toBe(true);
    });

    it('should return false for custom identifiers', () => {
      expect(plugin.isBuiltInOrKeyword('MyComponent')).toBe(false);
      expect(plugin.isBuiltInOrKeyword('formatName')).toBe(false);
      expect(plugin.isBuiltInOrKeyword('UserService')).toBe(false);
    });
  });

  describe('getImportInsertPosition', () => {
    it('should insert after last import line', () => {
      const content = `import { useState } from 'react';
import { Card } from './Card';

function App() {}`;
      const pos = plugin.getImportInsertPosition(content, 'test.ts');
      expect(pos).toBe(2);
    });

    it('should insert after comments if no imports', () => {
      const content = `// This is a module

function App() {}`;
      const pos = plugin.getImportInsertPosition(content, 'test.ts');
      expect(pos).toBe(2);
    });
  });

  describe('insertImports', () => {
    it('should insert imports at correct position in TS file', () => {
      const content = `import { useState } from 'react';

function App() {}`;
      const result = plugin.insertImports(content, [`import { Card } from './Card';`], 'test.ts');
      const lines = result.split('\n');
      expect(lines[0]).toBe(`import { useState } from 'react';`);
      expect(lines[1]).toBe(`import { Card } from './Card';`);
    });

    it('should handle Vue SFC files', () => {
      const content = `<template><div>{{ msg }}</div></template>
<script setup>
import { ref } from 'vue';
const msg = ref('hello');
</script>`;
      const result = plugin.insertImports(content, [`import { computed } from 'vue';`], 'test.vue');
      expect(result).toContain(`import { computed } from 'vue';`);
    });
  });
});
