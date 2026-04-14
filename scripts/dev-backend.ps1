param(
    [string]$ListenHost = "0.0.0.0",
    [int]$Port = 8000,
    [switch]$NoReload
)

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$pythonPath = Join-Path $repoRoot "backend\.venv\Scripts\python.exe"

if (-not (Test-Path -Path $pythonPath)) {
    Write-Error "Python venv not found at $pythonPath. Create it first: cd backend; python -m venv .venv; .\.venv\Scripts\Activate.ps1; pip install -r requirements.txt"
    exit 1
}

$null = & (Join-Path $PSScriptRoot "load-backend-env.ps1")

$requiredVars = @(
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY"
)

$missingVars = @()
foreach ($name in $requiredVars) {
    $value = [System.Environment]::GetEnvironmentVariable($name, "Process")
    if ([string]::IsNullOrWhiteSpace($value)) {
        $missingVars += $name
    }
}

if ($missingVars.Count -gt 0) {
    Write-Error "Missing required backend env vars in backend/.env: $($missingVars -join ', ')"
    exit 1
}

$geminiModel = [System.Environment]::GetEnvironmentVariable("GEMINI_MODEL", "Process")
if ([string]::IsNullOrWhiteSpace($geminiModel)) {
    $geminiModel = "gemini-2.5-flash"
}

$geminiKey = [System.Environment]::GetEnvironmentVariable("GEMINI_API_KEY", "Process")
if ([string]::IsNullOrWhiteSpace($geminiKey)) {
    Write-Warning "GEMINI_API_KEY is empty. Backend will use local fallback analyzer."
} else {
    Write-Host "Gemini quality analyzer enabled with model: $geminiModel"
}

for ($attempt = 1; $attempt -le 3; $attempt++) {
    $listenerPids = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique

    if (-not $listenerPids) {
        break
    }

    $stoppedAny = $false
    foreach ($listenerPid in $listenerPids) {
        $runningProcess = Get-Process -Id $listenerPid -ErrorAction SilentlyContinue
        if (-not $runningProcess) {
            continue
        }

        Write-Warning "Port $Port is already in use by PID $listenerPid ($($runningProcess.ProcessName)). Stopping it for a clean backend restart..."
        try {
            Stop-Process -Id $listenerPid -Force -ErrorAction Stop
            $stoppedAny = $true
        } catch {
            Write-Warning "Could not stop PID $listenerPid automatically: $($_.Exception.Message)"
        }
    }

    if (-not $stoppedAny) {
        break
    }
}

$blockingListeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Where-Object { Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue }

if ($blockingListeners) {
    $blockingPids = $blockingListeners | Select-Object -ExpandProperty OwningProcess -Unique
    Write-Warning "Port $Port still has active listener(s): $($blockingPids -join ', '). Uvicorn will now attempt to bind; if it fails, close those processes and retry."
}

Set-Location -Path $repoRoot

$args = @(
    "-m",
    "uvicorn",
    "app.main:app",
    "--app-dir",
    "backend",
    "--host",
    $ListenHost,
    "--port",
    "$Port"
)

if (-not $NoReload) {
    $args += "--reload"
}

Write-Host "Starting backend at http://localhost:$Port"
& $pythonPath @args
