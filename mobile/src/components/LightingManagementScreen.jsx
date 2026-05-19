import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    Alert, TextInput, ScrollView, useWindowDimensions, Platform
} from 'react-native';
import { Sun, ArrowLeft, Save, Clock, Zap, Moon, CloudSun, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Device from 'expo-device';
import Slider from '@react-native-community/slider'; // Asegúrate de tenerlo o usar un View + PanResponder
import { CONFIG } from '../constants/config';

const BACKEND_URL = CONFIG.BACKEND_URL;

export default function LightingManagementScreen({ onBack, currentLux = 0 }) {
    const { width } = useWindowDimensions();
    const isDesktop = width > 900;
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Estado para la configuración lumínica
    const [settings, setSettings] = useState({
        light_mode: 'manual',
        light_start_time: '09:00',
        light_end_time: '21:00',
        light_manual_intensity: 100
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
                    light_mode: data.light_mode || 'manual',
                    light_start_time: data.light_start_time || '09:00',
                    light_end_time: data.light_end_time || '21:00',
                    light_manual_intensity: data.light_manual_intensity ?? 100
                });
            }
        } catch (error) {
            console.error('Error fetching light settings:', error);
            Alert.alert('Error', 'No se pudieron cargar las configuraciones de iluminación.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const response = await fetch(`${BACKEND_URL}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });

            if (response.ok) {
                triggerHaptic('success');
                Alert.alert('¡Éxito!', 'Configuración lumínica actualizada.');
            } else {
                throw new Error('Error al guardar');
            }
        } catch (error) {
            triggerHaptic('error');
            Alert.alert('Error', 'No se pudo guardar la configuración.');
        } finally {
            setSaving(false);
        }
    };

    // Lógica de Estado de Lux
    const getLuxStatus = (lux) => {
        if (lux <= 50) return { label: 'Oscuro', color: '#64748b', icon: Moon };
        if (lux <= 300) return { label: 'Poca luz', color: '#fbbf24', icon: CloudSun };
        if (lux <= 1000) return { label: 'Luz Normal', color: '#38bdf8', icon: Sun };
        return { label: 'Mucha luz', color: '#f59e0b', icon: Sparkles };
    };

    const luxStatus = getLuxStatus(currentLux);
    const StatusIcon = luxStatus.icon;

    // Lógica Inversa Proporcional (Simulación UI)
    // Suponemos que 2000 lux es el máximo ambiental para el cálculo
    const calculateInverseIntensity = (lux) => {
        const maxLux = 2000;
        const normalizedLux = Math.min(lux, maxLux);
        const intensity = 100 - (normalizedLux / maxLux) * 100;
        return Math.max(Math.round(intensity), 0);
    };

    const autoIntensity = calculateInverseIntensity(currentLux);

    return (
        <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, isDesktop && styles.contentContainerDesktop]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => { triggerHaptic(); onBack(); }} style={styles.backButton}>
                    <ArrowLeft color="#94a3b8" size={24} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Sun color="#fbbf24" size={28} style={styles.headerIcon} />
                    <Text style={styles.headerTitle}>Administración Lumínica</Text>
                </View>
            </View>

            {/* Lux Display Block */}
            <View style={styles.luxCard}>
                <Text style={styles.luxLabel}>Luz Ambiental Actual</Text>
                <View style={styles.luxValueContainer}>
                    <Text style={styles.luxValue}>{currentLux}</Text>
                    <Text style={styles.luxUnit}>lx</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: luxStatus.color + '20' }]}>
                    <StatusIcon color={luxStatus.color} size={16} style={{ marginRight: 6 }} />
                    <Text style={[styles.statusBadgeText, { color: luxStatus.color }]}>{luxStatus.label}</Text>
                </View>
            </View>

            {/* Mode Switcher */}
            <View style={styles.modeContainer}>
                <TouchableOpacity
                    style={[styles.modeOption, settings.light_mode === 'manual' && styles.modeOptionActive]}
                    onPress={() => { triggerHaptic(); setSettings({ ...settings, light_mode: 'manual' }); }}
                >
                    <Clock color={settings.light_mode === 'manual' ? '#fff' : '#64748b'} size={20} />
                    <Text style={[styles.modeText, settings.light_mode === 'manual' && styles.modeTextActive]}>Horarios</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.modeOption, settings.light_mode === 'auto' && styles.modeOptionActive]}
                    onPress={() => { triggerHaptic(); setSettings({ ...settings, light_mode: 'auto' }); }}
                >
                    <Zap color={settings.light_mode === 'auto' ? '#fff' : '#64748b'} size={20} />
                    <Text style={[styles.modeText, settings.light_mode === 'auto' && styles.modeTextActive]}>Proporcional</Text>
                </TouchableOpacity>
            </View>

            {/* Mode Specific Settings */}
            {settings.light_mode === 'manual' ? (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Planificación por Horarios</Text>
                    <View style={styles.inputRow}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Inicio</Text>
                            <TextInput
                                style={styles.input}
                                value={settings.light_start_time}
                                onChangeText={(val) => setSettings({ ...settings, light_start_time: val })}
                                placeholder="09:00"
                                placeholderTextColor="#475569"
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Fin</Text>
                            <TextInput
                                style={styles.input}
                                value={settings.light_end_time}
                                onChangeText={(val) => setSettings({ ...settings, light_end_time: val })}
                                placeholder="21:00"
                                placeholderTextColor="#475569"
                            />
                        </View>
                    </View>
                    <Text style={styles.label}>Intensidad LED ({settings.light_manual_intensity}%)</Text>
                    {/* Placeholder for Slider since we don't have the lib installed yet in some environments */}
                    <Slider
                        style={{ width: '100%', height: 40 }}
                        minimumValue={0}
                        maximumValue={100}
                        step={1}
                        value={settings.light_manual_intensity}
                        onValueChange={(val) => setSettings({ ...settings, light_manual_intensity: Math.round(val) })}
                        minimumTrackTintColor="#38bdf8"
                        maximumTrackTintColor="rgba(51, 65, 85, 0.5)"
                        thumbTintColor="#38bdf8"
                    />
                    <View style={styles.intensityPicker}>
                        {[25, 50, 75, 100].map(val => (
                            <TouchableOpacity
                                key={val}
                                style={[styles.intensityBtn, settings.light_manual_intensity === val && styles.intensityBtnActive]}
                                onPress={() => { triggerHaptic(); setSettings({ ...settings, light_manual_intensity: val }); }}
                            >
                                <Text style={[styles.intensityBtnText, settings.light_manual_intensity === val && styles.intensityBtnTextActive]}>{val}%</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            ) : (
                <View style={[styles.section, styles.autoSection]}>
                    <View style={styles.autoHeader}>
                        <Zap color="#38bdf8" size={24} />
                        <Text style={styles.sectionTitle}>Modo Inteligente Inverso</Text>
                    </View>
                    <Text style={styles.description}>
                        La luz del acuario se ajustará automáticamente: mientras más luz haya en la habitación, menos potencia usará el LED, ahorrando energía y manteniendo un ambiente constante para tus peces.
                    </Text>
                    <View style={styles.previewBox}>
                        <Text style={styles.previewLabel}>Intensidad LED Calculada:</Text>
                        <Text style={styles.previewValue}>{autoIntensity}%</Text>
                    </View>
                </View>
            )}

            {/* Save Button */}
            <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
            >
                {saving ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <>
                        <Save color="#fff" size={20} style={{ marginRight: 10 }} />
                        <Text style={styles.saveButtonText}>Guardar Configuración</Text>
                    </>
                )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    contentContainer: { paddingBottom: 40 },
    contentContainerDesktop: { maxWidth: 600, alignSelf: 'center', width: '100%' },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    backButton: { padding: 10, marginRight: 12, backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: 12 },
    headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
    headerIcon: { marginRight: 10 },
    headerTitle: { color: '#f8fafc', fontSize: 22, fontWeight: 'bold' },

    luxCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.4)',
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.1)'
    },
    luxLabel: { color: '#94a3b8', fontSize: 14, marginBottom: 8, letterSpacing: 0.5 },
    luxValueContainer: { flexDirection: 'row', alignItems: 'baseline' },
    luxValue: { color: '#fff', fontSize: 64, fontWeight: '800' },
    luxUnit: { color: '#38bdf8', fontSize: 24, marginLeft: 6, fontWeight: '600' },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 10
    },
    statusBadgeText: { fontSize: 14, fontWeight: '600' },

    modeContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        borderRadius: 16,
        padding: 6,
        marginBottom: 24
    },
    modeOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8
    },
    modeOptionActive: { backgroundColor: '#38bdf8' },
    modeText: { color: '#64748b', fontWeight: '600' },
    modeTextActive: { color: '#fff' },

    section: {
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.1)'
    },
    autoSection: { borderColor: 'rgba(56, 189, 248, 0.2)' },
    autoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
    sectionTitle: { color: '#38bdf8', fontSize: 18, fontWeight: '600', marginBottom: 20 },
    description: { color: '#94a3b8', fontSize: 14, lineHeight: 20, marginBottom: 24 },

    inputRow: { flexDirection: 'row', gap: 15, marginBottom: 24 },
    inputGroup: { flex: 1 },
    label: { color: '#94a3b8', fontSize: 13, marginBottom: 8 },
    input: {
        backgroundColor: 'rgba(2, 6, 23, 0.6)',
        color: '#fff',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(51, 65, 85, 0.5)'
    },

    sliderPlaceholder: {
        height: 8,
        backgroundColor: 'rgba(51, 65, 85, 0.5)',
        borderRadius: 4,
        marginVertical: 12,
        overflow: 'hidden'
    },
    sliderTrack: { height: '100%', backgroundColor: '#38bdf8' },

    intensityPicker: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    intensityBtn: {
        flex: 1,
        paddingVertical: 10,
        backgroundColor: 'rgba(30, 41, 59, 0.4)',
        borderRadius: 10,
        alignItems: 'center'
    },
    intensityBtnActive: { backgroundColor: 'rgba(56, 189, 248, 0.2)', borderWidth: 1, borderColor: '#38bdf8' },
    intensityBtnText: { color: '#64748b', fontSize: 12, fontWeight: '700' },
    intensityBtnTextActive: { color: '#38bdf8' },

    previewBox: {
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        padding: 20,
        borderRadius: 16,
        alignItems: 'center'
    },
    previewLabel: { color: '#38bdf8', fontSize: 14, marginBottom: 4 },
    previewValue: { color: '#fff', fontSize: 32, fontWeight: '800' },

    saveButton: {
        backgroundColor: '#0ea5e9',
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
    },
    saveButtonDisabled: { opacity: 0.6 },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
