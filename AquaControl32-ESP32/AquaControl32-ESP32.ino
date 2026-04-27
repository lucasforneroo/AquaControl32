/*
 * AquaControl32 - ESP32 Firmware V3.1
 * ====================================
 * NOVEDADES v3.1:
 *   - iOS Captive Portal: DNS Server + endpoints de detección de Apple
 *   - WiFi Provisioning via SoftAP (compatible con Expo Go, SIN BLE)
 *   - Credenciales WiFi persistentes usando Preferences.h
 *   - Actualizaciones OTA via ArduinoOTA (por red local)
 *   - Actualizaciones OTA remota vía MQTT (comando desde la App)
 *   - Modo Rescate: Crea red "AquaControl_Setup" si no hay WiFi configurado
 *   - Botón BOOT (GPIO0): Mantener presionado al encender para borrar credenciales
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
#include <hp_BH1750.h> // Librería para el sensor de luz

WebServer server(80);
DNSServer dnsServer;

// ─── Configuración WiFi (Valores por defecto si falla todo) ──
const char* ssid = "TU_SSID_AQUÍ";
const char* password = "TU_PASSWORD_AQUÍ";

// ─── Botón de Reset ──────────────────────────────────────────
#define RESET_BUTTON_PIN 0  // GPIO0 = botón BOOT
#define RESET_HOLD_TIME 5000 // 5 segundos para resetear

// ─── Sensores DS18B20 ─────────────────────────────────────────
#define ONE_WIRE_BUS 4
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// ─── Control de Iluminación ──────────────────────────────────
#define LIGHT_PIN 2  // GPIO 2 (LED interno o Relay)
#define LIGHT_CHAN 0
#define LIGHT_FREQ 5000
#define LIGHT_RESO 8

bool lightStatus = false;
int lightIntensity = 255; // 0-255
hp_BH1750 luxSensor;
float currentLux = 0;

// ─── Clientes ────────────────────────────────────────────────
WiFiClient espClient;
PubSubClient mqttClient(espClient);
Preferences prefs;

// ─── Variables globales para conexión ────────────────────────
String wifi_ssid = "";
String wifi_pass = "";
String mqtt_server_ip = "192.168.0.18"; // IP de tu PC detectada por el backend
const char* mqtt_topic_data    = "aquacontrol32/esp32/temp";
const char* mqtt_topic_cmd     = "aquacontrol32/esp32/cmd";
const char* mqtt_topic_status  = "aquacontrol32/esp32/status";
const char* mqtt_client_id     = "ESP32_AquaControl32";
bool isProvisioning = false;

float tempMin = 999.0, tempMax = -999.0, tempSum = 0.0;
int lecturas = 0, numSensores = 0;
DeviceAddress sensorAddresses[5];
float lastTemps[5];
unsigned long lastPublish = 0;
const unsigned long PUBLISH_INTERVAL = 5000; // 5 segundos

// ─── Prototipos ───────────────────────────────────────────────
void setup_wifi();
void startProvisioning();
void handleRoot();
void handleConfig();
void handleScan();
void handleCaptivePortal(); // Para Apple y otros probes
void reconnectMQTT();
void onMqttMessage(char* topic, byte* payload, unsigned int length);
void descubrirServidor();
String buildJsonPayload();

// ════════════════════════════════════════════════════════════════
// SETUP
// ════════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n════════════════════════════════");
  Serial.println("  AquaControl32 ESP32 v3.1 (PROV)");
  Serial.println("════════════════════════════════");

  pinMode(RESET_BUTTON_PIN, INPUT_PULLUP);
  
  for (int i = 0; i < 5; i++) lastTemps[i] = NAN;

  // Cargar credenciales
  prefs.begin("aquactl", false);
  wifi_ssid = prefs.getString("ssid", "");
  wifi_pass = prefs.getString("pass", "");
  mqtt_server_ip = prefs.getString("mqtt", "192.168.0.105");

  // Verificar si hay que resetear (mantener presionado al encender)
  if (digitalRead(RESET_BUTTON_PIN) == LOW) {
    Serial.println("[RESET] Botón presionado. Borrando credenciales...");
    prefs.clear();
    delay(2000);
    ESP.restart();
  }

  // Conexión WiFi
  setup_wifi();

  if (!isProvisioning) {
    descubrirServidor();
    mqttClient.setServer(mqtt_server_ip.c_str(), 1883);
    mqttClient.setCallback(onMqttMessage);
    mqttClient.setBufferSize(512);
  } else {
    // Configurar endpoints del portal cautivo
    server.on("/", handleRoot);
    server.on("/config", HTTP_POST, handleConfig);
    server.on("/scan", handleScan);
    
    // Portal Cautivo para iOS / Android / Windows
    server.on("/hotspot-detect.html", handleCaptivePortal);
    server.on("/library/test/success.html", handleCaptivePortal);
    server.on("/generate_204", handleCaptivePortal);
    server.on("/success.txt", handleCaptivePortal);
    
    server.onNotFound(handleCaptivePortal);
    server.begin();
    dnsServer.start(53, "*", WiFi.softAPIP());
    Serial.println("[PROV] Servidor Web y DNS iniciados.");
  }

  sensors.begin();
  numSensores = sensors.getDeviceCount();
  Serial.printf("[Sensores] Detectados: %d\n", numSensores);
  for (int i = 0; i < numSensores; i++) {
    sensors.getAddress(sensorAddresses[i], i);
    sensors.setResolution(sensorAddresses[i], 12);
  }

  // Configurar Pin de Luz con PWM (LEDC)
  ledcSetup(LIGHT_CHAN, LIGHT_FREQ, LIGHT_RESO);
  ledcAttachPin(LIGHT_PIN, LIGHT_CHAN);
  ledcWrite(LIGHT_CHAN, 0); // Apagado por defecto

  // Iniciar I2C y Sensor de Luz
  Wire.begin(21, 22); // SDA, SCL estándar
  if (luxSensor.begin(BH1750_TO_GROUND)) {
    Serial.println("[Sensor] BH1750 detectado.");
  } else {
    Serial.println("[Sensor] BH1750 NO detectado. Verifique conexiones.");
  }
}

// ════════════════════════════════════════════════════════════════
// LOOP
// ════════════════════════════════════════════════════════════════
void loop() {
  if (isProvisioning) {
    dnsServer.processNextRequest();
    server.handleClient();
    return; // En modo provisioning no procesamos sensores ni MQTT
  }

  // MQTT
  if (!mqttClient.connected()) reconnectMQTT();
  mqttClient.loop();

  // Publicar sensores
  unsigned long now = millis();
  if (now - lastPublish >= PUBLISH_INTERVAL) {
    lastPublish = now;

    sensors.requestTemperatures();
    for (int i = 0; i < numSensores; i++) {
      float tempC = sensors.getTempC(sensorAddresses[i]);
      if (tempC == DEVICE_DISCONNECTED_C) continue;
      lastTemps[i] = tempC;
      lecturas++;
      tempSum += tempC;
      if (tempC < tempMin) tempMin = tempC;
      if (tempC > tempMax) tempMax = tempC;
      Serial.printf("[S%d] %.2f°C\n", i + 1, tempC);
    }

    // Leer Lux
    luxSensor.start();
    currentLux = luxSensor.getLux();
    Serial.printf("[LUX] %.2f lx\n", currentLux);

    String payload = buildJsonPayload();
    mqttClient.publish(mqtt_topic_data, payload.c_str());
    Serial.println("[MQTT] Publicado: " + payload);
  }
}

// ════════════════════════════════════════════════════════════════
// WIFI: Conexión WiFi básica
// ════════════════════════════════════════════════════════════════
void setup_wifi() {
  if (wifi_ssid == "" || wifi_ssid == "NULL") {
    Serial.println("[WiFi] No hay credenciales. Entrando en modo PROV.");
    startProvisioning();
    return;
  }

  Serial.printf("[WiFi] Intentando conectar a: %s\n", wifi_ssid.c_str());
  WiFi.mode(WIFI_STA);
  WiFi.begin(wifi_ssid.c_str(), wifi_pass.c_str());

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - start < 15000)) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\n[WiFi] Falló conexión. Pasando a Modo Provisioning...");
    startProvisioning();
  } else {
    Serial.println("\n[WiFi] ¡Conectado! IP: " + WiFi.localIP().toString());
    isProvisioning = false;
  }
}

void startProvisioning() {
  isProvisioning = true;
  WiFi.mode(WIFI_AP);
  WiFi.softAP("AquaControl_Setup", "");
  Serial.println("[PROV] AP 'AquaControl_Setup' iniciado. IP: " + WiFi.softAPIP().toString());
}

void handleRoot() {
  String html = "<html><head><meta name='viewport' content='width=device-width, initial-scale=1.0'>";
  html += "<style>body{font-family:sans-serif;background:#0f172a;color:white;text-align:center;padding:40px;}";
  html += "h1{color:#38bdf8;} p{color:#94a3b8;line-height:1.6;} .btn{display:inline-block;padding:12px 24px;background:#0ea5e9;color:white;border-radius:12px;text-decoration:none;font-weight:bold;margin-top:20px;}</style>";
  html += "</head><body><h1>AquaControl 32</h1>";
  html += "<p><b>MODO CONFIGURACION</b></p>";
  html += "<p>Si ves esta pantalla, tu telefono se ha conectado correctamente al dispositivo.</p>";
  html += "<p><b>Paso siguiente:</b> Pulsa 'Listo' o 'Done' arriba a la derecha (elige 'Usar sin internet' si te pregunta) y abre la App AquaControl para terminar.</p>";
  html += "</body></html>";
  server.send(200, "text/html", html);
}

void handleCaptivePortal() {
  String uri = server.uri();
  Serial.println("[Captive] Probe: " + uri);

  // Respuesta exacta para Apple Captive Portal
  if (uri.indexOf("success") >= 0 || uri.indexOf("hotspot-detect") >= 0 || uri.indexOf("canonical") >= 0) {
    server.send(200, "text/html", "<HTML><HEAD><TITLE>Success</TITLE></HEAD><BODY>Success</BODY></HTML>");
    return;
  }
  
  // Respuesta para Android (Goolge)
  if (uri.indexOf("generate_204") >= 0) {
    server.send(204, "text/plain", "");
    return;
  }

  // Si no es un probe específico, redirigimos al Root
  server.sendHeader("Location", "http://192.168.4.1/", true);
  server.send(302, "text/plain", "");
}

void handleScan() {
  Serial.println("[PROV] Escaneando redes...");
  int n = WiFi.scanNetworks();
  String json = "{\"networks\":[";
  for (int i = 0; i < n; ++i) {
    if (i > 0) json += ",";
    json += "{\"ssid\":\"" + WiFi.SSID(i) + "\",\"rssi\":" + String(WiFi.RSSI(i)) + "}";
  }
  json += "]}";
  server.send(200, "application/json", json);
}

void handleConfig() {
  if (!server.hasArg("ssid") || !server.hasArg("pass")) {
    server.send(400, "text/plain", "Missing ssid or pass");
    return;
  }

  String new_ssid = server.arg("ssid");
  String new_pass = server.arg("pass");
  String new_mqtt = server.hasArg("mqtt") ? server.arg("mqtt") : mqtt_server_ip;

  prefs.putString("ssid", new_ssid);
  prefs.putString("pass", new_pass);
  prefs.putString("mqtt", new_mqtt);

  server.send(200, "text/plain", "OK. Restarting...");
  Serial.println("[PROV] Config recibida. Guardando y reiniciando...");
  delay(2000);
  ESP.restart();
}
// ════════════════════════════════════════════════════════════════
// MQTT: Callback para recibir comandos
// ════════════════════════════════════════════════════════════════
void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  Serial.println("[MQTT] Comando recibido: " + msg);

  // Comando: {"cmd": "reboot"}
  if (msg.indexOf("reboot") > 0) {
    Serial.println("[CMD] Reiniciando...");
    delay(500);
    ESP.restart();
  }

  // Comando: {"light": "on"} o {"light": "off"}
  if (msg.indexOf("\"light\":") >= 0) {
    if (msg.indexOf("on") >= 0) {
      lightStatus = true;
      ledcWrite(LIGHT_CHAN, lightIntensity);
      Serial.println("[LIGHT] Encendido");
    } else {
      lightStatus = false;
      ledcWrite(LIGHT_CHAN, 0);
      Serial.println("[LIGHT] Apagado");
    }
    
    // Notificar cambio inmediato
    String payload = buildJsonPayload();
    mqttClient.publish(mqtt_topic_data, payload.c_str());
  }

  // Comando: {"intensity": 128} (0-255)
  if (msg.indexOf("\"intensity\":") >= 0) {
    int startIdx = msg.indexOf("\"intensity\":") + 12;
    int endIdx = msg.indexOf("}", startIdx);
    String intensityStr = msg.substring(startIdx, endIdx);
    lightIntensity = intensityStr.toInt();
    
    if (lightStatus) {
      ledcWrite(LIGHT_CHAN, lightIntensity);
      Serial.printf("[LIGHT] Intensidad ajustada a: %d\n", lightIntensity);
    }
  }
}

// ════════════════════════════════════════════════════════════════
// MQTT: Reconexión automática
// ════════════════════════════════════════════════════════════════
void reconnectMQTT() {
  int intentos = 0;
  while (!mqttClient.connected() && intentos < 5) {
    Serial.printf("[MQTT] Conectando a %s... ", mqtt_server_ip.c_str());
    if (mqttClient.connect(mqtt_client_id)) {
      Serial.println("✅ OK");
      mqttClient.subscribe(mqtt_topic_cmd);
      mqttClient.publish(mqtt_topic_status, "{\"status\":\"online\",\"version\":\"3.1\"}");
    } else {
      Serial.printf("❌ rc=%d. Reintentando en 5s...\n", mqttClient.state());
      intentos++;
      if (intentos == 3) descubrirServidor(); // Redescubrir si falla 3 veces
      delay(5000);
    }
  }
}

// ════════════════════════════════════════════════════════════════
// mDNS: Descubrir IP del servidor MQTT
// ════════════════════════════════════════════════════════════════
void descubrirServidor() {
  Serial.println("[mDNS] Buscando servidor 'aquacontrol'...");
  
  if (!MDNS.begin("esp32-aquacontrol")) {
    Serial.println("[mDNS] Error inicializando mDNS");
    return;
  }

  // 1. Intentar encontrar por servicio HTTP (Anunciado por el backend)
  Serial.println("[mDNS] Consultando servicios _http._tcp...");
  int n = MDNS.queryService("http", "tcp");
  
  if (n > 0) {
    for (int i = 0; i < n; i++) {
        String hostname = MDNS.hostname(i);
        Serial.printf("[mDNS] Servicio encontrado en %s (%s:%d)\n", 
                      hostname.c_str(), 
                      MDNS.address(i).toString().c_str(), 
                      MDNS.port(i));
        
        // Si el nombre coincide o contiene "aquacontrol"
        if (hostname.indexOf("aquacontrol") >= 0) {
            mqtt_server_ip = MDNS.address(i).toString();
            Serial.println("✅ [mDNS] Servidor principal seleccionado: " + mqtt_server_ip);
            return;
        }
    }
  }

  // 2. Intentar resolución directa de host 'aquacontrol.local'
  Serial.println("[mDNS] No se halló servicio específico, intentando 'aquacontrol.local'...");
  IPAddress hostIP = MDNS.queryHost("aquacontrol");
  
  if (hostIP.toString() != "0.0.0.0") {
    mqtt_server_ip = hostIP.toString();
    Serial.println("✅ [mDNS] Host encontrado: " + mqtt_server_ip);
  } else {
    Serial.println("⚠️ [mDNS] No se pudo encontrar el servidor. Usando IP fija de respaldo: " + mqtt_server_ip);
  }
}

// ════════════════════════════════════════════════════════════════
// PAYLOAD JSON
// ════════════════════════════════════════════════════════════════
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
