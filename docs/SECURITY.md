# Security — D'Luxury SaaS

## Autenticação

- JWT com tenantId obrigatório em todos os tokens
- tenantMiddleware valida tenantId contra tabela tenants em cada requisição
- Silent-fallback (00000000-...) eliminado

## Isolamento de Tenant

- withTenant() proxy filtra automaticamente por tenant_id
- Tabelas financeiras (titulos_receber, titulos_pagar, baixas) têm tenant_id
- audit_logs tem tenant_id e registra todas as mutações

## Rate Limiting

- Login: 5 tentativas / 10 min
- API: 1000 req / min por tenant
- Search/Export: limites menores por endpoint

## Audit Trail (LGPD)

- Tabela audit_logs registra CREATE, UPDATE, DELETE, SECURITY_EVENT
- Retenção: 90 dias (campo retention_expires_at)
- IP e user-agent registrados para rastreabilidade

## Secrets

- Nenhuma senha hardcoded no source
- Variáveis de ambiente validadas no boot (validateEnv.ts)
- APP_JWT_SECRET deve ter 32+ caracteres
- .env\* ignorado no .gitignore

## Dependências

- Atualizar mensalmente: npm audit
- Críticas: corrigir em 24h

## Contato de Segurança

- Reportar vulnerabilidades para: [seu email]
