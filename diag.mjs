import { chromium } from 'playwright';
const r = await fetch('https://dluxury-crm.vercel.app/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@dluxury.com', password: 'admin123' }),
});
const j = await r.json();
const token = j.data.token;
const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
console.log('JWT payload:', JSON.stringify(payload, null, 2));

const r2 = await fetch('https://dluxury-crm.vercel.app/api/clientes', {
  headers: { 'Authorization': `Bearer ${token}` },
});
const j2 = await r2.json();
console.log('\nClientes:', j2.success, 'count:', j2.data?.length);
console.log('Sample:', j2.data?.[0] || 'NENHUM');

const r3 = await fetch('https://dluxury-crm.vercel.app/api/clients', {
  headers: { 'Authorization': `Bearer ${token}` },
});
const j3 = await r3.json();
console.log('\nClients (singular):', j3.success, 'count:', j3.data?.length);
console.log('Sample:', j3.data?.[0] || 'NENHUM');
