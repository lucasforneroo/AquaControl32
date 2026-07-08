import { useState, useEffect, useRef } from 'react';
import { BleManager, LogLevel } from 'react-native-ble-plx';
import { encode as btoa, decode as atob } from 'base-64';
import { Platform, PermissionsAndroid } from 'react-native';

export const BLE_STATES = {
    IDLE: 'IDLE',
    SCANNING: 'SCANNING',
    DISCOVERED: 'DISCOVERED',
    CONNECTING: 'CONNECTING',
    CONNECTED_AWAITING_INPUT: 'CONNECTED_AWAITING_INPUT',
    SENDING_DATA: 'SENDING_DATA',
    AWAITING_VERIFICATION: 'AWAITING_VERIFICATION',
    PROVISIONED: 'PROVISIONED',
    FAILED: 'FAILED',
};

const SERVICE_UUID = 'a1b2c3d4-e5f6-7890-1234-56789abcdef0';
const CHARACTERISTIC_UUID = 'a1b2c3d4-e5f6-7890-1234-56789abcdef1';

export function useBLEProvisioning() {
    const [bleState, setBleState] = useState(BLE_STATES.IDLE);
    const [devices, setDevices] = useState([]);
    const [connectedDevice, setConnectedDevice] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    
    const managerRef = useRef(null);

    useEffect(() => {
        managerRef.current = new BleManager();
        managerRef.current.setLogLevel(LogLevel.Verbose);
        return () => {
            if (managerRef.current) {
                managerRef.current.destroy();
            }
        };
    }, []);

    const requestPermissions = async () => {
        if (Platform.OS === 'android' && Platform.Version >= 31) {
            const granted = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            ]);
            return (
                granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
                granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED
            );
        } else if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
    };

    const startScan = async () => {
        setErrorMsg('');
        const hasPermissions = await requestPermissions();
        if (!hasPermissions) {
            setErrorMsg('Bluetooth permissions are required.');
            setBleState(BLE_STATES.FAILED);
            return;
        }

        setBleState(BLE_STATES.SCANNING);
        setDevices([]);

        managerRef.current.startDeviceScan(null, null, (error, device) => {
            if (error) {
                console.error(error);
                setErrorMsg('Scan failed.');
                setBleState(BLE_STATES.FAILED);
                return;
            }

            if (device && (device.name === 'AquaControl32-Setup' || (device.serviceUUIDs && device.serviceUUIDs.includes(SERVICE_UUID)))) {
                setDevices((prev) => {
                    if (!prev.find(d => d.id === device.id)) {
                        return [...prev, device];
                    }
                    return prev;
                });
                setBleState(BLE_STATES.DISCOVERED);
            }
        });

        // Stop scan after 10 seconds if nothing is found
        setTimeout(() => {
            if (managerRef.current) {
                managerRef.current.stopDeviceScan();
                setBleState(prev => prev === BLE_STATES.SCANNING ? BLE_STATES.IDLE : prev);
            }
        }, 10000);
    };

    const stopScan = () => {
        if (managerRef.current) {
            managerRef.current.stopDeviceScan();
        }
    };

    const connectToDevice = async (device) => {
        stopScan();
        setBleState(BLE_STATES.CONNECTING);
        try {
            const connected = await managerRef.current.connectToDevice(device.id);
            await connected.discoverAllServicesAndCharacteristics();
            setConnectedDevice(connected);
            setBleState(BLE_STATES.CONNECTED_AWAITING_INPUT);
        } catch (error) {
            console.error(error);
            setErrorMsg('Failed to connect.');
            setBleState(BLE_STATES.FAILED);
        }
    };

    const provisionDevice = async (ssid, password) => {
        if (!connectedDevice) return;
        setBleState(BLE_STATES.SENDING_DATA);

        try {
            const payload = JSON.stringify({ ssid, password });
            // Encode payload to Base64 (react-native-ble-plx requires Base64 for write)
            const base64Payload = btoa(payload);

            // Subscribe to notifications first
            connectedDevice.monitorCharacteristicForService(
                SERVICE_UUID,
                CHARACTERISTIC_UUID,
                (error, characteristic) => {
                    if (error) {
                        console.error("Monitor error:", error);
                        return;
                    }
                    if (characteristic?.value) {
                        const responseStr = atob(characteristic.value);
                        try {
                            const response = JSON.parse(responseStr);
                            if (response.status === 'success') {
                                setBleState(BLE_STATES.PROVISIONED);
                            } else if (response.status === 'failed') {
                                setErrorMsg('WiFi connection failed.');
                                setBleState(BLE_STATES.FAILED);
                            } else if (response.status === 'connecting') {
                                setBleState(BLE_STATES.AWAITING_VERIFICATION);
                            }
                        } catch (e) {
                            console.error("Invalid JSON from device:", e);
                        }
                    }
                }
            );

            await connectedDevice.writeCharacteristicWithResponseForService(
                SERVICE_UUID,
                CHARACTERISTIC_UUID,
                base64Payload
            );
            setBleState(BLE_STATES.AWAITING_VERIFICATION);
        } catch (error) {
            console.error(error);
            setErrorMsg('Failed to send provision data.');
            setBleState(BLE_STATES.FAILED);
        }
    };

    const reset = () => {
        if (connectedDevice) {
            managerRef.current.cancelDeviceConnection(connectedDevice.id).catch(() => {});
        }
        setConnectedDevice(null);
        setDevices([]);
        setErrorMsg('');
        setBleState(BLE_STATES.IDLE);
    };

    return {
        bleState,
        devices,
        errorMsg,
        startScan,
        stopScan,
        connectToDevice,
        provisionDevice,
        reset
    };
}
