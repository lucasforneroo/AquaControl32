# AquaControl32
Sistema de monitoreo y control para acuarios (IoT).

## Estructura del Proyecto
- **backend/**: Servidor Node.js + Express + MQTT + PostgreSQL.
- **web/**: Dashboard administrativo en React + Vite.
- **mobile/**: Aplicación móvil en React Native + Expo.
- **firmware/**: Código para el ESP32 (sensores DS18B20, pH, etc).
- **docs/**: Documentación técnica y bitácora de versiones.
- **assets/**: Recursos gráficos compartidos.

## Cómo empezar
Cada carpeta tiene su propio archivo README con instrucciones específicas.

### 1. Backend
`cd backend && npm install && npm start`

### 2. Web
`cd web && npm install && npm run dev`

### 3. Mobile
`cd mobile && npm install && npx expo start`
