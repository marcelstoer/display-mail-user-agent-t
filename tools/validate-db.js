#!/usr/bin/env node
/**
 * Validates content/dispmua-database.json and content/48x48/ icons.
 *
 * Checks performed:
 *   1. JSON validity
 *   2. Duplicate entry keys (known pre-existing ones are reported as warnings)
 *   3. Orphaned icon references (DB entry points to a file that does not exist)
 *   4. Icon dimensions: every file in content/48x48/ must be exactly 48×48 px
 *      — PNG files: width/height are read from the IHDR chunk (bytes 16–23)
 *      — files whose first 8 bytes are not the PNG signature are reported as
 *        wrong-format errors (and their dimensions cannot be checked)
 *
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const DB_PATH   = join(ROOT, 'content', 'dispmua-database.json');
const ICONS_DIR = join(ROOT, 'content', '48x48');

// PNG file signature (first 8 bytes).
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

// ---------------------------------------------------------------------------

let errorCount = 0;

function error(msg) {
  console.error(`  ERROR: ${msg}`);
  errorCount++;
}

// ---------------------------------------------------------------------------
// 1. JSON validity
// ---------------------------------------------------------------------------
console.log('\n[1] JSON validity');
let db;
let jsonText;
try {
  jsonText = readFileSync(DB_PATH, 'utf8');
  db       = JSON.parse(jsonText);
  console.log('  OK — JSON is valid');
} catch (e) {
  error(`JSON parse failed: ${e.message}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 2. Duplicate keys
//    JSON.parse silently keeps the last value for duplicate keys within the
//    same object.  We tokenise the raw text tracking brace/bracket depth so
//    that only keys within the same section object are compared.  Keys that
//    appear in different sections (e.g. "cisco" in "c" and "organization")
//    are intentional and are not flagged.
// ---------------------------------------------------------------------------
console.log('\n[2] Duplicate key detection');
{
  // Minimal tokeniser: match JSON strings or single structural characters.
  const tokenRe = /"(?:[^"\\]|\\.)*"|[{}[\]]/g;
  let depth = 0;       // object nesting depth
  let arrayDepth = 0;  // array nesting depth within the current object level
  let currentSection = null;
  let prevStr = null;
  const sectionKeys = new Map(); // section → Map<key, count>
  let tok;
  while ((tok = tokenRe.exec(jsonText)) !== null) {
    const t = tok[0];
    if (t === '{') {
      depth++;
      if (depth === 2 && prevStr !== null) {
        currentSection = prevStr;
        sectionKeys.set(currentSection, new Map());
      }
      prevStr = null;
    } else if (t === '}') {
      depth--;
      prevStr = null;
    } else if (t === '[') {
      arrayDepth++;
      prevStr = null;
    } else if (t === ']') {
      arrayDepth--;
      prevStr = null;
    } else {
      // JSON string token
      const str = JSON.parse(t);
      if (depth === 2 && arrayDepth === 0) {
        // String at the top level of a section object → entry key
        const counts = sectionKeys.get(currentSection);
        if (counts) counts.set(str, (counts.get(str) ?? 0) + 1);
      }
      prevStr = str;
    }
  }
  let newDupes = 0;
  for (const [section, keys] of sectionKeys) {
    for (const [key, count] of keys) {
      if (count > 1) {
        error(`Duplicate key: "${key}" appears ${count} times in section "${section}"`);
        newDupes++;
      }
    }
  }
  if (newDupes === 0) {
    console.log('  OK — no duplicate keys found');
  }
}

// ---------------------------------------------------------------------------
// 3. Orphaned icon references
//    Walk all second-level values in the DB; each entry is [iconFile, url?, name?].
// ---------------------------------------------------------------------------
console.log('\n[3] Orphaned icon references');
{
  const iconFiles = new Set(readdirSync(ICONS_DIR).filter(f => f.endsWith('.png')));

  function collectIconRefs(obj) {
    const refs = [];
    for (const value of Object.values(obj)) {
      if (Array.isArray(value)) {
        refs.push(value[0]);
      } else if (typeof value === 'object' && value !== null) {
        refs.push(...collectIconRefs(value));
      }
    }
    return refs;
  }

  const iconRefs = collectIconRefs(db);
  let newOrphans = 0;
  for (const ref of iconRefs) {
    if (ref && !iconFiles.has(ref)) {
      error(`Orphaned icon reference: "${ref}" not found in content/48x48/`);
      newOrphans++;
    }
  }
  if (newOrphans === 0) {
    console.log(`  OK — no orphaned icon references (${iconRefs.length} entries checked)`);
  }
}

// ---------------------------------------------------------------------------
// 4. Icon format and dimensions
//    Read first 24 bytes of each file.
//    PNG layout:
//      bytes  0– 7  PNG signature
//      bytes  8–11  IHDR chunk length (always 13)
//      bytes 12–15  chunk type "IHDR"
//      bytes 16–19  width  (big-endian uint32)
//      bytes 20–23  height (big-endian uint32)
// ---------------------------------------------------------------------------
console.log('\n[4] Icon format and dimensions');
{
  const iconFiles = readdirSync(ICONS_DIR).filter(f => f.endsWith('.png'));
  let newFormatErrors = 0;
  let newDimErrors    = 0;

  for (const file of iconFiles) {
    const buf = readFileSync(join(ICONS_DIR, file));

    if (buf.length < 24) {
      error(`${file}: file too small to be a valid PNG (${buf.length} bytes)`);
      newFormatErrors++;
      continue;
    }

    // Check PNG signature.
    const isPng = PNG_SIG.every((byte, i) => buf[i] === byte);
    if (!isPng) {
      error(`${file}: not a PNG file (wrong file signature)`);
      newFormatErrors++;
      continue; // can't read PNG dimensions from a non-PNG
    }

    const width  = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    if (width !== 48 || height !== 48) {
      error(`${file}: expected 48×48, got ${width}×${height}`);
      newDimErrors++;
    }
  }

  if (newFormatErrors === 0 && newDimErrors === 0) {
    console.log(`  OK — no format or dimension errors (${iconFiles.length} files checked)`);
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('');
if (errorCount > 0) {
  console.error(`Validation FAILED — ${errorCount} error(s) found.`);
  process.exit(1);
} else {
  console.log('All checks passed.');
}
