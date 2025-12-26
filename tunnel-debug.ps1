# Script de diagnostico para el tunel
Write-Host "Diagnostico del Tunel" -ForegroundColor Cyan
Write-Host ""

# Verificar servicios locales
Write-Host "1. Verificando servicios locales..." -ForegroundColor Yellow
$caddy = Test-NetConnection -ComputerName 127.0.0.1 -Port 9000 -WarningAction SilentlyContinue
$frontend = Test-NetConnection -ComputerName 127.0.0.1 -Port 8080 -WarningAction SilentlyContinue
$backend = Test-NetConnection -ComputerName 127.0.0.1 -Port 8000 -WarningAction SilentlyContinue

Write-Host "   Caddy (9000): " -NoNewline
if ($caddy.TcpTestSucceeded) { Write-Host "Activo" -ForegroundColor Green } else { Write-Host "Inactivo" -ForegroundColor Red }

Write-Host "   Frontend (8080): " -NoNewline
if ($frontend.TcpTestSucceeded) { Write-Host "Activo" -ForegroundColor Green } else { Write-Host "Inactivo" -ForegroundColor Red }

Write-Host "   Backend (8000): " -NoNewline
if ($backend.TcpTestSucceeded) { Write-Host "Activo" -ForegroundColor Green } else { Write-Host "Inactivo" -ForegroundColor Red }

Write-Host ""

# Verificar Caddy responde
Write-Host "2. Verificando respuesta de Caddy..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:9000" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Verificar tunel
Write-Host "3. Verificando proceso del tunel..." -ForegroundColor Yellow
$tunnel = Get-Process | Where-Object {$_.ProcessName -like "*cloudflared*"}
if ($tunnel) {
    Write-Host "   Tunel activo: PID $($tunnel.Id)" -ForegroundColor Green
} else {
    Write-Host "   Tunel: No encontrado" -ForegroundColor Red
}

Write-Host ""
Write-Host "Si el tunel no funciona:" -ForegroundColor Cyan
Write-Host "   1. Espera 30-60 segundos" -ForegroundColor White
Write-Host "   2. Prueba desde otro dispositivo" -ForegroundColor White
Write-Host "   3. Verifica tu firewall" -ForegroundColor White
Write-Host "   4. Prueba con ngrok" -ForegroundColor White
