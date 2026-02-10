/**
 * Shared JavaScript/TypeScript keywords and built-ins
 * Single source of truth for JSTS_KEYWORDS and JSTS_BUILTINS
 */

export const JSTS_BUILTINS = new Set([
  'Array',
  'Object',
  'String',
  'Number',
  'Boolean',
  'Symbol',
  'Date',
  'Error',
  'RegExp',
  'Map',
  'Set',
  'Promise',
  'JSON',
  'Math',
  'Function',
  'Infinity',
  'NaN',
  'undefined',
  'null',
]);

export const JSTS_KEYWORDS = new Set([
  // Vue compiler macros — these are compiler-injected globals, not importable
  'defineProps',
  'defineEmits',
  'defineExpose',
  'defineSlots',
  'withDefaults',
]);
