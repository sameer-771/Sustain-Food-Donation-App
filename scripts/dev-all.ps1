$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backendScript = Join-Path $repoRoot "scripts\dev-backend.ps1"

$backendCommand = "Set-Location '$repoRoot'; powershell -ExecutionPolicy Bypass -File '$backendScript'"
$frontendCommand = "Set-Location '$repoRoot'; npm run dev:frontend"

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    $backendCommand
) | Out-Null

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    $frontendCommand
) | Out-Null

Write-Host "Started backend and frontend in two new terminals."
Write-Host "Frontend: http://localhost:5173"
Write-Host "Backend docs: http://localhost:8000/docs"
