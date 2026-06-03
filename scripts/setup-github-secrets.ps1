# ============================================================
# setup-github-secrets.ps1
# Cria os 4 secrets necessários no repositório GitHub via API REST
#
# USO: ./scripts/setup-github-secrets.ps1 -GithubToken "ghp_SEU_TOKEN"
#
# Para gerar o token:
#   https://github.com/settings/tokens/new
#   Scopes necessários: repo (secrets:write)
# ============================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$GithubToken
)

$REPO   = "jc8702/dluxury-crm"
$OWNER  = "jc8702"
$RNAME  = "dluxury-crm"
$APIBASE = "https://api.github.com/repos/$OWNER/$RNAME"

$Headers = @{
    "Authorization" = "Bearer $GithubToken"
    "Accept"        = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}

# ── Recupera a chave pública do repositório ──────────────────
Write-Host "`n[1/6] Obtendo chave publica do repositorio..." -ForegroundColor Cyan
$pubKeyResp = Invoke-RestMethod -Uri "$APIBASE/actions/secrets/public-key" `
                                -Headers $Headers -Method GET
$PUBLIC_KEY    = $pubKeyResp.key
$PUBLIC_KEY_ID = $pubKeyResp.key_id
Write-Host "     Key ID: $PUBLIC_KEY_ID" -ForegroundColor Gray

# ── Função de criptografia usando Sodium via .NET ─────────────
# GitHub exige: libsodium sealed box. Usamos a abordagem via
# script Python embutido (mais confiável no Windows sem deps .NET extras)
function Encrypt-Secret {
    param([string]$PublicKeyB64, [string]$SecretValue)

    # Python one-liner: PyNaCl sealed box encryption
    $pyScript = @"
import sys, base64
from nacl.public import PublicKey, SealedBox
pk_bytes = base64.b64decode("$PublicKeyB64")
pk = PublicKey(pk_bytes)
box = SealedBox(pk)
encrypted = box.encrypt(b"$SecretValue")
print(base64.b64encode(encrypted).decode())
"@
    $result = $pyScript | python -c "
import sys, base64
try:
    from nacl.public import PublicKey, SealedBox
except ImportError:
    import subprocess, sys
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'PyNaCl', '-q'])
    from nacl.public import PublicKey, SealedBox
data = sys.stdin.read()
exec(data)
" 2>$null

    if (-not $result) {
        Write-Host "     AVISO: PyNaCl nao disponivel. Usando metodo alternativo (curl)..." -ForegroundColor Yellow
        return $null
    }
    return $result.Trim()
}

# ── Função para criar/atualizar um secret via API ────────────
function Set-GithubSecret {
    param(
        [string]$SecretName,
        [string]$SecretValue,
        [string]$KeyId,
        [string]$EncryptedValue
    )

    $body = @{
        encrypted_value = $EncryptedValue
        key_id          = $KeyId
    } | ConvertTo-Json

    try {
        Invoke-RestMethod -Uri "$APIBASE/actions/secrets/$SecretName" `
                          -Headers $Headers `
                          -Method PUT `
                          -Body $body `
                          -ContentType "application/json" | Out-Null
        Write-Host "  ✅ $SecretName criado/atualizado" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "  ❌ Erro ao criar $SecretName : $_" -ForegroundColor Red
        return $false
    }
}

# ── Definição dos secrets ─────────────────────────────────────
$SECRETS = @{
    "VERCEL_TOKEN"      = "vca_5STf2cPZjwC4r30N7k0viADuKTT1RcNZUI3GQWc1mgaTPFQQUL2N0HxJ"
    "VERCEL_ORG_ID"     = "team_Sm3aJFEs2sp5kqA0RwtZEEIE"
    "VERCEL_PROJECT_ID" = "prj_53qsIX39Zqa2YG4xOYwwGdfrOvlf"
    "NEON_DATABASE_URL" = "postgresql://neondb_owner:npg_Xp2nuVN0lrwH@ep-winter-unit-acsitpn6-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
}

# ── Instala PyNaCl se não disponível ─────────────────────────
Write-Host "`n[2/6] Verificando dependencias Python (PyNaCl)..." -ForegroundColor Cyan
$hasPython = Get-Command python -ErrorAction SilentlyContinue
if ($hasPython) {
    python -m pip install PyNaCl -q 2>$null
    Write-Host "     PyNaCl OK" -ForegroundColor Gray
} else {
    Write-Host "     Python nao encontrado. Tentando metodo via curl..." -ForegroundColor Yellow
}

# ── Função encrypt via Python ─────────────────────────────────
function Encrypt-WithPython {
    param([string]$PublicKeyB64, [string]$Value)

    $encrypted = python -c @"
import sys, base64
from nacl.public import PublicKey, SealedBox
pk_bytes = base64.b64decode('$PublicKeyB64')
pk = PublicKey(pk_bytes)
box = SealedBox(pk)
msg = r'''$Value'''.encode()
encrypted = box.encrypt(msg)
print(base64.b64encode(encrypted).decode())
"@ 2>$null

    return $encrypted
}

# ── Loop principal: cria cada secret ─────────────────────────
Write-Host "`n[3/6] Criando secrets no repositorio $REPO ..." -ForegroundColor Cyan

$successCount = 0
foreach ($entry in $SECRETS.GetEnumerator()) {
    $name  = $entry.Key
    $value = $entry.Value

    Write-Host "`n  → $name" -ForegroundColor White

    $encrypted = Encrypt-WithPython -PublicKeyB64 $PUBLIC_KEY -Value $value

    if ($encrypted) {
        $ok = Set-GithubSecret -SecretName $name -SecretValue $value `
                               -KeyId $PUBLIC_KEY_ID -EncryptedValue $encrypted
        if ($ok) { $successCount++ }
    } else {
        Write-Host "  ⚠️  Falha na criptografia de $name" -ForegroundColor Yellow
    }
}

# ── Verifica resultado ────────────────────────────────────────
Write-Host "`n[4/6] Verificando secrets criados..." -ForegroundColor Cyan
$secretsList = Invoke-RestMethod -Uri "$APIBASE/actions/secrets" -Headers $Headers -Method GET
Write-Host "`n  Secrets no repositorio:" -ForegroundColor White
$secretsList.secrets | ForEach-Object {
    Write-Host "    ✓ $($_.name)  (atualizado: $($_.updated_at))" -ForegroundColor Green
}

Write-Host "`n============================" -ForegroundColor Cyan
Write-Host "  $successCount/4 secrets configurados" -ForegroundColor $(if ($successCount -eq 4) { "Green" } else { "Yellow" })
Write-Host "  Repositorio: https://github.com/$REPO/settings/secrets/actions" -ForegroundColor Gray
Write-Host "============================" -ForegroundColor Cyan
