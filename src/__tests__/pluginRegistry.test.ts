import { getPluginForExtension, getAllExtensions, getDefaultPlugins } from '@/plugins/index';
import { JsTsPlugin } from '@/plugins/jsTsPlugin';
import { PythonPlugin } from '@/plugins/pythonPlugin';
import { ElixirPlugin } from '@/plugins/elixirPlugin';
import { GoPlugin } from '@/plugins/goPlugin';
import { RustPlugin } from '@/plugins/rustPlugin';

describe('Plugin Registry', () => {
  describe('getPluginForExtension', () => {
    it('should return JsTsPlugin for .ts files', () => {
      expect(getPluginForExtension('.ts')).toBeInstanceOf(JsTsPlugin);
    });
    it('should return JsTsPlugin for .tsx files', () => {
      expect(getPluginForExtension('.tsx')).toBeInstanceOf(JsTsPlugin);
    });
    it('should return JsTsPlugin for .js files', () => {
      expect(getPluginForExtension('.js')).toBeInstanceOf(JsTsPlugin);
    });
    it('should return JsTsPlugin for .jsx files', () => {
      expect(getPluginForExtension('.jsx')).toBeInstanceOf(JsTsPlugin);
    });
    it('should return JsTsPlugin for .vue files', () => {
      expect(getPluginForExtension('.vue')).toBeInstanceOf(JsTsPlugin);
    });
    it('should return JsTsPlugin for .svelte files', () => {
      expect(getPluginForExtension('.svelte')).toBeInstanceOf(JsTsPlugin);
    });
    it('should return JsTsPlugin for .astro files', () => {
      expect(getPluginForExtension('.astro')).toBeInstanceOf(JsTsPlugin);
    });
    it('should return PythonPlugin for .py files', () => {
      expect(getPluginForExtension('.py')).toBeInstanceOf(PythonPlugin);
    });
    it('should return ElixirPlugin for .ex files', () => {
      expect(getPluginForExtension('.ex')).toBeInstanceOf(ElixirPlugin);
    });
    it('should return ElixirPlugin for .exs files', () => {
      expect(getPluginForExtension('.exs')).toBeInstanceOf(ElixirPlugin);
    });
    it('should return GoPlugin for .go files', () => {
      expect(getPluginForExtension('.go')).toBeInstanceOf(GoPlugin);
    });
    it('should return RustPlugin for .rs files', () => {
      expect(getPluginForExtension('.rs')).toBeInstanceOf(RustPlugin);
    });
    it('should return null for unsupported extensions', () => {
      expect(getPluginForExtension('.rb')).toBeNull();
      expect(getPluginForExtension('.java')).toBeNull();
    });
    it('should be case-insensitive', () => {
      expect(getPluginForExtension('.PY')).toBeInstanceOf(PythonPlugin);
      expect(getPluginForExtension('.TS')).toBeInstanceOf(JsTsPlugin);
    });
    it('should accept custom plugin list', () => {
      const customPlugins = [new PythonPlugin()];
      expect(getPluginForExtension('.py', customPlugins)).toBeInstanceOf(PythonPlugin);
      expect(getPluginForExtension('.ts', customPlugins)).toBeNull();
    });
  });

  describe('getAllExtensions', () => {
    it('should return all supported extensions', () => {
      const exts = getAllExtensions();
      expect(exts).toContain('.ts');
      expect(exts).toContain('.tsx');
      expect(exts).toContain('.js');
      expect(exts).toContain('.jsx');
      expect(exts).toContain('.vue');
      expect(exts).toContain('.svelte');
      expect(exts).toContain('.astro');
      expect(exts).toContain('.py');
      expect(exts).toContain('.ex');
      expect(exts).toContain('.exs');
      expect(exts).toContain('.go');
      expect(exts).toContain('.rs');
    });
    it('should accept custom plugin list', () => {
      const exts = getAllExtensions([new PythonPlugin()]);
      expect(exts).toEqual(['.py']);
    });
  });

  describe('getDefaultPlugins', () => {
    it('should return all 5 default plugins', () => {
      const plugins = getDefaultPlugins();
      expect(plugins).toHaveLength(5);
      expect(plugins.some(p => p instanceof JsTsPlugin)).toBe(true);
      expect(plugins.some(p => p instanceof PythonPlugin)).toBe(true);
      expect(plugins.some(p => p instanceof ElixirPlugin)).toBe(true);
      expect(plugins.some(p => p instanceof GoPlugin)).toBe(true);
      expect(plugins.some(p => p instanceof RustPlugin)).toBe(true);
    });
    it('FIX 14: should return a new array each time (not mutable reference)', () => {
      const plugins1 = getDefaultPlugins();
      const plugins2 = getDefaultPlugins();
      expect(plugins1).not.toBe(plugins2);
      plugins1.push(new PythonPlugin());
      expect(getDefaultPlugins()).toHaveLength(5);
    });
  });
});
