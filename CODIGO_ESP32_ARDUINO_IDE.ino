/*
 * AquaControl32 - ESP32 Firmware V3.2 (SaaS FIXED)
 * =============================================================
 * Instrucciones: Copia este código y pégalo en tu Arduino IDE.
 * Asegúrate de tener instaladas las librerías: 
 * - OneWire
 * - DallasTemperature
 * - PubSubClient
 * - hp_BH1750
 */

#include <OneWire.h>
#include <DallasTemperature.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ESPmDNS.h>
#include <Preferences.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Wire.h>
#include <hp_BH1750.h> 

// DEFINICIONES DE SENSORES
#define ONE_WIRE_BUS 4
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// CONFIGURACIÓN DE LUZ (LEDC v3.0 compatible)
#define LIGHT_PIN 2  
#define LIGHT_FREQ 5000
#define LIGHT_RESO 8

// VARIABLES GLOBALES
WebServer server(80);
DNSServer dnsServer;
const char* ssid_fallback = "Pablo Fornero 2.4GHz";
const char* pass_fallback = "221233601607";
#define RESET_BUTTON_PIN 0  

bool lightStatus = false;
int lightIntensity = 255; 
hp_BH1750 luxSensor;
float currentLux = 0;

WiFiClient espClient;
PubSubClient mqttClient(espClient);
Preferences prefs;

String wifi_ssid = "";
String wifi_pass = "";
String mqtt_server_ip = "192.168.0.105";
const char* mqtt_topic_data    = "aquacontrol32/esp32/temp";
const char* mqtt_topic_cmd     = "aquacontrol32/esp32/cmd";
const char* mqtt_topic_status  = "aquacontrol32/esp32/status";
const char* mqtt_client_id     = "ESP32_AquaControl32";
bool isProvisioning = false;

int numSensores = 0;
DeviceAddress sensorAddresses[5];
float lastTemps[5];
unsigned long lastPublish = 0;
const unsigned long PUBLISH_INTERVAL = 5000; 

// Prototipos
void setup_wifi();
void startProvisioning();
void handleCaptivePortal();
void onMqttMessage(char* topic, byte* payload, unsigned int length);
void reconnectMQTT();
String buildJsonPayload();

// SETUP
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n════════════════════════════════");
  Serial.println("  AquaControl32 v3.2 FIXED");
  Serial.println("════════════════════════════════");

  pinMode(RESET_BUTTON_PIN, INPUT_PULLUP);
  
  prefs.begin("aquactl", false);
  wifi_ssid = prefs.getString("ssid", ssid_fallback);
  wifi_pass = prefs.getString("pass", pass_fallback);
  mqtt_server_ip = prefs.getString("mqtt", "192.168.0.105");

  if (digitalRead(RESET_BUTTON_PIN) == LOW) {
    Serial.println("[RESET] Borrando memoria...");
    prefs.clear();
    delay(1000);
    ESP.restart();
  }

  setup_wifi();

  if (!isProvisioning) {
    mqttClient.setServer(mqtt_server_ip.c_str(), 1883);
    mqttClient.setCallback(onMqttMessage);
  } else {
    server.on("/", []() {
      server.send(200, "text/html", "<h1>Modo Config AquaControl</h1>");
    });
    server.onNotFound(handleCaptivePortal);
    server.begin();
    dnsServer.start(53, "*", WiFi.softAPIP());
  }

  sensors.begin();
  numSensores = sensors.getDeviceCount();
  Serial.printf("[Sensores] DS18B20: %d detectados\n", numSensores);

  // NUEVO PWM (LEDC v3.0+)
  ledcAttach(LIGHT_PIN, LIGHT_FREQ, LIGHT_RESO);
  ledcWrite(LIGHT_PIN, 0); 

  Wire.begin(21, 22);
  luxSensor.begin(BH1750_TO_GROUND);
}

// LOOP
void loop() {
  if (isProvisioning) {
    dnsServer.processNextRequest();
    server.handleClient();
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
  WiFi.begin(wifi_ssid.c_str(), wifi_pass.c_str());
  Serial.printf("[WiFi] Conectando a %s", wifi_ssid.c_str());
  int t = 0;
  while (WiFi.status() != WL_CONNECTED && t < 20) {
    delay(500); Serial.print("."); t++;
  }
  if (WiFi.status() != WL_CONNECTED) {
    isProvisioning = true;
    WiFi.mode(WIFI_AP);
    WiFi.softAP("AquaControl_Setup", "");
  } else {
    Serial.println("\n[WiFi] ¡Conectado! IP: " + WiFi.localIP().toString());
  }
}

void handleCaptivePortal() {
  server.sendHeader("Location", "http://192.168.4.1/", true);
  server.send(302, "text/plain", "");
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
    Serial.print("[MQTT] Intentando reconectar... ");
    if (mqttClient.connect(mqtt_client_id)) {
      Serial.println("CONECTADO ✅");
      mqttClient.subscribe(mqtt_topic_cmd);
    } else {
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
