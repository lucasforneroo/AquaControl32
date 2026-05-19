import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput, ScrollView, useWindowDimensions, Platform } from 'react-native';
import { Settings2, ArrowLeft, Save } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Device from 'expo-device';
import { CONFIG } from '../constants/config';

const BACKEND_URL = CONFIG.BACKEND_URL; // Ahora centralizado en config.js

export default function AquariumManagementScreen({ onBack, onSettingsSaved }) {
    const { width } = useWindowDimensions();
    const isDesktop = width > 900;
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Estado para los rangos
    const [settings, setSettings] = useState({
        min_ideal_temp: '16.0',
        max_ideal_temp: '26.0',
        min_alert_temp: '5.0',
        max_alert_temp: '40.0'
    });

    const triggerHaptic = (type = 'selection') => {
        if (Device.isDevice) {
            if (type === 'selection') Haptics.selectionAsync();
            else if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            else if (type === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${BACKEND_URL}/settings`);
            if (response.ok) {
                const data = await response.json();
                setSettings({
                    min_ideal_temp: data.min_ideal_temp.toString(),
                    max_ideal_temp: data.max_ideal_temp.toString(),
                    min_alert_temp: data.min_alert_temp.toString(),
                    max_alert_temp: data.max_alert_temp.toString()
                });
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            Alert.alert('Error', 'No se pudieron cargar las configuraciones del acuario.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const body = {
                min_ideal_temp: parseFloat(settings.min_ideal_temp),
                max_ideal_temp: parseFloat(settings.max_ideal_temp),
                min_alert_temp: parseFloat(settings.min_alert_temp),
                max_alert_temp: parseFloat(settings.max_alert_temp)
            };

            const response = await fetch(`${BACKEND_URL}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                const updatedData = await response.json();
                triggerHaptic('success');
                Alert.alert('¡Éxito!', 'Configuración guardada correctamente. Las nuevas reglas ya están activas.');
                onSettingsSaved(updatedData); // Notificar a App.js para que actualice sus validaciones
            } else {
                triggerHaptic('error');
                throw new Error('Error al guardar');
            }
        } catch (error) {
            triggerHaptic('error');
            console.error('Error saving:', error);
            Alert.alert('Error', 'Ocurrió un error al intentar guardar la configuración.');
        } finally {
            setSaving(false);
        }
    };

    const handleInputChange = (key, value) => {
        // Permitir solo números y punto decimal
        const sanitized = value.replace(/[^0-9.]/g, '');
        setSettings(prev => ({ ...prev, [key]: sanitized }));
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#38bdf8" />
                <Text style={styles.loadingText}>Cargando preferencias...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, isDesktop && styles.contentContainerDesktop]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => { triggerHaptic(); onBack(); }} style={styles.backButton}>
                    <ArrowLeft color="#94a3b8" size={24} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Settings2 color="#38bdf8" size={28} style={styles.headerIcon} />
                    <Text style={styles.headerTitle}>Gestión de Acuario</Text>
                </View>
            </View>

            <Text style={styles.description}>
                Personaliza los umbrales de temperatura de tu acuario.
            </Text>

            {/* Rango Ideal */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Rango Ideal (Estable)</Text>
                <View style={styles.inputRow}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Mínima (°C)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={settings.min_ideal_temp}
                            onChangeText={(val) => handleInputChange('min_ideal_temp', val)}
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Máxima (°C)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={settings.max_ideal_temp}
                            onChangeText={(val) => handleInputChange('max_ideal_temp', val)}
                        />
                    </View>
                </View>
                <Text style={styles.helperText}>
                    Si la temperatura sale de este rango, el sistema entrará en estado de "Alerta".
                </Text>
            </View>

            {/* Rango de Peligro */}
            <View style={[styles.section, styles.dangerSection]}>
                <Text style={[styles.sectionTitle, styles.dangerTitle]}>Rango Crítico (Peligro)</Text>
                <View style={styles.inputRow}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, styles.dangerLabel]}>Peligro Menor a (°C)</Text>
                        <TextInput
                            style={[styles.input, styles.dangerInput]}
                            keyboardType="numeric"
                            value={settings.min_alert_temp}
                            onChangeText={(val) => handleInputChange('min_alert_temp', val)}
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, styles.dangerLabel]}>Peligro Mayor a (°C)</Text>
                        <TextInput
                            style={[styles.input, styles.dangerInput]}
                            keyboardType="numeric"
                            value={settings.max_alert_temp}
                            onChangeText={(val) => handleInputChange('max_alert_temp', val)}
                        />
                    </View>
                </View>
                <Text style={[styles.helperText, styles.dangerHelper]}>
                    Si la temperatura supera estos límites extremos, se enviará una notificación Push de prioridad Alta y el panel parpadeará en rojo profundo.
                </Text>
            </View>

            {/* Save Button */}
            <TouchableOpacity 
                style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
                onPress={handleSave}
                disabled={saving}
            >
                {saving ? (
                    <ActivityIndicator color="#fff" style={styles.saveIcon} />
                ) : (
                    <Save color="#fff" size={20} style={styles.saveIcon} />
                )}
                <Text style={styles.saveButtonText}>Guardar Configuración</Text>
            </TouchableOpacity>

            <View style={{height: 40}} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#94a3b8', marginTop: 15, fontSize: 16 },
    
    container: { flex: 1, padding: 20 },
    contentContainer: { paddingBottom: 40 },
    contentContainerDesktop: { maxWidth: 800, alignSelf: 'center', width: '100%' },
    
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    backButton: { padding: 10, marginRight: 10, backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: 12 },
    headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
    headerIcon: { marginRight: 10 },
    headerTitle: { color: '#f8fafc', fontSize: 24, fontWeight: 'bold' },
    
    description: { color: '#cbd5e1', fontSize: 15, lineHeight: 22, marginBottom: 30 },
    
    section: { 
        backgroundColor: 'rgba(15, 23, 42, 0.6)', 
        borderRadius: 20, 
        padding: 24, 
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.15)'
    },
    dangerSection: {
        backgroundColor: 'rgba(69, 10, 10, 0.3)',
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    
    sectionTitle: { color: '#38bdf8', fontSize: 18, fontWeight: '600', marginBottom: 20 },
    dangerTitle: { color: '#ef4444' },
    
    inputRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 15 },
    inputGroup: { flex: 1 },
    label: { color: '#94a3b8', fontSize: 13, marginBottom: 8, fontWeight: '500' },
    dangerLabel: { color: '#fca5a5' },
    
    input: {
        backgroundColor: 'rgba(2, 6, 23, 0.8)',
        color: '#f8fafc',
        borderRadius: 12,
        padding: 15,
        fontSize: 18,
        borderWidth: 1,
        borderColor: 'rgba(51, 65, 85, 0.5)'
    },
    dangerInput: {
        borderColor: 'rgba(153, 27, 27, 0.5)',
        backgroundColor: 'rgba(2, 6, 23, 0.9)',
    },
    
    helperText: { color: '#64748b', fontSize: 13, marginTop: 15, fontStyle: 'italic' },
    dangerHelper: { color: '#b91c1c' },
    
    saveButton: {
        backgroundColor: '#0ea5e9',
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        shadowColor: "#0ea5e9",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    saveButtonDisabled: { opacity: 0.7 },
    saveIcon: { marginRight: 10 },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
