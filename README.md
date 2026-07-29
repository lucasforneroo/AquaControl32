# AquaControl32

<p align="center">
  <img src="assets/aquacontrol-banner.svg" alt="AquaControl32 banner" width="100%">
</p>

**Dispositivo IoT para el monitoreo de temperatura y la regulación automática de iluminación en acuarios**, basado en ESP32.

Proyecto desarrollado por **Lucas Fornero** y **Julián Müller** para la cátedra de Ingeniería en Computación I — UNRaf (Rafaela, Santa Fe, Argentina).

[![Demo en video](https://github.com/lucasforneroo/AquaControl32/raw/main/thumbnail.png)](https://youtu.be/jFxJrfuyzKE?feature=shared)

<p align="center">
  <!-- Hardware / Firmware -->
  <img src="https://img.shields.io/badge/ESP32-000000?style=for-the-badge&logo=espressif&logoColor=white" alt="ESP32">
  <img src="https://img.shields.io/badge/Arduino-00979D?style=for-the-badge&logo=arduino&logoColor=white" alt="Arduino Framework">
  <img src="https://img.shields.io/badge/C++-00599C?style=for-the-badge&logo=cplusplus&logoColor=white" alt="C++">
  <img src="https://img.shields.io/badge/Bluetooth%20LE-0082FC?style=for-the-badge&logo=bluetooth&logoColor=white" alt="Bluetooth Low Energy">
  <br>
  <img src="https://img.shields.io/badge/I²C-8A2BE2?style=for-the-badge" alt="I2C">
  <img src="https://img.shields.io/badge/1--Wire-777777?style=for-the-badge" alt="1-Wire">
  <img src="https://img.shields.io/badge/PWM%20control-FF7043?style=for-the-badge" alt="PWM">
  <img src="https://img.shields.io/badge/DS18B20-4CAF50?style=for-the-badge" alt="DS18B20 Temperature Sensor">
  <img src="https://img.shields.io/badge/BH1750-FFC107?style=for-the-badge" alt="BH1750 Light Sensor">
  <br>
  <!-- Backend / Software -->
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/MQTT-660066?style=for-the-badge&logo=mqtt&logoColor=white" alt="MQTT">
  <img src="https://img.shields.io/badge/Mosquitto-3C5280?style=for-the-badge&logo=eclipsemosquitto&logoColor=white" alt="Mosquitto Broker">
  <br>
  <!-- Mobile / Frontend -->
  <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native">
  <img src="https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
</p>

---

## ¿Qué problema resuelve?

El control tradicional de un acuario depende de termómetros de lectura manual y temporizadores fijos para la iluminación. Ese enfoque es propenso a errores humanos, no deja registro histórico y no reacciona ante cambios reales en el ambiente (estacionales, ubicación del acuario respecto a luz natural, etc.).

En el mercado existen dos extremos: controladores comerciales robustos pero costosos y cerrados (ej. Neptune Systems Apex), y soluciones open-source basadas en temporizadores fijos sin retroalimentación del entorno.

**AquaControl32 combina ambos mundos**: es un dispositivo de bajo costo y código abierto que regula la intensidad de la iluminación de forma proporcional a la luz ambiente medida en tiempo real, y además persiste el histórico de temperatura y luminosidad en una base de datos accesible desde una app móvil propia.

## Características principales

- 🌡️ **Monitoreo de temperatura del agua** mediante sensor sumergible DS18B20 (soporta hasta 5 sondas simultáneas sobre el mismo bus 1-Wire).
- 💡 **Regulación automática de iluminación** proporcional e inversa a la luz ambiente medida con el sensor BH1750 (más luz ambiente → menor intensidad LED, y viceversa).
- ⚡ **Etapa de potencia Darlington (BJT 2N2222 + MOSFET IRLZ44N)** controlada por PWM a 5 kHz, con transición suave del brillo (±2 unidades cada 30 ms) para evitar picos de corriente y cambios bruscos perceptibles.
- 📶 **Aprovisionamiento de red vía BLE**: en el primer encendido (o al perder conexión), el ESP32 expone un servidor BLE (`AquaControl32-Setup`) para recibir SSID y contraseña desde la app, sin necesidad de reprogramar el firmware.
- 📡 **Comunicación MQTT** (broker Mosquitto) entre el firmware y el backend, con topics separados para telemetría (`aquacontrol32/esp32/temp`) y comandos (`aquacontrol32/esp32/cmd`).
- 🎛️ **Control manual remoto**: además del modo automático, se puede fijar una intensidad fija (`override_intensity`) o encender/apagar el sistema (`light_on`) desde la app.
- 📊 **Histórico persistente** de temperatura y luminosidad en PostgreSQL, visualizado en tiempo real desde una app móvil.
- 🔔 **Alertas configurables** de temperatura: rangos ideal y crítico personalizables, con notificaciones push cuando se exceden los umbrales.

## Arquitectura del sistema

```
Sensores (DS18B20, BH1750)
        │
        ▼
   ESP32 (firmware C++/Arduino)
        │  MQTT (JSON) sobre Wi-Fi
        ▼
  Broker Mosquitto
        │
        ▼
Backend Node.js + Express  ───►  PostgreSQL (histórico)
        │
        ▼
App móvil React Native + Expo (dashboard en tiempo real)
```

**Flujo de datos:** el ESP32 lee ambos sensores, calcula el duty cycle de PWM en función de la luz medida, aplica la intensidad a la etapa Darlington y publica un payload JSON por MQTT. El backend se suscribe al topic, persiste los datos en PostgreSQL y los expone a la app, que refresca el panel periódicamente.

## Hardware

| Componente | Función |
|---|---|
| ESP32 DevKit V1 | Unidad de procesamiento central |
| DS18B20 | Sensor sumergible de temperatura (1-Wire, hasta 5 sondas) |
| BH1750 | Sensor de luz ambiente (I²C, 1–65535 lux) |
| BJT 2N2222 + MOSFET IRLZ44N | Etapa de potencia Darlington para el control PWM de la tira LED |
| Fuente T0500600 | Entrada 100–240V, salida 5V |

La frecuencia de PWM (5 kHz) se eligió por encima del umbral de fusión de parpadeo del ojo humano (50–90 Hz), de modo que la tira LED se percibe como una fuente de luz continua sin flicker.

### Ecuación de control de intensidad

```
pct = 100 − (lux_medido / LUX_MAX) × 100
```

Donde `LUX_MAX` es un valor configurable a partir del cual el sistema considera innecesario el aporte artificial de luz. El resultado se satura entre 0% y 100%.

## Ejemplo de payload MQTT

```json
{
  "numSensors": 1,
  "light": "on",
  "lux": 320.00,
  "intensity": 75,
  "currentPWM": 191,
  "temps": [{ "id": 1, "temp": 24.50 }]
}
```

## Estructura del repositorio

```
├── firmware/    # Código C++/Arduino para el ESP32
├── backend/     # Servidor Node.js + Express + MQTT + PostgreSQL
├── mobile/      # App React Native + Expo
├── docs/        # Documentación técnica y bitácora de versiones
└── assets/      # Recursos gráficos compartidos
```

Cada carpeta tiene su propio README con instrucciones específicas de instalación.

## Cómo empezar

### Backend

```bash
cd backend
npm install
npm start
```

### Mobile

```bash
cd mobile
npm install
npx expo start
```

## Resultados experimentales

Se validó que la regulación de intensidad responde proporcionalmente a la luz ambiente detectada:

| Luz medida (BH1750) | Duty cycle aplicado (0–255) | Observación |
|---|---|---|
| 1.25 lux | 234 | Ambiente muy oscuro |
| 59.58 lux | 168 | Ambiente con poca luz |
| 181.25 lux | 86 | Ambiente moderadamente iluminado |
| 337.08 lux | 0 | Ambiente muy iluminado |

Se confirmó el correcto funcionamiento de la cadena completa: sensor → firmware → backend → base de datos → frontend.

## Limitaciones actuales y trabajo futuro

- La IP del broker MQTT tiene un valor por defecto hardcodeado como respaldo ante fallos de resolución mDNS — pendiente de mejora.
- El sistema releva únicamente temperatura y luz ambiente; queda pendiente incorporar otras variables relevantes (calidad del agua, pH).
- Actualmente no hay actuadores para regular temperatura automáticamente; solo se envían alertas cuando se excede un umbral configurado.

## Stack técnico

- **Firmware:** C++ / Arduino Framework para ESP32
- **Backend:** Node.js, Express, MQTT (Mosquitto), PostgreSQL
- **Mobile:** React Native + Expo
- **Protocolos:** MQTT, BLE (GATT), I²C, 1-Wire

## Autores

- Lucas Fornero
- Julián Müller

Proyecto académico — Ingeniería en Computación I, UNRaf.
