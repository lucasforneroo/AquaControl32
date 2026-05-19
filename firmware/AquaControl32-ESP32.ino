/*
 * AquaControl32 - ESP32 Firmware V3.3 (Multi-WiFi SaaS Edition)
 * =============================================================
 * NOVEDADES v3.3:
 *   - WiFi Multi: Conexión automática a múltiples redes
 *   - Compatible con ESP32 Core v3.0+
 *   - IP fija de respaldo: YOUR_SERVER_IP
 *   - Descubrimiento dinámico via mDNS
 */

#include <OneWire.h>
#include <DallasTemperature.h>
#include <WiFi.h>
#include <WiFiMulti.h> 
#include <PubSubClient.h>
#include <ESPmDNS.h>
#include <Preferences.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Wire.h>
#include <hp_BH1750.h> 

WiFiMulti wifiMulti;
WebServer server(80);
DNSServer dnsServer;

// ─── DEFINICIONES DE HARDWARE ──────────────────────────────
#define RESET_BUTTON_PIN 0
#define ONE_WIRE_BUS 4
#define LIGHT_PIN 2
#define LIGHT_FREQ 5000
#define LIGHT_RESO 8

// ─── VARIABLES GLOBALES ─────────────────────────────────────
bool lightStatus = false;
int lightIntensity = 255;
hp_BH1750 luxSensor;
float currentLux = 0;

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

WiFiClient espClient;
PubSubClient mqttClient(espClient);
Preferences prefs;

String mqtt_server_ip = "YOUR_SERVER_IP"; 
const char* mqtt_topic_data    = "aquacontrol32/esp32/temp";
const char* mqtt_topic_cmd     = "aquacontrol32/esp32/cmd";
const char* mqtt_topic_status  = "aquacontrol32/esp32/status";
const char* mqtt_client_id     = "ESP32_AquaControl32";
bool isProvisioning = false;

int numSensores = 0;
float lastTemps[5];
unsigned long lastPublish = 0;
const unsigned long PUBLISH_INTERVAL = 5000; 

// Prototipos
void setup_wifi();
void onMqttMessage(char* topic, byte* payload, unsigned int length);
void reconnectMQTT();
String buildJsonPayload();

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n════════════════════════════════");
  Serial.println("  AquaControl32 v3.3 MULTI-WIFI");
  Serial.println("════════════════════════════════");

  pinMode(RESET_BUTTON_PIN, INPUT_PULLUP);
  
  prefs.begin("aquactl", false);
  
  // 🚨 LIMPIEZA DE MEMORIA (Comentado para producción)
  // prefs.clear(); 
  Serial.println("[MEMORIA] Iniciando preferencias...");

  mqtt_server_ip = prefs.getString("mqtt", "YOUR_SERVER_IP");

  // Si se presiona BOOT, borramos todo
  if (digitalRead(RESET_BUTTON_PIN) == LOW) {
    Serial.println("[RESET] Limpiando memoria...");
    prefs.clear();
    delay(1000);
    ESP.restart();
  }

  setup_wifi();

  if (!isProvisioning) {
    // Iniciamos mDNS
    if (!MDNS.begin("aquacontrol-esp32")) {
      Serial.println("[mDNS] Error al iniciar!");
    } else {
      Serial.println("[mDNS] Iniciado correctamente.");
    }
    mqttClient.setCallback(onMqttMessage);
  }

  sensors.begin();
  numSensores = sensors.getDeviceCount();
  Serial.printf("[Sensores] DS18B20: %d detectados\n", numSensores);

  ledcAttach(LIGHT_PIN, LIGHT_FREQ, LIGHT_RESO);
  ledcWrite(LIGHT_PIN, 0); 

  Wire.begin(21, 22);
  luxSensor.begin(BH1750_TO_GROUND);
}

void loop() {
  if (wifiMulti.run() != WL_CONNECTED) {
    Serial.println("[WiFi] Reconectando...");
    delay(1000);
    return;
  }

  if (!mqttClient.connected()) reconnectMQTT();
  mqttClient.loop();

  unsigned long now = millis();
  if (now - lastPublish >= PUBLISH_INTERVAL) {
    lastPublish = now;
    sensors.requestTemperatures();
    for (int i = 0; i < numSensores; i++) {
      lastTemps[i] = sensors.getTempCByIndex(i);
    }
    luxSensor.start();
    currentLux = luxSensor.getLux();

    String payload = buildJsonPayload();
    mqttClient.publish(mqtt_topic_data, payload.c_str());
    Serial.println("[MQTT] " + payload);
  }
}

void setup_wifi() {
  WiFi.mode(WIFI_STA);
  wifiMulti.addAP("YOUR_WIFI_SSID_1", "YOUR_WIFI_PASSWORD_1");
  wifiMulti.addAP("YOUR_WIFI_SSID_2", "YOUR_WIFI_PASSWORD_2"); 

  Serial.println("[WiFi] Buscando redes...");
  if (wifiMulti.run() == WL_CONNECTED) {
    Serial.println("[WiFi] ¡Conectado con éxito!");
    Serial.print("[WiFi] IP Local: "); Serial.println(WiFi.localIP());
  }
}

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  
  if (msg.indexOf("\"light\":") >= 0) {
    lightStatus = (msg.indexOf("on") >= 0);
    ledcWrite(LIGHT_PIN, lightStatus ? lightIntensity : 0);
  }
  
  if (msg.indexOf("\"intensity\":") >= 0) {
    int start = msg.indexOf(":") + 1;
    int end = msg.indexOf("}", start);
    lightIntensity = msg.substring(start, end).toInt();
    if(lightStatus) ledcWrite(LIGHT_PIN, lightIntensity);
  }
}

void reconnectMQTT() {
  while (!mqttClient.connected()) {
    // Intentamos buscar por mDNS la IP de la PC
    int n = MDNS.queryHost("aquacontrol");
    if (n > 0) {
      mqtt_server_ip = MDNS.address(0).toString();
      Serial.println("[mDNS] Servidor hallado en: " + mqtt_server_ip);
    }

    mqttClient.setServer(mqtt_server_ip.c_str(), 1883);

    if (mqttClient.connect(mqtt_client_id)) {
      Serial.println("[MQTT] CONECTADO ✅");
      mqttClient.subscribe(mqtt_topic_cmd);
    } else {
      Serial.println("FALLÓ ❌ (reintentando en 5s)");
      delay(5000);
    }
  }
}

String buildJsonPayload() {
  String j = "{\"numSensors\":" + String(numSensores) + 
             ",\"light\":\"" + String(lightStatus ? "on" : "off") + "\"" +
             ",\"lux\":" + String(currentLux, 2) +
             ",\"intensity\":" + String(lightIntensity) +
             ",\"temps\":[";
  for (int i = 0; i < numSensores; i++) {
    if (i > 0) j += ",";
    j += "{\"id\":" + String(i + 1) + ",\"temp\":" + (isnan(lastTemps[i]) ? String("null") : String(lastTemps[i], 2)) + "}";
  }
  j += "]}";
  return j;
}
