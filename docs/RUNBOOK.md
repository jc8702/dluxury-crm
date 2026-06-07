# Runbook — D'Luxury SaaS

## Deploy

```bash
./deploy.sh "Descrição do que foi feito"
```

## Verificar saúde do sistema

```bash
./validate.sh
```

## Backup do banco

```bash
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M).sql
```

## Rollback

```bash
# Rollback do último commit
git revert --no-edit HEAD
git push origin main

# Rollback de migration
psql $DATABASE_URL < backup-antes-da-migration.sql
```

## Problemas comuns

### 403 em todas as requisições

- Verificar que tenantMiddleware está aplicado antes das rotas
- Verificar que JWT contém campo tenantId
- Verificar que tenant existe na tabela tenants

### Erro de build TypeScript

- Rodar: npx tsc --noEmit
- Ver erros e corrigir

### Banco não conecta

- Verificar DATABASE_URL em Vercel Dashboard > Settings > Environment Variables
- Verificar que Neon projeto está ativo

### Rate limit acidentalmente disparado

- Reiniciar instância Vercel (apaga in-memory store)
- Se usar Upstash Redis: acessar console e apagar key do IP
