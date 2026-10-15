// Consistency check for lib/engines/categories.ts against lib/engines/index.ts.
//
// No test runner is configured in this project (see package.json — only
// `next build`/`next lint`), and this check doesn't need one: it's a plain
// Node script, run directly with `node lib/engines/categories.check.mjs`
// (exit 0 = pass, non-zero = fail, failure reason printed to stderr).
//
// It intentionally avoids importing the real .ts modules (which would drag
// in path-alias resolution and the full engine render chain just to read
// two arrays of string literals) and instead parses the source text for
// the two arrays directly — the same two arrays a human reviewer would
// compare by eye.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));

function extractStringLiterals(source, arrayStartRegex) {
  const startMatch = arrayStartRegex.exec(source);
  if (!startMatch) {
    throw new Error(`Could not locate array start matching ${arrayStartRegex}`);
  }
  const openBracketIndex = source.indexOf("[", startMatch.index + startMatch[0].length);
  if (openBracketIndex === -1) throw new Error("Could not find opening '[' for array");

  let depth = 0;
  let end = -1;
  for (let i = openBracketIndex; i < source.length; i++) {
    if (source[i] === "[") depth++;
    else if (source[i] === "]") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) throw new Error("Could not find matching ']' for array");

  const body = source.slice(openBracketIndex + 1, end);
  const literals = [...body.matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1]);
  return literals;
}

const indexSrc = readFileSync(path.join(dir, "index.ts"), "utf8");
const categoriesSrc = readFileSync(path.join(dir, "categories.ts"), "utf8");

const engineOrder = extractStringLiterals(indexSrc, /export const ENGINE_ORDER:\s*EngineId\[\]\s*=/);

// categoryOf's engineIds arrays: grab every `engineIds: [...]` occurrence.
const engineIdsBlocks = [...categoriesSrc.matchAll(/engineIds:\s*\[/g)];
let categoryEngineIds = [];
for (const block of engineIdsBlocks) {
  const openBracketIndex = block.index + block[0].length - 1;
  let depth = 0;
  let end = -1;
  for (let i = openBracketIndex; i < categoriesSrc.length; i++) {
    if (categoriesSrc[i] === "[") depth++;
    else if (categoriesSrc[i] === "]") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const body = categoriesSrc.slice(openBracketIndex + 1, end);
  const literals = [...body.matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1]);
  categoryEngineIds.push(...literals);
}

const errors = [];

const engineOrderSet = new Set(engineOrder);
if (engineOrderSet.size !== engineOrder.length) {
  errors.push("ENGINE_ORDER itself contains duplicates (unexpected, check index.ts)");
}

const categorySet = new Set(categoryEngineIds);
if (categorySet.size !== categoryEngineIds.length) {
  const seen = new Set();
  const dupes = categoryEngineIds.filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
  errors.push(`CATEGORIES has duplicate engine id(s): ${dupes.join(", ")}`);
}

const missingFromCategories = engineOrder.filter((id) => !categorySet.has(id));
if (missingFromCategories.length > 0) {
  errors.push(`Engine id(s) in ENGINE_ORDER but missing from CATEGORIES: ${missingFromCategories.join(", ")}`);
}

const extraInCategories = categoryEngineIds.filter((id) => !engineOrderSet.has(id));
if (extraInCategories.length > 0) {
  errors.push(`Engine id(s) in CATEGORIES but not in ENGINE_ORDER: ${extraInCategories.join(", ")}`);
}

if (errors.length > 0) {
  console.error("CATEGORIES / ENGINE_ORDER consistency check FAILED:");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `CATEGORIES / ENGINE_ORDER consistency check passed: ${engineOrder.length} engines, ${categoryEngineIds.length} categorized, set-equal.`
);
process.exit(0);
