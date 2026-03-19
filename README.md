# AquaControl32
![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![MQTT](https://img.shields.io/badge/MQTT-660066?style=for-the-badge&logo=mqtt&logoColor=white)
![Mosquitto](https://img.shields.io/badge/Mosquitto-3C5280?style=for-the-badge&logo=eclipse-mosquitto&logoColor=white)
![ESP32](https://img.shields.io/badge/ESP32-000000?style=for-the-badge&logo=espressif&logoColor=white)
![Arduino](https://img.shields.io/badge/Arduino_IDE-00979D?style=for-the-badge&logo=arduino&logoColor=white)
![React](https://img.shields.io/badge/React_(Web)-61DAFB?style=for-the-badge&logo=react&logoColor=20232A)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Google Cloud](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=000000&labelColor=white)

AquaControl32 es un proyecto educativo de la materia Ingeniería 1 en la carrera de Ingeniería en Computación en la UnRaf para monitorear y controlar variables críticas de un acuario (temperatura, iluminación y calidad del agua) usando un **ESP32** como dispositivo de borde.

El proyecto cuenta con:
- 📱 **App móvil** en **React Native + Expo** (v1.3) — ahora con Gráficos y Google Login
- 🌐 **App web** en **React + Vite** (v1.0) — versión original de dashboard 
- ⚙️ **Backend Node.js + Express + MQTT + WebSocket + PostgreSQL** — infraestructura escalable con persistencia
- 🔌 **Firmware ESP32** con sensor DS18B20 y auto-descubrimiento por mDNS

> 📄 **[Ver changelog de v1.3 →](docs/new-version-1.3.md)**

> **Nota sobre el alcance del repo:**
> - **App Móvil (React Native + Expo):** carpeta `AquaControl32-Mobile/`
> - **App Web (React + Vite):** carpeta `AquaControl32----template/src/`
> - **Backend (Node.js/Express + MQTT):** carpeta `AquaControl32----template/backend/`
> - **Firmware (Arduino IDE):** sketch de referencia incluido en este README

---

## INDICE

1. [Arquitectura general](#arquitectura-general)
2. [App Móvil (React Native + Expo)](#app-móvil-react-native--expo)
   - [Estructura de la UI móvil](#estructura-de-la-ui-móvil)
   - [Cómo ejecutar la app móvil](#cómo-ejecutar-la-app-móvil)
3. [App Web (React + Vite)](#app-web-react--vite)
   - [Cómo ejecutar la app web](#cómo-ejecutar-la-app-web)
4. [Backend (Node.js/Express + MQTT + WebSocket)](#backend-nodejsexpress--mqtt--websocket)
   - [Qué hace el backend](#qué-hace-el-backend)
   - [Cómo ejecutarlo](#cómo-ejecutarlo)
   - [Eventos en tiempo real (WebSocket)](#eventos-en-tiempo-real-websocket)
5. [MQTT con Mosquitto](#mqtt-con-mosquitto)
   - [Instalación y configuración](#instalación-y-configuración)
   - [Tópicos recomendados](#tópicos-recomendados)
   - [Formato de mensajes](#formato-de-mensajes)
6. [Firmware ESP32 (Arduino IDE) — ejemplo funcional](#firmware-esp32-arduino-ide--ejemplo-funcional)
7. [Materiales de hardware y sensores](#materiales-de-hardware-y-sensores)
8. [Conexiones recomendadas](#conexiones-recomendadas)
9. [Procedimiento completo para ejecutar el proyecto](#procedimiento-completo-para-ejecutar-el-proyecto)
10. [Troubleshooting](#troubleshooting)

---

## Arquitectura general

```
ESP32 (sensor DS18B20)
   │
   │ publica temperaturas por MQTT
   ▼
Mosquitto (broker MQTT, puerto 1883)
   │
   │ backend se suscribe al topic
   ▼
Backend Node.js (Express, puerto 4000)
   │
   │ reenvía datos por WebSocket
   ▼
App Móvil (React Native + Expo)        App Web (React + Vite)
   en Samsung A15 / dispositivo real       en navegador
```

Este patrón es liviano para microcontroladores y permite **telemetría en tiempo real** con historial y alertas configurables en el backend.

---

## App Móvil (React Native + Expo)

> **v1.3** — Versión actual principal con Gráficos y Auth

La app móvil fue migrada desde la versión web (React + Vite) a **React Native con Expo SDK 54**, permitiendo ejecución nativa en dispositivos Android e iOS.

### Estructura de la UI móvil

La interfaz está en `AquaControl32-Mobile/App.js` e incluye:

- **Pantalla de introducción** animada con logo AQ32
- **Dashboard principal** con diseño responsive (móvil y escritorio):
  - Header con logo y botones de navegación
  - Título "AquaControl 32" y subtítulo descriptivo
  - **Control de temperatura** con botones +/- (incrementos de 0.5°C)
  - **Control de luz** ON/OFF
  - **Panel "Estado del acuario"** con indicador de conexión WebSocket
  - **Métricas en tiempo real**: Temperatura, Iluminación, PH
- **Pantalla de historia** del proyecto ("Nuestra Historia")
- **Fondo animado** con partículas acuáticas

### Componentes

| Componente | Archivo | Función |
|---|---|---|
| `AnimatedBackground` | `src/components/AnimatedBackground.jsx` | Fondo animado con burbujas |
| `Intro` | `src/components/Intro.jsx` | Splash screen animado |
| `TemperatureControl` | `src/components/TemperatureControl.jsx` | Control de temperatura con +/- |
| `AQ32logo` | `src/components/AQ32logo.jsx` | Logo SVG del proyecto |
| `HistoryScreen` | `src/components/HistoryScreen.jsx` | Pantalla "Nuestra Historia" (Proyecto) |
| `MetricsHistoryScreen` | `src/components/MetricsHistoryScreen.jsx` | Gráficos e historial de sensores |

### Cómo ejecutar la app móvil

Requisitos:
- Node.js 18+
- Expo CLI
- Dispositivo físico con **Expo Go** o emulador Android

```bash
cd AquaControl32-Mobile
npm install
npx expo start
```

> **⚠️ Importante para dispositivos físicos:** Editar `src/constants/config.js` y cambiar la IP a la de tu PC en la red local:
> ```js
> WS_URL: 'ws://TU_IP_LOCAL:4000'
> ```

---

## App Web (React + Vite)

> **v1.0** — Versión original del proyecto (landing/demo de dashboard)

La versión web original está en `AquaControl32----template/src/` y funciona como dashboard en navegador.

### Cómo ejecutar la app web

```bash
cd AquaControl32----template
npm install
npm run dev
```

Luego abre el navegador en `http://localhost:5173`.

---

## Backend (Node.js/Express + MQTT + WebSocket)

El backend está en `AquaControl32----template/backend/` y actúa como **puente entre el ESP32 y las aplicaciones** (móvil y web).

### Qué hace el backend

- Se **conecta al broker MQTT** (Mosquitto) y se suscribe al topic `aquacontrol32/esp32/#`
- Mantiene en memoria el **último payload recibido** (temperatura)
- Expone un **servidor WebSocket** en el puerto 4000 para enviar datos en tiempo real
- Implementa **heartbeat** (ping cada 30s) para mantener conexiones activas
- Escucha en **0.0.0.0** para aceptar conexiones desde dispositivos en la red local

### Cómo ejecutarlo

```bash
cd AquaControl32----template/backend
npm install
node index.js
```

Deberías ver:
```
[HTTP] servidor escuchando en http://0.0.0.0:4000
[MQTT] conectado a mqtt://localhost:1883
[MQTT] suscrito a aquacontrol32/esp32/#
```

> **⚠️ El backend debe estar corriendo ANTES de abrir la app móvil.** Son dos procesos separados que corren en terminales distintas.

### Eventos en tiempo real (WebSocket)

Cada vez que llega nueva telemetría por MQTT, el backend transmite al cliente:

```json
{
  "type": "metrics",
  "data": {
    "temperature": 26.4,
    "updatedAt": "2026-02-11T12:00:00Z"
  }
}
```

---

## MQTT con Mosquitto

### Instalación y configuración

Se recomienda **Mosquitto** como broker MQTT. Configuración mínima:

```
allow_anonymous true
listener 1883
```

### Tópicos recomendados

- `aquacontrol32/esp32/telemetria`
- `aquacontrol32/esp32/estado`
- `aquacontrol32/esp32/alertas`
- `aquacontrol32/esp32/comandos` (desde backend → ESP32)

### Formato de mensajes

Ejemplo JSON publicado por el ESP32:

```json
{
  "timestamp": 123456,
  "numSensors": 1,
  "temps": [
    { "id": 1, "addr": "0x28FF...", "temp": 26.40 }
  ],
  "stats": { "min": 25.00, "max": 27.50, "avg": 26.25 }
}
```

Recomendaciones:
- Usar **QoS 0 o 1** para balance entre latencia y fiabilidad.
- Mantener payloads **compactos** (microcontrolador).
- Publicar cada 2–10 segundos según necesidad.

---

## Firmware ESP32 (Arduino IDE) — ejemplo funcional

Este sketch de referencia lee temperaturas reales del sensor DS18B20 y las publica por MQTT.

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

### Opción A: App Móvil (recomendado)

1. **Configurar Mosquitto** en tu PC (broker MQTT en puerto 1883)
2. **Conectar el ESP32** con los sensores y cargar el sketch desde Arduino IDE
3. **Iniciar el backend** (Terminal 1):
   ```bash
   cd AquaControl32----template/backend
   npm install
   node index.js
   ```
4. **Iniciar la app móvil** (Terminal 2):
   ```bash
   cd AquaControl32-Mobile
   npm install
   npx expo start
   ```
5. Escanear el QR con **Expo Go** en tu celular Android/iOS

> ⚠️ El celular y la PC deben estar en la **misma red WiFi**. Configurar la IP en `AquaControl32-Mobile/src/constants/config.js`.

### Opción B: App Web

1. Seguir pasos 1-3 de la Opción A
2. Ejecutar el frontend web:
   ```bash
   cd AquaControl32----template
   npm install
   npm run dev
   ```
3. Abrir `http://localhost:5173` en el navegador

---

## Troubleshooting

- **"WebSocket error" en la app móvil:**
  - Verificar que el backend esté corriendo (`node index.js`)
  - Verificar que la IP en `config.js` sea la IP correcta de tu PC
  - Verificar que el celular esté en la misma red WiFi
  - Revisar si el Firewall de Windows bloquea el puerto 4000
- **No llegan mensajes MQTT:** verificar IP del broker, puerto 1883 y la conexión WiFi del ESP32
- **Lecturas inestables:** revisar alimentación, cables y resistencias pull-up
- **Dashboard sin datos:** verificar que el backend esté corriendo y que el tópico MQTT coincida (`aquacontrol32/esp32/#`)

---

## Versiones

| Versión | Stack | Descripción |
|---------|-------|-------------|
| **v1.0** | React + Vite | Dashboard web original |
| **v1.2** | React Native + Expo | App móvil nativa + backend mejorado |
| **v1.3** | Stack v1.2 + PostgreSQL | Google Auth, Gráficos y Persistencia |

📄 [Ver detalle de cambios en v1.3 →](docs/new-version-1.3.md)

---

## Créditos

Proyecto académico de la materia Ingeniería 1 — Universidad Nacional de Rafaela (UnRaf).
Monitoreo y control de variables en acuarios usando ESP32.
