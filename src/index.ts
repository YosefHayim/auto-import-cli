export { FileScanner } from './scanner/fileScanner.js';
export { AstParser } from './parser/astParser.js';
export { FrameworkParser } from './parser/frameworkParser.js';
export { ImportResolver } from './resolver/importResolver.js';
export { AutoImportCli, createCli } from './cli/autoImportCli.js';
export { detectProjectLanguages } from './detector/languageDetector.js';
export { sortImports, groupImportStatements, classifyJsTsImport, classifyPythonImport } from './sorter/importSorter.js';

// Plugin system
export { JsTsPlugin } from './plugins/jsTsPlugin.js';
export { PythonPlugin } from './plugins/pythonPlugin.js';
export { ElixirPlugin } from './plugins/elixirPlugin.js';
export { GoPlugin } from './plugins/goPlugin.js';
export { RustPlugin } from './plugins/rustPlugin.js';
export { getPluginForExtension, getAllExtensions, getDefaultPlugins } from './plugins/index.js';

export type { ScanOptions, ScannedFile } from './scanner/fileScanner.js';
export type { ImportStatement, UsedIdentifier, ParseResult } from './parser/astParser.js';
export type { FrameworkParseResult } from './parser/frameworkParser.js';
export type { ExportInfo, ResolverOptions, PathAlias } from './resolver/importResolver.js';
export type { CliOptions, MissingImport } from './cli/autoImportCli.js';
export type { LanguagePlugin } from './plugins/languagePlugin.js';
export type { ImportGroup, PythonImportGroup } from './sorter/importSorter.js';

// Reporter
export {
  writeReport,
  generateMarkdownReport,
  generateTextReport,
  generateJsonReport,
} from './reporter/reportGenerator.js';
export type { ReportFormat, ReportEntry, ReportData } from './reporter/reportGenerator.js';

// Setup wizard
export {
  runSetupWizard,
  detectFileExtensions,
  detectHusky,
  generateConfig,
  loadConfigFile,
} from './cli/setupWizard.js';
export type { AutoImportConfig } from './cli/setupWizard.js';
