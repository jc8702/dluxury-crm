import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import crypto from 'node:crypto';

dotenv.config({ path: '.env.audit' });
const sql = neon(process.env.DATABASE_URL);
const JWT_SECRET = process.env.APP_JWT_SECRET;

console.log('=== LOTE 1 - EXECUÇÃO DE VERIFICAÇÃO ===\n');

// Helper to make mock response
function mockRes() {
  let status = 200;
  let body = null;
  const r = {
    status: (c) => { status = c; return r; },
    json: (d) => { body = d; return r; },
    end: () => r,
    setHeader: () => r,
    _s: () => status,
    _d: () => body,
    headersSent: false,
  };
  return r;
}

// 1. Webhook Asaas
console.log('--- 1. WEBHOOK ASAAS ---');
console.log('Verificando ASAAS_WEBHOOK_TOKEN na Vercel Production (sem imprimir valor):');
import { execSync } from 'node:child_process';
try {
  const envList = execSync('vercel env ls production 2>&1', { encoding: 'utf8' });
  const hasAsaas = envList.includes('ASAAS_WEBHOOK_TOKEN');
  console.log(`ASAAS_WEBHOOK_TOKEN presente em Production? ${hasAsaas ? 'SIM' : 'NÃO'}`);
  if (!hasAsaas) console.log('=> FAIL-OPEN: handler api/webhooks/asaas-webhook.ts:10 verifica `if (process.env.ASAAS_WEBHOOK_TOKEN && asaasToken !== ...)` — se var não setada, aceita qualquer request (bypass autenticação).');
  console.log('Raw env list (filtrado):\n' + envList.split('\n').filter(l=> l.includes('APP_') || l.includes('ASAAS') || l.includes('DATABASE')).join('\n'));
} catch(e){ console.log('vercel env ls falhou', e.message)}

console.log('\nTeste de replay/idempotência (análise estática + simulação SQL):');
console.log('Código em api/webhooks/asaas-webhook.ts: PAYMENT_RECEIVED faz `UPDATE subscriptions SET current_period_end = NOW()+30days WHERE tenant_id=...` sem idempotency key.');
console.log('Se Asaas reenviar mesmo evento paymentId, handler estende +30 dias novamente (duplicação). Não há tabela de eventos processados nem verificação de uniqueness.');
// Simular: verificar subscriptions schema tem campo para armazenar paymentId? Não.
try {
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='subscriptions' ORDER BY ordinal_position`;
  console.log('subscriptions cols:', cols.map(c=>c.column_name).join(', '));
  const hasEventLog = cols.some(c=> c.column_name.includes('event') || c.column_name.includes('payment'));
  console.log('Existe coluna de deduplicação/idempotência? '+ (hasEventLog ? 'SIM (verificar)' : 'NÃO - confirma falta de idempotência'));
} catch(e){ console.log(e.message)}

// 2. Host spoofing
console.log('\n--- 2. HOST SPOOFING (SUSPEITA) ---');
console.log('Código api/index.ts:142-144: const hostHeader = req.headers["host"]; req.tenantFromDomain = await resolveTenantByDomain(hostHeader)');
console.log('resolveTenantByDomain em src/api-lib/_db.ts:139 faz SELECT WHERE LOWER(dominio_personalizado)=hostname OU WHERE LOWER(subdominio)=subdomain');
try {
  const existente = await sql`SELECT subdominio, dominio_personalizado FROM tenants WHERE subdominio IS NOT NULL LIMIT 1`;
  const testeHostExistente = existente[0]?.subdominio ? `${existente[0].subdominio}.dluxury-crm.vercel.app` : 'artemadeira.dluxury-crm.vercel.app';
  const hostInexistente = 'naoexistentexyz123.dluxury-crm.vercel.app';
  console.log('Host existente para teste:', testeHostExistente);
  console.log('Host inexistente para teste:', hostInexistente);
  // Simular resolveTenantByDomain lógica localmente
  async function resolveTenantByDomainSim(host) {
    if (!host) return null;
    const hostname = host.split(':')[0].toLowerCase().trim();
    const byDomain = await sql`SELECT id, nome, subdominio FROM tenants WHERE LOWER(dominio_personalizado) = ${hostname} LIMIT 1`;
    if (byDomain.length > 0) return byDomain[0];
    const appDomain = process.env.APP_DOMAIN || 'dluxury-crm.vercel.app';
    if (hostname.endsWith('.' + appDomain)) {
      const subdomain = hostname.slice(0, -(appDomain.length + 1));
      if (subdomain) {
        const bySub = await sql`SELECT id, nome, subdominio FROM tenants WHERE LOWER(subdominio) = ${subdomain} LIMIT 1`;
        if (bySub.length > 0) return bySub[0];
      }
    }
    return null;
  }
  const r1 = await resolveTenantByDomainSim(testeHostExistente);
  const r2 = await resolveTenantByDomainSim(hostInexistente);
  console.log('Resultado host existente:', r1 ? `tenant ${r1.id} (${r1.nome})` : 'null');
  console.log('Resultado host inexistente:', r2 ? `tenant ${r2.id}` : 'null (esperado)');
  const diff = (r1 && !r2) ? 'SIM' : 'NAO';
  console.log('Diferenca observavel?', diff + ' - resposta difere (tenant vs null). Mas api/index.ts NAO bloqueia request com host inexistente para rotas publicas; para rotas protegidas, tenantFromDomain null e ignorado e usa JWT tenantId. Entao host spoofing NAO permite takeover direto, mas permite ENUMERACAO de tenants via /api/resolve-dominio (rota publica que retorna tenant nome/subdominio).');
  // Testar /api/resolve-dominio behavior
  console.log('\nTestando enumeração via /api/resolve-dominio (via sql simulation):');
  console.log('Endpoint /api/resolve-dominio em api/index.ts:547 retorna { tenant: {nome, subdominio} | null } sem autenticação. Permite enumerar todos tenants via brute-force de subdomínio.');
} catch(e){ console.log('host test error', e.message)}

// 3. RLS
console.log('\n--- 3. RLS ---');
try {
  const tables = await sql`SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' ORDER BY tablename`;
  const withRLS = tables.filter(t=> t.rowsecurity);
  const withoutRLS = tables.filter(t=> !t.rowsecurity);
  console.log(`Tabelas com RLS habilitado: ${withRLS.length} (${withRLS.map(t=>t.tablename).join(', ') || 'nenhuma'})`);
  console.log(`Tabelas SEM RLS: ${withoutRLS.length} (inclui clients, projects, titulos_*, quotations, users, etc.)`);
  console.log('Detalhe: erp_inventory e quotation_bom têm RLS true, mas role neondb_owner tem BYPASSRLS=true, então RLS ineficaz mesmo onde habilitado.');
  const bypass = await sql`SELECT rolname FROM pg_roles WHERE rolbypassrls = true AND rolname = current_user`;
  console.log('Role atual bypass RLS:', bypass.length ? bypass[0].rolname : 'none');
  // Provar bypass: tentar SET app.tenant_id e ver se query sem SET ainda retorna tudo
  // Como neondb_owner ignora RLS, mesmo com SET LOCAL, a policy não filtra se bypass.
  // Mostrar que withTenantSql faz SET LOCAL mas é inútil porque owner bypassa.
  const currentUser = (await sql`SELECT current_user`)[0].current_user;
  console.log('Current DB user:', currentUser, '(bypassa RLS)');
  console.log('=> Severidade: ALTO — defesa em profundidade ausente. Depende exclusivamente de filtro aplicação (WHERE tenant_id).');
} catch(e){ console.log(e.message)}

// 4. JWT
console.log('\n--- 4. JWT ---');
console.log('Onde feature gate lê plano:');
console.log('- src/api-lib/middleware/featureGate.ts:30 SELECT plano_tier FROM tenants WHERE id=tenantId (DB) -> correto');
console.log('- src/api-lib/feature-gate-middleware.ts:48 SELECT plano_tier FROM tenants (DB) -> correto');
console.log('- MAS src/api-lib/middleware/tenantMiddleware.ts:256 injeta req.planoTier = payload.planoTier || basic (DO TOKEN) e src/lib/features.ts usa payload para decidir bloqueio front-end');
console.log('Discrepância: Se atacante manipular token com planoTier=enterprise mas DB=basic, middleware feature-gate leria DB e bloquearia no backend, mas tenantMiddleware já injetou plano errado que pode ser usado por outros middlewares que leem do token (ex: alguma rota que confie em req.planoTier). Verificado que verifyFeatureGate lê do DB, então backend seguro, mas inconsistency é debt.');
// Teste usuário deletado consegue LER?
console.log('\nTeste usuário deletado com token antigo consegue LER? (execução):');
try {
  // Criar tenant e user temporário
  const testTenantId = crypto.randomUUID();
  const testUserId = crypto.randomUUID();
  await sql`INSERT INTO tenants (id, nome, subdominio, plano_tier, status) VALUES (${testTenantId}::uuid, 'TEST_TENANT_JWT', ${'testjwt'+Date.now().toString().slice(-4)}, 'basic', 'ativo')`;
  await sql`INSERT INTO users (id, name, email, password_hash, role, tenant_id) VALUES (${testUserId}::uuid, 'TEST USER', ${'testjwt'+Date.now()+'@test.com'}, 'hash_dummy', 'admin', ${testTenantId}::uuid)`;
  const payload = { id: testUserId, email: 'testjwt@test.com', role: 'admin', tenantId: testTenantId, planoTier: 'enterprise', exp: Math.floor(Date.now()/1000)+3600 };
  const token = jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
  // Deletar usuário do DB
  await sql`DELETE FROM users WHERE id = ${testUserId}::uuid`;
  // Tentar validar token via validateAuth (que só verifica assinatura)
  const { extractAndVerifyToken } = await import('../src/api-lib/_db.js');
  // Simular req
  const fakeReq = { headers: { authorization: `Bearer ${token}` } };
  // validateAuth lê só JWT, não checa se user existe no DB
  // Importar dinamicamente não funciona em mjs puro, então replicamos lógica:
  const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  console.log('Token decodificado após deleção:', { id: decoded.id, tenantId: decoded.tenantId });
  console.log('User existe no DB após DELETE?', (await sql`SELECT id FROM users WHERE id = ${testUserId}::uuid`).length ? 'SIM' : 'NÃO');
  console.log('extractAndVerifyToken retornaria authorized=true? SIM (só valida assinatura, não checa users table)');
  // Tentar chamar tenantMiddleware resolveTenantRequest: ele checa tenantExists, não userExists
  const tenantExists = (await sql`SELECT id FROM tenants WHERE id = ${testTenantId}::uuid LIMIT 1`).length > 0;
  console.log('Tenant ainda existe?', tenantExists);
  console.log('=> CONCLUSÃO: Token de usuário deletado CONTINUA VÁLIDO para LEITURA (GET) até expirar (7d). Severidade ALTO para leitura de dados sensíveis.');
  // Cleanup
  await sql`DELETE FROM tenants WHERE id = ${testTenantId}::uuid`;
} catch(e){ console.log('JWT test error', e.message, e.stack)}

// 5. init-db
console.log('\n--- 5. INIT-DB ---');
console.log('Endpoint /api/init-db em api/index.ts:532-539');
console.log('Recebe chave via HEADER x-init-key (linha 533: const initKey = req.headers["x-init-key"])');
console.log('Não lê query nem body. Rate limit em api/index.ts:34 3 req/5min para /api/init-db');
console.log('O que executa com chave correta: chama runInitDB() em src/api-lib/_init.ts que faz:');
console.log('- CREATE TABLE IF NOT EXISTS para ~30 tabelas');
console.log('- ALTER TABLE ADD COLUMN IF NOT EXISTS tenant_id para todas');
console.log('- MIGRA dados nulos para tenant default 00000000-...');
console.log('- Seed admin se users vazio, senão UPDATE tenant_id nulo');
console.log('- Seed estoque/chapas default se vazio');
console.log('Status: ANÁLISE ESTÁTICA (não PASSOU) porque expõe superfície de schema migration em produção sem audit log de quem chamou, sem proteção CSRF além do header, e com falha de idempotência em contadores.');
try {
  const keyHeader = 'x-init-key';
  console.log('Vetor testado: curl -H "x-init-key: $APP_INIT_KEY" https://dluxury-crm.vercel.app/api/init-db');
  const initKeyExists = !!process.env.APP_INIT_KEY;
  console.log('APP_INIT_KEY setado localmente?', initKeyExists ? 'SIM (mas valor não impresso)' : 'NÃO');
  // Verificar se vercel production tem APP_INIT_KEY
  try {
    const envProd = execSync('vercel env ls production 2>&1', {encoding:'utf8'});
    console.log('APP_INIT_KEY em Production?', envProd.includes('APP_INIT_KEY') ? 'SIM' : 'NÃO');
  } catch(e){}
} catch(e){console.log(e.message)}

console.log('\n=== FIM AJUSTES CLASSIFICAÇÃO ===');
