import { FrameworkParser } from '../parser/frameworkParser';

describe('FrameworkParser', () => {
  let parser: FrameworkParser;

  beforeEach(() => {
    parser = new FrameworkParser();
  });

  describe('Vue files', () => {
    it('should extract script content from Vue SFC', () => {
      const content = `
<template>
  <div>{{ message }}</div>
</template>

<script>
import { ref } from 'vue';
const message = ref('Hello');
</script>

<style>
.container {}
</style>
`;

      const result = parser.parseFrameworkFile(content, '.vue');

      expect(result.isFrameworkFile).toBe(true);
      expect(result.framework).toBe('vue');
      expect(result.scriptContent).toContain('const message = ref');
    });

    it('should handle script setup syntax', () => {
      const content = `
<template>
  <div>Test</div>
</template>

<script setup>
const count = ref(0);
</script>
`;

      const result = parser.parseFrameworkFile(content, '.vue');

      expect(result.isFrameworkFile).toBe(true);
      expect(result.scriptContent).toContain('const count = ref');
    });

    it('should handle script with lang attribute', () => {
      const content = `
<script lang="ts">
const foo: string = 'bar';
</script>
`;

      const result = parser.parseFrameworkFile(content, '.vue');

      expect(result.isFrameworkFile).toBe(true);
      expect(result.scriptContent).toContain("const foo: string = 'bar'");
    });
  });

  describe('Svelte files', () => {
    it('should extract script content from Svelte component', () => {
      const content = `
<script>
let count = 0;
function increment() {
  count += 1;
}
</script>

<button on:click={increment}>
  Count: {count}
</button>

<style>
button {}
</style>
`;

      const result = parser.parseFrameworkFile(content, '.svelte');

      expect(result.isFrameworkFile).toBe(true);
      expect(result.framework).toBe('svelte');
      expect(result.scriptContent).toContain('let count = 0');
    });

    it('should handle module context script', () => {
      const content = `
<script context="module">
export const shared = 'value';
</script>

<script>
let local = 'test';
</script>
`;

      const result = parser.parseFrameworkFile(content, '.svelte');

      expect(result.isFrameworkFile).toBe(true);
      // Should extract the first script tag (module context)
      expect(result.scriptContent).toContain("export const shared = 'value'");
    });
  });

  describe('Astro files', () => {
    it('should extract frontmatter from Astro component', () => {
      const content = `---
import Card from './Card.astro';
const title = 'Hello Astro';
---

<div>
  <Card>{title}</Card>
</div>

<style>
div {}
</style>
`;

      const result = parser.parseFrameworkFile(content, '.astro');

      expect(result.isFrameworkFile).toBe(true);
      expect(result.framework).toBe('astro');
      expect(result.scriptContent).toContain("const title = 'Hello Astro'");
    });

    it('should handle client-side script tags', () => {
      const content = `
<div>Content</div>

<script>
console.log('client-side');
</script>
`;

      const result = parser.parseFrameworkFile(content, '.astro');

      expect(result.isFrameworkFile).toBe(true);
      expect(result.scriptContent).toContain("console.log('client-side')");
    });
  });

  describe('Regular JS/TS files', () => {
    it('should pass through regular TypeScript files unchanged', () => {
      const content = `
import { useState } from 'react';
export function Component() {
  return <div>Test</div>;
}
`;

      const result = parser.parseFrameworkFile(content, '.tsx');

      expect(result.isFrameworkFile).toBe(false);
      expect(result.framework).toBeUndefined();
      expect(result.scriptContent).toBe(content);
    });
  });

  describe('insertImportsIntoFramework', () => {
    it('should insert imports into Vue script section', () => {
      const content = `
<template>
  <div>Test</div>
</template>

<script>

const foo = 'bar';
</script>
`;

      const parseResult = parser.parseFrameworkFile(content, '.vue');
      const imports = ["import { test } from './test';"];
      const result = parser.insertImportsIntoFramework(content, imports, parseResult);

      expect(result).toContain("import { test } from './test';");
      expect(result).toContain('const foo');
      expect(result).toMatch(/<script>/);
    });

    it('should insert imports after existing imports', () => {
      const content = `
<script>
import { existing } from './existing';

const foo = 'bar';
</script>
`;

      const parseResult = parser.parseFrameworkFile(content, '.vue');
      const imports = ["import { newImport } from './new';"];
      const result = parser.insertImportsIntoFramework(content, imports, parseResult);

      expect(result).toContain("import { existing } from './existing';");
      expect(result).toContain("import { newImport } from './new';");
      // New import should come after existing import
      expect(result.indexOf('newImport')).toBeGreaterThan(result.indexOf('existing'));
    });

    it('should not modify regular files', () => {
      const content = 'const foo = "bar";';
      const parseResult = parser.parseFrameworkFile(content, '.ts');
      const imports = ["import { test } from './test';"];
      const result = parser.insertImportsIntoFramework(content, imports, parseResult);

      expect(result).toBe(content);
    });
  });
});
