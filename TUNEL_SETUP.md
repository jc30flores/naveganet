# Configuración del Túnel Cloudflare

## Requisitos Previos

1. Tener `cloudflared` instalado
2. Tener el token del túnel naveganet
3. Tener Caddy corriendo en el puerto 9000

## Configuración Rápida

### Opción 1: Usando el token directamente

```powershell
cloudflared tunnel run --token [TU_TOKEN] --url http://localhost:9000
```

### Opción 2: Usando scripts genéricos

```powershell
# PowerShell
.\tunnel.ps1 cloudflared

# O CMD
tunnel.bat cloudflared
```

## Token del Túnel Naveganet

El token debe obtenerse desde el dashboard de Cloudflare:
1. Ve a: https://one.dash.cloudflare.com
2. Networks → Connectors → Cloudflare Tunnels
3. Selecciona el túnel "naveganet" o "facturador"
4. Copia el token

## Verificación

Una vez iniciado el túnel, deberías poder acceder a:
- https://naveganet.cheros.dev

## Notas Importantes

- El túnel debe apuntar al puerto 9000 (Caddy)
- Caddy actúa como proxy reverso y maneja tanto el frontend como el backend
- Asegúrate de que Caddy, el frontend y el backend estén corriendo antes de iniciar el túnel

