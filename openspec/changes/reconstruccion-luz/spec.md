# Specification: reconstruccion-luz

## Architecture & Design
La refactorización simplifica la lógica de modos rígidos y la reemplaza por un sistema basado en "overrides". Por defecto, el sistema se apoyará en una compensación ambiental (sensor exterior). Los overrides permitirán forzar el estado.

- **Frontend (UI/UX)**: 
  - Se eliminan los selectores de modo tradicionales (Automático / Manual / Programado).
  - Se implementa una sección de overrides mediante switches (checkboxes) que actúan como "checklist".
  - Override 1: "Horario". Habilita la selección de una franja horaria para forzar el encendido.
  - Override 2: "Intensidad". Permite fijar un valor de PWM estático, ignorando los sensores ambientales.

- **Backend (Cron Engine)**:
  - Implementación de un cronjob (tarea programada) que corra cada minuto (`* * * * *`).
  - El proceso evaluará las configuraciones actuales de la base de datos de cada equipo. Si el "Override Horario" está activo y la hora actual coincide con la franja, despacha el comando MQTT correspondiente para forzar el encendido/apagado.

- **Firmware (ESP32)**:
  - **ArduinoJson**: El callback MQTT se reescribe usando `ArduinoJson` (usando un buffer adecuado como `StaticJsonDocument<256>`). Se usarán validaciones (ej. `doc.containsKey("luz")`) para procesar solo los campos enviados (payloads parciales) sin alterar el resto del estado (evitando que si llega solo temperatura, se corrompa el valor de luz).
  - **Inversión de Darlington**: Dado que el arreglo Darlington invierte la lógica, el PWM se adaptará a: `ledcWrite(channel, 255 - valor_deseado)`, donde 0 es brillo máximo y 255 apagado.

## File Delta Specs

### Frontend (`web/` o framework en uso)
- **Componente de Iluminación**:
  - *Modificar/Crear*: Eliminar el `<select>` o botones de modos.
  - Agregar controles tipo Toggle/Switch vinculados a `override_horario_active` y `override_intensidad_active`.
  - Mostrar inputs de hora (`start_time`, `end_time`) condicionalmente cuando `override_horario_active` es true.
  - Mostrar un `<input type="range">` para la intensidad cuando `override_intensidad_active` es true.

### Backend (`backend/`)
- **Scheduler / Cronjob**:
  - *Modificar/Crear*: Registrar un comando o tarea periódica que se ejecute cada minuto.
  - *Lógica*: `if (override_horario_active && is_current_time_in_range(start_time, end_time)) { publish_mqtt_light_on(); } else if (override_horario_active) { publish_mqtt_light_off(); }`
  - Incluir manejo de fallas de conexión a MQTT (política de retries).

### Firmware (`firmware/`)
- **Gestión MQTT** (`src/mqtt.cpp` o equivalente):
  - Importar `<ArduinoJson.h>`.
  - Reemplazar el parseo manual/rígido (o de otras librerías) en el callback `onMqttMessage`.
  - `deserializeJson(doc, payload);`
  - Validar y actualizar variables globales solo si la llave existe en el JSON.
- **Controlador de Luz** (`src/light.cpp` o equivalente):
  - Actualizar todas las llamadas a `ledcWrite`.
  - `uint8_t invertedValue = 255 - brightness; ledcWrite(PWM_CHANNEL, invertedValue);`

## Data Model Changes
Se requieren nuevos campos o claves en la configuración JSON/DB:
- `light_override_schedule` (boolean)
- `light_schedule_start` (string/time, ej "08:00")
- `light_schedule_end` (string/time, ej "20:00")
- `light_override_intensity` (boolean)
- `light_intensity_value` (integer 0-255)

## Integration & Communication
- **MQTT Payload Structure**:
  - `{"light": {"override_intensity": true, "brightness": 128}}`
  - `{"light": {"override_schedule": true, "start": "08:00", "end": "20:00"}}`
  - Las actualizaciones pueden venir con un subconjunto de llaves (partial update). El firmware y el backend deben procesar esto correctamente sin setear el resto en nulo.
