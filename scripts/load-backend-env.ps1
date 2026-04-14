param(
    [string]$EnvPath = (Join-Path $PSScriptRoot "..\backend\.env")
)

$resolvedEnvPath = Resolve-Path -Path $EnvPath -ErrorAction Stop
$loadedKeys = @()

Get-Content -Path $resolvedEnvPath | ForEach-Object {
    $line = $_
    if (-not $line) {
        return
    }

    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) {
        return
    }

    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
        $name = $matches[1].Trim()
        $value = $matches[2]

        if (
            (($value.StartsWith('"')) -and ($value.EndsWith('"')) -and ($value.Length -ge 2)) -or
            (($value.StartsWith("'")) -and ($value.EndsWith("'")) -and ($value.Length -ge 2))
        ) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        [System.Environment]::SetEnvironmentVariable($name, $value, 'Process')
        $loadedKeys += $name
    }
}

$loadedKeys
