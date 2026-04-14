param(
    [string]$Model
)

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$null = & (Join-Path $PSScriptRoot "load-backend-env.ps1")

$apiKey = [System.Environment]::GetEnvironmentVariable("GEMINI_API_KEY", "Process")
if ([string]::IsNullOrWhiteSpace($apiKey)) {
    Write-Error "GEMINI_API_KEY is missing in backend/.env"
    exit 1
}

if ([string]::IsNullOrWhiteSpace($Model)) {
    $Model = [System.Environment]::GetEnvironmentVariable("GEMINI_MODEL", "Process")
}
if ([string]::IsNullOrWhiteSpace($Model)) {
    $Model = "gemini-2.5-flash"
}

$endpoint = "https://generativelanguage.googleapis.com/v1beta/models/$Model`:generateContent"

$payload = @{
    contents = @(
        @{
            role = "user"
            parts = @(
                @{
                    text = 'Reply with JSON only: {"freshness":"Fresh","confidence":0.9}'
                }
            )
        }
    )
    generationConfig = @{
        temperature = 0
        maxOutputTokens = 64
    }
} | ConvertTo-Json -Depth 8

try {
    $response = Invoke-RestMethod -Method Post -Uri $endpoint -Headers @{"x-goog-api-key" = $apiKey} -ContentType "application/json" -Body $payload -TimeoutSec 20
    $text = ""
    if ($response.candidates -and $response.candidates.Count -gt 0 -and $response.candidates[0].content.parts.Count -gt 0) {
        $text = [string]$response.candidates[0].content.parts[0].text
    }

    Write-Host "Gemini reachable with model: $Model"
    if (-not [string]::IsNullOrWhiteSpace($text)) {
        Write-Host "Sample response: $text"
    }
    exit 0
} catch {
    Write-Error "Gemini check failed for model '$Model': $($_.Exception.Message)"
    exit 1
}
