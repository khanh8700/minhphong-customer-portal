#!/usr/bin/env node
/**
 * Migration Linter — chạy trên PR để bắt lỗi trước khi apply lên DB.
 *
 * Kiểm tra:
 *  1. Naming convention: `<YYYYMMDDHHmmss>_<snake_case>.sql`.
 *  2. Timestamp không nằm trong tương lai > 24h (tránh paste nhầm).
 *  3. Không có 2 file cùng timestamp.
 *  4. Cảnh báo (không fail) các pattern phá huỷ dữ liệu: DROP TABLE, DROP COLUMN,
 *     ALTER COLUMN ... TYPE, TRUNCATE, DELETE FROM không có WHERE.
 *  5. Yêu cầu DROP/ALTER dùng IF EXISTS / IF NOT EXISTS để idempotent.
 *
 * Exit code:
 *  - 0: PASS (có thể có warning, nhưng không lỗi fatal)
 *  - 1: FAIL (ít nhất 1 lỗi)
 *
 * Chạy local: `node scripts/database/validate-migrations.mjs`
 * Chạy CI:    step `run: node scripts/database/validate-migrations.mjs`
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const MIGRATIONS_DIR = resolve(process.cwd(), 'supabase/migrations');
const FILE_PATTERN = /^(\d{14})_([a-z0-9_]+)\.sql$/;
const MAX_FUTURE_HOURS = 24;

const DESTRUCTIVE_PATTERNS = [
  { re: /\bDROP\s+TABLE\b(?!\s+IF\s+EXISTS)/i, msg: 'DROP TABLE không có IF EXISTS' },
  { re: /\bDROP\s+COLUMN\b(?!\s+IF\s+EXISTS)/i, msg: 'DROP COLUMN không có IF EXISTS' },
  { re: /\bDROP\s+FUNCTION\b(?!\s+IF\s+EXISTS)/i, msg: 'DROP FUNCTION không có IF EXISTS' },
  { re: /\bTRUNCATE\s+TABLE\b/i, msg: 'TRUNCATE TABLE (mất toàn bộ data)' },
  { re: /\bALTER\s+COLUMN\s+\w+\s+TYPE\b/i, msg: 'ALTER COLUMN ... TYPE (có thể mất data nếu không cast được)' },
  { re: /\bDELETE\s+FROM\s+\w+\s*;/i, msg: 'DELETE FROM không có WHERE (xoá toàn bảng)' },
];

const errors = [];
const warnings = [];

function parseTimestamp(ts) {
  // YYYYMMDDHHmmss → Date
  const y = Number(ts.slice(0, 4));
  const mo = Number(ts.slice(4, 6)) - 1;
  const d = Number(ts.slice(6, 8));
  const h = Number(ts.slice(8, 10));
  const mi = Number(ts.slice(10, 12));
  const s = Number(ts.slice(12, 14));
  return new Date(Date.UTC(y, mo, d, h, mi, s));
}

function main() {
  let files;
  try {
    files = readdirSync(MIGRATIONS_DIR);
  } catch (err) {
    console.error(`❌ Không đọc được ${MIGRATIONS_DIR}:`, err.message);
    process.exit(1);
  }

  const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort();
  const seenTimestamps = new Map();
  const now = Date.now();

  console.log(`🔍 Kiểm tra ${sqlFiles.length} migration...\n`);

  for (const file of sqlFiles) {
    const fullPath = join(MIGRATIONS_DIR, file);
    if (!statSync(fullPath).isFile()) continue;

    // 1. Naming
    const match = file.match(FILE_PATTERN);
    if (!match) {
      errors.push(`${file}: sai format, phải match /^\\d{14}_[a-z0-9_]+\\.sql$/`);
      continue;
    }

    const [, ts, name] = match;

    // 2. Timestamp future check
    const tsDate = parseTimestamp(ts);
    const diffHours = (tsDate.getTime() - now) / 3_600_000;
    if (diffHours > MAX_FUTURE_HOURS) {
      errors.push(
        `${file}: timestamp ${tsDate.toISOString()} nằm trong tương lai > ${MAX_FUTURE_HOURS}h. ` +
          `Có thể bạn paste nhầm timestamp.`,
      );
    }

    // 3. Duplicate timestamp
    if (seenTimestamps.has(ts)) {
      errors.push(
        `${file}: trùng timestamp với ${seenTimestamps.get(ts)}. ` +
          `Mỗi migration phải có timestamp duy nhất.`,
      );
    } else {
      seenTimestamps.set(ts, file);
    }

    // 4-5. Destructive pattern scan
    const sql = readFileSync(fullPath, 'utf8');
    for (const { re, msg } of DESTRUCTIVE_PATTERNS) {
      if (re.test(sql)) {
        warnings.push(`${file}: ${msg}`);
      }
    }
  }

  // Report
  if (warnings.length > 0) {
    console.log(`⚠️  ${warnings.length} cảnh báo (review kỹ trước khi merge):`);
    for (const w of warnings) console.log(`   - ${w}`);
    console.log();
  }

  if (errors.length > 0) {
    console.log(`❌ ${errors.length} lỗi:`);
    for (const e of errors) console.log(`   - ${e}`);
    console.log();
    process.exit(1);
  }

  console.log(`✅ Pass: ${sqlFiles.length} migration hợp lệ.`);
  if (warnings.length > 0) {
    console.log(`   (có ${warnings.length} cảnh báo — không block merge, nhưng reviewer cần verify).`);
  }
}

main();
