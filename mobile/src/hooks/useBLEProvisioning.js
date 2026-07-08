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
        }

        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
            );

            return granted === PermissionsAndroid.RESULTS.GRANTED;
        }

        return true;
    };

    const startScan = async () => {
        console.log("========== INICIANDO ESCANEO BLE ==========");

        setErrorMsg('');

        const hasPermissions = await requestPermissions();

        console.log("Permisos BLE:", hasPermissions);

        if (!hasPermissions) {
            setErrorMsg('Bluetooth permissions are required.');
            setBleState(BLE_STATES.FAILED);
            return;
        }

        setBleState(BLE_STATES.SCANNING);
        setDevices([]);

        managerRef.current.startDeviceScan(null, null, (error, device) => {

            if (error) {
                console.log("ERROR SCAN:", error);
                console.error(error);
                setErrorMsg("Scan failed.");
                setBleState(BLE_STATES.FAILED);
                return;
            }

            if (!device) return;

            console.log("========== DISPOSITIVO ==========");
            console.log("ID:", device.id);
            console.log("NAME:", device.name);
            console.log("LOCAL NAME:", device.localName);
            console.log("RSSI:", device.rssi);
            console.log("SERVICE UUIDS:", device.serviceUUIDs);

            setDevices(prev => {
                if (prev.find(d => d.id === device.id)) {
                    return prev;
                }

                return [...prev, device];
            });

            setBleState(BLE_STATES.DISCOVERED);
        });

        setTimeout(() => {
            if (managerRef.current) {
                console.log("Finalizando escaneo BLE");
                managerRef.current.stopDeviceScan();

                setBleState(prev =>
                    prev === BLE_STATES.SCANNING
                        ? BLE_STATES.IDLE
                        : prev
                );
            }
        }, 10000);
    };

    const stopScan = () => {
        if (managerRef.current) {
            managerRef.current.stopDeviceScan();
        }
    };

const connectToDevice = async (device) => {

    console.log("=========================");
    console.log("Intentando conectar con:");
    console.log(device.id);
    console.log(device.name);
    console.log(device.localName);
    console.log("=========================");

    stopScan();

    setBleState(BLE_STATES.CONNECTING);

    try {

        const connected = await managerRef.current.connectToDevice(device.id);

        console.log("CONECTADO");

        await connected.discoverAllServicesAndCharacteristics();

        console.log("Servicios descubiertos");

        setConnectedDevice(connected);

        setBleState(BLE_STATES.CONNECTED_AWAITING_INPUT);

    } catch (e) {

        console.log("ERROR AL CONECTAR");

        console.log(e);

        setBleState(BLE_STATES.FAILED);

    }
}

    const provisionDevice = async (ssid, password) => {
        console.log("Enviando:");

        console.log({
            ssid,
            password
        });

        if (!connectedDevice) return;

        setBleState(BLE_STATES.SENDING_DATA);

        try {

            const payload = JSON.stringify({
                ssid,
                password
            });

            const base64Payload = btoa(payload);

            connectedDevice.monitorCharacteristicForService(
                SERVICE_UUID,
                CHARACTERISTIC_UUID,
                (error, characteristic) => {

                    if (error) {
                        console.error(error);
                        return;
                    }

                    if (characteristic?.value) {

                        const response = JSON.parse(
                            atob(characteristic.value)
                        );

                        if (response.status === "success") {
                            setBleState(BLE_STATES.PROVISIONED);
                        }
                        else if (response.status === "connecting") {
                            setBleState(BLE_STATES.AWAITING_VERIFICATION);
                        }
                        else {
                            setErrorMsg("WiFi connection failed.");
                            setBleState(BLE_STATES.FAILED);
                        }
                    }
                }
            );

            await connectedDevice.writeCharacteristicWithResponseForService(
                SERVICE_UUID,
                CHARACTERISTIC_UUID,
                base64Payload
            );
            console.log("Payload enviado correctamente");

            setBleState(BLE_STATES.AWAITING_VERIFICATION);

        } catch (error) {
            console.error(error);
            setErrorMsg("Failed to send provision data.");
            setBleState(BLE_STATES.FAILED);
        }
    };

    const reset = () => {

        if (connectedDevice) {
            managerRef.current
                .cancelDeviceConnection(connectedDevice.id)
                .catch(() => {});
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