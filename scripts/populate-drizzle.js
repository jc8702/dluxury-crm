import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import fs from 'fs'
import crypto from 'crypto'

const sql = neon(process.env.DATABASE_URL)
const journal = JSON.parse(fs.readFileSync('./drizzle/meta/_journal.json', 'utf8'))

console.log(`Journal entries: ${journal.entries.length}`)

for (const e of journal.entries) {
  const sqlPath = `./drizzle/${e.tag}.sql`
  if (!fs.existsSync(sqlPath)) {
    console.log(`skip ${e.tag} (no sql file)`)
    continue
  }
  const content = fs.readFileSync(sqlPath, 'utf8')
  // drizzle hash is sha256 of file content truncated - mimic drizzle-kit
  const hash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 12)
  try {
    await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${hash}, ${e.when}) ON CONFLICT DO NOTHING`
    console.log(`+ ${e.tag} ${hash} ${e.when}`)
  } catch (err) {
    // fallback for simple table with manual hash column
    try {
      await sql.query(`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('${hash}', ${e.when}) ON CONFLICT DO NOTHING`)
      console.log(`+ ${e.tag} ${hash} (fallback)`)
    } catch (e2) {
      console.error(`fail ${e.tag}`, e2.message.slice(0,300))
    }
  }
}

const rows = await sql.query('SELECT count(*) as c FROM drizzle.__drizzle_migrations')
console.log(`drizzle count now: ${rows[0].c} / ${journal.entries.length}`)

// also ensure the original manual row does not conflict - update it to proper hash if needed
const all = await sql.query('SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at')
console.log('all rows:', all)
