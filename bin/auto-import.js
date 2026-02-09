#!/usr/bin/env node

import { createCli } from '../dist/cli/autoImportCli.js';

const program = createCli();
program.parse(process.argv);
