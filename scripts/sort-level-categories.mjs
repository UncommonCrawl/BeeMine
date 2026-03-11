import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const repoRoot = process.cwd();
const levelsPath = path.join(repoRoot, 'words.js');

const source = fs.readFileSync(levelsPath, 'utf8');

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function isEligibleEntry(value) {
  return typeof value === 'string' && value.length > 4;
}

function formatStringArray(values, indent) {
  if (values.length === 0) {
    return '[]';
  }

  const lines = values.map((value) => `${indent}  ${JSON.stringify(value)},`);
  return `\n${lines.join('\n')}\n${indent}`;
}

function rewriteCategoryArrays(text) {
  return text.replace(/(categories\s*:\s*)\[([\s\S]*?)\]/g, (match, prefix, body) => {
    const parsed = vm.runInNewContext(`[${body}]`, {});
    const values = Array.isArray(parsed) ? parsed.filter(isEligibleEntry) : [];

    const sorted = uniqueSorted(values);
    const indentMatch = match.match(/^\s*/);
    const indent = indentMatch ? indentMatch[0] : '';

    return `${prefix}[${formatStringArray(sorted, indent)}]`;
  });
}

function tryParseLevelCatalog(text) {
  const marker = 'export const levelCatalog =';
  if (!text.includes(marker)) {
    return null;
  }

  const transformed = `${text.replace(marker, 'const levelCatalog =')}\nmodule.exports = { levelCatalog };`;
  const context = {
    module: { exports: {} },
    exports: {},
  };

  vm.runInNewContext(transformed, context, { filename: 'words.js' });
  return context.module.exports.levelCatalog;
}

function serializeLevelCatalog(catalog) {
  const sortedCategoryNames = uniqueSorted(Object.keys(catalog));
  const lines = ['export const levelCatalog = {'];

  for (const categoryName of sortedCategoryNames) {
    const words = Array.isArray(catalog[categoryName])
      ? uniqueSorted(catalog[categoryName].filter(isEligibleEntry))
      : [];

    lines.push(`  ${JSON.stringify(categoryName)}: [`);
    for (const word of words) {
      lines.push(`    ${JSON.stringify(word)},`);
    }
    lines.push('  ],');
  }

  lines.push('};');
  lines.push('');

  return lines.join('\n');
}

let updated = rewriteCategoryArrays(source);

const levelCatalog = tryParseLevelCatalog(updated);
if (levelCatalog && typeof levelCatalog === 'object') {
  updated = serializeLevelCatalog(levelCatalog);
}

if (updated !== source) {
  fs.writeFileSync(levelsPath, updated, 'utf8');
  console.log(`Updated ${levelsPath}`);
} else {
  console.log(`No changes needed in ${levelsPath}`);
}
