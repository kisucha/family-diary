# Windows Task Scheduler - FamilyPlanner Daily Brief
# Run as Administrator

param()

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]"Administrator")

if (-not $isAdmin) {
    Write-Host "관리자 권한이 필요합니다. 관리자 PowerShell에서 실행하세요." -ForegroundColor Red
    exit 1
}

$TaskName    = "FamilyPlanner-DailyBrief"
$ScriptPath  = "C:\FamilyPlanner\send-daily-brief.ps1"
$TriggerTime = "08:00"

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "기존 작업 삭제됨."
}

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument ("-NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"" + $ScriptPath + "`"")

$trigger = New-ScheduledTaskTrigger -Daily -At $TriggerTime

$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 5) `
    -StartWhenAvailable

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -RunLevel Highest `
    -Description "FamilyPlanner Daily Telegram Brief 08:00" | Out-Null

Write-Host "등록 완료: $TaskName (매일 $TriggerTime)" -ForegroundColor Green
Write-Host "확인: Get-ScheduledTask -TaskName '$TaskName'"
