/**
 * Guards the one rule the test suite here cannot check: that the SQL runs on both engines.
 *
 *   node server/scripts/check-sql-portability.mjs
 *
 * Everything in `server/test/` runs against PostgreSQL, because that is what this machine
 * has. The SQL Server half is verified on the group's Windows box, which means a construct
 * only Postgres understands can sit in the codebase for days looking perfectly fine.
 *
 * So this scans the server source for the constructs the two engines spell differently.
 * It is a lint, not a parser — it reads text, and it can be fooled. What it cannot do is
 * stay silent while someone reaches for `RETURNING` out of habit.
 *
 * Every rule here corresponds to a decision recorded in docs/database.md. If a rule ever
 * needs to be turned off, that document is what has to change first.
 */
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SERVER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const RULES = [
  {
    name: 'RETURNING',
    pattern: /\.returning(All)?\s*\(|\bRETURNING\b/,
    why: 'Postgres only. SQL Server spells it OUTPUT INSERTED. Generate the id in the app, insert, then select it back.',
  },
  {
    name: 'OUTPUT INSERTED',
    pattern: /\bOUTPUT\s+INSERTED\b/i,
    why: 'SQL Server only. Same fix as RETURNING — generate the id in the app.',
  },
  {
    name: 'ON CONFLICT',
    pattern: /\.onConflict\s*\(|\bON\s+CONFLICT\b/i,
    why: 'Postgres only. SQL Server spells upsert MERGE. Delete-then-insert inside a transaction instead.',
  },
  {
    name: 'MERGE',
    pattern: /\bMERGE\s+INTO\b/i,
    why: 'SQL Server only. Delete-then-insert inside a transaction instead.',
  },
  {
    name: 'ILIKE',
    pattern: /['"`]ilike['"`]|\bILIKE\b/,
    why: 'Postgres only. Match the precomputed search_text column with a plain LIKE — see @/shared/text.',
  },
  {
    name: 'FOR UPDATE',
    pattern: /\bFOR\s+UPDATE\b|\bforUpdate\s*\(/i,
    why: 'Postgres only; SQL Server uses WITH (UPDLOCK, HOLDLOCK). Use a conditional UPDATE and check numUpdatedRows — see services/checkout.ts.',
  },
  {
    name: 'UPDLOCK / HOLDLOCK',
    pattern: /\bUPDLOCK\b|\bHOLDLOCK\b/i,
    why: 'SQL Server only. Use a conditional UPDATE and check numUpdatedRows.',
  },
  {
    name: 'serial / identity column',
    pattern: /\b(serial|bigserial)\b|\bidentity\s*\(/i,
    why: 'Spelled differently on each engine, and reading the new value back needs RETURNING/OUTPUT. Every primary key here is a string the app generates.',
  },
  {
    name: 'varchar in a migration',
    pattern: /['"`]varchar\(/i,
    why: "SQL Server's varchar is single-byte under most collations and eats Vietnamese diacritics. Use columnTypes().str(), which picks nvarchar there.",
  },
  {
    name: 'unaccent',
    pattern: /\bunaccent\b/i,
    why: 'A Postgres extension. The search_text column exists so neither engine needs one.',
  },
]

/**
 * `limit()` without an `orderBy()` in the same statement.
 *
 * SQL Server compiles LIMIT to OFFSET … FETCH, which *requires* an ORDER BY — so a query
 * that paginates fine on Postgres is a syntax error there. Checked per statement rather
 * than per file: two unrelated queries in one file must not vouch for each other.
 */
function findUnorderedLimits(source) {
  const hits = []
  for (const statement of source.split(/\.execute(?:TakeFirst(?:OrThrow)?)?\(\)/)) {
    if (/\.limit\s*\(/.test(statement) && !/\.orderBy\s*\(/.test(statement)) {
      const line = source.slice(0, source.indexOf(statement) + statement.length).split('\n').length
      hits.push(line)
    }
  }
  return hits
}

/**
 * Blank out comments while keeping every line where it was.
 *
 * Line-by-line stripping is not enough: these files explain at length *why* they avoid
 * `RETURNING` and `FOR UPDATE`, and those explanations run across many lines of a block
 * comment. The first version of this check reported fifteen problems, every one of them a
 * sentence saying the construct is not used — a lint nobody would keep running for long.
 *
 * Newlines survive so a reported line number still points at the right line.
 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (line) => ' '.repeat(line.length))
}

async function sourceFiles(dir) {
  const found = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    // Tests are allowed to write engine-specific SQL when proving a behaviour; the
    // application code is what has to stay portable.
    if (entry.isDirectory() && entry.name !== 'test' && entry.name !== 'scripts') {
      found.push(...(await sourceFiles(full)))
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      found.push(full)
    }
  }
  return found
}

const problems = []

/**
 * The one file allowed to name both spellings — it exists precisely to choose between
 * them, so a rule that fired here would be checking the check.
 */
const DIALECT_HELPER = path.join(SERVER, 'db', 'columnTypes.ts')

for (const file of await sourceFiles(SERVER)) {
  const raw = await readFile(file, 'utf8')
  const source = stripComments(raw)
  const rel = path.relative(path.join(SERVER, '..'), file)

  source.split('\n').forEach((text, i) => {
    if (!text.trim()) return

    for (const rule of RULES) {
      if (file === DIALECT_HELPER) continue
      if (rule.pattern.test(text)) {
        problems.push({ rel, line: i + 1, name: rule.name, why: rule.why, text: text.trim() })
      }
    }
  })

  for (const line of findUnorderedLimits(source)) {
    problems.push({
      rel,
      line,
      name: 'limit() without orderBy()',
      why: 'SQL Server compiles LIMIT to OFFSET … FETCH, which requires an ORDER BY.',
      text: '',
    })
  }
}

if (problems.length === 0) {
  console.log('✓ SQL khả chuyển: không thấy cấu trúc riêng của một engine nào.')
  process.exit(0)
}

console.error(`✗ Tìm thấy ${problems.length} chỗ có thể không chạy trên cả hai database:\n`)
for (const p of problems) {
  console.error(`  ${p.rel}:${p.line}  [${p.name}]`)
  if (p.text) console.error(`    ${p.text}`)
  console.error(`    → ${p.why}\n`)
}
process.exit(1)
