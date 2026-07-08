# Design: reconstruccion-luz

## 1. Overview
El rediseño de la lógica de iluminación elimina la complejidad de tener modos de operación fijos. En lugar de esto, el comportamiento por defecto es que la iluminación se auto-regula (compensa) según las lecturas del sensor exterior. A través de la UI administrativa, se pueden habilitar excepciones (overrides) para fijar el horario de encendido/apagado, y/o para forzar una intensidad lumínica determinada. 

## 2. Componentes Afectados

### 2.1 UI/UX (React Native)
- **Eliminación de modos actuales:** Remover el selector de modos "Auto", "Manual", "Programado".
- **Nueva Interfaz de Checklist de Overrides:**
  - **Override de Horario:** Switch on/off. Si está en "on", mostrar selectores de `hora_inicio` y `hora_fin`.
  - **Override de Intensidad:** Switch on/off. Si está en "on", mostrar un slider (0-100%) para la intensidad fija deseada.
- **API/Endpoints:** Ajustar las peticiones para actualizar los campos `light_override_schedule_enabled`, `light_schedule_start`, `light_schedule_end`, `light_override_intensity_enabled`, `light_intensity_value` en la base de datos a través de peticiones HTTP a Node.js.

### 2.2 Backend y Cronjob (Node.js)
- **Modificación de Queries:** Ajustar el modelo y los esquemas (endpoints HTTP) para guardar los nuevos parámetros de overrides indicados arriba.
- **Cronjob Programado:**
  - Utilizar una librería como `node-cron` configurada para ejecutarse cada minuto (`* * * * *`).
  - **Lógica de evaluación:**
    1. Obtener la configuración general desde la DB.
    2. Si `light_override_schedule_enabled` es verdadero: evaluar si la hora actual del servidor cae dentro del rango `[light_schedule_start, light_schedule_end]`.
       - Si está dentro del rango, la luz debe estar "ON".
       - Si está fuera, "OFF".
    3. Si `light_override_intensity_enabled` es verdadero: el valor de intensidad deseada se toma del usuario (`light_intensity_value`).
    4. Combinar las decisiones para armar y emitir un payload MQTT hacia el dispositivo ESP32.
  - **Ejemplo Payload:** `{"light_on": true, "intensity": 80}`

### 2.3 Firmware (ESP32)
- **Parseo JSON Seguro:**
  - Importar e integrar la librería `ArduinoJson` en el firmware.
  - Reemplazar el parseo artesanal (e.g. `strtok` o `indexOf`) de payloads MQTT por un `StaticJsonDocument<256> doc;`.
  - Deserializar el payload y evaluar la existencia de las llaves (`doc.containsKey("light_on")`) antes de modificar las variables de estado. Esto evita que envíos de telemetría sin info de luz alteren la configuración actual.
- **Inversión Matemática del PWM (Darlington):**
  - Dado que el transistor Darlington invierte la lógica (0 = VCC máximo a los LEDs, 255 = 0V a los LEDs), se debe ajustar la señal de salida.
  - Al momento de utilizar la función `ledcWrite(channel, value)`, el valor calculado (`intensity` mapeado de 0-100 a 0-255) debe ser invertido.
  - `uint8_t final_pwm = 255 - mapped_intensity;`
  - Ejecutar `ledcWrite(LIGHT_PWM_CHANNEL, final_pwm);`.

## 3. Data Model Changes
Añadir o migrar las siguientes columnas/campos en la tabla de configuración (SQL o NoSQL, dependiendo de lo existente):
- `light_override_schedule_enabled` (boolean)
- `light_schedule_start` (time / string "HH:mm")
- `light_schedule_end` (time / string "HH:mm")
- `light_override_intensity_enabled` (boolean)
- `light_intensity_value` (integer 0-100)

## 4. Considerations & Rollback
- Si el ESP32 no recibe un payload en un periodo prolongado, mantendrá su estado de fallback autónomo.
- Pararollback, se mantendrá en repositorios el estado anterior de la base de datos (con migraciones down correspondientes) y un backup del firmware actual sin `ArduinoJson`.
