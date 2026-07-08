import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    Alert, TextInput, ScrollView, useWindowDimensions, Animated, Platform, Switch
} from 'react-native';
import { Sun, ArrowLeft, Save, Clock, Zap, Moon, CloudSun, Sparkles, Info } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Device from 'expo-device';
import Slider from '@react-native-community/slider';
import { CONFIG } from '../constants/config';

const BACKEND_URL = CONFIG.BACKEND_URL;

export default function LightingManagementScreen({ onBack, currentLux = 0 }) {
    const { width } = useWindowDimensions();
    const isDesktop = width > 900;
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [fadeAnim] = useState(new Animated.Value(0));

    // Estado para la configuración lumínica
    const [settings, setSettings] = useState({
        light_override_schedule_enabled: false,
        light_schedule_start: '09:00',
        light_schedule_end: '21:00',
        light_override_intensity_enabled: false,
        light_intensity_value: 100
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
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${BACKEND_URL}/settings`);
            if (response.ok) {
                const data = await response.json();
                setSettings({
                    light_override_schedule_enabled: data.light_override_schedule_enabled || false,
                    light_schedule_start: data.light_schedule_start || '09:00',
                    light_schedule_end: data.light_schedule_end || '21:00',
                    light_override_intensity_enabled: data.light_override_intensity_enabled || false,
                    light_intensity_value: data.light_intensity_value ?? 100
                });
            }
        } catch (error) {
            console.error('Error fetching light settings:', error);
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
                Alert.alert('¡Sincronizado!', 'La configuración se envió al ESP32 correctamente.');
            } else {
                throw new Error('Error al guardar');
            }
        } catch (error) {
            triggerHaptic('error');
            Alert.alert('Error', 'No se pudo conectar con el servidor.');
        } finally {
            setSaving(false);
        }
    };

    const getLuxStatus = (lux) => {
        if (lux <= 50) return { label: 'Ambiente Oscuro', color: '#94a3b8', icon: Moon, desc: 'Ideal para descanso' };
        if (lux <= 300) return { label: 'Luz Tenue', color: '#fbbf24', icon: CloudSun, desc: 'Atardecer/Amanecer' };
        if (lux <= 1000) return { label: 'Luz Óptima', color: '#38bdf8', icon: Sun, desc: 'Día despejado' };
        return { label: 'Luz Intensa', color: '#f59e0b', icon: Sparkles, desc: 'Exposición directa' };
    };

    const luxStatus = getLuxStatus(currentLux);
    const StatusIcon = luxStatus.icon;

    // Cálculo inverso para visualización
    const autoIntensity = Math.max(0, Math.round(100 - (Math.min(currentLux, 2000) / 2000) * 100));

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#38bdf8" />
                <Text style={styles.loadingText}>Cargando parámetros...</Text>
            </View>
        );
    }

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.contentContainer, isDesktop && styles.contentContainerDesktop]}>
                
                {/* Header Pro */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.glassButton}>
                        <ArrowLeft color="#fff" size={20} />
                    </TouchableOpacity>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>Iluminación</Text>
                        <Text style={styles.headerSubtitle}>Control Inteligente del Ecosistema</Text>
                    </View>
                </View>

                {/* Dashboard de Lux */}
                <View style={styles.mainCard}>
                    <View style={styles.luxHeader}>
                        <Text style={styles.cardLabel}>SENSOR AMBIENTAL</Text>
                        <View style={[styles.statusBadge, { backgroundColor: luxStatus.color + '15' }]}>
                            <StatusIcon color={luxStatus.color} size={14} />
                            <Text style={[styles.statusText, { color: luxStatus.color }]}>{luxStatus.label}</Text>
                        </View>
                    </View>
                    
                    <View style={styles.luxDisplay}>
                        <Text style={styles.luxBigValue}>{currentLux}</Text>
                        <Text style={styles.luxUnit}>LUX</Text>
                    </View>

                    <View style={styles.progressTrack}>
                        <View style={[styles.progressBar, { width: `${Math.min((currentLux/2000)*100, 100)}%`, backgroundColor: luxStatus.color }]} />
                    </View>
                    <Text style={styles.cardFooter}>{luxStatus.desc}</Text>
                </View>

                {/* Overrides */}
                <Text style={styles.sectionLabel}>EXCEPCIONES (OVERRIDES)</Text>
                
                <View style={styles.configCard}>
                    <View style={styles.overrideRow}>
                        <View>
                            <Text style={styles.overrideTitle}>Forzar Horario</Text>
                            <Text style={styles.overrideDesc}>Ignora el sensor y enciende la luz en este rango</Text>
                        </View>
                        <Switch
                            value={settings.light_override_schedule_enabled}
                            onValueChange={(val) => { triggerHaptic(); setSettings({...settings, light_override_schedule_enabled: val}); }}
                            trackColor={{ false: '#1e293b', true: '#38bdf8' }}
                            thumbColor="#fff"
                        />
                    </View>

                    {settings.light_override_schedule_enabled && (
                        <View style={styles.row}>
                            <View style={styles.inputBox}>
                                <Text style={styles.smallLabel}>ENCENDIDO</Text>
                                <TextInput 
                                    style={styles.timeInput}
                                    value={settings.light_schedule_start}
                                    onChangeText={(t) => setSettings({...settings, light_schedule_start: t})}
                                    placeholder="09:00"
                                    placeholderTextColor="#475569"
                                />
                            </View>
                            <View style={styles.inputBox}>
                                <Text style={styles.smallLabel}>APAGADO</Text>
                                <TextInput 
                                    style={styles.timeInput}
                                    value={settings.light_schedule_end}
                                    onChangeText={(t) => setSettings({...settings, light_schedule_end: t})}
                                    placeholder="21:00"
                                    placeholderTextColor="#475569"
                                />
                            </View>
                        </View>
                    )}
                </View>

                <View style={styles.configCard}>
                    <View style={styles.overrideRow}>
                        <View>
                            <Text style={styles.overrideTitle}>Forzar Intensidad</Text>
                            <Text style={styles.overrideDesc}>Ignora la auto-regulación lumínica</Text>
                        </View>
                        <Switch
                            value={settings.light_override_intensity_enabled}
                            onValueChange={(val) => { triggerHaptic(); setSettings({...settings, light_override_intensity_enabled: val}); }}
                            trackColor={{ false: '#1e293b', true: '#38bdf8' }}
                            thumbColor="#fff"
                        />
                    </View>

                    {settings.light_override_intensity_enabled && (
                        <View style={styles.intensitySection}>
                            <Text style={styles.smallLabel}>INTENSIDAD FIJA: {settings.light_intensity_value}%</Text>
                            <Slider
                                style={styles.slider}
                                minimumValue={0}
                                maximumValue={100}
                                step={5}
                                value={settings.light_intensity_value}
                                onValueChange={(v) => setSettings({...settings, light_intensity_value: Math.round(v)})}
                                minimumTrackTintColor="#38bdf8"
                                maximumTrackTintColor="#1e293b"
                                thumbTintColor="#fff"
                            />
                        </View>
                    )}
                </View>

                {/* Botón de Guardado */}
                <TouchableOpacity 
                    style={[styles.saveBtn, saving && styles.saveBtnDisabled]} 
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Text style={styles.saveBtnText}>APLICAR CAMBIOS</Text>
                            <Save color="#fff" size={20} />
                        </>
                    )}
                </TouchableOpacity>

                <View style={styles.footerInfo}>
                    <Info color="#64748b" size={14} />
                    <Text style={styles.footerText}>Los cambios se aplican en tiempo real al dispositivo.</Text>
                </View>

            </ScrollView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    contentContainer: { padding: 24, paddingBottom: 60 },
    contentContainerDesktop: { maxWidth: 500, alignSelf: 'center', width: '100%' },
    
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
    loadingText: { color: '#94a3b8', marginTop: 12, fontSize: 14, letterSpacing: 1 },

    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 32, marginTop: Platform.OS === 'ios' ? 20 : 0 },
    glassButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    headerTextContainer: { flex: 1 },
    headerTitle: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
    headerSubtitle: { color: '#64748b', fontSize: 13, marginTop: 2 },

    mainCard: { backgroundColor: '#0f172a', borderRadius: 28, padding: 24, borderSize: 1, borderColor: '#1e293b', marginBottom: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
    luxHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    cardLabel: { color: '#38bdf8', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 6 },
    statusText: { fontSize: 11, fontWeight: '700' },
    luxDisplay: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginBottom: 20 },
    luxBigValue: { color: '#fff', fontSize: 72, fontWeight: '900', letterSpacing: -2 },
    luxUnit: { color: '#334155', fontSize: 20, fontWeight: '700', marginLeft: 8 },
    progressTrack: { height: 6, backgroundColor: '#1e293b', borderRadius: 3, width: '100%', marginBottom: 12, overflow: 'hidden' },
    progressBar: { height: '100%', borderRadius: 3 },
    cardFooter: { color: '#475569', fontSize: 12, textAlign: 'center', fontWeight: '600' },

    sectionLabel: { color: '#475569', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 16, marginLeft: 4 },
    tabsContainer: { flexDirection: 'row', backgroundColor: '#0f172a', borderRadius: 18, padding: 6, marginBottom: 24 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, gap: 10 },
    tabActive: { backgroundColor: '#38bdf8' },
    tabText: { color: '#64748b', fontSize: 14, fontWeight: '700' },
    tabTextActive: { color: '#fff' },

    configCard: { backgroundColor: '#0f172a', borderRadius: 24, padding: 20, marginBottom: 24 },
    overrideRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    overrideTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
    overrideDesc: { color: '#64748b', fontSize: 12, marginTop: 4, maxWidth: '85%' },
    row: { flexDirection: 'row', gap: 16 },
    inputBox: { flex: 1, backgroundColor: '#020617', padding: 16, borderRadius: 18, borderSize: 1, borderColor: '#1e293b' },
    smallLabel: { color: '#475569', fontSize: 10, fontWeight: '800', marginBottom: 8 },
    timeInput: { color: '#fff', fontSize: 18, fontWeight: '700' },
    intensitySection: { marginTop: 24, paddingHorizontal: 8 },
    slider: { width: '100%', height: 40 },
    autoInfo: { flexDirection: 'row', gap: 16, marginBottom: 24 },
    infoIcon: { width: 48, height: 44, backgroundColor: '#38bdf810', borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    autoTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
    autoDesc: { color: '#64748b', fontSize: 13, lineHeight: 18 },
    statsPreview: { flexDirection: 'row', backgroundColor: '#020617', borderRadius: 20, padding: 20, alignItems: 'center' },
    statItem: { flex: 1, alignItems: 'center' },
    statLabel: { color: '#475569', fontSize: 11, fontWeight: '700', marginBottom: 4 },
    statValue: { color: '#38bdf8', fontSize: 24, fontWeight: '800' },
    statDivider: { width: 1, height: 30, backgroundColor: '#1e293b' },

    saveBtn: { backgroundColor: '#0ea5e9', borderRadius: 20, paddingVertical: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15 },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
    
    footerInfo: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 },
    footerText: { color: '#475569', fontSize: 11, fontWeight: '500' }
});

