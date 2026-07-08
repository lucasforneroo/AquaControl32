# Proposal: Bluetooth Provisioning (bluetooth-provisioning)

## 1. Executive Summary
The goal of this change is to implement a local initial configuration flow via Bluetooth Low Energy (BLE) for the AquaControl32 system. Currently, the ESP32 firmware relies on hardcoded WiFi credentials, which limits deployment and fails to meet the university requirement for local provisioning. This feature will allow the ESP32 to start in a BLE advertising mode if no credentials are found in non-volatile storage (NVS), enabling the companion mobile app to scan, connect, and securely transmit WiFi credentials.

## 2. Problem Statement
The current implementation hardcodes WiFi credentials into the ESP32 firmware. This creates significant friction for end-users, requiring them to recompile or reflash the device if the network changes or for deployment in new environments. The requirement dictates a localized setup mechanism over Bluetooth before HTTP/WS communication can occur. Furthermore, Expo Go does not natively support `react-native-ble-plx`, necessitating a shift to Expo Development Builds.

## 3. Proposed Solution

### 3.1. Firmware (ESP32)
*   **Credential Storage**: Utilize the `Preferences.h` library to store and retrieve the WiFi SSID and Password securely from NVS (Non-Volatile Storage).
*   **Boot Sequence**: On boot, the ESP32 will check for existing credentials in NVS. 
    *   If credentials exist, it attempts to connect to the WiFi network and proceed with standard HTTP/WS operations.
    *   If credentials do not exist (or connection fails repeatedly), it will initialize the BLE stack and begin advertising a specific service UUID (e.g., "AquaControl Provisioning").
*   **BLE Configuration Service**: Expose a custom BLE Service with Characteristics to:
    1.  Receive the target WiFi SSID (Write).
    2.  Receive the target WiFi Password (Write).
    3.  Trigger a connection attempt (Write/Command).
    4.  Report connection status (Notify/Read).
*   **Security (Optional but recommended)**: Implement basic pairing/bonding or payload encryption to prevent unauthorized configuration, depending on the strictness of the university requirement.

### 3.2. Mobile App (Expo / React Native)
*   **Library Integration**: Add and configure `react-native-ble-plx` to handle BLE scanning and connections.
*   **Build Pipeline Shift**: Transition the Expo project to use Development Builds (`npx expo run:android` / `npx expo run:ios`) via `prebuild`, as Expo Go cannot run native Bluetooth modules. Update `app.json` with the necessary BLE permissions (e.g., `NSBluetoothAlwaysUsageDescription` for iOS, and `BLUETOOTH_SCAN`/`BLUETOOTH_CONNECT` for Android).
*   **UI/UX Flow ("Añadir Nuevo Dispositivo")**:
    1.  **Scanning Screen**: A clean, animated UI showing nearby AquaControl BLE devices.
    2.  **Network Selection**: Once connected to the ESP32 over BLE, the app prompts the user to enter their home WiFi SSID and password.
    3.  **Provisioning & Handoff**: The app writes the credentials to the ESP32's BLE characteristics and waits for a success notification.
    4.  **Completion**: Upon successful WiFi connection by the ESP32, the mobile app transitions to the standard dashboard, now communicating via HTTP/WS over the local network.

## 4. Architecture & Data Flow
1.  **Mobile -> ESP32 (BLE)**: User inputs SSID/Password -> App writes to BLE Characteristics.
2.  **ESP32**: Reads Characteristics -> Saves to `Preferences` -> Restarts WiFi Stack -> Attempts Connection.
3.  **ESP32 -> Mobile (BLE)**: Notifies success/failure of WiFi connection.
4.  **Mobile & ESP32 (WiFi)**: Standard communication resumes over HTTP/WebSocket.

## 5. Alternatives Considered
*   **WiFi Access Point (Captive Portal)**: Having the ESP32 broadcast its own WiFi network. *Rejected* because the requirement explicitly demands Bluetooth configuration.
*   **Bluetooth Classic**: *Rejected* in favor of BLE due to better cross-platform compatibility (especially iOS) and lower power consumption.

## 6. Milestones & Phases
1.  **Phase 1: Environment Setup**: Configure Expo Development Builds and integrate `react-native-ble-plx`. Handle mobile OS permissions.
2.  **Phase 2: Firmware BLE Service**: Implement the BLE advertising and characteristic handling on the ESP32, along with `Preferences.h` storage.
3.  **Phase 3: Mobile UI & Integration**: Build the "Add Device" screens and implement the BLE communication logic to write credentials.
4.  **Phase 4: Testing & Polish**: End-to-end testing of the provisioning flow, error handling (wrong password, network out of range), and UI feedback.
