$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

$repoRoot = Split-Path -Parent $PSScriptRoot
$pythonExe = if ($env:LIGHTFM_PYTHON_EXE) { $env:LIGHTFM_PYTHON_EXE } else { "python" }
$logDir = Join-Path $repoRoot "retrain_logs"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

$logFile = Join-Path $logDir "nightly_retrain_$timestamp.log"

Push-Location $repoRoot
try {
    $command = "`"$pythonExe`" -u egitim_pipeline.py"
    $rawLogFile = Join-Path $logDir "nightly_retrain_raw_$timestamp.log"
    $rawErrFile = Join-Path $logDir "nightly_retrain_raw_$timestamp.err.log"
    $process = Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c $command" `
        -WorkingDirectory $repoRoot `
        -RedirectStandardOutput $rawLogFile `
        -RedirectStandardError $rawErrFile `
        -Wait `
        -PassThru `
        -WindowStyle Hidden

    $combined = @()
    if (Test-Path $rawLogFile) { $combined += Get-Content $rawLogFile }
    if (Test-Path $rawErrFile) { $combined += Get-Content $rawErrFile }

    $combined | Tee-Object -FilePath $logFile
    Remove-Item $rawLogFile -ErrorAction SilentlyContinue
    Remove-Item $rawErrFile -ErrorAction SilentlyContinue

    exit $process.ExitCode
}
finally {
    Pop-Location
}
