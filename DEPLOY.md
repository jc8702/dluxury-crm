# Deploy Checklist

## ✅ 1. Vercel (Frontend & API)
**Status:** DEPLOYADO
**URL:** https://dluxury-crm.vercel.app

O frontend e a API (serverless functions) estão no ar e funcionando.

## ✅ 2. Neon Database (Migration)

Você precisa executar o script de migração no seu banco Neon para garantir integridade e performance.

### Como executar:

1. Acesse o **Neon Console** (https://console.neon.tech)
2. Selecione seu projeto **dluxury-crm**
3. Vá na aba **SQL Editor**
4. Copie o conteúdo do arquivo `src/db/migrations/phase5_indexes_and_constraints.sql`
5. Execute o script

### O que esse script faz:
- cria índices de performance para `eventos`, `orcamentos`, `projetos`
- normaliza dados para minúsculas (evita bug de ENUM maiúsculo)
- cria trigger para normalizar futuras inserções
- adiciona constraint de validação de datas

---

## 📋 Checklist Final

- [x] Build passou
- [x] Deploy Vercel OK
- [ ] Executar SQL no Neon (Manual)
- [ ] Testar sistema em produção

## 🆘 Problemas Comuns

### 1. "DATABASE_URL não encontrada" no Vercel
Verifique se a variável de ambiente `DATABASE_URL` está configurada no Vercel Project Settings.

### 2. "Table 'eventos' doesn't exist"
O banco pode estar vazio ou as tabelas não foram criadas. Verifique se o schema está sincronizado.

### 3. Erro de CORS
Se a API não responder, verifique as configurações de CORS no `api/index.ts`.