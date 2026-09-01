# ============================================================
# ROTAZIONE MASTER KEY — Fantacalcio26
# ============================================================
# Uso:
#   1. Vai su https://jsonbin.io → Settings → Regenerate Master Key
#   2. Copia la nuova key
#   3. Esegui:  .\rotate-key.ps1 "NUOVA_KEY"
#
# Lo script aggiorna config.js, commit e push automaticamente.
# ============================================================

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$NewKey
)

$ErrorActionPreference = "Stop"
$ConfigFile = Join-Path $PSScriptRoot "js\config.js"

if (-not (Test-Path $ConfigFile)) {
    Write-Error "config.js non trovato in $ConfigFile"
    exit 1
}

# Sostituisci la master key nel file
$content = Get-Content $ConfigFile -Raw
$pattern = 'masterKey:\s*"[^"]*"'
$replacement = "masterKey: `"$NewKey`""

if ($content -match $pattern) {
    $content = $content -replace $pattern, $replacement
    Set-Content $ConfigFile -Value $content -NoNewline
    Write-Host "[OK] Master key aggiornata in config.js" -ForegroundColor Green
} else {
    Write-Error "Pattern masterKey non trovato in config.js"
    exit 1
}

# Git commit + push
Push-Location $PSScriptRoot
try {
    git add js/config.js
    git commit -m "security: rotate jsonbin master key"
    git push origin main
    Write-Host "[OK] Commit e push completati" -ForegroundColor Green
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Fatto! La vecchia key non funziona più." -ForegroundColor Cyan
Write-Host "⚠️  La vecchia key resta nella git history (non rimovibile senza rewrite)." -ForegroundColor Yellow
