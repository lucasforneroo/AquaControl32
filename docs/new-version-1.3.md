# 🚀 AquaControl32 — Versión 1.3

## Persistencia, Autenticación y Gráficos en Tiempo Real

**Fecha:** 10 de Marzo de 2026  
**Autor:** Lucas Fornero

---

## ¿Qué hay de nuevo en v1.3?

La versión 1.3 es la actualización más ambiciosa hasta la fecha, transformando el proyecto en una plataforma completa con base de datos, seguridad y visualización avanzada.

---

## Características Principales

### 🗄️ Persistencia con PostgreSQL
- Integración completa con **PostgreSQL** para almacenar métricas históricas.
- Tabla `metrics`: Registro de temperatura e iluminación con timestamp.
- Tabla `users`: Almacenamiento seguro de perfiles para autenticación.
- Script de inicialización automática (`init-db.js`).

### 📊 Gráficos de Tendencia Histórica
- Nueva pantalla **Historial de Métricas** con gráficos de líneas interactivos (`react-native-chart-kit`).
- Filtros dinámicos por intervalos: **1h, 3h, 12h y 24h**.
- Visualización limpia sin puntos de datos, enfocada en la tendencia de la curva.
- Estadísticas en tiempo real (Máximas, Mínimas y Promedios).

### 🔐 Autenticación con Google
- Implementación de **Google OAuth** integrada en la App Móvil.
- Login seguro y persistente mediante `AsyncStorage`.
- Interfaz de usuario que refleja el estado de la sesión (nombre del usuario en el header).

### 📡 Infraestructura Inteligente (Auto-Discovery)
- **mDNS / Bonjour**: El backend ahora se anuncia como `aquacontrol.local`.
- **Detección Dinámica de IP**: El servidor detecta automáticamente su IP local al iniciar, eliminando la necesidad de cambiarla a mano.
- **ESP32 Auto-Connect**: El firmware ahora busca el servidor automáticamente en la red local usando mDNS.

### 🎨 Refinamiento Estético y UI
- **Menú de Opciones**: Panel de "Ajustes" extensible para una navegación más limpia.
- **Fondo Animado v2**: Efecto de constelaciones con transición de color fluida (**Azul ↔ Verde**).
- **Layout Contenido**: Gráficos y paneles ajustados para evitar desbordes en cualquier pantalla.

---

## Cambios Técnicos (v1.3)

| Componente | Mejora |
|--------|---------|
| **Backend** | Refactorización modular (`mqttService`, `wsService`, `ipUtils`). |
| **Backend** | Nuevas rutas REST para historial y estadísticas. |
| **Mobile** | Integración de `react-native-chart-kit` y `lucide-react-native`. |
| **Mobile** | Lógica de filtrado de datos balanceada para gráficos fluidos. |
| **ESP32** | Payload JSON mejorado con direcciones físicas de sensores (Dallas). |
| **Database** | Índices optimizados para consultas por tiempo. |

---

## Estructura del Proyecto Actualizada

```
AquaControl32/
├── AquaControl32-Mobile/          ← 📱 App móvil (v1.3)
│   ├── src/
│   │   ├── components/
│   │   │   ├── MetricsHistoryScreen.jsx  ← [NUEVO] Gráficos
│   │   │   ├── HistoryScreen.jsx         ← Restore original
│   │   │   └── AnimatedBackground.jsx    ← v2 (Color cycling)
│   │   └── constants/config.js           ← IP Dinámica
│
├── AquaControl32----template/     ← 🌐 Backend & Web
│   ├── backend/
│   │   ├── src/
│   │   │   ├── routes/metricsRoutes.js   ← [NUEVO] API de datos
│   │   │   ├── services/                 ← [REFAC] Servicios modulares
│   │   │   └── scripts/init-db.js        ← [NUEVO] DB Setup
│   │   └── .env                          ← DB & JWT Config
│
├── AquaControl32-ESP32/           ← 🔌 Firmware (v1.3)
│
├── docs/
│   ├── new-version-1.2.md
│   └── new-version-1.3.md         ← [ESTÁS AQUÍ]
└── README.md
```

---

## Cómo ejecutar v1.3

1. **Base de Datos**: Tener PostgreSQL corriendo y configurar el `DATABASE_URL` en el `.env` del backend.
2. **Backend**:
   ```bash
   npm run db:init  # Crea las tablas (opcional)
   node src/index.js
   ```
3. **App Móvil**:
   ```bash
   npx expo start --clear
   ```

---

## Créditos
**AquaControl Team — Lucas Fornero (2026)**
Estudiante de Ingeniería en Computación (UnRaf).
