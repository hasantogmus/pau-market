param(
    [string]$TaskName = "PauMarketNightlyLightFMTraining",
    [string]$RunAt = "03:00",
    [string]$PythonExe = "python"
)

$ErrorActionPreference = "Stop"

$runnerScript = Join-Path $PSScriptRoot "run_nightly_retrain.ps1"

if (-not (Test-Path $runnerScript)) {
    throw "Calistirici script bulunamadi: $runnerScript"
}

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runnerScript`""

$trigger = New-ScheduledTaskTrigger -Daily -At $RunAt
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

[Environment]::SetEnvironmentVariable("LIGHTFM_PYTHON_EXE", $PythonExe, "User")

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "PAU Market LightFM modelini her gece yeniden egitir ve FastAPI modelini yeniler." `
    -Force | Out-Null

Write-Host "Scheduled task olusturuldu: $TaskName ($RunAt)"
