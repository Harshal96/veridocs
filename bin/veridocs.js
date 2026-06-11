#!/usr/bin/env node
'use strict';

const { run } = require('../src/cli');

try {
  const code = run(process.argv.slice(2));
  if (code !== null) process.exitCode = code;
} catch (err) {
  console.error(`\n  ✗ ${err.message}\n`);
  process.exitCode = 1;
}
