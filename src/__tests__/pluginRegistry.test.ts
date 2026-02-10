import { getPluginForExtension, getAllExtensions, getDefaultPlugins } from '@/plugins/index';
import { JsTsPlugin } from '@/plugins/jsTsPlugin';
import { PythonPlugin } from '@/plugins/pythonPlugin';
import { RustPlugin } from '@/plugins/rustPlugin';

describe('Plugin Registry', () => {
  describe('getPluginForExtension', () => {
    it('should return JsTsPlugin for .ts files', () => {
      const plugin = getPluginForExtension('.ts');
      expect(plugin).toBeInstanceOf(JsTsPlugin);
    });

    it('should return JsTsPlugin for .tsx files', () => {
      const plugin = getPluginForExtension('.tsx');
      expect(plugin).toBeInstanceOf(JsTsPlugin);
    });

    it('should return JsTsPlugin for .js files', () => {
      const plugin = getPluginForExtension('.js');
      expect(plugin).toBeInstanceOf(JsTsPlugin);
    });

    it('should return JsTsPlugin for .jsx files', () => {
      const plugin = getPluginForExtension('.jsx');
      expect(plugin).toBeInstanceOf(JsTsPlugin);
    });

    it('should return JsTsPlugin for .vue files', () => {
      const plugin = getPluginForExtension('.vue');
      expect(plugin).toBeInstanceOf(JsTsPlugin);
    });

    it('should return JsTsPlugin for .svelte files', () => {
      const plugin = getPluginForExtension('.svelte');
      expect(plugin).toBeInstanceOf(JsTsPlugin);
    });

    it('should return JsTsPlugin for .astro files', () => {
      const plugin = getPluginForExtension('.astro');
      expect(plugin).toBeInstanceOf(JsTsPlugin);
    });

    it('should return PythonPlugin for .py files', () => {
      const plugin = getPluginForExtension('.py');
      expect(plugin).toBeInstanceOf(PythonPlugin);
    });

    it('should return RustPlugin for .rs files', () => {
      const plugin = getPluginForExtension('.rs');
      expect(plugin).toBeInstanceOf(RustPlugin);
    });

    it('should return null for unsupported extensions', () => {
      expect(getPluginForExtension('.go')).toBeNull();
      expect(getPluginForExtension('.rb')).toBeNull();
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
      expect(exts).toContain('.rs');
    });

    it('should accept custom plugin list', () => {
      const exts = getAllExtensions([new PythonPlugin()]);
      expect(exts).toEqual(['.py']);
    });
  });

  describe('getDefaultPlugins', () => {
    it('should return JsTsPlugin, PythonPlugin, and RustPlugin', () => {
      const plugins = getDefaultPlugins();
      expect(plugins).toHaveLength(3);
      expect(plugins.some(p => p instanceof JsTsPlugin)).toBe(true);
      expect(plugins.some(p => p instanceof PythonPlugin)).toBe(true);
      expect(plugins.some(p => p instanceof RustPlugin)).toBe(true);
    });
  });
});
