@echo off
REM Script para crear túnel con ngrok o cloudflared
REM Uso: tunnel.bat [ngrok|cloudflared]

set TOOL=%~1
if "%TOOL%"=="" set TOOL=cloudflared

set PORT=9000

echo 🚀 Iniciando túnel para puerto %PORT%...

if "%TOOL%"=="ngrok" (
    where ngrok >nul 2>&1
    if errorlevel 1 (
        echo ❌ ngrok no está instalado.
        echo 📥 Instálalo desde: https://ngrok.com/download
        echo 💡 O usa: choco install ngrok
        pause
        exit /b 1
    )
    
    echo ✅ Usando ngrok...
    echo 🌐 El túnel se abrirá en unos segundos...
    echo ⚠️  Presiona Ctrl+C para detener el túnel
    echo.
    ngrok http %PORT%
) else if "%TOOL%"=="cloudflared" (
    where cloudflared >nul 2>&1
    if errorlevel 1 (
        echo ❌ cloudflared no está instalado.
        echo 📥 Descárgalo desde: https://github.com/cloudflare/cloudflared/releases
        echo 💡 O usa: choco install cloudflared
        echo.
        echo 🔧 Intentando instalar con winget...
        winget install --id Cloudflare.cloudflared -e
        if errorlevel 1 (
            echo ❌ No se pudo instalar automáticamente.
            pause
            exit /b 1
        )
    )
    
    echo ✅ Usando Cloudflare Tunnel...
    echo 🌐 El túnel se abrirá en unos segundos...
    echo ⚠️  Presiona Ctrl+C para detener el túnel
    echo.
    cloudflared tunnel --url http://localhost:%PORT%
) else (
    echo ❌ Herramienta no reconocida: %TOOL%
    echo 💡 Usa: ngrok o cloudflared
    pause
    exit /b 1
)

