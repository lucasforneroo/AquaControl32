   # AquaControl32
# By Lucas Fornero and Julian Muller 
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![MQTT](https://img.shields.io/badge/MQTT-660066?style=for-the-badge&logo=mqtt&logoColor=white)
![Mosquitto](https://img.shields.io/badge/Mosquitto-3C5280?style=for-the-badge&logo=eclipse-mosquitto&logoColor=white)
![ESP32](https://img.shields.io/badge/ESP32-000000?style=for-the-badge&logo=espressif&logoColor=white)
![Arduino](https://img.shields.io/badge/Arduino_IDE-00979D?style=for-the-badge&logo=arduino&logoColor=white)

AquaControl32 es un proyecto educativo de la materia ingenieria 1 en la carrera de ingenieria en computacion en la UnRaf para monitorear y controlar variables críticas de un acuario (temperatura, iluminación y calidad del agua) usando un **ESP32** como dispositivo de borde y una **aplicación web** como dashboard. El repositorio actual contiene el **frontend en React + Vite**, un **backend Node.js + Express + MQTT** y documentación técnica para el flujo en tiempo real entre **ESP32 → MQTT → Node.js → UI**. El firmware puede implementarse siguiendo las guías y ejemplos de este README.

> **Nota importante sobre el alcance del repo:**
> - **Frontend:** incluido en este repositorio (carpeta `src/`).
> - **Backend (Node.js/Express + MQTT):** disponible dentro de `AquaControl32----template/src/BACKEND/backend`.
> - **Firmware (Arduino IDE):** se incluye un **sketch de referencia** dentro de este README, pero **no hay archivo `.ino`** en el repositorio.

---

## INDICE

1. [Arquitectura general](#arquitectura-general)
2. [Frontend (React + Vite)](#frontend-react--vite)
   - [Estructura de la UI](#estructura-de-la-ui)
   - [Cómo ejecutar el frontend](#cómo-ejecutar-el-frontend)
3. [Backend (Node.js/Express + MQTT) — implementación incluida](#backend-nodejsexpress--mqtt--implementación-incluida)
   - [Qué hace el backend](#qué-hace-el-backend)
   - [Cómo ejecutarlo](#cómo-ejecutarlo)
   - [Endpoints disponibles](#endpoints-disponibles)
   - [Eventos en tiempo real (WebSocket)](#eventos-en-tiempo-real-websocket)
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
            └─ Node.js se suscribe y normaliza métricas
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

## Backend (Node.js/Express + MQTT) — implementación incluida

El backend real ya está en el repositorio, dentro de `AquaControl32----template/src/BACKEND/backend`. Está implementado con **Express**, **MQTT** y **WebSocket**, y su objetivo es recibir métricas desde el broker MQTT y enviarlas en tiempo real al frontend.

### Qué hace el backend

- Se **conecta al broker MQTT** y se suscribe a un tópico configurable.
- Mantiene en memoria el **último payload recibido** (temperatura, pH, luz).
- Expone un **endpoint REST** para leer el último estado.
- Emite actualizaciones en **tiempo real vía WebSocket** cuando llega nueva telemetría.

### Cómo ejecutarlo

1. Entra a la carpeta del backend:

```bash
cd AquaControl32----template/src/BACKEND/backend
```

2. Instala dependencias:

```bash
npm install
```

3. Configura variables de entorno (opcional):

- `HTTP_PORT` (por defecto 4000)
- `MQTT_URL` (por defecto `mqtt://broker.hivemq.com`)
- `MQTT_TOPIC` (por defecto `test/aquacontrol`)

Ejemplo rápido:

```bash
MQTT_URL=mqtt://localhost:1883 MQTT_TOPIC=aquacontrol32/esp32/telemetria npm start
```

4. Inicia el servidor (según scripts disponibles):

```bash
npm run dev
```

> Si no tienes `dev`, usa `npm start`. Verifica los scripts en `AquaControl32----template/src/BACKEND/backend/package.json`.

### Endpoints disponibles

- `GET /health` → salud del servicio.
- `GET /api/metrics` → último payload de telemetría en memoria.

### Eventos en tiempo real (WebSocket)

El backend inicia un **WebSocket server** en el mismo puerto HTTP. Cada vez que llega nueva telemetría por MQTT, transmite el payload al frontend con el tipo `metrics`.

Ejemplo de mensaje emitido:

```json
{
  "type": "metrics",
  "data": {
    "temperature": 26.4,
    "ph": 7.2,
    "lighting": 78,
    "updatedAt": "2024-09-01T12:00:00Z"
  }
}
```

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
/*
 * Lectura de sensor DS18B20 MEJORADO - ESP32
 * Con múltiples sensores, estadísticas y detección de cambios
 * INTEGRADO CON MQTT PARA AquaControl32
 */

#include <OneWire.h>
#include <DallasTemperature.h>
#include <WiFi.h>
#include <PubSubClient.h>

// Configuración WiFi (MODIFICA ESTOS VALORES)
const char* ssid = "TU_RED_WIFI";
const char* password = "TU_PASSWORD";

// Configuración MQTT
const char* mqtt_server = "broker.hivemq.com";  // Broker público de prueba
const char* mqtt_topic = "test/aquacontrol";    // Cambia el tópico
const char* mqtt_client_id = "ESP32_AquaControl";

WiFiClient espClient;
PubSubClient client(espClient);

// Pin donde está conectado el sensor DS18B20 (GPIO)
#define ONE_WIRE_BUS 32

// Umbral de cambio para notificar (en °C)
#define TEMP_CHANGE_THRESHOLD 0.5

// Configurar oneWire
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// Variables para estadísticas
float tempMin = 999.0;
float tempMax = -999.0;
float tempSum = 0.0;
int lecturas = 0;
float tempAnterior = 0.0;

// Variable para almacenar direcciones de sensores
DeviceAddress sensorAddresses[5]; // Hasta 5 sensores
int numSensores = 0;

// Array para guardar última lectura de cada sensor (para construir JSON)
float lastTemps[5];

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Inicializar lastTemps
  for (int i = 0; i < 5; i++) lastTemps[i] = NAN;

  Serial.println("=================================");
  Serial.println("  DS18B20 + MQTT - ESP32");
  Serial.println("=================================");
  Serial.println();

  // Conectar a WiFi
  setup_wifi();
  while (WiFi.status() != WL_CONNECTED) {
  delay(500);
  Serial.print(".");
}
Serial.println("");
Serial.println("WiFi conectado");
Serial.print("IP: ");
Serial.println(WiFi.localIP());

  // Configurar MQTT
  client.setServer(mqtt_server, 1883);

  // Iniciar sensores
  sensors.begin();

  // Detectar sensores conectados
  numSensores = sensors.getDeviceCount();
  Serial.print("Sensores detectados: ");
  Serial.println(numSensores);

  if (numSensores == 0) {
    Serial.println();
    Serial.println("******************************");
    Serial.println("ERROR: No se encontró ningún DS18B20");
    Serial.println("Verifica las conexiones:");
    Serial.println("  - VCC (Rojo) -> 3.3V o 5V");
    Serial.println("  - DATA (Amarillo) -> GPIO 4");
    Serial.println("  - GND (Negro) -> GND");
    Serial.println("  - Resistencia 4.7K entre VCC y DATA");
    Serial.println("******************************");
    while (1) {
      delay(1000);
    }
  }

  // Obtener direcciones de todos los sensores
  Serial.println();
  Serial.println("Direcciones de sensores:");
  for (int i = 0; i < numSensores; i++) {
    if (sensors.getAddress(sensorAddresses[i], i)) {
      Serial.print("Sensor ");
      Serial.print(i + 1);
      Serial.print(": 0x");
      for (uint8_t j = 0; j < 8; j++) {
        if (sensorAddresses[i][j] < 16) Serial.print("0");
        Serial.print(sensorAddresses[i][j], HEX);
      }
      Serial.println();
    }
  }

  // Configurar resolución
  for (int i = 0; i < numSensores; i++) {
    sensors.setResolution(sensorAddresses[i], 12);
  }

  Serial.println();
  Serial.println("Sensor(es) iniciado(s) correctamente");
  Serial.println("Resolución: 12 bits (0.0625°C)");
  Serial.printf("Pin configurado: GPIO %d\n", ONE_WIRE_BUS);
  Serial.println();
  Serial.println("Comandos disponibles:");
  Serial.println("  r - Resetear estadísticas");
  Serial.println("  s - Mostrar estadísticas");
  Serial.println();

  delay(2000);
}

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Conectando a ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi conectado");
  Serial.println("Dirección IP: ");
  Serial.println(WiFi.localIP());
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Intentando conexión MQTT...");
    if (client.connect(mqtt_client_id)) {
      Serial.println("conectado");
    } else {
      Serial.print("falló, rc=");
      Serial.print(client.state());
      Serial.println(" reintentando en 5 segundos");
      delay(5000);
    }
  }
}

void loop() {
  // Mantener conexión MQTT
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // Verificar comandos seriales
  if (Serial.available() > 0) {
    char comando = Serial.read();
    if (comando == 'r' || comando == 'R') {
      resetearEstadisticas();
    } else if (comando == 's' || comando == 'S') {
      mostrarEstadisticas();
    }
  }

  // Solicitar temperaturas
  sensors.requestTemperatures();

  // Leer temperatura de cada sensor
  for (int i = 0; i < numSensores; i++) {
    float tempC = sensors.getTempC(sensorAddresses[i]);

    if (tempC == DEVICE_DISCONNECTED_C) {
      lastTemps[i] = NAN;
      Serial.print("Sensor ");
      Serial.print(i + 1);
      Serial.println(": ERROR - Desconectado");
      continue;
    } else {
      lastTemps[i] = tempC;
    }

    // Actualizar estadísticas
    lecturas++;
    tempSum += tempC;
    if (tempC < tempMin) tempMin = tempC;
    if (tempC > tempMax) tempMax = tempC;

    Serial.print("Sensor ");
    Serial.print(i + 1);
    Serial.print(": ");
    Serial.print(tempC, 2);
    Serial.print(" °C");

    if (i == 0) {
      float cambio = tempC - tempAnterior;
      if (abs(cambio) >= TEMP_CHANGE_THRESHOLD && lecturas > 1) {
        Serial.print("  [");
        if (cambio > 0) Serial.print("+");
        Serial.print(cambio, 2);
        Serial.print("°C]");
      }
      tempAnterior = tempC;
    }

    Serial.print(" - ");
    clasificarTemperatura(tempC);
    Serial.println();
  }

  // Mostrar estadísticas cada 10 lecturas
  if (lecturas > 0 && lecturas % 10 == 0) {
    Serial.println();
    mostrarEstadisticas();
  }

  // Construir JSON y publicarlo por MQTT
  String payload = buildJsonPayload();
  Serial.println(payload);
  
  // Publicar por MQTT
  if (client.publish(mqtt_topic, payload.c_str())) {
    Serial.println("Datos publicados por MQTT");
  } else {
    Serial.println("Error al publicar por MQTT");
  }

  Serial.println("------------------------------");

  delay(2000);
}

void clasificarTemperatura(float temp) {
  if (temp < 0) {
    Serial.print("Congelación");
  } else if (temp < 10) {
    Serial.print("Frío");
  } else if (temp < 18) {
    Serial.print("Fresco");
  } else if (temp < 24) {
    Serial.print("Confortable");
  } else if (temp < 30) {
    Serial.print("Cálido");
  } else if (temp < 40) {
    Serial.print("Caliente");
  } else {
    Serial.print("Muy caliente");
  }
}

void mostrarEstadisticas() {
  if (lecturas == 0) {
    Serial.println("No hay estadísticas aún");
    return;
  }

  Serial.println();
  Serial.println("====== ESTADÍSTICAS ======");
  Serial.print("Lecturas totales: ");
  Serial.println(lecturas);
  Serial.print("Temperatura mínima: ");
  Serial.print(tempMin, 2);
  Serial.println(" °C");
  Serial.print("Temperatura máxima: ");
  Serial.print(tempMax, 2);
  Serial.println(" °C");
  Serial.print("Temperatura promedio: ");
  Serial.print(tempSum / lecturas, 2);
  Serial.println(" °C");
  Serial.print("Rango: ");
  Serial.print(tempMax - tempMin, 2);
  Serial.println(" °C");
  Serial.println("==========================");
  Serial.println();
}

void resetearEstadisticas() {
  tempMin = 999.0;
  tempMax = -999.0;
  tempSum = 0.0;
  lecturas = 0;
  tempAnterior = 0.0;

  Serial.println();
  Serial.println("Estadísticas reseteadas");
  Serial.println();
}

String buildJsonPayload() {
  String j = "{";
  j += "\"timestamp\":";
  j += String(millis());
  j += ",\"numSensors\":";
  j += String(numSensores);
  j += ",\"temps\":[";

  for (int i = 0; i < numSensores; i++) {
    if (i > 0) j += ",";
    j += "{";
    j += "\"id\":";
    j += String(i + 1);
    j += ",\"addr\":\"0x";
    for (uint8_t b = 0; b < 8; b++) {
      if (sensorAddresses[i][b] < 16) j += "0";
      j += String(sensorAddresses[i][b], HEX);
    }
    j += "\",\"temp\":";
    if (isnan(lastTemps[i])) {
      j += "null";
    } else {
      j += String(lastTemps[i], 2);
    }
    j += "}";
  }

  j += "]";
  j += ",\"stats\":{";
  j += "\"min\":";
  j += String(tempMin, 2);
  j += ",\"max\":";
  j += String(tempMax, 2);
  j += ",\"avg\":";
  float avg = (lecturas > 0) ? (tempSum / lecturas) : 0.0;
  j += String(avg, 2);
  j += "}}";
  return j;
}
```

Librerías necesarias en Arduino IDE (sensores y conectividad):
- **WiFi** (incluida en ESP32 core)
- **PubSubClient** (MQTT)
- **OneWire** + **DallasTemperature** (DS18B20 - temperatura)
- **BH1750** o **Adafruit BH1750** (sensor de luz por I2C, opcional)
- **DFRobot_PH** (sensor de pH, opcional)

> Para sensores analógicos simples (nivel de agua, turbidez, LDR en divisor), puedes usar `analogRead` sin librerías adicionales.

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
4. **Ejecutar el backend** (Express + MQTT).
5. **Ejecutar el frontend** con `npm run dev`.

---

## Troubleshooting

- **No llegan mensajes MQTT:** verifica IP del broker, puerto 1883 y la conexión WiFi.
- **Lecturas inestables:** revisa alimentación, cables y resistencias pull-up.
- **Dashboard sin datos:** verifica que el backend esté corriendo y que el tópico MQTT coincida.

---

## Créditos

Proyecto académico: monitoreo y control de variables en acuarios usando ESP32.