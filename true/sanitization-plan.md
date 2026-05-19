# Plan: Sanitización para GitHub (AquaControl32)
Este plan detalla los reemplazos realizados para proteger la privacidad del usuario antes de subir el código a un repositorio público.
## Valores Sensibles Respaldados (Privado)
- WiFi 1 (Pablo): Pablo Fornero 2.4GHz / 221233601607
- WiFi 2 (Fibertel): Fibertel WiFi764 2.4GHz / (Clave netsh)
- DB Password: Lucas2012
- Server IP: 192.168.0.5
## Cambios en el Código
1. firmware/AquaControl32-ESP32.ino: Reemplazar SSIDs, Passwords e IPs por YOUR_....
2. mobile/src/constants/config.js: Reemplazar IP por YOUR_SERVER_IP.
3. backend/docker-compose.yml: Reemplazar contraseñas de DB.
4. backend/.env.example: Crear archivo modelo sin claves reales.