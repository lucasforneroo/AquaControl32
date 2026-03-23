import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RefreshCcw, Thermometer, Calendar, ArrowLeft, Clock } from 'lucide-react-native';
import AdvancedTemperatureChart from './AdvancedTemperatureChart';
import { CONFIG } from '../constants/config';
import AnimatedBackground from './AnimatedBackground';

const screenWidth = Dimensions.get('window').width;

const MetricsHistoryScreen = ({ onBack, settings }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedInterval, setSelectedInterval] = useState(24); // Horas por defecto

    const fetchData = async (hours = selectedInterval) => {
        try {
            setRefreshing(true);
            const apiBase = CONFIG.WS_URL.replace('ws://', 'http://');
            const response = await fetch(`${apiBase}/metrics/history?hours=${hours}`);
            if (!response.ok) throw new Error('Network response was not ok');
            const json = await response.json();
            
            // Tomamos una muestra balanceada si hay demasiados datos
            let sampling = json;
            if (json.length > 30) {
                const step = Math.ceil(json.length / 20);
                sampling = json.filter((_, i) => i % step === 0);
            }
            setData(sampling);
            // Guardar en caché
            await AsyncStorage.setItem(`cached_history_${hours}`, JSON.stringify(sampling));
        } catch (error) {
            console.error('Error fetching history:', error);
            // Intentar cargar de caché
            const cached = await AsyncStorage.getItem(`cached_history_${hours}`);
            if (cached) {
                setData(JSON.parse(cached));
                console.log(`📦 Historial (${hours}h) cargado de caché`);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(selectedInterval), 60000);
        return () => clearInterval(interval);
    }, [selectedInterval]);

    const handleIntervalChange = (hours) => {
        setSelectedInterval(hours);
        setLoading(true);
        fetchData(hours);
    };


    const intervals = [
        { label: '1h', value: 1 },
        { label: '3h', value: 3 },
        { label: '12h', value: 12 },
        { label: '24h', value: 24 },
    ];

    return (
        <View style={styles.container}>
            <AnimatedBackground />
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <ArrowLeft color="#94a3b8" size={24} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Métricas del Sistema</Text>
                    <TouchableOpacity onPress={() => fetchData()} disabled={refreshing}>
                        <RefreshCcw size={20} color="#fff" style={refreshing ? { opacity: 0.5 } : {}} />
                    </TouchableOpacity>
                </View>

                {/* Filtros de Tiempo */}
                <View style={styles.filterBar}>
                    {intervals.map((item) => (
                        <TouchableOpacity
                            key={item.value}
                            onPress={() => handleIntervalChange(item.value)}
                            style={[
                                styles.filterItem,
                                selectedInterval === item.value && styles.filterItemActive
                            ]}
                        >
                            <Text style={[
                                styles.filterText,
                                selectedInterval === item.value && styles.filterTextActive
                            ]}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#50cbffff" />
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        {data.length > 0 ? (
                            <View style={styles.content}>
                                <View style={styles.chartCard}>
                                    <View style={styles.cardHeader}>
                                        <Clock size={16} color="#37c3ffff" />
                                        <Text style={styles.cardTitle}>Tendencia - Últimas {selectedInterval}h</Text>
                                    </View>
                                    <View style={styles.chartWrapper}>
                                        <AdvancedTemperatureChart 
                                            data={data} 
                                            settings={settings} 
                                        />
                                    </View>
                                </View>

                                <View style={styles.statsRow}>
                                    <View style={styles.statBox}>
                                        <Thermometer color="#38bdf8" size={24} />
                                        <Text style={styles.statVal}>
                                            {data.length > 0 ? parseFloat(data[data.length-1].temperature).toFixed(1) : '--'}°C
                                        </Text>
                                        <Text style={styles.statLab}>Última lectura</Text>
                                    </View>
                                    <View style={styles.statBox}>
                                        <Calendar color="#94a3b8" size={24} />
                                        <Text style={styles.statVal}>{data.length}</Text>
                                        <Text style={styles.statLab}>Muestras</Text>
                                    </View>
                                </View>

                                <Text style={styles.sectionTitle}>Registros Recientes</Text>
                                {data.slice(-5).reverse().map((item, i) => (
                                    <View key={i} style={styles.logItem}>
                                        <View style={styles.logTimeCol}>
                                            <Text style={styles.logTime}>
                                                {new Date(item.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                            <Text style={styles.logDate}>
                                                {new Date(item.recorded_at).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                                            </Text>
                                        </View>
                                        <Text style={styles.logVal}>{parseFloat(item.temperature).toFixed(2)}°C</Text>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <View style={styles.center}>
                                <Text style={styles.emptyText}>No hay datos disponibles para este intervalo.</Text>
                            </View>
                        )}
                    </ScrollView>
                )}
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    safeArea: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    backButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10 },
    title: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    filterBar: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 10, paddingHorizontal: 20 },
    filterItem: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    filterItemActive: { backgroundColor: 'rgba(56, 189, 248, 0.2)', borderColor: '#38bdf8' },
    filterText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
    filterTextActive: { color: '#fff' },
    scrollContent: { padding: 20, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
    content: { width: '100%' },
    chartCard: { backgroundColor: 'rgba(15, 23, 42, 0.4)', borderRadius: 24, padding: 15, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.15)', overflow: 'hidden' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
    cardTitle: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
    chartWrapper: { alignItems: 'center', width: '100%' },
    chart: { borderRadius: 16, marginVertical: 8 },
    statsRow: { flexDirection: 'row', gap: 15, marginTop: 20 },
    statBox: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: 15, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.1)' },
    statVal: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 5 },
    statLab: { color: '#64748b', fontSize: 12, marginTop: 2 },
    sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 30, marginBottom: 15 },
    logItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'rgba(15, 23, 42, 0.3)', borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.1)' },
    logTimeCol: { gap: 2 },
    logTime: { color: '#f8fafc', fontSize: 14, fontWeight: '600' },
    logDate: { color: '#64748b', fontSize: 11 },
    logVal: { color: '#38bdf8', fontSize: 16, fontWeight: 'bold' },
    emptyText: { color: '#64748b', textAlign: 'center' }
});

export default MetricsHistoryScreen;
