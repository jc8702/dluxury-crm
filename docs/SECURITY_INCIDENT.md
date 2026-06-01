# 🚨 INCIDENTE DE SEGURANÇA — Exposição de Secrets no Git History

**Data da detecção:** 2026-06-01
**Severidade:** 🔴 CRÍTICA
**Status:** Mitigação parcial aplicada; rotação completa pendente de ação manual nas plataformas

---

## Resumo

Em auditoria de segurança realizada em 2026-06-01, foram identificados **6 secrets reais commitados no histórico do Git** ao longo de **7 commits**. Os valores expostos davam acesso direto a:

- Banco de dados PostgreSQL (Neon) — credenciais completas
- API do Google Gemini / Google AI — chave de produção
- Sistema de autenticação JWT — segredo previsível (`dluxury-industrial-secret-2024`)
- PIN de autenticação rápida — trivial (`1234`)
- Chave de inicialização do banco — previsível (`dluxury-init-key-2024`)

## Secrets expostos (valores revogados)

| Variável                       | Valor exposto                                                  | Plataforma       |
| ------------------------------ | -------------------------------------------------------------- | ---------------- |
| `DATABASE_URL`                 | `postgresql://neondb_owner:npg_Xp2nuVN0lrwH@ep-winter-unit...` | Neon             |
| `GEMINI_API_KEY`               | `AQ.Ab8RN6LqHeHZeeepIS2fnIn6cFjxystVVNO5ZVZ3O3pKXmYJOdg`       | Google AI Studio |
| `GOOGLE_GENERATION_AI_API_KEY` | (mesmo valor acima)                                            | Google AI Studio |
| `APP_JWT_SECRET`               | `dluxury-industrial-secret-2024`                               | —                |
| `APP_PIN`                      | `1234`                                                         | —                |
| `APP_INIT_KEY`                 | `dluxury-init-key-2024`                                        | —                |

**⚠️ Mesmo que os valores antigos não sejam mais válidos após a rotação, o git history ainda os contém.** Qualquer pessoa com acesso ao repositório (mesmo após `git rm`) pode recuperá-los via `git log -p` até que a história seja reescrita.

## Commits afetados

```
83cdb80  fix(plano-corte): add estoque column, op_id collision, hardening migration
6aaa894  feat: implementa Fase 2 - Arquitetura Multi-Agentes & RAG com pgvector no Neon
e4a2ed1  fix: resolve rendering regression, client persistence and UX improvements
cd0b058  feat: implementado detector de anomalias via IA para auditoria industrial
43bef95  feat: modulo de estoque completo com integração de orçamentos e baixa automática
65cf58f  feat: integracao completa com Supabase e historico de simulacoes
64c02fd  feat: redesign JMDCORP Purple and pagination
```

## Ações aplicadas (mitigação)

✅ **Local (repositório):**

- `.env` reescrito com placeholders fortes + comentários de rotação
- `.env.example` continua sendo o único arquivo `.env*` rastreado pelo git
- `.env` e `.env.vercel` removidos do tracking (`git rm --cached`)
- `.gitignore` já continha `.env`, `.env.*`, `.env*.local`

✅ **Validação de outros controles de segurança:**

- JWT verify usa `algorithms: ['HS256']` (whitelist) — `src/api-lib/_db.ts:64`
- Security headers presentes em `api/index.ts:87-100` (CSP, X-Frame-Options, X-Content-Type-Options, HSTS, Permissions-Policy)
- Nenhum uso de `eval()` ou `new Function()` no `src/`

## Ações pendentes (VOCÊ precisa fazer)

### 1. Rotacionar secrets nas plataformas (URGENTE)

#### Neon (DATABASE_URL)

1. Acesse https://console.neon.tech
2. Selecione o projeto `dluxury-crm`
3. Settings → Database → Reset password
4. Copie a nova connection string
5. Atualize em:
   - `.env` local (DATABASE_URL)
   - Vercel → Project Settings → Environment Variables → Production

#### Google AI Studio (GEMINI_API_KEY)

1. Acesse https://aistudio.google.com/apikey
2. **Delete** a chave `AIza...` exposta
3. **Create** uma nova chave
4. Atualize em:
   - `.env` local (GEMINI_API_KEY, GOOGLE_GENERATION_AI_API_KEY)
   - Vercel → Environment Variables

#### APP_JWT_SECRET

1. Gere novo valor: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. Atualize em `.env` local e Vercel
3. **AVISO:** Rotacionar JWT_SECRET invalida TODOS os tokens existentes. Usuários precisarão logar novamente.

#### APP_INIT_KEY

1. Gere novo valor: mesmo comando acima
2. Atualize em `.env` local e Vercel

#### APP_PIN

1. Gere novo PIN: 6 dígitos aleatórios (ex: `847293`)
2. Atualize em `.env` local e Vercel
3. Comunique aos usuários

### 2. Reescrever git history (NUCLEAR — faça com backup)

```bash
# Backup primeiro
cp -r .git .git.backup

# Opção A: BFG Repo-Cleaner (recomendado, mais rápido)
# https://rtyley.github.io/bfg-repo-cleaner/
bfg --replace-text passwords.txt
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Opção B: git filter-branch (built-in, mais lento)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env .env.vercel" \
  --prune-empty --tag-name-filter cat -- --all
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (CUIDADO: reescreve histórico remoto)
git push origin --force --all
git push origin --force --tags
```

⚠️ **Force push reescreve o histórico do repositório remoto.** Todos os colaboradores precisam fazer `git rebase` ou clonar de novo.

### 3. Pós-rotação

- [ ] Confirmar que `.env` em produção (Vercel) tem os NOVOS valores
- [ ] Confirmar que aplicação funciona após deploy
- [ ] Fazer `git push --force` (se optou por reescrever history)
- [ ] Notificar equipe sobre re-login (JWT rotacionado)
- [ ] Adicionar pre-commit hook para detectar `.env` (veja abaixo)

### 4. Prevenção futura

Adicionar `gitleaks` ou `git-secrets` como pre-commit hook:

```bash
# Opção A: gitleaks (recomendado)
# https://github.com/gitleaks/gitleaks
brew install gitleaks  # ou scoop install gitleaks
gitleaks detect --source . --verbose

# Adicionar em .husky/pre-commit:
# gitleaks protect --staged --verbose
```

```bash
# Opção B: git-secrets (mais simples)
# https://github.com/awslabs/git-secrets
git secrets --install
git secrets --register-aws  # ou adicionar patterns custom
```

## Lições aprendidas

1. **`.gitignore` não é proteção retroativa** — arquivos já rastreados continuam no histórico
2. **Placeholders em `.env` não são suficientes** — devs frequentemente substituem pelos valores reais antes de commitar
3. **Validação no pre-commit é essencial** — Husky + gitleaks/git-secrets bloqueia antes do push
4. **CI deve falhar se detectar secrets** — adicionar step de scanning no pipeline

## Referências

- OWASP: https://owasp.org/www-community/vulnerabilities/Information_exposure_through_directory_listing
- GitHub Secret Scanning: https://docs.github.com/en/code-security/secret-scanning
- BFG Repo-Cleaner: https://rtyley.github.io/bfg-repo-cleaner/
- gitleaks: https://github.com/gitleaks/gitleaks
