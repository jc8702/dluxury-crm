import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function main() {
  const hash = '$2b$10$Jlcr1lwz1YXwypO/Kk0OyuGGaI5EplAHR6tq6nTzx/N6iVLuoNmOa';
  await sql`UPDATE users SET password_hash = ${hash} WHERE email = 'admin@dluxury.com'`;
  console.log('Admin password updated to admin123');
}

main().catch(console.error);
