const postgres = require('postgres');
const dotenv = require('dotenv');

dotenv.config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function check() {
  try {
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log('Tables:', tables.map(t => t.table_name).join(', '));

    const projects = await sql`SELECT * FROM projects LIMIT 5`;
    console.log('Projects:', JSON.stringify(projects, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(err);
    process.exit(1);
  }
}
check();
