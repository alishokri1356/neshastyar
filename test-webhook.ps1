# Test webhook script for PowerShell
$meetingId = "0b6d7796-1f0c-450a-abe2-11adaeeb6b86"
$url = "http://localhost:3001/sendmail/$meetingId"

Write-Host "🧪 Testing webhook: $url" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $url -Method Get -ContentType "application/json"
    Write-Host "✅ Webhook test successful!" -ForegroundColor Green
    Write-Host "📊 Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ Webhook test failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
    }
}
