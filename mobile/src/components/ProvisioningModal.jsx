import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput, ScrollView, Modal, FlatList } from 'react-native';
import { Wifi, ShieldCheck, ArrowRight, RefreshCw, X, CheckCircle2, Bluetooth } from 'lucide-react-native';
import { useBLEProvisioning, BLE_STATES } from '../hooks/useBLEProvisioning';

export default function ProvisioningModal({ visible, onClose, backendUrl }) {
    const { 
        bleState, 
        devices, 
        errorMsg, 
        startScan, 
        connectToDevice, 
        provisionDevice, 
        reset: resetBle 
    } = useBLEProvisioning();

    const [selectedSsid, setSelectedSsid] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        if (visible) {
            resetBle();
        }
    }, [visible]);

    useEffect(() => {
        if (errorMsg) {
            Alert.alert('Error', errorMsg);
        }
    }, [errorMsg]);

    const handleConfig = () => {
        if (!selectedSsid || !password) {
            Alert.alert('Error', 'Por favor ingresa la red y la contraseña.');
            return;
        }
        provisionDevice(selectedSsid, password);
    };

    const renderContent = () => {
        if (bleState === BLE_STATES.IDLE) {
            return (
                <View style={styles.stepContainer}>
                    <Bluetooth color="#38bdf8" size={60} style={styles.icon} />
                    <Text style={styles.title}>Vincular Dispositivo (BLE)</Text>
                    <Text style={styles.description}>
                        Para configurar tu AquaControl32:
                        {"\n\n"}1. Asegúrate de que el dispositivo esté encendido.
                        {"\n"}2. Enciende el Bluetooth de tu teléfono.
                        {"\n"}3. Presiona "Escanear" para buscar el dispositivo.
                    </Text>
                    <TouchableOpacity style={styles.primaryButton} onPress={startScan}>
                        <Text style={styles.buttonText}>Escanear Dispositivos</Text>
                        <ArrowRight color="#fff" size={20} />
                    </TouchableOpacity>
                </View>
            );
        }

        if (bleState === BLE_STATES.SCANNING || bleState === BLE_STATES.DISCOVERED || bleState === BLE_STATES.CONNECTING) {
            return (
                <View style={styles.stepContainer}>
                    <Text style={styles.title}>Buscando Dispositivos</Text>
                    {bleState === BLE_STATES.SCANNING && devices.length === 0 ? (
                        <View style={styles.loader}>
                            <ActivityIndicator size="large" color="#38bdf8" />
                            <Text style={styles.loaderText}>Escaneando (Bluetooth)...</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={devices}
                            keyExtractor={(item) => item.id}
                            style={styles.list}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={styles.networkItem}
                                    onPress={() => connectToDevice(item)}
                                >
                                    <Text style={styles.networkName}>{item.name || 'AquaControl32-Setup'}</Text>
                                    <Text style={styles.networkInfo}>{item.rssi} dBm</Text>
                                    {bleState === BLE_STATES.CONNECTING && <ActivityIndicator color="#38bdf8" style={{marginLeft: 10}}/>}
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <View style={styles.empty}>
                                    <Text style={styles.emptyText}>No se encontraron dispositivos BLE.</Text>
                                    <TouchableOpacity onPress={startScan} style={styles.retryButton}>
                                        <RefreshCw color="#38bdf8" size={20} />
                                        <Text style={styles.retryText}>Reintentar</Text>
                                    </TouchableOpacity>
                                </View>
                            }
                        />
                    )}
                    <TouchableOpacity style={styles.ghostButton} onPress={resetBle}>
                        <Text style={styles.ghostButtonText}>Volver</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (bleState === BLE_STATES.CONNECTED_AWAITING_INPUT || bleState === BLE_STATES.FAILED && errorMsg === 'WiFi connection failed.') {
            return (
                <ScrollView contentContainerStyle={styles.stepContainer}>
                    <ShieldCheck color="#38bdf8" size={60} style={styles.icon} />
                    <Text style={styles.title}>Configuración WiFi</Text>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Nombre de tu Red (SSID)</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Ej: MiRedWiFi" 
                            value={selectedSsid} 
                            onChangeText={setSelectedSsid}
                            placeholderTextColor="#64748b"
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Contraseña WiFi</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Clave de tu WiFi" 
                            secureTextEntry 
                            value={password} 
                            onChangeText={setPassword}
                            placeholderTextColor="#64748b"
                        />
                    </View>
                    <TouchableOpacity style={styles.primaryButton} onPress={handleConfig}>
                        <Text style={styles.buttonText}>Enviar Configuración</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.ghostButton} onPress={resetBle}>
                        <Text style={styles.ghostButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                </ScrollView>
            );
        }

        if (bleState === BLE_STATES.SENDING_DATA || bleState === BLE_STATES.AWAITING_VERIFICATION) {
             return (
                 <View style={styles.stepContainer}>
                    <View style={styles.loader}>
                        <ActivityIndicator size="large" color="#38bdf8" />
                        <Text style={styles.loaderText}>Enviando configuración y verificando...</Text>
                    </View>
                 </View>
             );
        }

        if (bleState === BLE_STATES.PROVISIONED) {
            return (
                <View style={styles.stepContainer}>
                    <CheckCircle2 color="#22c55e" size={80} style={styles.icon} />
                    <Text style={styles.title}>¡Configuración Exitosa!</Text>
                    <Text style={styles.description}>
                        El dispositivo se ha conectado exitosamente a <Text style={styles.bold}>{selectedSsid}</Text>.
                    </Text>
                    <TouchableOpacity style={styles.successButton} onPress={() => { resetBle(); onClose(); }}>
                        <Text style={styles.buttonText}>Finalizar</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return null;
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.modalContent}>
                    <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
                        <X color="#94a3b8" size={24} />
                    </TouchableOpacity>
                    {renderContent()}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.9)', justifyContent: 'flex-end' },
    modalContent: { 
        backgroundColor: '#0f172a', 
        borderTopLeftRadius: 30, 
        borderTopRightRadius: 30, 
        padding: 30, 
        minHeight: '70%',
        borderTopWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.2)'
    },
    closeIcon: { alignSelf: 'flex-end', padding: 5 },
    stepContainer: { alignItems: 'center', width: '100%', paddingBottom: 20 },
    icon: { marginBottom: 20 },
    title: { color: '#f8fafc', fontSize: 24, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    description: { color: '#94a3b8', fontSize: 16, lineHeight: 24, textAlign: 'center', marginBottom: 30 },
    bold: { color: '#38bdf8', fontWeight: 'bold' },
    primaryButton: { 
        backgroundColor: '#0ea5e9', 
        paddingVertical: 16, 
        paddingHorizontal: 24, 
        borderRadius: 16, 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 10,
        width: '100%',
        justifyContent: 'center'
    },
    successButton: { 
        backgroundColor: '#22c55e', 
        paddingVertical: 16, 
        paddingHorizontal: 24, 
        borderRadius: 16, 
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center'
    },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    ghostButton: { marginTop: 15, padding: 10 },
    ghostButtonText: { color: '#64748b', fontSize: 16 },
    
    loader: { padding: 40, alignItems: 'center' },
    loaderText: { color: '#38bdf8', marginTop: 10 },
    
    list: { width: '100%', maxHeight: 300, marginBottom: 20 },
    networkItem: { 
        backgroundColor: 'rgba(30, 41, 59, 0.5)', 
        padding: 18, 
        borderRadius: 12, 
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.1)'
    },
    networkName: { color: '#f8fafc', fontSize: 16, fontWeight: '500' },
    networkInfo: { color: '#64748b', fontSize: 12 },
    
    empty: { padding: 30, alignItems: 'center' },
    emptyText: { color: '#64748b', marginBottom: 10 },
    retryButton: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    retryText: { color: '#38bdf8', fontWeight: '600' },
    
    inputGroup: { width: '100%', marginBottom: 20 },
    label: { color: '#94a3b8', fontSize: 13, marginBottom: 8, marginLeft: 4 },
    input: { 
        backgroundColor: 'rgba(2, 6, 23, 0.8)', 
        color: '#f8fafc', 
        borderRadius: 12, 
        padding: 15, 
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(51, 65, 85, 0.5)'
    }
});
