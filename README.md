# AquaControl32

AquaControl32 es un proyecto educativo para monitorear y controlar variables críticas de un acuario (temperatura, iluminación y calidad del agua) usando un **ESP32** como dispositivo de borde y una **aplicación web** como dashboard. El repositorio actual contiene el **frontend en React + Vite** y documentación técnica para el flujo en tiempo real entre **ESP32 → MQTT → Node.js → UI**. El backend y el firmware pueden implementarse siguiendo las guías y ejemplos de este README.

> **Nota importante sobre el alcance del repo:**
> - **Frontend:** incluido en este repositorio (carpeta `src/`).
> - **Backend (Node.js/Express + MySQL):** descrito en esta documentación, pero **no está implementado** en el repositorio.
> - **Firmware (Arduino IDE):** se incluye un **sketch de referencia** dentro de este README, pero **no hay archivo `.ino`** en el repositorio.

---

## Índice

1. [Arquitectura general](#arquitectura-general)
2. [Frontend (React + Vite)](#frontend-react--vite)
   - [Estructura de la UI](#estructura-de-la-ui)
   - [Cómo ejecutar el frontend](#cómo-ejecutar-el-frontend)
3. [Backend (Node.js/Express + MySQL) — diseño propuesto](#backend-nodejsexpress--mysql--diseño-propuesto)
   - [Responsabilidades](#responsabilidades)
   - [Modelo de datos sugerido](#modelo-de-datos-sugerido)
   - [Endpoints sugeridos](#endpoints-sugeridos)
4. [MQTT con Mosquitto](#mqtt-con-mosquitto)
   - [Instalación y configuración](#instalación-y-configuración)
   - [Tópicos recomendados](#tópicos-recomendados)
   - [Formato de mensajes](#formato-de-mensajes)
5. [Firmware ESP32 (Arduino IDE) — ejemplo funcional](#firmware-esp32-arduino-ide--ejemplo-funcional)
6. [Materiales de hardware y sensores](#materiales-de-hardware-y-sensores)
7. [Conexiones recomendadas](#conexiones-recomendadas)
8. [Procedimiento completo para ejecutar el proyecto](#procedimiento-completo-para-ejecutar-el-proyecto)
9. [Troubleshooting](#troubleshooting)

---

## Arquitectura general

La arquitectura propuesta (y documentada en `docs/esp32-node-realtime.md`) es:

```
ESP32 (sensores/actuadores)
   └─ publica lecturas → MQTT (Mosquitto)
            └─ Node.js se suscribe y guarda en MySQL
                  └─ Node.js emite a la UI (WebSocket/SSE)
                        └─ Frontend React muestra dashboard
```

Este patrón es liviano para microcontroladores y permite **telemetría en tiempo real**, con historial y alertas configurables en el backend. Para más contexto sobre protocolos y variantes, consulta la documentación en `docs/esp32-node-realtime.md`.

---

## Frontend (React + Vite)

El frontend es una **landing/demo de dashboard** ya maquetada para el proyecto. Está pensada como base para incorporar datos en tiempo real cuando el backend esté listo.

### Estructura de la UI

La interfaz principal está en `src/App.jsx` e incluye:

- **Hero principal** con badge “Dashboard inteligente”, título y texto descriptivo del proyecto.
- **Botones de acción**: “Conectar dispositivo” y “Ver demostración”.
- **Métricas rápidas** (monitoreo 24/7, precisión térmica, alarmas configurables).
- **Panel lateral de estado** con:
  - Estado general (ej. “Estable”).
  - Tres métricas destacadas (Temperatura, Iluminación, PH).
  - Timeline de eventos (ej. encendido gradual, alertas, modo nocturno).
- **Sección de features** con mensajes de control centralizado, alertas proactivas e historial.

Todo el contenido está actualmente **estático** en JSX, listo para conectarse a datos reales (por ejemplo, desde WebSocket) cuando se implemente el backend.

### Cómo ejecutar el frontend

Requisitos:
- Node.js 18+ (recomendado)
- npm

Pasos:

```bash
npm install
npm run dev
```

Luego abre el navegador en la URL que Vite indique (por defecto `http://localhost:5173`).

---

## Backend (Node.js/Express + MySQL) — diseño propuesto

El README original menciona Node.js/Express + MySQL como backend, pero **no existe implementación en este repositorio**. A continuación, se describe un diseño recomendado para que otro usuario pueda reconstruirlo.

### Responsabilidades

- **Suscribirse a MQTT** para recibir datos de sensores en tiempo real.
- **Persistir datos** de telemetría en MySQL.
- **Emitir eventos** al frontend (WebSocket o SSE).
- **Exponer endpoints** REST para configuración, historial y control.

### Modelo de datos sugerido

Tabla `telemetria`:

| Campo        | Tipo        | Descripción                     |
|--------------|-------------|---------------------------------|
| id           | INT (PK)    | Identificador autoincremental   |
| dispositivo  | VARCHAR     | ID o nombre del ESP32           |
| temperatura  | FLOAT       | °C                              |
| ph           | FLOAT       | pH                              |
| luz          | FLOAT       | % o lux                         |
| timestamp    | DATETIME    | Fecha/hora de la lectura        |

Tabla `alertas` (opcional):

| Campo        | Tipo        | Descripción                     |
|--------------|-------------|---------------------------------|
| id           | INT (PK)    | Identificador                   |
| tipo         | VARCHAR     | temperatura/ph/luz              |
| mensaje      | VARCHAR     | Descripción de la alerta        |
| timestamp    | DATETIME    | Fecha/hora de la alerta         |

### Endpoints sugeridos

- `GET /api/telemetria?from=...&to=...` → historial
- `GET /api/estado` → última lectura
- `POST /api/config` → umbrales de alertas
- `POST /api/actuadores` → comandos (luz, calefactor, bomba)

---

## MQTT con Mosquitto

### Instalación y configuración

Se recomienda **Mosquitto** como broker MQTT. El repositorio incluye un archivo de ejemplo en `AquaControl32----template/mosquitto.conf`:

```
allow_anonymous true
listener 1883
```

Con este archivo puedes ejecutar un broker local rápido para pruebas.

### Tópicos recomendados

- `aquacontrol32/esp32/telemetria`
- `aquacontrol32/esp32/estado`
- `aquacontrol32/esp32/alertas`
- `aquacontrol32/esp32/comandos` (desde backend → ESP32)

### Formato de mensajes

Ejemplo JSON publicado por el ESP32:

```json
{
  "device_id": "esp32-001",
  "temperature": 26.4,
  "ph": 7.2,
  "light": 78,
  "timestamp": "2024-09-01T12:00:00Z"
}
```

Recomendaciones:
- Usar **QoS 0 o 1** para balance entre latencia y fiabilidad.
- Mantener payloads **compactos** (microcontrolador).
- Publicar cada 2–10 segundos según necesidad.

---

## Firmware ESP32 (Arduino IDE) — ejemplo funcional

Este sketch de referencia publica datos ficticios a MQTT. Debes ajustarlo a tus sensores reales.

```cpp
#include <WiFi.h>
#include <PubSubClient.h>

const char* ssid = "TU_WIFI";
const char* password = "TU_PASSWORD";
const char* mqtt_server = "192.168.1.100"; // IP del broker Mosquitto

WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  client.setServer(mqtt_server, 1883);
}

void reconnect() {
  while (!client.connected()) {
    if (client.connect("esp32-001")) {
      client.subscribe("aquacontrol32/esp32/comandos");
    } else {
      delay(2000);
    }
  }
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // Datos simulados (reemplazar por lecturas reales de sensores)
  float temperatura = 26.4;
  float ph = 7.2;
  int luz = 78;

  String payload = "{\"device_id\":\"esp32-001\",\"temperature\":" + String(temperatura) +
                   ",\"ph\":" + String(ph) +
                   ",\"light\":" + String(luz) + "}";

  client.publish("aquacontrol32/esp32/telemetria", payload.c_str());
  delay(5000);
}
```

Librerías necesarias en Arduino IDE:
- **WiFi** (incluida en ESP32 core)
- **PubSubClient** (instalar desde Library Manager)

---

## Materiales de hardware y sensores

Componentes recomendados:

- **ESP32 DevKit V1** (microcontrolador principal).
- **Sensor de temperatura sumergible** (DS18B20 o similar).
- **Sensor de pH** (por ejemplo, kit con módulo BNC).
- **Sensor de luz** (LDR + divisor de voltaje, o BH1750 I2C).
- **Relé 5V/3.3V** para controlar calefactor o luces.
- **Fuente de alimentación estable** (5V/2A recomendado).
- **Protoboard y cables Dupont**.

Opcionales:
- **Sensor de nivel de agua**.
- **Bomba / actuadores** para automatización.

---

## Conexiones recomendadas

> *Estas conexiones son orientativas; consulta las hojas de datos de tus sensores.*

1. **DS18B20 (temperatura):**
   - VCC → 3.3V
   - GND → GND
   - DATA → GPIO 4 (con resistencia pull-up de 4.7k a 3.3V)

2. **Sensor de luz (LDR):**
   - LDR + resistencia en divisor de voltaje
   - Punto medio → ADC (GPIO 34 por ejemplo)

3. **Sensor pH:**
   - Salida analógica del módulo → ADC (GPIO 35 por ejemplo)
   - VCC y GND según módulo

4. **Relé para actuadores:**
   - IN → GPIO 26 (ejemplo)
   - VCC y GND según módulo

---

## Procedimiento completo para ejecutar el proyecto

1. **Configurar Mosquitto** en tu PC o en una Raspberry Pi.
2. **Conectar el ESP32** con los sensores y cargar el sketch (Arduino IDE).
3. **Levantar el broker MQTT** (Mosquitto).
4. **Implementar el backend** (si deseas persistencia y control remoto).
5. **Ejecutar el frontend** con `npm run dev`.

---

## Troubleshooting

- **No llegan mensajes MQTT:** verifica IP del broker, puerto 1883 y la conexión WiFi.
- **Lecturas inestables:** revisa alimentación, cables y resistencias pull-up.
- **Dashboard sin datos:** asegúrate de implementar WebSocket/SSE en el backend.

---

## Créditos

Proyecto académico: monitoreo y control de variables en acuarios usando ESP32.
