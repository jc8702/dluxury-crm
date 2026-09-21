import dotenv from 'dotenv'; dotenv.config({path:'.env'}); import jwt from 'jsonwebtoken'; import crypto from 'node:crypto'; import { neon } from '@neondatabase/serverless';
const sql=neon(process.env.DATABASE_URL); const JWT_SECRET=process.env.APP_JWT_SECRET; const BASE='http://localhost:3000';
function tok(id,email,role,tenantId){return jwt.sign({id,email,role,tenantId,planoTier:'enterprise'},JWT_SECRET,{algorithm:'HS256',expiresIn:'7d'})}
async function http(m,p,token,body){const h={'Content-Type':'application/json'}; if(token) h['Authorization']=`Bearer ${token}`; const r=await fetch(`${BASE}${p}`,{method:m,headers:h,body:body?JSON.stringify(body):undefined}); let j=null; try{j=await r.json()}catch{}; return {status:r.status, json:j}}
const tenantA=crypto.randomUUID(), tenantB=crypto.randomUUID(), userA=crypto.randomUUID(), userB=crypto.randomUUID();
await sql`INSERT INTO tenants (id,nome,subdominio,plano_tier,status) VALUES (${tenantA}::uuid,'TAF',${'taf'+Date.now().toString().slice(-6)},'enterprise','ativo')`;
await sql`INSERT INTO tenants (id,nome,subdominio,plano_tier,status) VALUES (${tenantB}::uuid,'TBF',${'tbf'+Date.now().toString().slice(-6)},'enterprise','ativo')`;
await sql`INSERT INTO users (id,name,email,password_hash,role,tenant_id) VALUES (${userA}::uuid,'UAF',${'uaf'+Date.now()+'@test.local'},'hash','admin',${tenantA}::uuid)`;
await sql`INSERT INTO users (id,name,email,password_hash,role,tenant_id) VALUES (${userB}::uuid,'UBF',${'ubf'+Date.now()+'@test.local'},'hash','admin',${tenantB}::uuid)`;
const tokenA=tok(userA,'uaf@test.local','admin',tenantA), tokenB=tok(userB,'ubf@test.local','admin',tenantB);
console.log('setup', (await sql`SELECT COUNT(*)::int as c FROM tenants WHERE id IN (${tenantA}::uuid, ${tenantB}::uuid)`)[0].c);

// retalhos correto
let r=await http('POST','/api/retalhos',tokenA,{sku_chapa:'CHP-A', largura_mm:500, altura_mm:600, espessura_mm:15, origem:'sobra_plano_corte'});
console.log('retalhos POST',r.status, JSON.stringify(r.json).slice(0,600));
let id=r.json?.data?.id;
if(id){
  let patchB=await http('PATCH',`/api/retalhos?id=${id}`,tokenB,{observacoes:'HACKED'});
  console.log('retalhos PATCH B',patchB.status, JSON.stringify(patchB.json).slice(0,400));
  let db=await sql`SELECT observacoes FROM retalhos_estoque WHERE id=${id}::uuid AND tenant_id=${tenantA}::uuid`;
  console.log('retalhos DB',db[0]?.observacoes, db[0]?.observacoes==='HACKED'?'FALHOU':'PASSOU');
  await http('DELETE',`/api/retalhos?id=${id}`,tokenA);
  await sql`DELETE FROM retalhos_estoque WHERE id=${id}::uuid`;
} else console.log('retalhos Nao testado');

// estoque materiais POST
r=await http('POST','/api/estoque',tokenA,{sku:'MAT-'+Date.now(), nome:'MAT_A', descricao:'teste', categoria_id: null});
console.log('estoque POST',r.status, JSON.stringify(r.json).slice(0,600));
let mid=r.json?.data?.id;
if(mid){
  let patchB=await http('PATCH',`/api/estoque?id=${mid}`,tokenB,{nome:'HACKED'});
  console.log('estoque PATCH B',patchB.status, JSON.stringify(patchB.json).slice(0,400));
  let db=await sql`SELECT nome FROM materiais WHERE id=${mid}::uuid AND tenant_id=${tenantA}::uuid`;
  console.log('estoque DB nome',db[0]?.nome, db[0]?.nome==='HACKED'?'FALHOU':'PASSOU');
  await http('DELETE',`/api/estoque?id=${mid}`,tokenA);
  await sql`DELETE FROM materiais WHERE id=${mid}::uuid`;
} else {
  // try GET list IDOR: create then GET B list should not contain
  let listB=await http('GET','/api/estoque',tokenB);
  console.log('estoque GET B',listB.status, 'count', listB.json?.data?.length);
}

// compras GET still 500 text = integer -> inspect handler
r=await http('GET','/api/compras?type=pedidos',tokenA);
console.log('compras GET',r.status, JSON.stringify(r.json).slice(0,600));

// after-sales
r=await http('POST','/api/after-sales',tokenA,{numero:'AS-'+crypto.randomUUID().slice(0,8), titulo:'AS_A', descricao:'teste', tipo:'garantia'});
console.log('after-sales POST',r.status, JSON.stringify(r.json).slice(0,600));
let asId=r.json?.data?.id;
if(asId){
  let patchB=await http('PATCH',`/api/after-sales?id=${asId}`,tokenB,{titulo:'HACKED'});
  console.log('after-sales PATCH B',patchB.status, JSON.stringify(patchB.json).slice(0,400));
  let db=await sql`SELECT titulo FROM chamados_garantia WHERE id=${asId}::uuid AND tenant_id=${tenantA}::uuid`;
  console.log('after-sales DB titulo',db[0]?.titulo, db[0]?.titulo==='HACKED'?'FALHOU':'PASSOU');
  await sql`DELETE FROM chamados_garantia WHERE id=${asId}::uuid`;
}

await sql`DELETE FROM users WHERE id IN (${userA}::uuid, ${userB}::uuid)`;
await sql`DELETE FROM tenants WHERE id IN (${tenantA}::uuid, ${tenantB}::uuid)`;
console.log('cleanup', (await sql`SELECT COUNT(*)::int as c FROM tenants WHERE id IN (${tenantA}::uuid, ${tenantB}::uuid)`)[0].c);
