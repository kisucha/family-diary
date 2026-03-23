# FamilyPlanner 일일 텔레그램 브리핑 발송 스크립트
# Windows 작업 스케줄러에서 매일 오전 8시에 실행

$AppUrl    = "http://localhost:4000"
$CronSecret = "family-diary-cron-2026"

$url     = "$AppUrl/api/cron/daily-brief"
$headers = @{ "Authorization" = "Bearer $CronSecret" }

try {
    $response = Invoke-RestMethod -Uri $url -Method POST -Headers $headers -TimeoutSec 30
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] 발송 완료: $($response | ConvertTo-Json -Compress)"
} catch {
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] 오류: $_"
    exit 1
}
