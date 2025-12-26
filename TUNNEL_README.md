# 🌐 Compartir el Sistema con Túnel

Este proyecto incluye scripts para compartir tu aplicación local mediante un túnel público.

## 🚀 Opciones Disponibles

### 1. **Cloudflare Tunnel (Recomendado - Gratis, Rápido, pero TEMPORAL)**
```bash
# Windows PowerShell
.\tunnel.ps1 cloudflared

# Windows CMD
tunnel.bat cloudflared
```
**Características:**
- ✅ Gratis, sin registro
- ✅ Muy rápido de configurar
- ⚠️ **URL temporal** - Cambia cada vez que reinicias
- ⏱️ Duración limitada (horas)

### 2. **ngrok (Alternativa Popular - También TEMPORAL en plan gratuito)**
```bash
# Windows PowerShell
.\tunnel.ps1 ngrok

# Windows CMD
tunnel.bat ngrok
```
**Características:**
- ✅ Plan gratuito disponible
- ⚠️ **URL temporal** - Cambia cada vez que reinicias (en plan gratuito)
- 📝 Requiere registro
- 💰 Planes de pago ofrecen URLs fijas

## 📋 Requisitos Previos

### Para Cloudflare Tunnel:
1. Descarga desde: https://github.com/cloudflare/cloudflared/releases
2. O instala con Chocolatey: `choco install cloudflared`
3. O con winget: `winget install Cloudflare.cloudflared`

### Para ngrok:
1. Regístrate en: https://ngrok.com
2. Descarga desde: https://ngrok.com/download
3. O instala con Chocolatey: `choco install ngrok`
4. Configura tu token: `ngrok config add-authtoken TU_TOKEN`

## 🔧 Pasos para Compartir

1. **Asegúrate de que tu sistema esté corriendo:**
   - Backend Django en puerto 8000
   - Frontend Vite en puerto 8080
   - Caddy en puerto 9000 (opcional, pero recomendado)

2. **Ejecuta el script de túnel:**
   ```powershell
   .\tunnel.ps1
   ```

3. **Copia la URL que se genera** (algo como `https://xxxxx.trycloudflare.com`)

4. **Comparte la URL** con quien quieras que acceda

5. **⚠️ Importante:** Actualiza `ALLOWED_HOSTS` en Django para permitir el dominio del túnel

## 🔒 Configuración de Seguridad

### Actualizar Django Settings

Edita `backend/colosso_backend/settings.py`:

```python
# Agregar el dominio del túnel a ALLOWED_HOSTS
ALLOWED_HOSTS = ["localhost", "127.0.0.1", ".trycloudflare.com", ".ngrok.io", ".ngrok-free.app"]

# Agregar el dominio del túnel a CORS
CORS_ALLOWED_ORIGINS = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:9000",
    "http://127.0.0.1:9000",
    # Agregar aquí la URL del túnel cuando la tengas
]
```

### Actualizar CORS dinámicamente (Opcional)

Para desarrollo, puedes permitir todos los orígenes temporalmente:

```python
CORS_ALLOW_ALL_ORIGINS = True  # Solo para desarrollo/túneles
```

## 📝 Notas Importantes

### ⚠️ Túneles Temporales (Gratuitos):
- **Cloudflare Tunnel (Opción 1)**: 
  - ✅ URL temporal que cambia cada vez que reinicias
  - ✅ Gratis, sin registro necesario
  - ⏱️ Duración limitada (generalmente horas)
  - 🔄 La URL cambia en cada reinicio
  
- **ngrok (Opción 2) - Plan Gratuito**:
  - ✅ URL temporal que cambia cada vez que reinicias
  - 📝 Requiere registro (gratis)
  - ⏱️ Límite de tiempo y ancho de banda
  - 🔄 La URL cambia en cada reinicio

### 💰 Opciones Permanentes (De Pago):
- **ngrok Pro**: URL fija personalizada, sin límites
- **Cloudflare Tunnel con cuenta**: Túneles persistentes con dominios personalizados
- **Servicios VPS**: Hosting permanente (DigitalOcean, AWS, etc.)

### 🔒 Seguridad:
- 🔒 **Solo para desarrollo/testing** - No uses en producción
- 🚫 **No compartas URLs con datos sensibles** sin autenticación adecuada
- ⏱️ **Los túneles gratuitos tienen límites** de tiempo y ancho de banda

## 🎯 Uso Rápido

```powershell
# 1. Inicia tu sistema (en terminales separadas)
cd backend && python manage.py runserver
cd frontend && npm run dev
# Si usas Caddy: caddy run

# 2. En otra terminal, inicia el túnel
.\tunnel.ps1

# 3. Comparte la URL que aparece
```

## 🔄 Alternativa: Usar Extensión de VS Code/Cursor

Si prefieres usar una extensión:

1. Instala "Live Server" o "ngrok for VS Code" desde el marketplace
2. Configura el puerto 9000 (o 8080 si no usas Caddy)
3. Activa el túnel desde la extensión

## 💡 Tips

- **Cloudflare Tunnel** es más rápido y no requiere registro
- **ngrok** ofrece más opciones de configuración con cuenta gratuita
- Usa **Caddy** (puerto 9000) para tener un solo punto de entrada
- Si no usas Caddy, apunta el túnel al puerto 8080 (frontend)

