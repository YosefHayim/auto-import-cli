import { AstParser } from '@/parser/astParser';

describe('AstParser', () => {
  let parser: AstParser;

  beforeEach(() => {
    parser = new AstParser();
  });

  describe('parse', () => {
    it('should detect existing imports', () => {
      const content = `
import { useState } from 'react';
import Button from './Button';

export function MyComponent() {
  return <div>Test</div>;
}
`;

      const result = parser.parse(content);
      
      expect(result.existingImports).toHaveLength(2);
      expect(result.existingImports[0].source).toBe('react');
      expect(result.existingImports[0].imports).toContain('useState');
      expect(result.existingImports[1].source).toBe('./Button');
      expect(result.existingImports[1].isDefault).toBe(true);
    });

    it('should detect JSX components usage', () => {
      const content = `
export function MyComponent() {
  return (
    <div>
      <Card>
        <Button onClick={handleClick}>Click</Button>
      </Card>
    </div>
  );
}
`;

      const result = parser.parse(content);
      
      expect(result.usedIdentifiers.some(id => id.name === 'Card')).toBe(true);
      expect(result.usedIdentifiers.some(id => id.name === 'Button')).toBe(true);
    });

    it('should detect function calls', () => {
      const content = `
export function MyComponent() {
  const name = formatName('John', 'Doe');
  return <div>{name}</div>;
}
`;

      const result = parser.parse(content);
      
      expect(result.usedIdentifiers.some(id => id.name === 'formatName')).toBe(true);
    });

    it('should not detect method calls as missing imports', () => {
      const content = `
export function MyComponent() {
  const str = 'hello';
  const upper = str.toUpperCase();
  return <div>{upper}</div>;
}
`;

      const result = parser.parse(content);
      
      expect(result.missingImports).not.toContain('toUpperCase');
    });

    it('should identify missing imports', () => {
      const content = `
export function MyComponent() {
  return <Card><Button>Click</Button></Card>;
}
`;

      const result = parser.parse(content);
      
      expect(result.missingImports).toContain('Card');
      expect(result.missingImports).toContain('Button');
    });

    it('should not mark imported items as missing', () => {
      const content = `
import { Card } from './Card';

export function MyComponent() {
  return <Card>Content</Card>;
}
`;

      const result = parser.parse(content);
      
      expect(result.missingImports).not.toContain('Card');
    });

    it('should handle namespace imports', () => {
      const content = `
import * as React from 'react';

export function MyComponent() {
  return <div>Test</div>;
}
`;

      const result = parser.parse(content);
      
      expect(result.existingImports[0].isNamespace).toBe(true);
      expect(result.existingImports[0].imports).toContain('React');
    });
  });
});
