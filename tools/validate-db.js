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
 * Pre-existing issues are tracked in the KNOWN_* sets below so they produce
 * warnings rather than errors.  Fix those issues and remove the entries.
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
// Pre-existing known issues — change to errors once fixed.
// ---------------------------------------------------------------------------

/** Duplicate keys in the DB (JSON.parse keeps the last value silently). */
const KNOWN_DUPLICATE_KEYS = new Set([
  'cisco',
  'm5mailer.com',
  'produced by phpbb2',
]);

/** DB entries that reference an icon file which does not exist. */
const KNOWN_ORPHANED_ICONS = new Set([
  'owamail3.png',          // referenced in DB but file is missing
  'scienceshumaines.png',  // referenced in DB but file is missing
]);

/** Icon files in content/48x48/ that are not PNG format. */
const KNOWN_WRONG_FORMAT = new Set([
  'netcorecloud.png',  // actually a JPEG file (48×48)
  'vfpwinsock.png',    // actually a JPEG file (48×48)
]);

/** Icon files in content/48x48/ whose dimensions are not 48×48. */
const KNOWN_WRONG_DIMENSIONS = new Set([
  'febooti.png',      // 37×37
  'gfwl.png',         // 48×49
  'hclmessenger.png', // 49×48
]);

// ---------------------------------------------------------------------------

let errorCount = 0;

function error(msg) {
  console.error(`  ERROR: ${msg}`);
  errorCount++;
}

function warn(msg) {
  console.warn(`  WARN:  ${msg}`);
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
//    JSON.parse silently keeps the last value for duplicate keys, so we scan
//    the raw text for patterns of the form  "key": [  which are DB entries.
// ---------------------------------------------------------------------------
console.log('\n[2] Duplicate key detection');
{
  const entryRe = /"([^"\\]+)":\s*\[/g;
  const keyCounts = new Map();
  let m;
  while ((m = entryRe.exec(jsonText)) !== null) {
    const k = m[1];
    keyCounts.set(k, (keyCounts.get(k) ?? 0) + 1);
  }
  let newDupes = 0;
  for (const [key, count] of keyCounts) {
    if (count > 1) {
      if (KNOWN_DUPLICATE_KEYS.has(key)) {
        warn(`Known duplicate key: "${key}" (${count} occurrences)`);
      } else {
        error(`Duplicate key: "${key}" appears ${count} times`);
        newDupes++;
      }
    }
  }
  if (newDupes === 0) {
    console.log('  OK — no new duplicate keys found');
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
      if (KNOWN_ORPHANED_ICONS.has(ref)) {
        warn(`Known orphaned icon reference: "${ref}"`);
      } else {
        error(`Orphaned icon reference: "${ref}" not found in content/48x48/`);
        newOrphans++;
      }
    }
  }
  if (newOrphans === 0) {
    console.log(`  OK — no new orphaned icon references (${iconRefs.length} entries checked)`);
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
      if (KNOWN_WRONG_FORMAT.has(file)) {
        warn(`Known wrong format: "${file}" is not a PNG file`);
      } else {
        error(`${file}: not a PNG file (wrong file signature)`);
        newFormatErrors++;
      }
      continue; // can't read PNG dimensions from a non-PNG
    }

    const width  = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    if (width !== 48 || height !== 48) {
      if (KNOWN_WRONG_DIMENSIONS.has(file)) {
        warn(`Known wrong dimensions: "${file}" is ${width}×${height}`);
      } else {
        error(`${file}: expected 48×48, got ${width}×${height}`);
        newDimErrors++;
      }
    }
  }

  if (newFormatErrors === 0 && newDimErrors === 0) {
    console.log(`  OK — no new format or dimension errors (${iconFiles.length} files checked)`);
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
