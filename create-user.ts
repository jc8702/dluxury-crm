import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL!);

async function createAdmin() {
  let tenantId;
  const tenants = await sql`SELECT id FROM tenants LIMIT 1`;
  if (tenants.length === 0) {
    const tenant = await sql`
      INSERT INTO tenants (nome)
      VALUES ('D-Luxury')
      RETURNING id
    `;
    tenantId = tenant[0].id;
  } else {
    tenantId = tenants[0].id;
  }
  
  await sql`
    INSERT INTO users (name, email, password_hash, role, tenant_id)
    VALUES ('Admin', 'admin@admin.com', '123456', 'admin', ${tenantId})
    ON CONFLICT (email) DO UPDATE SET password_hash = '123456'
  `;
  console.log('User admin@admin.com created/updated with password: 123456');
}

createAdmin().catch(console.error);
