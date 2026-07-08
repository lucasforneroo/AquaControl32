# Design: Bluetooth Provisioning (bluetooth-provisioning)

## 1. Overview
This document specifies the technical design for implementing Bluetooth Low Energy (BLE) provisioning for the AquaControl32 system. It covers the firmware changes on the ESP32 and the frontend implementation in the React Native companion app.

## 2. Firmware (ESP32) Design

### 2.1 Dependencies
*   `BLEDevice.h`, `BLEServer.h`, `BLEUtils.h`, `BLE2902.h`: For BLE communication.
*   `Preferences.h`: For Non-Volatile Storage (NVS) to save and load WiFi credentials.
*   `ArduinoJson.h`: For payload parsing.

### 2.2 Storage (`Preferences.h`)
We will use the `Preferences` library to persist the WiFi configuration.
*   **Namespace**: `"wifi_prefs"`
*   **Keys**: `"ssid"`, `"password"`

### 2.3 BLE Service & Characteristics
We will define a custom BLE service for AquaControl Provisioning.
*   **Service UUID**: `a1b2c3d4-e5f6-7890-1234-56789abcdef0`
*   **Characteristic - Configuration (Write/Notify)**: `a1b2c3d4-e5f6-7890-1234-56789abcdef1`
    *   **Write**: The mobile app will send the WiFi credentials to this characteristic.
    *   **Notify**: The ESP32 will send status updates (e.g., connection success/failure) to the mobile app.

### 2.4 Payload Format
The payload exchanged over BLE will use **JSON format** for flexibility.

**Mobile to ESP32 (Write):**
```json
{
  "ssid": "MyHomeNetwork",
  "password": "MySecretPassword"
}
```

**ESP32 to Mobile (Notify):**
```json
{
  "status": "connecting" // or "success", "failed"
}
```

### 2.5 Boot Flow Logic
1.  Initialize `Preferences` and read `"ssid"` and `"password"`.
2.  If credentials exist, attempt WiFi connection.
    *   If connected, start normal HTTP/WS operation.
    *   If failed (after retries), fallback to BLE Provisioning mode.
3.  If credentials do not exist, start BLE Provisioning mode.
    *   Initialize BLE device with name "AquaControl32-Setup".
    *   Start Advertising.
    *   Wait for client connection and payload.
    *   Upon receiving payload, parse JSON, save to `Preferences`, and attempt WiFi connection.
    *   Send status back via Notify.

## 3. Mobile App (React Native) Design

### 3.1 Dependencies & Configuration
*   **Library**: Add `react-native-ble-plx` to manage BLE communication.
*   **Expo Plugin Configuration (`app.json`)**:
    Since Expo Go doesn't support custom native modules, we must use Expo Development Builds and configure the plugin in `app.json` for proper OS permissions.
    ```json
    {
      "expo": {
        "plugins": [
          [
            "@config-plugins/react-native-ble-plx",
            {
              "isBackgroundEnabled": false,
              "modes": ["peripheral", "central"],
              "bluetoothAlwaysPermission": "Allow $(PRODUCT_NAME) to connect to AquaControl32 over Bluetooth.",
              "bluetoothPeripheralPermission": "Allow $(PRODUCT_NAME) to connect to AquaControl32 over Bluetooth."
            }
          ]
        ]
      }
    }
    ```

### 3.2 State Management Architecture
The provisioning flow will be managed by a finite state machine, moving through the following states:
1.  **`SCANNING`**: Searching for devices advertising the AquaControl Provisioning service UUID.
2.  **`DISCOVERED`**: Device found, ready to connect.
3.  **`CONNECTING`**: Establishing BLE connection and discovering services/characteristics.
4.  **`CONNECTED_AWAITING_INPUT`**: Connected, prompting user for WiFi SSID/Password.
5.  **`SENDING_DATA`**: Transmitting JSON payload to the ESP32.
6.  **`AWAITING_VERIFICATION`**: Waiting for ESP32 to notify success/failure of WiFi connection.
7.  **`PROVISIONED` / `FAILED`**: Final state based on ESP32 notification.

### 3.3 Screen Flow (Provisioning Screen)
*   **Step 1: Scan & Connect**: The screen shows a radar animation. Once "AquaControl32-Setup" is found, it automatically attempts connection.
*   **Step 2: Network Details**: After connection, present a form with `SSID` and `Password` inputs.
*   **Step 3: Provision**: User taps "Connect". App writes JSON payload to the Configuration Characteristic and subscribes to notifications.
*   **Step 4: Status**: Show loading spinner. If ESP32 notifies `"success"`, navigate to the main dashboard. If `"failed"`, show an error and allow the user to try again.

## 4. Security Considerations
*   In this initial implementation, BLE communication will be unencrypted (beyond standard BLE link layer security).
*   To prevent unauthorized reconfiguration, the BLE setup mode will only be active when the ESP32 has no saved credentials or explicitly fails to connect to known networks. It will not advertise once successfully connected to WiFi.
