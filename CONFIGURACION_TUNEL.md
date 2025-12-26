# Configuración del Túnel Naveganet desde Cloudflare Dashboard

## Pasos para Configurar desde el Dashboard

### 1. Acceder al Dashboard
- Ve a: https://one.dash.cloudflare.com
- Navega a: **Networks** → **Connectors** → **Cloudflare Tunnels**

### 2. Seleccionar o Crear el Túnel
- Si ya existe el túnel "facturador" con la ruta `naveganet.cheros.dev`, úsalo
- O crea un nuevo túnel específico para naveganet

### 3. Configurar la Ruta Publicada
- Ve a la pestaña **"Published application routes"**
- Asegúrate de que exista una ruta con:
  - **Hostname:** `naveganet.cheros.dev` (o el dominio que prefieras)
  - **Path:** `*` (todas las rutas)
  - **Service:** `http://localhost:9000`

### 4. Iniciar el Túnel Localmente
Una vez configurado en el dashboard, inicia el túnel localmente con:

```powershell
.\start-naveganet-tunnel.ps1
```

O manualmente:
```powershell
cloudflared tunnel run --token [TU_TOKEN] --url http://localhost:9000
```

## Nota sobre el Error SSL

Si ves el error `ERR_SSL_VERSION_OR_CIPHER_MISMATCH`, puede ser porque:
1. El túnel no está corriendo localmente
2. Hay un problema con la configuración del dominio en Cloudflare
3. Necesitas esperar unos minutos para que la configuración se propague

## Verificación

1. Asegúrate de que Caddy esté corriendo en el puerto 9000
2. Inicia el túnel con el script o comando
3. Espera 1-2 minutos para que la configuración se propague
4. Accede a: `https://naveganet.cheros.dev`

