param(
    [string]$Host = "0.0.0.0",
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

Set-Location -Path $repoRoot

$args = @(
    "-m",
    "uvicorn",
    "app.main:app",
    "--app-dir",
    "backend",
    "--host",
    $Host,
    "--port",
    "$Port"
)

if (-not $NoReload) {
    $args += "--reload"
}

Write-Host "Starting backend at http://localhost:$Port"
& $pythonPath @args
