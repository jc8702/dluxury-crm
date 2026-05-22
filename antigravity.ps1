param(
  [switch]$Check,
  [switch]$Stop,
  [switch]$OpenBrowser
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$runtimeDir = Join-Path $root 'scratch\antigravity'
$pidFile = Join-Path $runtimeDir 'runtime.json'
$apiOut = Join-Path $runtimeDir 'api.out.log'
$apiErr = Join-Path $runtimeDir 'api.err.log'
$webOut = Join-Path $runtimeDir 'web.out.log'
$webErr = Join-Path $runtimeDir 'web.err.log'

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null

function Get-CommandPath {
  param([Parameter(Mandatory = $true)][string]$Name)

  $cmd = Get-Command $Name -ErrorAction Stop
  if ($cmd.Path) { return $cmd.Path }
  if ($cmd.Source) { return $cmd.Source }
  return $Name
}

function Get-ListeningProcessesForPort {
  param([Parameter(Mandatory = $true)][int]$Port)

  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if (-not $connections) {
    return @()
  }

  $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
  $results = @()

  foreach ($processId in $pids) {
    $cmdLine = $null
    try {
      $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$processId" -ErrorAction SilentlyContinue
      if ($proc) {
        $cmdLine = $proc.CommandLine
      }
    } catch {
    }

    $results += [PSCustomObject]@{
      Pid = $processId
      CommandLine = $cmdLine
    }
  }

  return $results
}

function Test-PortOpen {
  param(
    [Parameter(Mandatory = $true)][int]$Port,
    [int]$TimeoutSeconds = 20
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    try {
      $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
      if ($listeners) {
        return $true
      }
    } catch {
    }
    Start-Sleep -Milliseconds 500
  }

  return $false
}

function Ensure-PortAvailable {
  param([Parameter(Mandatory = $true)][int]$Port)

  $listeners = @(Get-ListeningProcessesForPort -Port $Port)
  if ($listeners.Count -eq 0) {
    return
  }

  $workspaceListeners = @(
    $listeners | Where-Object { $_.CommandLine -and $_.CommandLine -like "*$root*" }
  )

  foreach ($proc in $workspaceListeners) {
    if (Get-Process -Id $proc.Pid -ErrorAction SilentlyContinue) {
      Stop-Process -Id $proc.Pid -Force -ErrorAction SilentlyContinue
      Write-Host "Processo antigo do workspace encerrado na porta ${Port}: PID $($proc.Pid)"
    }
  }

  Start-Sleep -Milliseconds 300

  $remaining = @(Get-ListeningProcessesForPort -Port $Port)
  if ($remaining.Count -eq 0) {
    return
  }

  $details = $remaining | ForEach-Object {
    if ($_.CommandLine) {
      "PID $($_.Pid): $($_.CommandLine)"
    } else {
      "PID $($_.Pid): comando indisponivel"
    }
  }

  $message = "Porta $Port ja esta em uso.`n" + ($details -join "`n")
  throw $message
}

function Stop-ManagedProcesses {
  if (-not (Test-Path $pidFile)) {
    Write-Host 'Nenhum processo gerenciado encontrado.'
    return
  }

  $state = Get-Content $pidFile -Raw | ConvertFrom-Json
  $trackedPids = @()

  if ($state.PSObject.Properties.Name -contains 'apiPids') {
    $trackedPids += @($state.apiPids)
  }
  if ($state.PSObject.Properties.Name -contains 'webPids') {
    $trackedPids += @($state.webPids)
  }

  $trackedPids += @($state.apiPid, $state.webPid)
  $trackedPids = @(
    $trackedPids |
      Where-Object { $_ } |
      ForEach-Object { [int]$_ } |
      Select-Object -Unique
  )

  foreach ($managedProcessId in $trackedPids) {
    if (Get-Process -Id $managedProcessId -ErrorAction SilentlyContinue) {
      Stop-Process -Id $managedProcessId -Force -ErrorAction SilentlyContinue
      Write-Host "Processo encerrado: $managedProcessId"
    }
  }

  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  Write-Host "Estado removido em $pidFile"
}

function Run-Step {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][scriptblock]$Action
  )

  Write-Host ""
  Write-Host "==> $Label"
  & $Action
  if ($LASTEXITCODE -ne 0) {
    throw "$Label falhou com codigo $LASTEXITCODE."
  }
}

if ($Stop) {
  Stop-ManagedProcesses
  return
}

$nodePath = Get-CommandPath 'node'
$npmPath = Get-CommandPath 'npm'
$tsxCliScript = Join-Path $root 'node_modules\tsx\dist\cli.mjs'

if (-not (Test-Path (Join-Path $root 'node_modules'))) {
  Run-Step -Label 'Instalando dependencias' -Action {
    & $npmPath install
  }
}

if ($Check) {
  Run-Step -Label 'Lint' -Action {
    & $npmPath run lint
  }

  Run-Step -Label 'Testes' -Action {
    & $npmPath run test -- --run
  }

  Run-Step -Label 'Build' -Action {
    & $npmPath run build
  }

  Write-Host ""
  Write-Host 'Validacao concluida.'
  return
}

if (Test-Path $pidFile) {
  Write-Host 'Encontrado estado anterior do launcher. Encerrando processos antigos...'
  Stop-ManagedProcesses
}

$apiScript = Join-Path $root 'dev-api-server.js'
$viteScript = Join-Path $root 'node_modules\vite\bin\vite.js'

if (-not (Test-Path $apiScript)) {
  throw "Arquivo nao encontrado: $apiScript"
}

if (-not (Test-Path $viteScript)) {
  throw "Vite nao encontrado em node_modules. Rode o launcher sem node_modules ou execute npm install."
}

if (-not (Test-Path $tsxCliScript)) {
  throw "tsx nao encontrado em $tsxCliScript. Verifique se as dependencias foram instaladas corretamente."
}

Write-Host ""
Write-Host 'Iniciando API local...'
Ensure-PortAvailable -Port 3000
$apiProcess = Start-Process `
  -FilePath $nodePath `
  -ArgumentList @($tsxCliScript, $apiScript) `
  -WorkingDirectory $root `
  -WindowStyle Hidden `
  -RedirectStandardOutput $apiOut `
  -RedirectStandardError $apiErr `
  -PassThru

if (-not (Test-PortOpen -Port 3000)) {
  throw "API nao subiu na porta 3000. Verifique $apiErr"
}

$apiListenerPids = @(
  Get-ListeningProcessesForPort -Port 3000 |
    Select-Object -ExpandProperty Pid -Unique
)
$apiPrimaryPid = if ($apiListenerPids.Count -gt 0) { $apiListenerPids[0] } else { $apiProcess.Id }
$apiTrackedPids = @(
  @($apiPrimaryPid, $apiProcess.Id) + $apiListenerPids |
    Select-Object -Unique
)

Write-Host 'Iniciando Vite...'
Ensure-PortAvailable -Port 5173
$webProcess = Start-Process `
  -FilePath $nodePath `
  -ArgumentList @($viteScript, '--strictPort', '--port', '5173') `
  -WorkingDirectory $root `
  -WindowStyle Hidden `
  -RedirectStandardOutput $webOut `
  -RedirectStandardError $webErr `
  -PassThru

if (-not (Test-PortOpen -Port 5173)) {
  throw "Vite nao subiu na porta 5173. Verifique $webErr"
}

$webListenerPids = @(
  Get-ListeningProcessesForPort -Port 5173 |
    Select-Object -ExpandProperty Pid -Unique
)
$webPrimaryPid = if ($webListenerPids.Count -gt 0) { $webListenerPids[0] } else { $webProcess.Id }
$webTrackedPids = @(
  @($webPrimaryPid, $webProcess.Id) + $webListenerPids |
    Select-Object -Unique
)

$state = @{
  apiPid = $apiPrimaryPid
  webPid = $webPrimaryPid
  apiPids = $apiTrackedPids
  webPids = $webTrackedPids
  startedAt = (Get-Date).ToString('o')
  logs = @{
    apiOut = $apiOut
    apiErr = $apiErr
    webOut = $webOut
    webErr = $webErr
  }
}

$state | ConvertTo-Json -Depth 5 | Set-Content -Path $pidFile -Encoding UTF8

Write-Host ""
Write-Host 'Ambiente pronto.'
Write-Host 'Frontend: http://localhost:5173'
Write-Host 'API:       http://localhost:3000'
Write-Host "Logs:      $runtimeDir"

if ($OpenBrowser) {
  Start-Process 'http://localhost:5173'
}
