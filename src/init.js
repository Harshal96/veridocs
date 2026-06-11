'use strict';

const fs = require('fs');
const path = require('path');

const SCAFFOLD_DIR = path.join(__dirname, '..', 'example');

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const dirent of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, dirent.name);
    const dest = path.join(to, dirent.name);
    if (dirent.isDirectory()) copyDir(src, dest);
    else fs.copyFileSync(src, dest);
  }
}

function initProject(targetDir, { log = console.log } = {}) {
  const target = path.resolve(targetDir);
  if (fs.existsSync(target) && fs.readdirSync(target).length > 0) {
    throw new Error(`Target directory is not empty: ${target}`);
  }
  copyDir(SCAFFOLD_DIR, target);
  log(`\n  ✦ veridocs project created in ${target}\n`);
  log('  Next steps:');
  log(`    cd ${path.relative(process.cwd(), target) || '.'}`);
  log('    veridocs serve        # live-reloading dev server on :4567');
  log('    veridocs build        # static site in ./build\n');
  log('  Migrating from Slate? Replace ./source with your Slate source folder.\n');
  return target;
}

module.exports = { initProject };
