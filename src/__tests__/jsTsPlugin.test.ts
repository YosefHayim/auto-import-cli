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

  describe('parseImports - edge cases', () => {
    it('should not crash on type-only imports', () => {
      const content = `import type { User } from './models';
import { Card } from './Card';`;
      const imports = plugin.parseImports(content, 'test.ts');
      expect(imports.some(i => i.source === './Card')).toBe(true);
    });

    it('should parse namespace imports', () => {
      const content = `import * as utils from './utils';`;
      const imports = plugin.parseImports(content, 'test.ts');
      expect(imports.length).toBeGreaterThanOrEqual(1);
      const match = imports.find(i => i.source === './utils');
      expect(match).toBeDefined();
      expect(match!.isNamespace).toBe(true);
    });

    it('should parse multiple imports on same line separated by semicolons', () => {
      const content = `import { A } from 'a'; import { B } from 'b';`;
      const imports = plugin.parseImports(content, 'test.ts');
      expect(imports.some(i => i.source === 'a')).toBe(true);
      expect(imports.some(i => i.source === 'b')).toBe(true);
    });

    it('should handle side-effect import without crashing', () => {
      const content = `import 'side-effects';
import { foo } from 'bar';`;
      const imports = plugin.parseImports(content, 'test.ts');
      expect(imports.some(i => i.source === 'bar')).toBe(true);
    });
  });

  describe('parseExports - edge cases', () => {
    it('should detect aliased exports', () => {
      const content = `export { X as Y };`;
      const exports = plugin.parseExports(content, 'test.ts');
      expect(exports.some(e => e.name === 'Y')).toBe(true);
    });

    it('should detect re-exports', () => {
      const content = `export { X } from './other';`;
      const exports = plugin.parseExports(content, 'test.ts');
      expect(exports.some(e => e.name === 'X')).toBe(true);
    });

    it('should not crash on export enum', () => {
      const content = `export enum Foo { A, B }`;
      expect(() => plugin.parseExports(content, 'test.ts')).not.toThrow();
    });

    it('should not crash on anonymous default export', () => {
      const content = `export default function() {}`;
      expect(() => plugin.parseExports(content, 'test.ts')).not.toThrow();
    });
  });

  describe('findUsedIdentifiers - Angular patterns', () => {
    it('should not report Component as missing when it is a keyword', () => {
      const content = `
const metadata = Component({ selector: 'app-root' });
`;
      const ids = plugin.findUsedIdentifiers(content, 'test.ts');
      expect(ids.some(id => id.name === 'Component')).toBe(false);
    });

    it('should recognize Angular identifiers as keywords', () => {
      expect(plugin.isBuiltInOrKeyword('Injectable')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('NgModule')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('OnInit')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('OnDestroy')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('EventEmitter')).toBe(true);
    });

    it('should recognize Angular decorator identifiers as keywords', () => {
      expect(plugin.isBuiltInOrKeyword('Input')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('Output')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('ViewChild')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('Pipe')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('Directive')).toBe(true);
    });

    it('should recognize Angular service identifiers as keywords', () => {
      expect(plugin.isBuiltInOrKeyword('HttpClient')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('Router')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('ActivatedRoute')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('FormBuilder')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('Observable')).toBe(true);
    });
  });

  describe('findUsedIdentifiers - Vue patterns', () => {
    it('should recognize Vue Composition API keywords', () => {
      expect(plugin.isBuiltInOrKeyword('defineProps')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('defineEmits')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('defineExpose')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('defineSlots')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('withDefaults')).toBe(true);
    });
  });

  describe('findUsedIdentifiers - Next.js patterns', () => {
    it('should recognize Next.js type keywords', () => {
      expect(plugin.isBuiltInOrKeyword('GetServerSideProps')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('GetStaticProps')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('GetStaticPaths')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('NextPage')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('NextApiRequest')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('NextApiResponse')).toBe(true);
    });
  });

  describe('Svelte file support', () => {
    it('should detect existing imports in Svelte files', () => {
      const content = `<script>
import { onMount } from 'svelte';
let count = 0;
</script>
<button>{count}</button>`;
      const imports = plugin.parseImports(content, 'test.svelte');
      expect(imports.some(i => i.source === 'svelte')).toBe(true);
    });

    it('should detect function calls in Svelte script section', () => {
      const content = `<script>
import { onMount } from 'svelte';
let count = 0;
const result = formatValue(count);
</script>
<button>{count}</button>`;
      const ids = plugin.findUsedIdentifiers(content, 'test.svelte');
      expect(ids.some(id => id.name === 'formatValue')).toBe(true);
    });

    it('should recognize Svelte component keywords', () => {
      expect(plugin.isBuiltInOrKeyword('SvelteComponent')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('SvelteComponentDev')).toBe(true);
    });
  });

  describe('Astro file support', () => {
    it('should detect existing imports in Astro files', () => {
      const content = `---
import Card from './Card.astro';
const title = 'Hello';
---
<Card>{title}</Card>`;
      const imports = plugin.parseImports(content, 'test.astro');
      expect(imports.some(i => i.source === './Card.astro')).toBe(true);
    });

    it('should detect identifiers in Astro frontmatter', () => {
      const content = `---
import Card from './Card.astro';
const data = fetchData();
---
<Card>{data}</Card>`;
      const ids = plugin.findUsedIdentifiers(content, 'test.astro');
      expect(ids.some(id => id.name === 'fetchData')).toBe(true);
    });
  });
});
