# Plan: Sistema de Iluminación Automatizada (Lux Inverso) - AquaControl32

Este plan detalla los pasos para implementar un control de iluminación inteligente que ajusta la intensidad de los LEDs de forma inversamente proporcional a la luz ambiental, configurable desde la App.

## Objetivos
1.  Habilitar el almacenamiento y visualización de datos de Lux (sensor BH1750).
2.  Implementar la lógica de "Proporcionalidad Inversa" (Más luz ambiente = Menos luz LED).
3.  Permitir al usuario elegir entre modos: Manual (Horarios) vs Automático (Proporcional).

## Cambios por Módulo

### 1. Base de Datos (PostgreSQL)
- Modificar la tabla `metrics` y `hourly_metrics` para incluir la columna `lux` (DECIMAL).
- Actualizar `system_settings` si es necesario para guardar parámetros de calibración (opcional, usaremos defaults por ahora).

### 2. Backend (Node.js)
- **`src/utils/schemas.js`**: Actualizar `mqttPayloadSchema` para validar el campo `lux`.
- **`src/services/mqttService.js`**: 
    - Extraer `lux` del payload del ESP32.
    - Guardar `lux` en la base de datos junto a la temperatura y luz.
    - Incluir `lux` en el broadcast de WebSockets.
- **`src/controllers/settingsController.js`**: Asegurar que los nuevos modos se guarden correctamente.

### 3. App Móvil (React Native)
- **`src/components/LightingManagementScreen.jsx`**:
    - Mejorar la UI para reflejar el estado "Automático" vs "Horarios".
    - Mostrar el valor de Lux actual con una barra de progreso o indicador visual pro.
    - Implementar el envío de comandos al backend cuando cambie el modo.

### 4. Firmware (ESP32)
- **Modificar `loop()`**:
    - Si el modo es `auto`, calcular: `Intensidad = 100 - (Lux_Actual / Lux_Max * 100)`.
    - Aplicar `ledcWrite` basado en el cálculo.
- **Modificar `onMqttMessage()`**:
    - Recibir la configuración de modo (`manual`/`auto`) y el `light_manual_intensity`.
- **Integración BH1750**: Asegurar que `luxSensor.getLux()` se use para la lógica local y no solo para reporte.

## Verificación
1.  **Test Sensor**: Tapar el sensor y ver si el LED sube de intensidad.
2.  **Test App**: Cambiar a modo Manual en la App y verificar que el ESP32 ignore el sensor de luz.
3.  **Test DB**: Verificar que en `/latest` aparezca el campo `lux`.

---
**¿Procedo con la creación de los archivos del plan y la implementación?**
