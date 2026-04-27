import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput, ScrollView, Modal, FlatList } from 'react-native';
import { Wifi, ShieldCheck, ArrowRight, RefreshCw, X, CheckCircle2 } from 'lucide-react-native';

const ESP_AP_IP = '192.168.4.1';

export default function ProvisioningModal({ visible, onClose, backendUrl }) {
    const [step, setStep] = useState(1); // 1: Instrucciones, 2: Escaneo, 3: Formulario, 4: Éxito
    const [networks, setNetworks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedSsid, setSelectedSsid] = useState('');
    const [password, setPassword] = useState('');
    const [mqttIp, setMqttIp] = useState(backendUrl || '');

    const reset = () => {
        setStep(1);
        setNetworks([]);
        setLoading(false);
        setSelectedSsid('');
        setPassword('');
    };

    const handleNextStep = () => {
        if (step === 1) scanNetworks();
        else setStep(step + 1);
    };

    const scanNetworks = async () => {
        setLoading(true);
        setStep(2);
        try {
            // Aumentamos el timeout a 10s para dar tiempo al ESP32 a escanear
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const res = await fetch(`http://${ESP_AP_IP}/scan`, { signal: controller.signal });
            clearTimeout(timeoutId);
            const data = await res.json();
            setNetworks(data.networks || []);
        } catch (error) {
            console.log('Scan aborted or failed:', error.name);
            if (error.name === 'AbortError') {
                Alert.alert(
                    'Tiempo de espera agotado',
                    'El dispositivo tardó demasiado en responder. Asegúrate de estar conectado a "AquaControl_Setup".',
                    [{ text: 'Reintentar', onPress: scanNetworks }, { text: 'Cancelar', onPress: () => setStep(1) }]
                );
            } else {
                Alert.alert('Error de conexión', 'No se pudo alcanzar al dispositivo (192.168.4.1).');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleConfig = async () => {
        if (!selectedSsid || !password) {
            Alert.alert('Error', 'Por favor selecciona una red e ingresa la contraseña.');
            return;
        }

        setLoading(true);
        try {
            const body = new URLSearchParams();
            body.append('ssid', selectedSsid);
            body.append('pass', password);
            body.append('mqtt', mqttIp.replace('http://', '').replace(':4000', '').trim());

            const res = await fetch(`http://${ESP_AP_IP}/config`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: body.toString()
            });

            if (res.ok) {
                setStep(4);
            } else {
                throw new Error('Error en la respuesta del dispositivo');
            }
        } catch (error) {
            Alert.alert('Error de Envío', 'No se pudo enviar la configuración al dispositivo.');
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <View style={styles.stepContainer}>
                        <Wifi color="#38bdf8" size={60} style={styles.icon} />
                        <Text style={styles.title}>Vincular Dispositivo</Text>
                        <Text style={styles.description}>
                            Para configurar tu AquaControl32:
                            {"\n\n"}1. Ve a los ajustes WiFi de tu teléfono.
                            {"\n"}2. Conéctate a la red: {"\n"}   <Text style={styles.bold}>"AquaControl_Setup"</Text>
                            {"\n"}3. Una vez conectado, vuelve aquí.
                        </Text>
                        <TouchableOpacity style={styles.primaryButton} onPress={handleNextStep}>
                            <Text style={styles.buttonText}>Ya estoy conectado</Text>
                            <ArrowRight color="#fff" size={20} />
                        </TouchableOpacity>
                    </View>
                );
            case 2:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.title}>Selecciona tu red WiFi</Text>
                        {loading ? (
                            <View style={styles.loader}>
                                <ActivityIndicator size="large" color="#38bdf8" />
                                <Text style={styles.loaderText}>Escaneando...</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={networks}
                                keyExtractor={(item, index) => index.toString()}
                                style={styles.list}
                                renderItem={({ item }) => (
                                    <TouchableOpacity 
                                        style={[styles.networkItem, selectedSsid === item.ssid && styles.networkItemSelected]}
                                        onPress={() => { setSelectedSsid(item.ssid); setStep(3); }}
                                    >
                                        <Text style={styles.networkName}>{item.ssid}</Text>
                                        <Text style={styles.networkInfo}>{item.rssi} dBm</Text>
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                    <View style={styles.empty}>
                                        <Text style={styles.emptyText}>No se encontraron redes.</Text>
                                        <TouchableOpacity onPress={scanNetworks} style={styles.retryButton}>
                                            <RefreshCw color="#38bdf8" size={20} />
                                            <Text style={styles.retryText}>Reintentar</Text>
                                        </TouchableOpacity>
                                    </View>
                                }
                            />
                        )}
                        <TouchableOpacity style={styles.ghostButton} onPress={() => setStep(1)}>
                            <Text style={styles.ghostButtonText}>Volver</Text>
                        </TouchableOpacity>
                    </View>
                );
            case 3:
                return (
                    <ScrollView contentContainerStyle={styles.stepContainer}>
                        <ShieldCheck color="#38bdf8" size={60} style={styles.icon} />
                        <Text style={styles.title}>Configuración</Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Red seleccionada</Text>
                            <TextInput style={[styles.input, { opacity: 0.6 }]} value={selectedSsid} editable={false} />
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
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>IP del Servidor (Opcional)</Text>
                            <TextInput 
                                style={styles.input} 
                                value={mqttIp} 
                                onChangeText={setMqttIp}
                                placeholder="Ej: 192.168.0.XXX"
                                placeholderTextColor="#64748b"
                            />
                        </View>
                        <TouchableOpacity style={styles.primaryButton} onPress={handleConfig} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Vincular ahora</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.ghostButton} onPress={() => setStep(2)}>
                            <Text style={styles.ghostButtonText}>Cambiar red</Text>
                        </TouchableOpacity>
                    </ScrollView>
                );
            case 4:
                return (
                    <View style={styles.stepContainer}>
                        <CheckCircle2 color="#22c55e" size={80} style={styles.icon} />
                        <Text style={styles.title}>¡Configuración Enviada!</Text>
                        <Text style={styles.description}>
                            El dispositivo se está reiniciando para conectar a <Text style={styles.bold}>{selectedSsid}</Text>.
                            {"\n\n"}Regresa a tu WiFi principal y en unos segundos el dispositivo debería aparecer "Estable" en el panel.
                        </Text>
                        <TouchableOpacity style={styles.successButton} onPress={() => { reset(); onClose(); }}>
                            <Text style={styles.buttonText}>Finalizar</Text>
                        </TouchableOpacity>
                    </View>
                );
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.modalContent}>
                    <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
                        <X color="#94a3b8" size={24} />
                    </TouchableOpacity>
                    {renderStep()}
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
    networkItemSelected: { borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.1)' },
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
