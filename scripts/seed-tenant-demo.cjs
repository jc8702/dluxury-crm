// seed-tenant-demo.cjs — Arte & Madeira (marcenaria fictícia de teste)
const https = require('https');
const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');

const DATABASE_URL = process.env.DATABASE_URL;
const INIT_KEY = process.env.APP_INIT_KEY;

if (!DATABASE_URL) {
  console.error('❌ ERRO: A variável de ambiente DATABASE_URL é obrigatória.');
  process.exit(1);
}
if (!INIT_KEY) {
  console.error('❌ ERRO: A variável de ambiente APP_INIT_KEY é obrigatória.');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const TENANT_ID     = 'aaaaaaaa-1111-4111-8111-111111111111';
const ADMIN_EMAIL   = 'admin@artemadeira.com.br';
const ADMIN_PASS    = 'Arte@2024';
const VENDEDOR_EMAIL = 'vendas@artemadeira.com.br';
const VENDEDOR_PASS  = 'Vendas@2024';

async function safeSql(query) {
  try { await query; return true; } catch (e) { console.log('  (migração segura):', e.message.substring(0, 80)); return false; }
}

async function main() {
  console.log('🔧 Disparando init-db via API da Vercel...');
  try {
    await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'dluxury-crm.vercel.app',
        path: '/api/init-db',
        method: 'GET',
        headers: { 'x-init-key': INIT_KEY }
      }, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => { console.log('→ HTTP', res.statusCode); resolve(); });
      });
      req.on('error', reject);
      req.end();
    });
  } catch (e) { console.log('⚠️', e.message); }

  // Aguardar 2s
  await new Promise(r => setTimeout(r, 2000));

  console.log('\n🪵 Iniciando seed da marcenaria fictícia "Arte & Madeira"...\n');

  // ── MIGRAÇÕES PREVENTIVAS ─────────────────────────────────
  console.log('📦 Aplicando migrações preventivas no banco...');

  // Garantir tenant_id na tabela users (pode não existir em produção ainda)
  await safeSql(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE`);

  // Garantir referências em subscriptions
  await safeSql(sql`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS asaas_customer_id VARCHAR(255)`);
  await safeSql(sql`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS asaas_subscription_id VARCHAR(255)`);
  await safeSql(sql`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plano VARCHAR(50) DEFAULT 'free'`);
  await safeSql(sql`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS valor DECIMAL(12,2) DEFAULT 0`);
  await safeSql(sql`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS dia_vencimento INTEGER`);
  await safeSql(sql`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE`);
  await safeSql(sql`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`);

  // Garantir tenant_configs existe
  await safeSql(sql`
    CREATE TABLE IF NOT EXISTS tenant_configs (
      tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
      espessura_padrao_mdf INTEGER DEFAULT 15,
      largura_maxima_sem_travessa INTEGER DEFAULT 800,
      folga_gaveta_telescopica NUMERIC(4,2) DEFAULT 13.00,
      markup_padrao NUMERIC(5,2) DEFAULT 1.50,
      gemini_api_key_custom TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  console.log('✅ Migrações aplicadas\n');

  // ── TENANT ─────────────────────────────────────────────────
  await sql`
    INSERT INTO tenants (id, nome, subdominio, dominio_personalizado, plano_tier, status)
    VALUES (${TENANT_ID}, 'ARTE & MADEIRA MARCENARIA', 'artemadeira', 'crm.artemadeira.com.br', 'pro', 'ativo')
    ON CONFLICT (id) DO UPDATE SET nome=EXCLUDED.nome, status=EXCLUDED.status
  `;
  console.log('✅ Tenant: ARTE & MADEIRA MARCENARIA');

  // ── CONFIG DO TENANT ───────────────────────────────────────
  await sql`
    INSERT INTO tenant_configs (tenant_id, espessura_padrao_mdf, largura_maxima_sem_travessa, folga_gaveta_telescopica, markup_padrao)
    VALUES (${TENANT_ID}, 15, 800, 13.00, 1.65)
    ON CONFLICT (tenant_id) DO UPDATE SET markup_padrao=1.65
  `;
  console.log('✅ Configurações: markup 1.65x');

  // ── ASSINATURA ─────────────────────────────────────────────
  await sql`
    INSERT INTO subscriptions (tenant_id, status, plano, valor, dia_vencimento, current_period_end)
    VALUES (${TENANT_ID}, 'active', 'pro', 297.00, 5, NOW() + INTERVAL '30 days')
    ON CONFLICT DO NOTHING
  `;
  console.log('✅ Assinatura Pro — R$ 297,00/mês — válida por 30 dias');

  // ── ADMIN ──────────────────────────────────────────────────
  const hashAdmin = await bcrypt.hash(ADMIN_PASS, 10);
  await sql`
    INSERT INTO users (name, email, password_hash, role, tenant_id)
    VALUES ('CARLOS MENDONÇA', ${ADMIN_EMAIL}, ${hashAdmin}, 'admin', ${TENANT_ID})
    ON CONFLICT (email) DO UPDATE SET password_hash=${hashAdmin}, name='CARLOS MENDONÇA', tenant_id=${TENANT_ID}, role='admin'
  `;
  console.log('✅ Admin: ' + ADMIN_EMAIL + ' / ' + ADMIN_PASS);

  // ── VENDEDOR ───────────────────────────────────────────────
  const hashVend = await bcrypt.hash(VENDEDOR_PASS, 10);
  await sql`
    INSERT INTO users (name, email, password_hash, role, tenant_id)
    VALUES ('FERNANDA ROCHA', ${VENDEDOR_EMAIL}, ${hashVend}, 'vendedor', ${TENANT_ID})
    ON CONFLICT (email) DO UPDATE SET password_hash=${hashVend}, name='FERNANDA ROCHA', tenant_id=${TENANT_ID}, role='vendedor'
  `;
  console.log('✅ Vendedor: ' + VENDEDOR_EMAIL + ' / ' + VENDEDOR_PASS);

  // ── CLIENTES DEMO ──────────────────────────────────────────
  await safeSql(sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE`);
  for (const c of [
    { nome:'RODRIGO FERREIRA', email:'rodrigo@email.com', telefone:'(11) 99234-5678', cidade:'São Paulo', uf:'SP' },
    { nome:'ANA CLARA SANTOS', email:'anaclara@email.com', telefone:'(11) 98765-4321', cidade:'Campinas', uf:'SP' },
    { nome:'MARCO AURÉLIO LIMA', email:'marco@email.com', telefone:'(11) 97654-3210', cidade:'São Paulo', uf:'SP' },
  ]) {
    await safeSql(sql`INSERT INTO clients (nome, email, telefone, cidade, uf, status, tenant_id) VALUES (${c.nome}, ${c.email}, ${c.telefone}, ${c.cidade}, ${c.uf}, 'ativo', ${TENANT_ID}) ON CONFLICT DO NOTHING`);
  }
  console.log('✅ 3 clientes de exemplo criados');

  // ── RESULTADO FINAL ────────────────────────────────────────
  console.log('\n' + '='.repeat(58));
  console.log('🎉  AMBIENTE DE TESTE PRONTO!');
  console.log('='.repeat(58));
  console.log('🏭  EMPRESA  :  ARTE & MADEIRA MARCENARIA');
  console.log('🌐  URL      :  https://dluxury-crm.vercel.app');
  console.log('─'.repeat(58));
  console.log('🔑  ADMINISTRADOR:');
  console.log('    E-mail  :  ' + ADMIN_EMAIL);
  console.log('    Senha   :  ' + ADMIN_PASS);
  console.log('    Perfil  :  Acesso total');
  console.log('─'.repeat(58));
  console.log('🔑  VENDEDOR:');
  console.log('    E-mail  :  ' + VENDEDOR_EMAIL);
  console.log('    Senha   :  ' + VENDEDOR_PASS);
  console.log('    Perfil  :  Acesso comercial');
  console.log('─'.repeat(58));
  console.log('📦  PLANO    :  Pro — R$ 297,00/mês — 30 dias válidos');
  console.log('='.repeat(58));
}

main().catch(e => { console.error('\n❌ ERRO:', e.message); process.exit(1); });
