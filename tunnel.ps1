# Script para crear túnel con ngrok o cloudflared
# Uso: .\tunnel.ps1 [ngrok|cloudflared]

param(
    [string]$Tool = "cloudflared"
)

$Port = 9000  # Puerto de Caddy

Write-Host "🚀 Iniciando túnel para puerto $Port..." -ForegroundColor Cyan

if ($Tool -eq "ngrok") {
    # Verificar si ngrok está instalado
    if (-not (Get-Command ngrok -ErrorAction SilentlyContinue)) {
        Write-Host "❌ ngrok no está instalado." -ForegroundColor Red
        Write-Host "📥 Instálalo desde: https://ngrok.com/download" -ForegroundColor Yellow
        Write-Host "💡 O usa: choco install ngrok" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "✅ Usando ngrok..." -ForegroundColor Green
    Write-Host "🌐 El túnel se abrirá en unos segundos..." -ForegroundColor Cyan
    Write-Host "⚠️  Presiona Ctrl+C para detener el túnel" -ForegroundColor Yellow
    Write-Host ""
    
    ngrok http $Port
}
elseif ($Tool -eq "cloudflared") {
    # Verificar si cloudflared está instalado
    if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
        Write-Host "❌ cloudflared no está instalado." -ForegroundColor Red
        Write-Host "📥 Descárgalo desde: https://github.com/cloudflare/cloudflared/releases" -ForegroundColor Yellow
        Write-Host "💡 O usa: choco install cloudflared" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "🔧 Instalando cloudflared automáticamente..." -ForegroundColor Cyan
        
        # Intentar instalar con winget
        if (Get-Command winget -ErrorAction SilentlyContinue) {
            winget install --id Cloudflare.cloudflared -e
        }
        else {
            Write-Host "❌ No se pudo instalar automáticamente. Por favor instálalo manualmente." -ForegroundColor Red
            exit 1
        }
    }
    
    Write-Host "✅ Usando Cloudflare Tunnel..." -ForegroundColor Green
    Write-Host "🌐 El túnel se abrirá en unos segundos..." -ForegroundColor Cyan
    Write-Host "⚠️  Presiona Ctrl+C para detener el túnel" -ForegroundColor Yellow
    Write-Host ""
    
    cloudflared tunnel --url http://localhost:$Port
}
else {
    Write-Host "❌ Herramienta no reconocida: $Tool" -ForegroundColor Red
    Write-Host "💡 Usa: ngrok o cloudflared" -ForegroundColor Yellow
    exit 1
}

