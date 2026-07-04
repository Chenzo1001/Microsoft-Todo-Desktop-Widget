$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $root ".env"

if (Test-Path $envPath) {
  Get-Content $envPath | ForEach-Object {
    $line = $_.Trim()
    if ($line.Length -eq 0 -or $line.StartsWith("#")) {
      return
    }

    $parts = $line -split "=", 2
    if ($parts.Count -ne 2) {
      return
    }

    $name = $parts[0].Trim()
    $value = $parts[1].Trim()

    if ($value.StartsWith('"') -and $value.EndsWith('"')) {
      $value = $value.Substring(1, $value.Length - 2)
    } elseif ($value.StartsWith("'") -and $value.EndsWith("'")) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    if ($name -match "^[A-Za-z_][A-Za-z0-9_]*$") {
      Set-Item -Path "Env:$name" -Value $value
    }
  }
}

if (-not $env:MICROSOFT_CLIENT_ID) {
  throw "MICROSOFT_CLIENT_ID was not found in .env or environment."
}

Push-Location $root
try {
  npm run tauri:build
} finally {
  Pop-Location
}
