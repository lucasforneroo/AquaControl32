import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, ScrollView, SafeAreaView,
  StatusBar, TouchableOpacity, useWindowDimensions, Alert, Linking, TextInput, ActivityIndicator,
  BackHandler, Platform
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { CONFIG } from './src/constants/config';
import AnimatedBackground from './src/components/AnimatedBackground';
import Intro from './src/components/Intro';
import AQ32logo from './src/components/AQ32logo';
import TemperatureControl from './src/components/TemperatureControl';
import HistoryScreen from './src/components/HistoryScreen';
import MetricsHistoryScreen from './src/components/MetricsHistoryScreen';
import AquariumManagementScreen from './src/components/AquariumManagementScreen';
import LightingManagementScreen from './src/components/LightingManagementScreen';
import SkeletonLoader from './src/components/SkeletonLoader';
import OfflineBanner from './src/components/OfflineBanner';
import LightingControl from './src/components/LightingControl';
import ProvisioningModal from './src/components/ProvisioningModal';
import { Thermometer, Sun, Droplets, Settings, Activity, Settings2, ArrowLeft } from 'lucide-react-native';

import * as Haptics from 'expo-haptics';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Configuración de comportamiento de notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// OBLIGATORIO para que el flujo OAuth cierre correctamente en Expo Go
// WebBrowser.maybeCompleteAuthSession(); 

// ─── Configuración ──────────────────────────────────────────
const GOOGLE_CLIENT_ID = '703002297863-rj0ktbrtk6ua1pgcg871mlaid9qafhkv.apps.googleusercontent.com';
const BACKEND_URL = CONFIG.BACKEND_URL;

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
  const [blink, setBlink] = useState(true);

  // Efecto global para parpadeo rápido
  useEffect(() => {
    const interval = setInterval(() => setBlink(b => !b), 300);
    return () => clearInterval(interval);
  }, []);

  // Animación de latido (corazón)
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 150 }),
        withTiming(1, { duration: 150 }),
        withTiming(1.2, { duration: 150 }),
        withTiming(1, { duration: 550 })
      ),
      -1,
      false
    );
  }, []);

  const animatedHeartbeatStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }]
    };
  });

  const [metrics, setMetrics] = useState({
    temperature: null,
    ph: null,
    light: null, // 'on' o 'off'
    lux: 0,
    updatedAt: null
  });
  const [targetTemperature, setTargetTemperature] = useState(26.0);
  const [connected, setConnected] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [showProvisioning, setShowProvisioning] = useState(false);

  // Trigger para haptics genérico
  const triggerHaptic = (type = 'selection') => {
    if (Device.isDevice) {
      if (type === 'selection') Haptics.selectionAsync();
      else if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else if (type === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      else if (type === 'impact') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // ─── Estado Global de Umbrales Dinámicos ────────────────────
  const [systemSettings, setSystemSettings] = useState({
    min_ideal_temp: 16.0,
    max_ideal_temp: 26.0,
    min_alert_temp: 5.0,
    max_alert_temp: 40.0
  });

  // ─── Obtener configuración global ───────────────────────────
  useEffect(() => {
    fetchSettings();
    // Safety timeout: forzar fin de carga tras 5 segundos si falla la red
    const timer = setTimeout(() => setIsLoadingData(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/settings`);
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      setSystemSettings({
        min_ideal_temp: data.min_ideal_temp ?? 16.0,
        max_ideal_temp: data.max_ideal_temp ?? 26.0,
        min_alert_temp: data.min_alert_temp ?? 5.0,
        max_alert_temp: data.max_alert_temp ?? 40.0,
      });
      setIsOffline(false);
      await AsyncStorage.setItem('cached_settings', JSON.stringify(data));
      setTimeout(() => setIsLoadingData(false), 1500);
    } catch (err) {
      console.error('Error fetching settings on load:', err);
      setIsOffline(true);
      // Intentar cargar de caché
      const cached = await AsyncStorage.getItem('cached_settings');
      if (cached) {
        setSystemSettings(JSON.parse(cached));
        console.log('📦 Settings cargadas desde caché local');
      }
      setIsLoadingData(false);
    }
  };

  // ─── Estado de autenticación ──────────────────────────────
  const [user, setUser] = useState(null);       // datos del usuario logueado
  const [authLoading, setAuthLoading] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' o 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);

  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const isConnecting = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;

    const handleHardwareBackPress = () => {
      if (showProvisioning) {
        setShowProvisioning(false);
        return true;
      }

      if (showAuthModal) {
        setShowAuthModal(false);
        return true;
      }

      if (showIntro) {
        return true;
      }

      if (currentView === 'lighting_management') {
        setCurrentView('settings');
        return true;
      }

      if (currentView !== 'dashboard') {
        setCurrentView('dashboard');
        return true;
      }

      // En el dashboard dejamos que Android cierre o minimice la app normalmente.
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleHardwareBackPress);
    return () => subscription.remove();
  }, [currentView, showAuthModal, showIntro, showProvisioning]);

  // ─── Verificar si hay sesión guardada al iniciar ──────────
  useEffect(() => {
    checkStoredSession();
  }, []);

  // ─── Verificar sesión almacenada ──────────────────────────
  const checkStoredSession = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      const storedToken = await AsyncStorage.getItem('jwt_token');

      console.log('💾 Sesión guardada:', storedUser ? 'Encontrada' : 'No hay');

      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        console.log('✅ Sesión restaurada de AsyncStorage');
        setTimeout(() => registerForPushNotificationsAsync(), 2000);
      }

      // Las métricas en caché YA NO se cargan aquí.
      // Solo se muestran cuando el dispositivo está vinculado o en modo Demo.

    } catch (error) {
      console.error('Error al leer sesión guardada:', error);
    }
  };

  // ─── Registro de Notificaciones Push ──────────────────────
  const registerForPushNotificationsAsync = async () => {
    let token;
    try {
      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          console.warn('❌ Permiso de notificaciones denegado');
          return;
        }

        console.log('⏳ Solicitando Push Token de Expo...');
        
        // El projectId es OBLIGATORIO en SDK 50+ si se usa EAS.
        // Si no tienes uno, Expo Go usa uno genérico, pero es mejor intentar sin él o con el del usuario.
        // Obtenemos el projectId desde el config de Expo de forma dinámica
        const expoConfig = Constants.expoConfig || Constants.manifest2?.extra?.expoConfig;
        const projId = expoConfig?.extra?.eas?.projectId;
        
        if (!projId) {
          console.warn('⚠️ No se encontró projectId. Correr "npx eas project:init" para vincularlo.');
        }

        token = (await Notifications.getExpoPushTokenAsync({
          projectId: projId
        })).data;
        
        console.log('🔔 Push Token obtenido:', token);
      } else {
        console.log('💻 Notificaciones no soportadas en simulador');
      }

      if (token) {
        await sendPushTokenToBackend(token);
      }
    } catch (error) {
      console.error('❌ Error al obtener Push Token:', error);
    }
    return token;
  };

  const sendPushTokenToBackend = async (pushToken) => {
    try {
      const jwtToken = await AsyncStorage.getItem('jwt_token');
      if (!jwtToken) return;

      const res = await fetch(`${BACKEND_URL}/auth/push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ token: pushToken }),
      });

      if (res.ok) {
        console.log('✅ Push Token registrado en el servidor');
      }
    } catch (error) {
      console.error('❌ Error enviando Push Token al backend:', error);
    }
  };

  // ─── Nueva Autenticación Personalizada ──────────────────
  const handleAuthAction = async () => {
    if (!email || !password || (authMode === 'register' && !name)) {
      Alert.alert('Error', 'Por favor completá todos los campos');
      return;
    }

    setAuthLoading(true);
    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const body = authMode === 'login' 
        ? { email, password } 
        : { email, password, name };

      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        triggerHaptic('error');
        throw new Error(data.error || 'Error en la autenticación');
      }

      triggerHaptic('success');
      await AsyncStorage.setItem('jwt_token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      
      setUser(data.user);
      setShowAuthModal(false);
      
      console.log('✅ Auth exitoso:', data.user.email);
      Alert.alert('¡Bienvenido!', `Hola ${data.user.name} 👋`);
      
      registerForPushNotificationsAsync();

    } catch (error) {
      console.error('❌ Error auth:', error.message);
      Alert.alert('Error', error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const sendTokenToBackend = async (idToken) => {
    // Legacy Google
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
      handleLogout();
    } else {
      setShowAuthModal(true);
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
      console.log(`[WS] Intentando conectar a: ${CONFIG.WS_URL}...`);
      ws.current = new WebSocket(CONFIG.WS_URL);

      ws.current.onopen = () => {
        console.log('Connected to backend');
        isConnecting.current = false;
        setConnected(true);
        setIsOffline(false);
      };

      ws.current.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'metrics') {
            // Actualizar métricas
            setMetrics(prev => {
              const newMetrics = { ...prev, ...message.data };
              AsyncStorage.setItem('cached_metrics', JSON.stringify(newMetrics)).catch(() => {});
              return newMetrics;
            });
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
        setIsOffline(true); // Activar banner si se desconecta
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

  const handleToggleLight = (newStatus) => {
    if (!connected || !ws.current) {
        Alert.alert('Error', 'No hay conexión con el servidor');
        return;
    }

    const command = {
        type: 'command',
        payload: { light_on: newStatus }
    };

    ws.current.send(JSON.stringify(command));
    // Optimistic UI update
    setMetrics(prev => ({ ...prev, light: newStatus ? 'on' : 'off' }));
  };

  const handleIncreaseTemp = () => {
    triggerHaptic('impact');
    setTargetTemperature(prev => +(prev + 0.1).toFixed(1));
  };
  const handleDecreaseTemp = () => {
    triggerHaptic('impact');
    setTargetTemperature(prev => +(prev - 0.1).toFixed(1));
  };

  const temp = metrics.temperature;
  // Consideramos neutral si está desconectado, o si la temperatura es null o exactamente 0 (indicativo de falta de lectura real)
  const isNeutral = !connected || temp === null || temp === 0;
  
  const isDanger = !isNeutral && (temp <= systemSettings.min_alert_temp || temp >= systemSettings.max_alert_temp);
  const isAlert = !isNeutral && !isDanger && (temp < systemSettings.min_ideal_temp || temp > systemSettings.max_ideal_temp);
  const isAnyAlert = isDanger || isAlert;

  let statusText = 'Desc.';
  let badgeStyle = styles.statusDisconnected;
  let textStyle = styles.statusTextDisconnected;
  let isDangerMode = false;

  if (isNeutral) {
    statusText = 'Desconectado';
    badgeStyle = styles.statusDisconnected;
    textStyle = styles.statusTextDisconnected;
  } else {
    if (isDanger) {
      statusText = 'PELIGRO';
      badgeStyle = styles.statusDanger;
      textStyle = [styles.statusTextDanger, animatedHeartbeatStyle];
      isDangerMode = true;
    } else if (isAlert) {
      statusText = 'ALERTA';
      badgeStyle = styles.statusAlert;
      textStyle = styles.statusTextAlert;
    } else {
      statusText = 'Estable';
      badgeStyle = styles.statusOk;
      textStyle = styles.statusTextOk;
    }
  }

  // Estilos dinámicos para los contenedores en modo Peligro o Neutral
  const dynamicTopBar = isDangerMode ? styles.topBarDangerBg : (isNeutral ? styles.topBarNeutralBg : styles.topBarBg);
  const dynamicPanelBg = isDangerMode ? styles.panelDangerBg : (isNeutral ? styles.panelNeutralBg : styles.panelBg);
  const dynamicMetricRow = isDangerMode ? styles.metricRowDangerBg : (isNeutral ? styles.metricRowNeutralBg : styles.metricRowBg);
  const dynamicMetricCard = isDangerMode ? styles.metricCardDangerBg : (isNeutral ? styles.metricCardNeutralBg : styles.metricCardBg);

  // 1. Branding Intro (Splash) siempre al iniciar
  if (showIntro) {
    return <Intro onComplete={() => setShowIntro(false)} />;
  }

  // 2. Landing / Auth (solo si no hay sesión ni modo demo)
  if (!user && !isDemoMode) {
    return (
      <View style={styles.mainContainer}>
        <AnimatedBackground isAlert={false} isDanger={false} />
        <View style={styles.landingContent}>
          <AQ32logo />
          <Text style={styles.subtitle}>Supervisión inteligente para tu acuario</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setShowAuthModal(true)}>
              <Text style={styles.primaryButtonText}>Entrar / Registrarse</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostButton} onPress={() => setIsDemoMode(true)}>
              <Text style={styles.ghostButtonText}>Ver Modo Demo</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Re-usar modal de auth existente */}
        {showAuthModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{authMode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}</Text>
              {authMode === 'register' && (
                <TextInput style={styles.input} placeholder="Nombre" value={name} onChangeText={setName} placeholderTextColor="#64748b" />
              )}
              <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#64748b" />
              <TextInput style={styles.input} placeholder="Contraseña" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#64748b" />
              <TouchableOpacity style={styles.authActionButton} onPress={handleAuthAction} disabled={authLoading}>
                <Text style={styles.authActionButtonText}>{authLoading ? 'Cargando...' : (authMode === 'login' ? 'Entrar' : 'Registrarse')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
                <Text style={styles.toggleAuthModeText}>{authMode === 'login' ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Entrá'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowAuthModal(false)} style={styles.closeModal}><Text style={styles.closeModalText}>Cancelar</Text></TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }

  if (currentView === 'history') {
    return (
      <View style={styles.mainContainer}>
        <AnimatedBackground isAlert={isAlert} isDanger={isDanger} isNeutral={isNeutral} />
        <HistoryScreen onBack={() => setCurrentView('dashboard')} />
      </View>
    );
  }

  if (isLoadingData) {
    return (
      <View style={styles.mainContainer}>
        <StatusBar barStyle="light-content" />
        <AnimatedBackground isAlert={false} isDanger={false} />
        <SkeletonLoader />
      </View>
    );
  }

  if (currentView === 'metrics') {
    return (
      <View style={styles.mainContainer}>
        <OfflineBanner isVisible={isOffline} />
        <AnimatedBackground isAlert={isAlert} isDanger={isDanger} isNeutral={isNeutral} />
        <MetricsHistoryScreen 
          settings={systemSettings}
          onBack={() => {
            triggerHaptic('selection');
            setCurrentView('dashboard');
          }} 
        />
      </View>
    );
  }

  if (currentView === 'aquarium_management') {
    return (
      <View style={styles.mainContainer}>
        <AnimatedBackground isAlert={isAlert} isDanger={isDanger} isNeutral={isNeutral} />
        <AquariumManagementScreen 
          onBack={() => {
            triggerHaptic('selection');
            setCurrentView('dashboard');
          }} 
          onSettingsSaved={(newSettings) => setSystemSettings(newSettings)}
        />
      </View>
    );
  }

  if (currentView === 'lighting_management') {
    return (
      <View style={styles.mainContainer}>
        <AnimatedBackground isAlert={isAlert} isDanger={isDanger} isNeutral={isNeutral} />
        <LightingManagementScreen 
          onBack={() => {
            triggerHaptic('selection');
            setCurrentView('settings');
          }}
          currentLux={metrics.lux || 0}
        />
      </View>
    );
  }

  if (currentView === 'settings') {
    return (
      <View style={styles.mainContainer}>
        <AnimatedBackground isAlert={isAlert} isDanger={isDanger} isNeutral={isNeutral} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setCurrentView('dashboard')} style={styles.backButton}>
              <ArrowLeft color="#fff" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Configuración</Text>
          </View>
          
          <ScrollView contentContainerStyle={styles.settingsScroll}>
            {/* Historial Card */}
            <TouchableOpacity 
              style={styles.settingsCard}
              onPress={() => {
                triggerHaptic('selection');
                setCurrentView('metrics');
              }}
            >
              <View style={[styles.settingsIconContainer, { backgroundColor: 'rgba(56, 189, 248, 0.2)' }]}>
                <Activity color="#38bdf8" size={24} />
              </View>
              <View style={styles.settingsTextContainer}>
                <Text style={styles.settingsCardTitle}>Estadísticas Diarias</Text>
              </View>
            </TouchableOpacity>

            {/* Gestión Card */}
            <TouchableOpacity 
              style={styles.settingsCard}
              onPress={() => {
                triggerHaptic('selection');
                setCurrentView('aquarium_management');
              }}
            >
              <View style={[styles.settingsIconContainer, { backgroundColor: 'rgba(168, 85, 247, 0.2)' }]}>
                <Settings2 color="#a855f7" size={24} />
              </View>
              <View style={styles.settingsTextContainer}>
                <Text style={styles.settingsCardTitle}>Gestión del Acuario</Text>
              </View>
            </TouchableOpacity>

            {/* Administracion Lumínica Card */}
            <TouchableOpacity 
              style={styles.settingsCard}
              onPress={() => {
                triggerHaptic('selection');
                setCurrentView('lighting_management');
              }}
            >
              <View style={[styles.settingsIconContainer, { backgroundColor: 'rgba(251, 191, 36, 0.2)' }]}>
                <Sun color="#fbbf24" size={24} />
              </View>
              <View style={styles.settingsTextContainer}>
                <Text style={styles.settingsCardTitle}>Administración Lumínica</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.settingsInfoSection}>
              <Text style={styles.settingsInfoLabel}>Versión del Sistema</Text>
              <Text style={styles.settingsInfoValue}>AquaControl32 v1.3</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />
      <AnimatedBackground isAlert={isAlert} isDanger={isDanger} isNeutral={isNeutral} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.scrollContentDesktop
        ]}>

          {/* Top Bar */}
          <View style={[styles.topBar, isDesktop && styles.topBarDesktop]}>
            <View style={[styles.topBarContainer, dynamicTopBar]}>
              <View style={styles.logoHalf}>
                <AQ32logo />
              </View>

              <View style={styles.buttonsHalf}>
                {/* ─── BOTÓN LOGIN / LOGOUT ─────────────────────────── */}
                <TouchableOpacity
                  style={[
                    styles.smallButton,
                    user && styles.smallButtonLoggedIn   
                  ]}
                  onPress={handleLoginPress}
                  disabled={authLoading}    
                >
                  <Text style={[
                    styles.smallButtonText,
                    user && styles.smallButtonTextLoggedIn
                  ]}>
                    {authLoading ? '...' : (user ? `${user.name?.split(' ')[0]} ✕` : 'Login')}
                  </Text>
                </TouchableOpacity>

                {/* ─── BOTÓN HISTORIA ──────────────────────────────── */}
                <TouchableOpacity
                  style={styles.smallButton}
                  onPress={() => setCurrentView('history')}
                >
                  <Text style={styles.smallButtonText}>Historia</Text>
                </TouchableOpacity>

                {/* ─── BOTÓN OPCIONES ────────────────────────────────── */}
                <TouchableOpacity
                  style={[styles.smallButton, currentView === 'settings' && styles.smallButtonActive]}
                  onPress={() => {
                    triggerHaptic('selection');
                    setCurrentView('settings');
                  }}
                >
                  <Settings color={currentView === 'settings' ? "#38bdf8" : "#94a3b8"} size={16} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ─── EXTENSIÓN DE OPCIONES ───────────────────────────── */}

          {/* Main Hero Section */}
          <View style={[styles.heroSection, isDesktop && styles.heroSectionDesktop]}>

            {/* Left Column */}
            <View style={[styles.heroContent, isDesktop && styles.heroContentDesktop]}>

              <Text style={[styles.title, isDesktop && styles.alignLeft, isDesktop && styles.titleDesktop]}>
                AquaControl 32
              </Text>

              <Text style={[styles.subtitle, isDesktop && styles.alignLeft]}>
                Supervisa tu acuario desde cualquier lugar
              </Text>

              <View style={[styles.actions, isDesktop && styles.alignLeft, isDesktop && { justifyContent: 'flex-start' }]}>
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={() => {
                    triggerHaptic('selection');
                    setShowProvisioning(true);
                  }}
                >
                  <Text style={styles.primaryButtonText}>
                    {isDesktop ? 'Conectar dispositivo' : 'Conectar'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.ghostButton, isDemoMode && styles.ghostButtonActive]}
                  onPress={() => {
                    triggerHaptic('selection');
                    const nextDemoMode = !isDemoMode;
                    setIsDemoMode(nextDemoMode);
                    if (nextDemoMode) {
                      setMetrics({
                        temperature: 24.5,
                        ph: 7.2,
                        light: 'on',
                        updatedAt: new Date().toISOString()
                      });
                    } else {
                      setMetrics({ temperature: null, ph: null, light: null, updatedAt: null });
                    }
                  }}
                >
                  <Text style={styles.ghostButtonText}>
                    {isDemoMode ? 'Salir de Demo' : (isDesktop ? 'Modo Demo' : 'Demo')}
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

                <View style={[styles.controlWrapper, { marginLeft: isDesktop ? 20 : 0 }]}>
                  <LightingControl 
                    status={metrics.light} 
                    onToggle={handleToggleLight} 
                  />
                </View>
              </View>
            </View>

            {/* Right Column: Panel */}
            <View style={[styles.heroPanelWrapper, isDesktop && styles.heroPanelWrapperDesktop]}>
              <View style={[styles.panel, dynamicPanelBg]}>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelTitle}>Estado del acuario</Text>
                  <View style={[styles.statusBadge, connected ? badgeStyle : styles.statusDisconnected]}>
                    <Animated.Text style={[styles.statusText, connected ? textStyle : styles.statusTextDisconnected]}>
                      {connected ? statusText : 'DESCONECTADO'}
                    </Animated.Text>
                  </View>
                </View>

                {isDesktop ? (
                  <View style={styles.metricsList}>
                    <View style={[styles.metricRow, dynamicMetricRow]}>
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
                          {metrics.light === 'on' ? 'ON' : (metrics.light === 'off' ? 'OFF' : '--')}
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
                    <View style={[styles.metricCard, dynamicMetricCard]}>
                      <View style={styles.metricHeader}>
                        <Thermometer color="#94a3b8" size={20} />
                        <Text style={styles.metricLabelMobile}>Temp</Text>
                      </View>
                      <Text style={styles.metricValueMobile}>
                        {metrics.temperature ? `${metrics.temperature}°C` : '--'}
                      </Text>
                      
                    </View>
                    <View style={[styles.metricCard, dynamicMetricCard]}>
                      <View style={styles.metricHeader}>
                        <Sun color="#94a3b8" size={20} />
                        <Text style={styles.metricLabelMobile}>Luz</Text>
                      </View>
                      <Text style={styles.metricValueMobile}>
                        {metrics.light === 'on' ? 'ON' : (metrics.light === 'off' ? 'OFF' : '--')}
                      </Text>
                      
                    </View>
                    <View style={[styles.metricCard, dynamicMetricCard]}>
                      <View style={styles.metricHeader}>
                        <Droplets color="#94a3b8" size={20} />
                        <Text style={styles.metricLabelMobile}>PH</Text>
                      </View>
                      <Text style={styles.metricValueMobile}>{metrics.ph || '--'}</Text>
                      
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

      {/* ─── MODAL DE AUTENTICACION ─────────────────────────────── */}
      {showAuthModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {authMode === 'login' ? 'Bienvenido' : 'Crear Cuenta'}
            </Text>
            
            {authMode === 'register' && (
              <TextInput
                style={styles.input}
                placeholder="Nombre"
                placeholderTextColor="#64748b"
                value={name}
                onChangeText={setName}
              />
            )}
            
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#64748b"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#64748b"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity 
              style={styles.authActionButton}
              onPress={handleAuthAction}
              disabled={authLoading}
            >
              <Text style={styles.authActionButtonText}>
                {authLoading ? 'Cargando...' : (authMode === 'login' ? 'Entrar' : 'Registrarse')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              style={styles.toggleAuthMode}
            >
              <Text style={styles.toggleAuthModeText}>
                {authMode === 'login' ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Entrá'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setShowAuthModal(false)}
              style={styles.closeModal}
            >
              <Text style={styles.closeModalText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <ProvisioningModal 
        visible={showProvisioning} 
        onClose={() => setShowProvisioning(false)} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#000000' },
  landingContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  safeArea: { flex: 1 },
  scrollContent: { padding: 20, alignItems: 'center', paddingTop: 50 },
  scrollContentDesktop: { alignItems: 'center', paddingTop: 40 },
  topBar: { width: '100%', marginBottom: 30, paddingHorizontal: 10 },
  topBarDesktop: { marginBottom: 60 },
  
  // Custom Dynamic Backgrounds
  topBarBg: { backgroundColor: 'rgba(15, 23, 42, 0.4)' },
  topBarDangerBg: { backgroundColor: 'rgba(69, 10, 10, 0.4)' },
  topBarNeutralBg: { backgroundColor: 'rgba(30, 41, 59, 0.2)' },
  
  panelBg: { backgroundColor: 'rgba(15, 23, 42, 0.4)' },
  panelDangerBg: { backgroundColor: 'rgba(69, 10, 10, 0.4)' },
  panelNeutralBg: { backgroundColor: 'rgba(30, 41, 59, 0.2)', borderColor: 'rgba(148, 163, 184, 0.1)' },
  
  metricRowBg: { backgroundColor: 'rgba(4, 12, 28, 0.6)' },
  metricRowDangerBg: { backgroundColor: 'rgba(35, 5, 5, 0.6)' },
  metricRowNeutralBg: { backgroundColor: 'rgba(15, 23, 42, 0.3)', borderColor: 'rgba(148, 163, 184, 0.05)' },

  metricCardBg: { backgroundColor: 'rgba(2, 6, 23, 0.6)' },
  metricCardDangerBg: { backgroundColor: 'rgba(25, 2, 2, 0.6)' },
  metricCardNeutralBg: { backgroundColor: 'rgba(2, 6, 23, 0.3)' },

  topBarContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    width: '100%',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
  },
  logoHalf: { 
    flex: 0.4, 
    alignItems: 'flex-start',
    marginLeft: -65,
    marginTop: 5, 
    transform: [{ scale: 2 }] // Agranda el logo
  },
  buttonsHalf: { flex: 0.6, flexDirection: 'row', justifyContent: 'flex-end', gap: 12, alignItems: 'center' },

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

  panel: { borderRadius: 24, padding: 17, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.2)' },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  panelTitle: { color: '#e2e8f0', fontSize: 18, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusOk: { backgroundColor: 'rgba(34, 197, 94, 0.2)' },
  statusAlert: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
  statusDanger: { backgroundColor: 'rgba(220, 38, 38, 0.3)' },
  statusDisconnected: { backgroundColor: 'rgba(148, 163, 184, 0.2)' },
  
  statusText: { fontSize: 14, fontWeight: 'bold' },
  statusTextOk: { color: '#4ade80' },
  statusTextAlert: { color: '#ef4444' },
  statusTextDanger: { color: '#ff0000', textTransform: 'uppercase' },
  statusTextDisconnected: { color: '#94a3b8' },

  metricsList: { gap: 15 },
  metricRow: { borderRadius: 12, padding: 20, borderWidth: 1, borderColor: 'rgba(30, 41, 59, 0.5)', alignItems: 'center' },
  metricInfo: { alignItems: 'center', gap: 5 },
  metricLabel: { color: '#f8fafc', fontSize: 16, fontWeight: '600' },
  metricValue: { color: '#cbd5e1', fontSize: 24 },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', marginBottom: 20 },
  metricCard: { borderRadius: 14, padding: 15, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.1)', width: '30%', minWidth: 90 },
  metricHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  metricLabelMobile: { color: '#94a3b8', fontSize: 12 },
  metricValueMobile: { color: '#f8fafc', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  metricSub: { color: '#64748b', fontSize: 10 },

  timelineLine: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)', marginTop: 30, width: '120%', marginLeft: '-10%', shadowColor: '#fff', shadowOpacity: 0.5, shadowRadius: 10, elevation: 5 },
  
  // ─── Estilos Auth Modal ─────────────────────────────────
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 30,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 25,
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 12,
    padding: 15,
    color: '#f8fafc',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  authActionButton: {
    width: '100%',
    backgroundColor: '#38bdf8',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  authActionButtonText: {
    color: '#0f172a',
    fontWeight: 'bold',
    fontSize: 16,
  },
  toggleAuthMode: {
    marginTop: 20,
  },
  toggleAuthModeText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  closeModal: {
    marginTop: 15,
  },
  closeModalText: {
    color: '#64748b',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  
  // ─── Estilos de la Pantalla de Configuración ───────────
  backButton: {
    padding: 10,
    marginRight: 10,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 12,
  },
  settingsScroll: {
    padding: 20,
    gap: 15,
  },
  settingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingsTextContainer: {
    flex: 1,
  },
  settingsCardTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  settingsCardSub: {
    color: '#94a3b8',
    fontSize: 13,
  },
  settingsInfoSection: {
    marginTop: 30,
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingsInfoLabel: {
    color: '#64748b',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  settingsInfoValue: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  smallButtonActive: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  primaryButtonActive: {
    backgroundColor: '#059669', // Verde para indicar éxito/link
    borderColor: '#10b981',
  },
  ghostButtonActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderColor: '#38bdf8',
  },
});
