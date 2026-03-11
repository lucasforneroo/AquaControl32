/*
 * Lectura de sensor DS18B20 - ESP32 V2.4
 * INTEGRADO CON MQTT PARA AquaControl32
 * 
 * CORRECCIÓN: Uso de queryHost como alternativa a MDNS.IP() para máxima compatibilidad.
 */

#include <OneWire.h>
#include <DallasTemperature.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ESPmDNS.h>

// Configuración WiFi
const char* ssid = "Fibertel WiFi764 2.4GHz";
const char* password = "0142601491";

// Configuración MQTT
String mqtt_server_ip = "/*
 * Lectura de sensor DS18B20 MEJORADO - ESP32
 * Con múltiples sensores, estadísticas y detección de cambios
 * INTEGRADO CON MQTT PARA AquaControl32
 */

#include <OneWire.h>
#include <DallasTemperature.h>
#include <WiFi.h>
#include <PubSubClient.h>

// Configuración WiFi (MODIFICA ESTOS VALORES)
const char* ssid = "Fibertel WiFi764 2.4GHz";
const char* password = "0142601491";

// Configuración MQTT
const char* mqtt_server = "192.168.0.13";   // IP DE TU PC
const char* mqtt_topic = "aquacontrol32/esp32/temp";
const char* mqtt_client_id = "ESP32_AquaControl32";


WiFiClient espClient;
PubSubClient client(espClient);

// Pin donde está conectado el sensor DS18B20 (GPIO)
#define ONE_WIRE_BUS 4

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
}192.168.0.7"; 
const char* mqtt_topic = "aquacontrol32/esp32/temp";
const char* mqtt_client_id = "ESP32_AquaControl32";

WiFiClient espClient;
PubSubClient client(espClient);

#define ONE_WIRE_BUS 4
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

float tempMin = 999.0, tempMax = -999.0, tempSum = 0.0, tempAnterior = 0.0;
int lecturas = 0, numSensores = 0;
DeviceAddress sensorAddresses[5];
float lastTemps[5];

/**
 * Busca servicios _http._tcp.local y resuelve su IP usando queryHost.
 * Este método es más compatible con versiones antiguas o modificadas del core de ESP32.
 */
void descubrirServidor() {
  Serial.println("\n[mDNS] Buscando 'aquacontrol'...");
  
  if (!MDNS.begin("esp32-aquacontrol")) {
    Serial.println("[mDNS] Error iniciando");
    return;
  }

  // Buscamos servicios HTTP
  int n = MDNS.queryService("http", "tcp");
  
  if (n > 0) {
    for (int i = 0; i < n; i++) {
      String hostname = MDNS.hostname(i);
      Serial.print("[mDNS] Servicio detectado en host: "); Serial.println(hostname);
      
      if (hostname.indexOf("aquacontrol") >= 0 || i == 0) {
        // En lugar de MDNS.IP(i), usamos queryHost para obtener la IPAddress
        IPAddress result = MDNS.queryHost(hostname);
        
        if (result.toString() != "0.0.0.0") {
          mqtt_server_ip = result.toString();
          Serial.print("[mDNS] ¡IP encontrada! -> "); Serial.println(mqtt_server_ip);
          return;
        }
      }
    }
  } else {
    Serial.println("[mDNS] No se encontró el servicio. Usando IP por defecto o reintentando...");
    // Fallback manual por si acaso
    IPAddress fallback = MDNS.queryHost("aquacontrol");
    if (fallback.toString() != "0.0.0.0") {
      mqtt_server_ip = fallback.toString();
      Serial.print("[mDNS] Encontrado via queryHost directo: "); Serial.println(mqtt_server_ip);
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  for (int i = 0; i < 5; i++) lastTemps[i] = NAN;

  Serial.println("\n--- AquaControl32 ESP32 V2.4 ---");
  setup_wifi();
  descubrirServidor();

  client.setServer(mqtt_server_ip.c_str(), 1883);
  sensors.begin();
  numSensores = sensors.getDeviceCount();
  for (int i = 0; i < numSensores; i++) {
    sensors.getAddress(sensorAddresses[i], i);
    sensors.setResolution(sensorAddresses[i], 12);
  }
}

void setup_wifi() {
  Serial.print("WiFi: "); Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\nOK! IP: " + WiFi.localIP().toString());
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Conectando MQTT (" + mqtt_server_ip + ")... ");
    if (client.connect(mqtt_client_id)) {
      Serial.println("OK");
    } else {
      Serial.print("Error rc="); Serial.print(client.state());
      Serial.println(" - 5s y reintento...");
      descubrirServidor();
      client.setServer(mqtt_server_ip.c_str(), 1883);
      delay(5000);
    }
  }
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  sensors.requestTemperatures();
  for (int i = 0; i < numSensores; i++) {
    float tempC = sensors.getTempC(sensorAddresses[i]);
    if (tempC == DEVICE_DISCONNECTED_C) continue;
    
    lastTemps[i] = tempC;
    lecturas++;
    tempSum += tempC;
    if (tempC < tempMin) tempMin = tempC;
    if (tempC > tempMax) tempMax = tempC;
    
    Serial.print("S"); Serial.print(i + 1); Serial.print(": "); 
    Serial.print(tempC, 2); Serial.println("C");
  }

  String payload = buildJsonPayload();
  client.publish(mqtt_topic, payload.c_str());
  delay(2000);
}

String buildJsonPayload() {
  String j = "{\"numSensors\":" + String(numSensores) + ",\"temps\":[";
  for (int i = 0; i < numSensores; i++) {
    if (i > 0) j += ",";
    j += "{\"id\":" + String(i + 1) + ",\"temp\":" + (isnan(lastTemps[i]) ? String("null") : String(lastTemps[i], 2)) + "}";
  }
  j += "]}";
  return j;
}
