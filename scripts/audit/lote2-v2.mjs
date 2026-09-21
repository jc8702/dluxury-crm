import { neon } from '@neondatabase/serverless'; import dotenv from 'dotenv'; import jwt from 'jsonwebtoken'; import crypto from 'node:crypto';
dotenv.config({path:'.env'}); const sql=neon(process.env.DATABASE_URL); const JWT_SECRET=process.env.APP_JWT_SECRET; const BASE='http://localhost:3000';
function tok(id,email,role,tenantId){ return jwt.sign({id,email,role,tenantId,planoTier:'enterprise'},JWT_SECRET,{algorithm:'HS256',expiresIn:'7d'})}
async function http(m,p,token,body){ const h={'Content-Type':'application/json'}; if(token) h['Authorization']=`Bearer ${token}`; const r=await fetch(`${BASE}${p}`,{method:m,headers:h,body:body?JSON.stringify(body):undefined}); let j=null; try{j=await r.json()}catch{}; return {status:r.status, json:j}}

const tenantA=crypto.randomUUID(), tenantB=crypto.randomUUID();
const userA=crypto.randomUUID(), userB=crypto.randomUUID();
await sql`INSERT INTO tenants (id,nome,subdominio,plano_tier,status) VALUES (${tenantA}::uuid,'TA2',${'ta2'+Date.now().toString().slice(-6)},'enterprise','ativo')`;
await sql`INSERT INTO tenants (id,nome,subdominio,plano_tier,status) VALUES (${tenantB}::uuid,'TB2',${'tb2'+Date.now().toString().slice(-6)},'enterprise','ativo')`;
await sql`INSERT INTO users (id,name,email,password_hash,role,tenant_id) VALUES (${userA}::uuid,'UA2',${'ua2'+Date.now()+'@test.local'},'hash','admin',${tenantA}::uuid)`;
await sql`INSERT INTO users (id,name,email,password_hash,role,tenant_id) VALUES (${userB}::uuid,'UB2',${'ub2'+Date.now()+'@test.local'},'hash','admin',${tenantB}::uuid)`;
const tokenA=tok(userA,'ua2@test.local','admin',tenantA), tokenB=tok(userB,'ub2@test.local','admin',tenantB);
console.log('setup', (await sql`SELECT COUNT(*)::int as c FROM tenants WHERE id IN (${tenantA}::uuid, ${tenantB}::uuid)`)[0].c);

// retalhos correto: POST /api/retalhos {sku_chapa, largura_mm, altura_mm, espessura_mm}
let r=await http('POST','/api/retalhos',tokenA,{sku_chapa:'CHP-A', largura_mm:100, altura_mm:100, espessura_mm:15});
console.log('retalhos POST',r.status, JSON.stringify(r.json).slice(0,500));
if(r.json?.data?.id){
  let patchB=await http('PATCH',`/api/retalhos?id=${r.json.data.id}`,tokenB,{sku_chapa:'HACKED'});
  console.log('retalhos PATCH B',patchB.status);
  let db = await sql`SELECT sku_chapa FROM retalhos_estoque WHERE id = ${r.json.data.id}::uuid AND tenant_id=${tenantA}::uuid`;
  console.log('retalhos DB sku_chapa', db[0]?.sku_chapa, db[0]?.sku_chapa==='CHP-A'?'PASSOU':'FALHOU');
  await http('DELETE',`/api/retalhos?id=${r.json.data.id}`,tokenA);
  try{ await sql`DELETE FROM retalhos_estoque WHERE id=${r.json.data.id}::uuid`}catch{}
} else {
  // try alternative: via estoque? check handler expects sku_chapa
  console.log('retalhos create fail, trying with sku column');
  r=await http('POST','/api/retalhos',tokenA,{sku:'CHP-A', sku_chapa:'CHP-A', largura_mm:100, altura_mm:100, espessura_mm:15});
  console.log('retry',r.status, JSON.stringify(r.json).slice(0,500));
}

// calendario correto: POST /api/calendario/criar-evento
r=await http('POST','/api/calendario/criar-evento',tokenA,{titulo:'CAL_A', descricao:'teste', data_evento: new Date().toISOString().split('T')[0], hora_evento:'10:00', tipo_evento:'tarefa'});
console.log('calendario criar-evento POST',r.status, JSON.stringify(r.json).slice(0,600));
if(r.json?.evento?.id){
  let patchB=await http('PATCH',`/api/calendario?id=${r.json.evento.id}`,tokenB,{concluido:true});
  console.log('calendario PATCH B',patchB.status, JSON.stringify(patchB.json).slice(0,400));
  let db = await sql`SELECT titulo FROM eventos_calendario WHERE id=${r.json.evento.id} AND tenant_id=${tenantA}::uuid`;
  console.log('calendario DB titulo', db[0]?.titulo, db[0]?.titulo==='CAL_A'?'PASSOU':'FALHOU');
  await http('DELETE',`/api/calendario?id=${r.json.evento.id}`,tokenA);
  try{ await sql`DELETE FROM eventos_calendario WHERE id=${r.json.evento.id}`}catch{}
}

// estoque materiais: check actual table existence
let cols=await sql`SELECT tablename FROM pg_tables WHERE tablename IN ('materiais','erp_chapas','estoque_materiais_detalhado')`;
console.log('estoque tables', cols.map(c=>c.tablename).join(','));
r=await http('GET','/api/estoque',tokenA);
console.log('estoque GET',r.status, JSON.stringify(r.json).slice(0,400));
if(r.status===500){ console.log('estoque erro', r.json?.error?.slice(0,400)) }

// compras: verify missing relation
let pedExists=await sql`SELECT to_regclass('public.pedidos_compra') as tbl`;
console.log('pedidos_compra exists', pedExists[0]?.tbl);
r=await http('GET','/api/compras?type=pedidos',tokenA);
console.log('compras GET pedidos',r.status, JSON.stringify(r.json).slice(0,500));

// after-sales with unique numero
r=await http('POST','/api/after-sales',tokenA,{numero:'AS'+Date.now(), titulo:'AS_A', descricao:'teste', tipo:'garantia', projeto_id: null, cliente_id: null});
console.log('after-sales POST unique',r.status, JSON.stringify(r.json).slice(0,500));
if(r.json?.data?.id){
  let patchB=await http('PATCH',`/api/after-sales?id=${r.json.data.id}`,tokenB,{titulo:'HACKED'});
  console.log('after-sales PATCH B',patchB.status);
  let db = await sql`SELECT titulo FROM chamados_garantia WHERE id=${r.json.data.id}::uuid AND tenant_id=${tenantA}::uuid`;
  console.log('after-sales DB', db[0]?.titulo, db[0]?.titulo==='AS_A'?'PASSOU':'FALHOU');
  try{ await sql`DELETE FROM chamados_garantia WHERE id=${r.json.data.id}::uuid`}catch{}
}

// billing tolerance 5d: SQL simulation
let subId=crypto.randomUUID();
await sql`INSERT INTO subscriptions (id, tenant_id, status, plano, valor, current_period_end) VALUES (${subId}::uuid, ${tenantA}::uuid, 'overdue', 'basic', 100, NOW() - INTERVAL '6 days')`;
let checkOverdue = await http('POST','/api/clients',tokenA,{nome:'BILL_TEST', razao_social:'BILL_TEST'});
console.log('billing overdue 6d POST clients (esperado 402)', checkOverdue.status, JSON.stringify(checkOverdue.json).slice(0,400));
await sql`DELETE FROM subscriptions WHERE id=${subId}::uuid`;
// cleanup should still succeed for overdue 2d (within tolerance)
let subId2=crypto.randomUUID();
await sql`INSERT INTO subscriptions (id, tenant_id, status, plano, valor, current_period_end) VALUES (${subId2}::uuid, ${tenantA}::uuid, 'overdue', 'basic', 100, NOW() - INTERVAL '2 days')`;
let checkOk = await http('POST','/api/clients',tokenA,{nome:'BILL_TEST2', razao_social:'BILL_TEST2'});
console.log('billing overdue 2d POST clients (esperado 200)', checkOk.status);
if(checkOk.json?.data?.id) try{ await sql`DELETE FROM clients WHERE id=${checkOk.json.data.id}`}catch{}
await sql`DELETE FROM subscriptions WHERE id=${subId2}::uuid`;

try{ await sql`DELETE FROM users WHERE id IN (${userA}::uuid, ${userB}::uuid)`}catch{}
try{ await sql`DELETE FROM tenants WHERE id IN (${tenantA}::uuid, ${tenantB}::uuid)`}catch{}
console.log('cleanup', (await sql`SELECT COUNT(*)::int as c FROM tenants WHERE id IN (${tenantA}::uuid, ${tenantB}::uuid)`)[0].c);
