/**
 * Framework-specific parser for extracting script sections from component files
 * Supports Vue, Svelte, and Astro files
 */

export interface FrameworkParseResult {
  scriptContent: string;
  scriptStart: number;
  scriptEnd: number;
  isFrameworkFile: boolean;
  framework?: 'vue' | 'svelte' | 'astro';
}

export class FrameworkParser {
  /**
   * Determines if a file is a framework-specific file and extracts its script content
   */
  parseFrameworkFile(content: string, ext: string): FrameworkParseResult {
    const framework = this.detectFramework(ext);

    if (!framework) {
      return {
        scriptContent: content,
        scriptStart: 0,
        scriptEnd: content.length,
        isFrameworkFile: false,
      };
    }

    const extraction = this.extractScriptSection(content, framework);

    return {
      ...extraction,
      isFrameworkFile: true,
      framework,
    };
  }

  private detectFramework(ext: string): 'vue' | 'svelte' | 'astro' | null {
    switch (ext.toLowerCase()) {
      case '.vue':
        return 'vue';
      case '.svelte':
        return 'svelte';
      case '.astro':
        return 'astro';
      default:
        return null;
    }
  }

  private extractScriptSection(
    content: string,
    framework: 'vue' | 'svelte' | 'astro',
  ): { scriptContent: string; scriptStart: number; scriptEnd: number } {
    switch (framework) {
      case 'vue':
        return this.extractVueScript(content);
      case 'svelte':
        return this.extractSvelteScript(content);
      case 'astro':
        return this.extractAstroScript(content);
    }
  }

  /**
   * Extract script section from Vue Single File Component
   * Matches <script>, <script setup>, <script lang="ts">, etc.
   */
  private extractVueScript(content: string): {
    scriptContent: string;
    scriptStart: number;
    scriptEnd: number;
  } {
    // Match <script> tag with optional attributes
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/i;
    const match = content.match(scriptRegex);

    if (match) {
      const scriptContent = match[1];
      const scriptStart = match.index! + match[0].indexOf('>') + 1;
      const scriptEnd = scriptStart + scriptContent.length;

      return {
        scriptContent: scriptContent.trim(),
        scriptStart,
        scriptEnd,
      };
    }

    // If no script tag found, return empty
    return {
      scriptContent: '',
      scriptStart: 0,
      scriptEnd: 0,
    };
  }

  /**
   * Extract script section from Svelte component
   * Matches <script>, <script context="module">, <script lang="ts">, etc.
   */
  private extractSvelteScript(content: string): {
    scriptContent: string;
    scriptStart: number;
    scriptEnd: number;
  } {
    // Svelte can have multiple script tags (module context and instance)
    // We'll extract the first one (usually the instance script)
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/i;
    const match = content.match(scriptRegex);

    if (match) {
      const scriptContent = match[1];
      const scriptStart = match.index! + match[0].indexOf('>') + 1;
      const scriptEnd = scriptStart + scriptContent.length;

      return {
        scriptContent: scriptContent.trim(),
        scriptStart,
        scriptEnd,
      };
    }

    return {
      scriptContent: '',
      scriptStart: 0,
      scriptEnd: 0,
    };
  }

  /**
   * Extract frontmatter/script section from Astro component
   * Astro uses --- delimiters for the frontmatter
   */
  private extractAstroScript(content: string): {
    scriptContent: string;
    scriptStart: number;
    scriptEnd: number;
  } {
    // Match frontmatter section between ---
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/m;
    const match = content.match(frontmatterRegex);

    if (match) {
      const scriptContent = match[1];
      const scriptStart = match.index! + 4; // After "---\n"
      const scriptEnd = scriptStart + scriptContent.length;

      return {
        scriptContent: scriptContent.trim(),
        scriptStart,
        scriptEnd,
      };
    }

    // Also check for <script> tags in Astro (client-side scripts)
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/i;
    const scriptMatch = content.match(scriptRegex);

    if (scriptMatch) {
      const scriptContent = scriptMatch[1];
      const scriptStart = scriptMatch.index! + scriptMatch[0].indexOf('>') + 1;
      const scriptEnd = scriptStart + scriptContent.length;

      return {
        scriptContent: scriptContent.trim(),
        scriptStart,
        scriptEnd,
      };
    }

    return {
      scriptContent: '',
      scriptStart: 0,
      scriptEnd: 0,
    };
  }

  /**
   * Insert imports into the correct location within a framework file
   */
  insertImportsIntoFramework(originalContent: string, imports: string[], parseResult: FrameworkParseResult): string {
    if (!parseResult.isFrameworkFile || imports.length === 0) {
      return originalContent;
    }

    const { scriptStart, scriptEnd, scriptContent } = parseResult;

    // Find where to insert imports within the script section
    const lines = scriptContent.split('\n');
    let lastImportLine = -1;
    let firstCodeLine = 0;

    // Find the last import or first code line
    for (let i = 0; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();
      if (
        trimmedLine.startsWith('//') ||
        trimmedLine.startsWith('/*') ||
        trimmedLine.startsWith('*') ||
        trimmedLine === ''
      ) {
        firstCodeLine = i + 1;
        continue;
      }
      if (trimmedLine.startsWith('import ')) {
        lastImportLine = i;
      } else if (trimmedLine.length > 0 && lastImportLine === -1) {
        break;
      }
    }

    // Insert imports
    const insertIndex = lastImportLine >= 0 ? lastImportLine + 1 : firstCodeLine;
    lines.splice(insertIndex, 0, ...imports);

    const newScriptContent = lines.join('\n');

    // Reconstruct the full file content
    const before = originalContent.substring(0, scriptStart);
    const after = originalContent.substring(scriptEnd);

    return before + '\n' + newScriptContent + '\n' + after;
  }
}
