import fetch from 'node-fetch';

async function main() {
  const res = await fetch('http://localhost:3000/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@dluxury.com', password: 'admin123', action: 'login' })
  });
  console.log(res.status);
  console.log(await res.text());
}

main().catch(console.error);
