# Script para iniciar el tunel naveganet
# Uso: .\start-naveganet-tunnel.ps1

Write-Host "Iniciando tunel naveganet..." -ForegroundColor Cyan

# Detener cualquier tunel anterior
Get-Process | Where-Object {$_.ProcessName -like "*cloudflared*"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Token del tunel naveganet
$token = "eyJhIjoiNDViYzgzOTVmMDAzMTM5NjE0NzQ5Y2IyN2I4MjUzYzciLCJ0IjoiOTVhMTFjMjgtNmFlNS00MGIxLWEwZjktYTAzZTcxYmNkMzg0IiwicyI6Ik1ESXlNV00zT1RZdFkyTXhPQzAwWTJJNUxUazBNRFV0T1dRMk5EY3lObVl4T0RNeiJ9"

Write-Host "Tunel: naveganet" -ForegroundColor Green
Write-Host "Puerto local: 9000 (Caddy - Proxy Reverso)" -ForegroundColor Green
Write-Host ""
Write-Host "Caddy maneja:" -ForegroundColor Cyan
Write-Host "- Frontend (puerto 8080)" -ForegroundColor Yellow
Write-Host "- Backend /api (puerto 8000)" -ForegroundColor Yellow
Write-Host ""
Write-Host "URL del tunel:" -ForegroundColor Cyan
Write-Host "https://naveganet.cheros.dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "Presiona Ctrl+C para detener el tunel" -ForegroundColor Yellow
Write-Host ""

cloudflared tunnel run --token $token --url http://localhost:9000

