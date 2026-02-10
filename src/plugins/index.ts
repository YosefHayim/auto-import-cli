export type { LanguagePlugin } from './languagePlugin.js';
export { JsTsPlugin } from './jsTsPlugin.js';
export { PythonPlugin } from './pythonPlugin.js';
export { GoPlugin } from './goPlugin.js';

import type { LanguagePlugin } from './languagePlugin.js';
import { JsTsPlugin } from './jsTsPlugin.js';
import { PythonPlugin } from './pythonPlugin.js';
import { GoPlugin } from './goPlugin.js';

const DEFAULT_PLUGINS: LanguagePlugin[] = [
  new JsTsPlugin(),
  new PythonPlugin(),
  new GoPlugin(),
];

export function getPluginForExtension(ext: string, plugins?: LanguagePlugin[]): LanguagePlugin | null {
  const list = plugins ?? DEFAULT_PLUGINS;
  return list.find(p => p.extensions.includes(ext.toLowerCase())) ?? null;
}

export function getAllExtensions(plugins?: LanguagePlugin[]): string[] {
  const list = plugins ?? DEFAULT_PLUGINS;
  return list.flatMap(p => p.extensions);
}

export function getDefaultPlugins(): LanguagePlugin[] {
  return DEFAULT_PLUGINS;
}
