# Specification: Bluetooth Provisioning (bluetooth-provisioning)

## 1. Overview
This document specifies the technical details for implementing Bluetooth Low Energy (BLE) provisioning on the AquaControl32 system. It covers the changes required in the ESP32 firmware and the React Native Expo app.

## 2. Firmware (ESP32)

### 2.1. NVS Storage
- Use `Preferences.h` to manage NVS storage.
- **Namespace:** `wifi_creds`
- **Keys:** `ssid` (String), `password` (String)

### 2.2. BLE Configuration
- **Library:** Use the standard ESP32 BLE libraries (`BLEDevice.h`, `BLEServer.h`, `BLEUtils.h`, `BLE2902.h`).
- **Service UUID:** Define a unique UUID for the Provisioning Service (e.g., `12345678-1234-5678-1234-56789abcdef0`).
- **Characteristics:**
  - **SSID Characteristic:** Write-only, UUID: `...-0001`
  - **Password Characteristic:** Write-only, UUID: `...-0002`
  - **Command Characteristic:** Write-only, UUID: `...-0003` (Triggers connection attempt)
  - **Status Characteristic:** Read/Notify, UUID: `...-0004` (Reports WiFi connection status)

### 2.3. Boot Flow
1. Initialize `Preferences` and read `ssid` and `password`.
2. If both exist, attempt WiFi connection.
3. If WiFi connects, start HTTP/WebSocket services and bypass BLE.
4. If credentials don't exist or connection fails, start BLE server and advertise.

### 2.4. BLE Event Handling
- Upon receiving a write to the Command Characteristic, attempt WiFi connection with the provided SSID/Password.
- Update Status Characteristic and notify connected clients of the result (e.g., `0` for success, `1` for failure).
- If successful, save credentials to NVS using `Preferences` and restart the ESP32 or transition gracefully to normal operation mode.

## 3. Mobile App (React Native Expo)

### 3.1. Dependencies & Configuration
- **Library:** Install `react-native-ble-plx`.
- **Expo Config (`app.json`):**
  - Add `react-native-ble-plx` plugin.
  - Configure iOS permissions: `NSBluetoothAlwaysUsageDescription`, `NSBluetoothPeripheralUsageDescription`.
  - Configure Android permissions: `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `ACCESS_FINE_LOCATION`.
- **Build:** Switch to Expo Development Builds (`npx expo run:android` / `npx expo run:ios`).

### 3.2. UI Components
- **`ProvisioningModal` (or dedicated Screen):**
  - **State 1: Scanning.** Display a radar/spinner animation. Show discovered "AquaControl32" devices in a list.
  - **State 2: Input.** Form for `SSID` and `Password`.
  - **State 3: Connecting.** Progress indicator while writing to BLE characteristics and awaiting status notification.
  - **State 4: Success/Error.** Display result and transition to main dashboard on success.

### 3.3. BLE Communication Flow
1. **Initialize:** Start `BleManager`.
2. **Scan:** Filter devices by Service UUID or name prefix ("AquaControl").
3. **Connect:** Connect to the selected device, discover services and characteristics.
4. **Provision:**
   - Write SSID string to SSID Characteristic.
   - Write Password string to Password Characteristic.
   - Write command to Command Characteristic.
   - Listen for notifications on Status Characteristic.
5. **Disconnect:** Disconnect BLE upon receiving a success status and transition to network/HTTP mode.

## 4. Security & Error Handling
- The ESP32 BLE server should handle disconnects gracefully and resume advertising.
- The mobile app should enforce timeouts on scanning and connection attempts.
- Notify the user of incorrect passwords or if the target WiFi network is out of range for the ESP32.
