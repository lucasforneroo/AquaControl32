# 📱 AquaControl32 — Versión 1.2

## Migración de React + Vite → React Native + Expo

**Fecha:** 09 de Febrero de 2026  
**Autor:** Lucas Fornero

---

## ¿Qué cambió?

La versión 1.2 marca la **transición de una app web a una app móvil nativa**, manteniendo la versión web original como referencia.

---

## Comparativa de versiones

| Característica | v1.0 (Web) | v1.2 (Móvil) |
|---|---|---|
| **Framework** | React 18 | React Native 0.81 |
| **Bundler** | Vite | Metro (Expo SDK 54) |
| **Plataforma** | Navegador web | Android / iOS nativo |
| **Estilos** | CSS archivos separados | StyleSheet (inline RN) |
| **Navegación** | URL-based | State-based (useState) |
| **Iconos** | lucide-react | lucide-react-native |
| **SVG** | Nativo del navegador | react-native-svg |
| **Animaciones** | CSS Animations / Canvas | react-native-reanimated |
| **WebSocket** | Estático (sin conexión) | Conexión real al backend |
| **Datos** | Hardcodeados | Tiempo real via ESP32 |
| **Backend** | No conectado | Express + MQTT + WebSocket |

---

## Nuevas funcionalidades en v1.2

### 📡 Conexión en tiempo real
- La app se conecta al backend por **WebSocket** y recibe temperaturas del **ESP32** en vivo
- Indicador de estado de conexión (**Estable** / **Desc.**) en el panel del acuario
- Reconexión automática cada 5 segundos si se pierde la conexión
- Heartbeat (ping/pong) cada 30s para mantener la conexión activa

### 🌡️ Control de temperatura funcional
- Botones +/- que ajustan la temperatura objetivo en incrementos de 0.5°C
- La temperatura actual se muestra desde el sensor DS18B20 real

### 📱 UI adaptada a móvil
- Diseño responsive: se adapta automáticamente entre **móvil** y **escritorio**
- Métricas en grid de cards (móvil) o lista horizontal (desktop)
- Control de luz con layout diferente según la plataforma

### 🎨 Pantalla de introducción
- Splash screen animado con el logo AQ32
- Transición suave al dashboard

### 📖 Pantalla "Nuestra Historia"
- Sección dedicada a la historia del proyecto
- Accesible desde el botón en el header

---

## Cambios en el backend (v1.2)

| Cambio | Detalle |
|--------|---------|
| **Escucha en 0.0.0.0** | Acepta conexiones desde dispositivos en la red local |
| **Heartbeat WebSocket** | Ping cada 30s, termina clientes que no responden |
| **Error handling MQTT** | Logs de errores de conexión y reconexión automática |
| **Error handling WS** | Captura errores por cliente para prevenir crashes |
| **Topic actualizado** | Suscripción a `aquacontrol32/esp32/#` (wildcard) |

---

## Estructura del proyecto

```
AquaControl32/
├── AquaControl32-Mobile/          ← 📱 App móvil (v1.2)
│   ├── App.js                     ← Componente principal
│   ├── src/
│   │   ├── components/
│   │   │   ├── AnimatedBackground.jsx
│   │   │   ├── AQ32logo.jsx
│   │   │   ├── HistoryScreen.jsx
│   │   │   ├── Intro.jsx
│   │   │   └── TemperatureControl.jsx
│   │   └── constants/
│   │       └── config.js          ← Configuración WS_URL
│   ├── app.json
│   └── package.json
│
├── AquaControl32----template/     ← 🌐 App web (v1.0) + Backend
│   ├── backend/
│   │   ├── index.js               ← Servidor Express + MQTT + WS
│   │   └── package.json
│   └── src/                       ← Frontend web React + Vite
│
├── docs/
├── README.md
└── .gitignore
```

---

## Tecnologías agregadas en v1.2

| Tecnología | Uso |
|---|---|
| **React Native 0.81** | Framework de UI móvil |
| **Expo SDK 54** | Toolchain y runtime |
| **react-native-reanimated** | Animaciones fluidas |
| **react-native-svg** | Renderizar SVGs (logo) |
| **lucide-react-native** | Iconos para móvil |
| **WebSocket (nativo RN)** | Conexión tiempo real al backend |
| **ws (npm)** | Servidor WebSocket en backend |

---

## Cómo ejecutar v1.2

Necesitás **3 procesos corriendo al mismo tiempo**:

```
Terminal 1 → Mosquitto (broker MQTT)
Terminal 2 → node index.js (backend, puerto 4000)  
Terminal 3 → npx expo start (app móvil)
```

> ⚠️ El celular y la PC deben estar en la **misma red WiFi**.  
> Configurar la IP de la PC en `AquaControl32-Mobile/src/constants/config.js`.
