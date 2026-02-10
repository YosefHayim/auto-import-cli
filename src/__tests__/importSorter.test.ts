import {
  sortImports,
  groupImportStatements,
  classifyJsTsImport,
  classifyPythonImport,
} from '@/sorter/importSorter';

describe('importSorter', () => {
  describe('classifyJsTsImport', () => {
    it('should classify node: prefixed imports as builtin', () => {
      expect(classifyJsTsImport("import fs from 'node:fs'")).toBe('builtin');
      expect(classifyJsTsImport("import { join } from 'node:path'")).toBe('builtin');
    });

    it('should classify bare node builtins as builtin', () => {
      expect(classifyJsTsImport("import * as fs from 'fs'")).toBe('builtin');
      expect(classifyJsTsImport("import { join } from 'path'")).toBe('builtin');
      expect(classifyJsTsImport("import { createServer } from 'http'")).toBe('builtin');
      expect(classifyJsTsImport("import { readFile } from 'fs/promises'")).toBe('builtin');
    });

    it('should classify scoped packages as external', () => {
      expect(classifyJsTsImport("import { Command } from '@types/node'")).toBe('external');
      expect(classifyJsTsImport("import React from '@emotion/react'")).toBe('external');
    });

    it('should classify unscoped packages as external', () => {
      expect(classifyJsTsImport("import React from 'react'")).toBe('external');
      expect(classifyJsTsImport("import { debounce } from 'lodash'")).toBe('external');
      expect(classifyJsTsImport("import chalk from 'chalk'")).toBe('external');
    });

    it('should classify @/ imports as alias', () => {
      expect(classifyJsTsImport("import { Button } from '@/components/Button'")).toBe('alias');
      expect(classifyJsTsImport("import { utils } from '@/lib/utils'")).toBe('alias');
    });

    it('should classify ~/ imports as alias', () => {
      expect(classifyJsTsImport("import { config } from '~/config'")).toBe('alias');
    });

    it('should classify # imports as alias', () => {
      expect(classifyJsTsImport("import { helper } from '#utils/helper'")).toBe('alias');
    });

    it('should classify ./ and ../ imports as relative', () => {
      expect(classifyJsTsImport("import { Foo } from './Foo'")).toBe('relative');
      expect(classifyJsTsImport("import { Bar } from '../Bar'")).toBe('relative');
      expect(classifyJsTsImport("import { Baz } from '../../Baz'")).toBe('relative');
    });

    it('should classify side-effect imports', () => {
      expect(classifyJsTsImport("import 'reflect-metadata'")).toBe('external');
      expect(classifyJsTsImport("import './styles.css'")).toBe('relative');
      expect(classifyJsTsImport("import 'node:fs'")).toBe('builtin');
    });
  });

  describe('classifyPythonImport', () => {
    it('should classify stdlib modules', () => {
      expect(classifyPythonImport('import os')).toBe('stdlib');
      expect(classifyPythonImport('import sys')).toBe('stdlib');
      expect(classifyPythonImport('from pathlib import Path')).toBe('stdlib');
      expect(classifyPythonImport('from collections import defaultdict')).toBe('stdlib');
      expect(classifyPythonImport('import json')).toBe('stdlib');
      expect(classifyPythonImport('from typing import List')).toBe('stdlib');
    });

    it('should classify third-party modules', () => {
      expect(classifyPythonImport('import requests')).toBe('thirdparty');
      expect(classifyPythonImport('from flask import Flask')).toBe('thirdparty');
      expect(classifyPythonImport('import numpy')).toBe('thirdparty');
      expect(classifyPythonImport('from django.db import models')).toBe('thirdparty');
    });

    it('should classify relative imports as local', () => {
      expect(classifyPythonImport('from . import utils')).toBe('local');
      expect(classifyPythonImport('from .models import User')).toBe('local');
      expect(classifyPythonImport('from ..config import settings')).toBe('local');
    });
  });

  describe('sortImports - JS/TS', () => {
    it('should sort imports into correct group order: builtin → external → alias → relative', () => {
      const imports = [
        "import { Button } from './Button';",
        "import React from 'react';",
        "import { join } from 'path';",
        "import { utils } from '@/lib/utils';",
      ];

      const result = sortImports(imports, 'js');

      expect(result).toEqual([
        "import { join } from 'path';",
        '',
        "import React from 'react';",
        '',
        "import { utils } from '@/lib/utils';",
        '',
        "import { Button } from './Button';",
      ]);
    });

    it('should sort alphabetically within each group', () => {
      const imports = [
        "import { z } from 'zod';",
        "import React from 'react';",
        "import { debounce } from 'lodash';",
        "import chalk from 'chalk';",
      ];

      const result = sortImports(imports, 'js');

      expect(result).toEqual([
        "import chalk from 'chalk';",
        "import { debounce } from 'lodash';",
        "import React from 'react';",
        "import { z } from 'zod';",
      ]);
    });

    it('should handle multiple builtins sorted alphabetically', () => {
      const imports = [
        "import * as path from 'path';",
        "import * as fs from 'fs';",
        "import { createServer } from 'http';",
      ];

      const result = sortImports(imports, 'js');

      expect(result).toEqual([
        "import * as fs from 'fs';",
        "import { createServer } from 'http';",
        "import * as path from 'path';",
      ]);
    });

    it('should handle node: prefixed builtins', () => {
      const imports = [
        "import { readFile } from 'node:fs/promises';",
        "import { join } from 'node:path';",
        "import React from 'react';",
      ];

      const result = sortImports(imports, 'ts');

      expect(result).toEqual([
        "import { readFile } from 'node:fs/promises';",
        "import { join } from 'node:path';",
        '',
        "import React from 'react';",
      ]);
    });

    it('should not add blank lines when only one group exists', () => {
      const imports = [
        "import { Bar } from './Bar';",
        "import { Foo } from './Foo';",
      ];

      const result = sortImports(imports, 'js');

      expect(result).toEqual([
        "import { Bar } from './Bar';",
        "import { Foo } from './Foo';",
      ]);
    });

    it('should return empty array for empty input', () => {
      expect(sortImports([], 'js')).toEqual([]);
    });

    it('should handle a single import', () => {
      const result = sortImports(["import React from 'react';"], 'js');
      expect(result).toEqual(["import React from 'react';"]);
    });

    it('should handle mixed alias styles', () => {
      const imports = [
        "import { a } from '@/a';",
        "import { b } from '~/b';",
        "import { c } from '#c';",
      ];

      const result = sortImports(imports, 'ts');

      expect(result).toEqual([
        "import { a } from '@/a';",
        "import { c } from '#c';",
        "import { b } from '~/b';",
      ]);
    });

    it('should handle all four groups together', () => {
      const imports = [
        "import { Comp } from './Comp';",
        "import { helper } from '@/utils/helper';",
        "import express from 'express';",
        "import * as fs from 'fs';",
        "import { join } from 'path';",
        "import axios from 'axios';",
        "import { config } from '@/config';",
        "import { local } from '../local';",
      ];

      const result = sortImports(imports, 'js');

      expect(result).toEqual([
        "import * as fs from 'fs';",
        "import { join } from 'path';",
        '',
        "import axios from 'axios';",
        "import express from 'express';",
        '',
        "import { config } from '@/config';",
        "import { helper } from '@/utils/helper';",
        '',
        "import { local } from '../local';",
        "import { Comp } from './Comp';",
      ]);
    });
  });

  describe('sortImports - Python', () => {
    it('should sort Python imports into correct group order: stdlib → thirdparty → local', () => {
      const imports = [
        'from .models import User',
        'import requests',
        'import os',
      ];

      const result = sortImports(imports, 'python');

      expect(result).toEqual([
        'import os',
        '',
        'import requests',
        '',
        'from .models import User',
      ]);
    });

    it('should sort alphabetically within Python groups', () => {
      const imports = [
        'import sys',
        'import os',
        'import json',
        'from pathlib import Path',
      ];

      const result = sortImports(imports, 'python');

      expect(result).toEqual([
        'from pathlib import Path',
        'import json',
        'import os',
        'import sys',
      ]);
    });

    it('should handle all three Python groups', () => {
      const imports = [
        'from .utils import helper',
        'from flask import Flask',
        'import requests',
        'import os',
        'import sys',
        'from ..config import settings',
      ];

      const result = sortImports(imports, 'python');

      expect(result).toEqual([
        'import os',
        'import sys',
        '',
        'from flask import Flask',
        'import requests',
        '',
        'from ..config import settings',
        'from .utils import helper',
      ]);
    });
  });

  describe('groupImportStatements', () => {
    it('should merge new JS/TS imports with existing ones and sort', () => {
      const existingContent = [
        "import React from 'react';",
        "import { useState } from 'react';",
        '',
        'const App = () => {};',
      ].join('\n');

      const newImports = [
        "import { join } from 'path';",
        "import { Button } from './Button';",
      ];

      const result = groupImportStatements(existingContent, newImports, 'js');

      expect(result).toEqual([
        "import { join } from 'path';",
        '',
        "import React from 'react';",
        "import { useState } from 'react';",
        '',
        "import { Button } from './Button';",
      ]);
    });

    it('should deduplicate imports', () => {
      const existingContent = "import React from 'react';\n\nconst x = 1;";
      const newImports = ["import React from 'react';"];

      const result = groupImportStatements(existingContent, newImports, 'js');

      expect(result).toEqual(["import React from 'react';"]);
    });

    it('should handle empty existing content', () => {
      const newImports = [
        "import { Foo } from './Foo';",
        "import React from 'react';",
      ];

      const result = groupImportStatements('', newImports, 'js');

      expect(result).toEqual([
        "import React from 'react';",
        '',
        "import { Foo } from './Foo';",
      ]);
    });

    it('should handle empty new imports', () => {
      const existingContent = "import React from 'react';\n\nconst x = 1;";

      const result = groupImportStatements(existingContent, [], 'js');

      expect(result).toEqual(["import React from 'react';"]);
    });

    it('should merge Python imports correctly', () => {
      const existingContent = 'import os\nfrom flask import Flask\n\ndef main(): pass';
      const newImports = ['from .models import User', 'import sys'];

      const result = groupImportStatements(existingContent, newImports, 'python');

      expect(result).toEqual([
        'import os',
        'import sys',
        '',
        'from flask import Flask',
        '',
        'from .models import User',
      ]);
    });

    it('should handle multi-line JS imports in existing content', () => {
      const existingContent = [
        'import {',
        '  useState,',
        '  useEffect',
        "} from 'react';",
        '',
        'const App = () => {};',
      ].join('\n');

      const newImports = ["import { join } from 'path';"];

      const result = groupImportStatements(existingContent, newImports, 'ts');

      expect(result).toEqual([
        "import { join } from 'path';",
        '',
        "import { useState, useEffect } from 'react';",
      ]);
    });
  });
});
