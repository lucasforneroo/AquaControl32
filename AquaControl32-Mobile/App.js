import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, ScrollView, SafeAreaView,
  StatusBar, TouchableOpacity, useWindowDimensions, Alert, Linking
} from 'react-native';

import { CONFIG } from './src/constants/config';
import AnimatedBackground from './src/components/AnimatedBackground';
import Intro from './src/components/Intro';
import AQ32logo from './src/components/AQ32logo';
import TemperatureControl from './src/components/TemperatureControl';
import HistoryScreen from './src/components/HistoryScreen';
import MetricsHistoryScreen from './src/components/MetricsHistoryScreen';
import { Thermometer, Sun, Droplets, Settings, Activity } from 'lucide-react-native';

import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';

// OBLIGATORIO para que el flujo OAuth cierre correctamente en Expo Go
WebBrowser.maybeCompleteAuthSession();

// ─── Configuración ──────────────────────────────────────────
const GOOGLE_CLIENT_ID = '703002297863-rj0ktbrtk6ua1pgcg871mlaid9qafhkv.apps.googleusercontent.com';
const BACKEND_URL = 'http://192.168.0.13:4000';

export default function App() {

  // ─── DEBUG: Escuchar enlaces profundos (Deep Links) ────────
  useEffect(() => {
    const handleDeepLink = (event) => {
      console.log('🔗 Deep Link recibido:', event.url);
    };

    const sub = Linking.addEventListener('url', handleDeepLink);

    // Ver si la app se abrió con una URL inicial
    Linking.getInitialURL().then((url) => {
      if (url) console.log('🔗 URL Inicial:', url);
    });

    return () => sub.remove();
  }, []);
  const { width } = useWindowDimensions();
  const isDesktop = width > 900;

  const [showIntro, setShowIntro] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [metrics, setMetrics] = useState({
    temperature: 26.4,
    ph: 7.2,
    lighting: 78,
    updatedAt: null
  });
  const [targetTemperature, setTargetTemperature] = useState(26.4);
  const [connected, setConnected] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  // ─── Estado de autenticación ──────────────────────────────
  const [user, setUser] = useState(null);       // datos del usuario logueado
  const [authLoading, setAuthLoading] = useState(false);

  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const isConnecting = useRef(false);

  // ─── Google Auth Hook ─────────────────────────────────────
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    iosClientId: GOOGLE_CLIENT_ID,
    androidClientId: GOOGLE_CLIENT_ID,
    // Google solo acepta HTTPS, así que usamos el Túnel directo:
    redirectUri: 'https://6eqfiyw-lucasfornero-8081.exp.direct',
  });

  useEffect(() => {
    if (request) {
      console.log('📢 Google Redirect URI:', request.redirectUri);
    }
  }, [request]);

  // ─── Verificar si hay sesión guardada al iniciar ──────────
  useEffect(() => {
    checkStoredSession();
  }, []);

  // ─── Escuchar respuesta de Google ─────────────────────────
  useEffect(() => {
    console.log('💬 Auth Response:', JSON.stringify(response, null, 2));

    if (response?.type === 'success') {
      const { id_token, authentication } = response.params || response;
      const token = id_token || authentication?.idToken;

      console.log('🔑 Token recibido:', token ? 'SÍ' : 'NO');

      if (token) {
        sendTokenToBackend(token);
      } else {
        Alert.alert('Error', 'Google no devolvió el token esperado');
      }
    } else if (response?.type === 'error') {
      console.error('Google Auth error:', response.error);
      Alert.alert('Error', 'No se pudo autenticar con Google');
    }
  }, [response]);

  // ─── Verificar sesión almacenada ──────────────────────────
  const checkStoredSession = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      const storedToken = await AsyncStorage.getItem('jwt_token');

      console.log('💾 Sesión guardada:', storedUser ? 'Encontrada' : 'No hay');

      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        console.log('✅ Sesión restaurada de AsyncStorage');
      }
    } catch (error) {
      console.error('Error al leer sesión guardada:', error);
    }
  };

  // ─── Enviar token de Google al backend ───────────────────
  const sendTokenToBackend = async (idToken) => {
    setAuthLoading(true);
    try {
      console.log('Enviando token al backend...');

      const res = await fetch(`${BACKEND_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: idToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error del servidor');
      }

      // Guardar en AsyncStorage
      await AsyncStorage.setItem('jwt_token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));

      // Actualizar estado
      setUser(data.user);

      console.log('✅ Login exitoso:', data.user.email);
      Alert.alert('¡Bienvenido!', `Hola ${data.user.name} 👋`);

    } catch (error) {
      console.error('❌ Error al autenticar:', error.message);
      Alert.alert('Error de autenticación', error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // ─── Cerrar sesión ────────────────────────────────────────
  const handleLogout = async () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que querés cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('jwt_token');
            await AsyncStorage.removeItem('user');
            setUser(null);
            console.log('🔴 Sesión cerrada');
          }
        }
      ]
    );
  };

  // ─── Handler del botón login ──────────────────────────────
  const handleLoginPress = () => {
    if (user) {
      // Si ya está logueado → cerrar sesión
      handleLogout();
    } else {
      // Si no está logueado → abrir Google Auth
      promptAsync();
    }
  };

  // ─── WebSocket ────────────────────────────────────────────
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      isConnecting.current = true;
      if (ws.current) ws.current.close();
    };
  }, []);

  const connectWebSocket = () => {
    if (isConnecting.current) return;
    isConnecting.current = true;

    try {
      if (ws.current) {
        ws.current.onclose = null;
        ws.current.close();
      }

      console.log('Connecting to:', CONFIG.WS_URL);
      ws.current = new WebSocket(CONFIG.WS_URL);

      ws.current.onopen = () => {
        console.log('Connected to backend');
        isConnecting.current = false;
        setConnected(true);
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'metrics') {
            setMetrics(prev => ({ ...prev, ...message.data }));
            if (message.data.temperature != null) {
              setTargetTemperature(message.data.temperature);
            }
          }
        } catch (e) {
          console.error('Error parsing message:', e);
        }
      };

      ws.current.onclose = () => {
        console.log('Disconnected from backend');
        isConnecting.current = false;
        setConnected(false);
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        reconnectTimer.current = setTimeout(connectWebSocket, 5000);
      };

      ws.current.onerror = (e) => {
        console.error('WebSocket error:', e.type || 'connection failed');
      };

    } catch (e) {
      console.error('Connection error:', e);
      isConnecting.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      reconnectTimer.current = setTimeout(connectWebSocket, 5000);
    }
  };

  const handleIncreaseTemp = () => {
    setTargetTemperature(prev => Math.round((prev + 0.5) * 10) / 10);
  };

  const handleDecreaseTemp = () => {
    setTargetTemperature(prev => Math.round((prev - 0.5) * 10) / 10);
  };

  if (showIntro) {
    return <Intro onComplete={() => setShowIntro(false)} />;
  }

  if (currentView === 'history') {
    return <HistoryScreen onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'metrics') {
    return <MetricsHistoryScreen onBack={() => setCurrentView('dashboard')} />;
  }

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />
      <AnimatedBackground />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.scrollContentDesktop
        ]}>

          {/* Top Bar */}
          <View style={[styles.topBar, isDesktop && styles.topBarDesktop]}>
            <View style={styles.logoAndButtons}>
              <View style={styles.logoWrapper}>
                <AQ32logo />
              </View>

              <View style={styles.authButtons}>

                {/* ─── BOTÓN LOGIN / LOGOUT ─────────────────────────── */}
                <TouchableOpacity
                  style={[
                    styles.smallButton,
                    user && styles.smallButtonLoggedIn   // estilo verde si está logueado
                  ]}
                  onPress={handleLoginPress}
                  disabled={authLoading || !request}    // deshabilitado mientras carga
                >
                  <Text style={[
                    styles.smallButtonText,
                    user && styles.smallButtonTextLoggedIn
                  ]}>
                    {authLoading
                      ? 'Cargando...'
                      : user
                        ? `${user.name?.split(' ')[0]} ✕`  // muestra nombre + X para logout
                        : 'Login'
                    }
                  </Text>
                </TouchableOpacity>

                {/* ─── BOTÓN HISTORIA ──────────────────────────────── */}
                <TouchableOpacity
                  style={styles.smallButton}
                  onPress={() => setCurrentView('history')}
                >
                  <Text style={styles.smallButtonText}>Nuestra Historia</Text>
                </TouchableOpacity>

                {/* ─── BOTÓN OPCIONES ────────────────────────────────── */}
                <TouchableOpacity
                  style={[styles.smallButton, showOptions && styles.smallButtonActive]}
                  onPress={() => setShowOptions(!showOptions)}
                >
                  <Settings color={showOptions ? "#38bdf8" : "#94a3b8"} size={16} />
                </TouchableOpacity>

              </View>
            </View>
          </View>

          {/* ─── EXTENSIÓN DE OPCIONES ───────────────────────────── */}
          {showOptions && (
            <View style={styles.optionsExtension}>
              <Text style={styles.extensionTitle}>Opciones del Sistema</Text>
              <View style={styles.extensionRow}>
                <TouchableOpacity 
                  style={styles.extensionItem}
                  onPress={() => {
                    setCurrentView('metrics');
                    setShowOptions(false);
                  }}
                >
                  <View style={styles.extensionIcon}>
                    <Activity color="#38bdf8" size={20} />
                  </View>
                  <Text style={styles.extensionText}>Historial de Métricas</Text>
                </TouchableOpacity>
                {/* Puedes añadir más opciones aquí en el futuro */}
              </View>
            </View>
          )}

          {/* Main Hero Section */}
          <View style={[styles.heroSection, isDesktop && styles.heroSectionDesktop]}>

            {/* Left Column */}
            <View style={[styles.heroContent, isDesktop && styles.heroContentDesktop]}>

              <Text style={[styles.title, isDesktop && styles.alignLeft, isDesktop && styles.titleDesktop]}>
                AquaControl 32
              </Text>

              <Text style={[styles.subtitle, isDesktop && styles.alignLeft]}>
                Supervisa y controla tu ambiente desde cualquier lugar
              </Text>

              <View style={[styles.actions, isDesktop && styles.alignLeft, isDesktop && { justifyContent: 'flex-start' }]}>
                <TouchableOpacity style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>
                    {isDesktop ? "Conectar dispositivo" : "Conectar"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ghostButton}>
                  <Text style={styles.ghostButtonText}>
                    {isDesktop ? "Seleccionar dispositivo" : "Demo"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Controls */}
              <View style={[styles.controlsRow, isDesktop && styles.alignLeft, isDesktop && { justifyContent: 'flex-start' }]}>
                <View style={styles.controlWrapper}>
                  <TemperatureControl
                    temperature={targetTemperature}
                    onIncrease={handleIncreaseTemp}
                    onDecrease={handleDecreaseTemp}
                  />
                </View>

                {isDesktop ? (
                  <View style={styles.lightControlDesktop}>
                    <View style={styles.lightButtons}>
                      <TouchableOpacity style={styles.lightBtn}>
                        <Text style={styles.lightBtnText}>ON</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ height: 10 }} />
                    <View style={styles.lightButtons}>
                      <TouchableOpacity style={styles.lightBtn}>
                        <Text style={styles.lightBtnText}>OFF</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.lightControlMobile}>
                    <Text style={styles.controlLabel}>Luz</Text>
                    <View style={styles.mobileLightBtnContainer}>
                      <TouchableOpacity style={[styles.lightBtn, styles.mobileLightBtnWidth]}>
                        <Text style={styles.lightBtnText}>ON</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.lightBtn, styles.lightBtnOff, styles.mobileLightBtnWidth]}>
                        <Text style={styles.lightBtnText}>OFF</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Right Column: Panel */}
            <View style={[styles.heroPanelWrapper, isDesktop && styles.heroPanelWrapperDesktop]}>
              <View style={styles.panel}>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelTitle}>Estado del acuario</Text>
                  <View style={[styles.statusBadge, connected ? styles.statusOk : styles.statusError]}>
                    <Text style={styles.statusText}>{connected ? 'Estable' : 'Desc.'}</Text>
                  </View>
                </View>

                {isDesktop ? (
                  <View style={styles.metricsList}>
                    <View style={styles.metricRow}>
                      <View style={styles.metricInfo}>
                        <Text style={styles.metricLabel}>Temperatura</Text>
                        <Text style={styles.metricValue}>
                          {metrics.temperature ? `${metrics.temperature}°C` : '--'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.metricRow}>
                      <View style={styles.metricInfo}>
                        <Text style={styles.metricLabel}>Iluminación</Text>
                        <Text style={styles.metricValue}>
                          {metrics.lighting ? `${metrics.lighting}%` : '--'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.metricRow}>
                      <View style={styles.metricInfo}>
                        <Text style={styles.metricLabel}>PH</Text>
                        <Text style={styles.metricValue}>{metrics.ph || '--'}</Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.metricsGrid}>
                    <View style={styles.metricCard}>
                      <View style={styles.metricHeader}>
                        <Thermometer color="#94a3b8" size={20} />
                        <Text style={styles.metricLabelMobile}>Temp</Text>
                      </View>
                      <Text style={styles.metricValueMobile}>
                        {metrics.temperature ? `${metrics.temperature}°C` : '--'}
                      </Text>
                      <Text style={styles.metricSub}>Objetivo {targetTemperature}°C</Text>
                    </View>
                    <View style={styles.metricCard}>
                      <View style={styles.metricHeader}>
                        <Sun color="#94a3b8" size={20} />
                        <Text style={styles.metricLabelMobile}>Luz</Text>
                      </View>
                      <Text style={styles.metricValueMobile}>
                        {metrics.lighting ? `${metrics.lighting}%` : '--'}
                      </Text>
                      <Text style={styles.metricSub}>Modo Amanecer</Text>
                    </View>
                    <View style={styles.metricCard}>
                      <View style={styles.metricHeader}>
                        <Droplets color="#94a3b8" size={20} />
                        <Text style={styles.metricLabelMobile}>PH</Text>
                      </View>
                      <Text style={styles.metricValueMobile}>{metrics.ph || '--'}</Text>
                      <Text style={styles.metricSub}>Balanceado</Text>
                    </View>
                  </View>
                )}

                {isDesktop && <View style={styles.timelineLine} />}
              </View>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#000000' },
  safeArea: { flex: 1 },
  scrollContent: { padding: 20, alignItems: 'center', paddingTop: 50 },
  scrollContentDesktop: { alignItems: 'center', paddingTop: 40 },
  topBar: { width: '100%', marginBottom: 40, maxWidth: 1200 },
  topBarDesktop: { marginBottom: 60 },
  logoAndButtons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 20 },
  logoWrapper: { transform: [{ scale: 2 }], marginRight: 0, marginLeft: -40, marginTop: 0, marginBottom: 0 },
  authButtons: { flexDirection: 'row', gap: 10, alignItems: 'center', marginLeft: -50 },

  smallButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  // ─── NUEVO: estilo cuando está logueado ─────────────────
  smallButtonLoggedIn: {
    borderColor: 'rgba(34, 197, 94, 0.4)',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  smallButtonText: { color: '#94a3b8', fontSize: 12, fontWeight: '500' },
  // ─── NUEVO: texto verde cuando está logueado ─────────────
  smallButtonTextLoggedIn: { color: '#22c55e' },

  heroSection: { width: '100%', maxWidth: 500, gap: 40 },
  heroSectionDesktop: { maxWidth: 1200, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 80 },
  heroContent: { alignItems: 'center', flex: 1 },
  heroContentDesktop: { alignItems: 'flex-start', maxWidth: 600 },
  heroPanelWrapper: { width: '100%' },
  heroPanelWrapperDesktop: { flex: 1, maxWidth: 500 },

  title: { fontSize: 35, fontWeight: 'bold', color: '#708294ff', textAlign: 'center', marginBottom: 20 },
  titleDesktop: { fontSize: 48 },
  subtitle: { fontSize: 16, color: '#94a3b8', textAlign: 'center', marginBottom: 30, lineHeight: 24 },
  alignLeft: { textAlign: 'left', alignSelf: 'flex-start' },

  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, marginBottom: 40, justifyContent: 'center' },
  primaryButton: { backgroundColor: '#26335273', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.3)' },
  primaryButtonText: { color: '#79849dff', fontWeight: '700', fontSize: 14 },
  ghostButton: { backgroundColor: 'transparent', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.3)' },
  ghostButtonText: { color: '#e2e8f0', fontWeight: '600', fontSize: 14 },

  controlsRow: { flexDirection: 'row', gap: 20, justifyContent: 'center', width: '100%' },
  controlWrapper: {},
  lightControlDesktop: { justifyContent: 'center', gap: 15 },
  lightControlMobile: { backgroundColor: '#0f172a', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.1)', alignItems: 'center', justifyContent: 'space-between', minWidth: 90 },
  controlLabel: { color: '#94a3b8', marginBottom: 10, fontSize: 14, fontWeight: '600' },
  mobileLightBtnContainer: { gap: 10, width: '100%', alignItems: 'center' },
  lightButtons: {},
  lightBtn: { backgroundColor: 'rgba(255, 255, 255, 0.1)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, minWidth: 60, alignItems: 'center' },
  mobileLightBtnWidth: { width: '100%', minWidth: 70 },
  lightBtnOff: { opacity: 0.5 },
  lightBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

  panel: { backgroundColor: 'rgba(15, 23, 42, 0.4)', borderRadius: 24, padding: 17, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.2)' },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  panelTitle: { color: '#e2e8f0', fontSize: 18, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusOk: { backgroundColor: 'rgba(34, 197, 94, 0.2)' },
  statusError: { backgroundColor: 'rgba(26, 196, 145, 0.2)' },
  statusText: { color: '#57ff94ff', fontSize: 14, fontWeight: 'bold' },

  metricsList: { gap: 15 },
  metricRow: { backgroundColor: 'rgba(4, 12, 28, 0.6)', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: 'rgba(30, 41, 59, 0.5)', alignItems: 'center' },
  metricInfo: { alignItems: 'center', gap: 5 },
  metricLabel: { color: '#f8fafc', fontSize: 16, fontWeight: '600' },
  metricValue: { color: '#cbd5e1', fontSize: 24 },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', marginBottom: 20 },
  metricCard: { backgroundColor: 'rgba(2, 6, 23, 0.6)', borderRadius: 14, padding: 15, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.1)', width: '30%', minWidth: 90 },
  metricHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  metricLabelMobile: { color: '#94a3b8', fontSize: 12 },
  metricValueMobile: { color: '#f8fafc', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  metricSub: { color: '#64748b', fontSize: 10 },

  timelineLine: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)', marginTop: 30, width: '120%', marginLeft: '-10%', shadowColor: '#fff', shadowOpacity: 0.5, shadowRadius: 10, elevation: 5 },
  
  // ─── Estilos de la Extensión de Opciones ─────────────────
  smallButtonActive: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  optionsExtension: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  extensionTitle: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  extensionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  extensionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: 180,
  },
  extensionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  extensionText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
});