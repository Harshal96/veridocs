'use strict';

const path = require('path');
const { buildProject, loadConfig } = require('./build');
const { startServer } = require('./serve');
const { initProject } = require('./init');

const HELP = `
  veridocs — beautiful, Slate-compatible API docs

  Usage
    veridocs init [dir]        scaffold a new docs project
    veridocs build [options]   build the static site
    veridocs serve [options]   dev server with live reload
    veridocs help              show this message

  Options
    --source <dir>   markdown source directory      (default: source)
    --out <dir>      output directory               (default: build)
    --theme <dir>    theme overrides directory      (default: theme)
    --port <n>       dev server port                (default: 4567)
    --json           also emit docs.json (parsed AST for custom frontends)

  Config
    Reads veridocs.config.json or veridocs.config.js from the
    current directory; CLI flags take precedence.
`;

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') args.json = true;
    else if (arg.startsWith('--')) {
      args[arg.slice(2)] = argv[++i];
    } else {
      args._.push(arg);
    }
  }
  return args;
}

function run(argv) {
  const args = parseArgs(argv);
  const command = args._[0] || 'help';
  const overrides = {};
  for (const key of ['source', 'out', 'theme']) {
    if (args[key]) overrides[key] = args[key];
  }
  if (args.port) overrides.port = Number(args.port);
  if (args.json) overrides.json = true;

  switch (command) {
    case 'init': {
      initProject(args._[1] || '.');
      return 0;
    }
    case 'build': {
      const config = loadConfig(process.cwd(), overrides);
      const started = Date.now();
      const result = buildProject(config);
      const rel = path.relative(process.cwd(), result.out) || '.';
      console.log(`\n  ✦ built "${result.title}" → ${rel}/ in ${Date.now() - started}ms`);
      console.log(
        `    ${result.toc.length} sections · ${
          result.languages.map((l) => l.label).join(', ') || 'no language tabs'
        }`
      );
      for (const name of result.missingIncludes) {
        console.warn(`  ⚠ include not found: ${name}`);
      }
      console.log('');
      return result.missingIncludes.length ? 1 : 0;
    }
    case 'serve': {
      const config = loadConfig(process.cwd(), overrides);
      startServer(config);
      return null; // keeps running
    }
    case 'help':
    case '--help':
    case '-h':
      console.log(HELP);
      return 0;
    default:
      console.error(`Unknown command: ${command}`);
      console.log(HELP);
      return 1;
  }
}

module.exports = { run, parseArgs };
