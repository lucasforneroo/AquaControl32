# Tasks: Bluetooth Provisioning (bluetooth-provisioning)

This document breaks down the implementation of Bluetooth Low Energy (BLE) provisioning into granular tasks based on the `spec.md` and `design.md`.

## Phase 1: Firmware (ESP32)

- [x] **Task 1.1: Initialize NVS Storage**
  - Use `Preferences.h`.
  - Set namespace to `"wifi_prefs"`.
  - Implement read functions for `"ssid"` and `"password"`.

- [x] **Task 1.2: Create BLE Server**
  - Include necessary libraries (`BLEDevice.h`, `BLEServer.h`, `BLEUtils.h`, `BLE2902.h`).
  - Initialize BLE device with name "AquaControl32-Setup".
  - Define Custom Service UUID: `a1b2c3d4-e5f6-7890-1234-56789abcdef0`.
  - Define Configuration Characteristic UUID: `a1b2c3d4-e5f6-7890-1234-56789abcdef1` with Write and Notify properties.
  - Setup Advertising.

- [x] **Task 1.3: Implement Boot Flow Logic**
  - On boot, read credentials from NVS.
  - If credentials exist, attempt WiFi connection.
  - If WiFi connects, start normal HTTP/WS operation.
  - If connection fails or no credentials exist, start the BLE server and begin advertising.

- [x] **Task 1.4: Wait for Credentials and Save to NVS**
  - Implement write callback on the Configuration Characteristic.
  - Parse the incoming JSON payload (containing `"ssid"` and `"password"`) using `ArduinoJson`.
  - Save the parsed credentials to NVS using `Preferences`.

- [x] **Task 1.5: Restart and Notify**
  - Notify the mobile app of the status (`{"status": "connecting"}`).
  - Attempt WiFi connection with new credentials.
  - If successful, notify `{"status": "success"}` and restart the ESP32 (or transition to normal operation).
  - If failed, notify `{"status": "failed"}` and remain in BLE mode.

## Phase 2: Mobile App (React Native Expo)

- [x] **Task 2.1: Install Dependencies**
  - Install `react-native-ble-plx`.

- [x] **Task 2.2: Configure Permissions in `app.json`**
  - Add the `@config-plugins/react-native-ble-plx` plugin to the `plugins` array.
  - Configure `isBackgroundEnabled`, `modes`, `bluetoothAlwaysPermission`, and `bluetoothPeripheralPermission`.

- [x] **Task 2.3: Create BLE Hook / State Logic**
  - Create a custom hook or state manager for BLE provisioning.
  - Implement the state machine: `SCANNING`, `DISCOVERED`, `CONNECTING`, `CONNECTED_AWAITING_INPUT`, `SENDING_DATA`, `AWAITING_VERIFICATION`, `PROVISIONED`, `FAILED`.
  - Implement BLE scanning (filtering by "AquaControl32-Setup" or UUID).
  - Implement connection, service/characteristic discovery.
  - Implement JSON payload writing and notification subscription.

- [x] **Task 2.4: Build UI Modal "Add Aquarium"**
  - **Step 1 (Scan & Connect):** Show radar animation, list discovered devices.
  - **Step 2 (Network Details):** Create a form for user to input SSID and Password.
  - **Step 3 (Status/Provisioning):** Show loading spinner while payload is sent and verified.
  - **Step 4 (Result):** Display success or error message, handle navigation on success.
