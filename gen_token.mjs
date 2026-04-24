import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL);
const JWT_SECRET = process.env.APP_JWT_SECRET || 'dluxury-industrial-secret-2024';

async function main() {
  const users = await sql`SELECT * FROM users LIMIT 1`;
  if (users.length === 0) {
    console.log('❌ No users found');
    return;
  }
  
  const user = users[0];
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  console.log('🎫 TOKEN:', token);
  console.log('👤 USER:', user.name, user.email);
}

main().catch(console.error);