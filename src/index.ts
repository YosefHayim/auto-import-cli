export { FileScanner } from './scanner/fileScanner.js';
export { AstParser } from './parser/astParser.js';
export { FrameworkParser } from './parser/frameworkParser.js';
export { ImportResolver } from './resolver/importResolver.js';
export { AutoImportCli, createCli } from './cli/autoImportCli.js';

// Plugin system
export { JsTsPlugin } from './plugins/jsTsPlugin.js';
export { PythonPlugin } from './plugins/pythonPlugin.js';
export { getPluginForExtension, getAllExtensions, getDefaultPlugins } from './plugins/index.js';

export type { ScanOptions, ScannedFile } from './scanner/fileScanner.js';
export type { ImportStatement, UsedIdentifier, ParseResult } from './parser/astParser.js';
export type { FrameworkParseResult } from './parser/frameworkParser.js';
export type { ExportInfo, ResolverOptions, PathAlias } from './resolver/importResolver.js';
export type { CliOptions, MissingImport } from './cli/autoImportCli.js';
export type { LanguagePlugin } from './plugins/languagePlugin.js';
