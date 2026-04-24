import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const sql = neon(process.env.DATABASE_URL);

async function main() {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('admin123', salt);
  
  const r = await sql`
    INSERT INTO users (name, email, password_hash, role)
    VALUES ('Admin Test', 'admintest@test.com', ${hash}, 'admin')
    RETURNING id, name, email, role
  `;
  console.log('USER CREATED:', JSON.stringify(r[0], null, 2));
}

main().catch(console.error);