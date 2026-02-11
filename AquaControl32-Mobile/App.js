import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, StatusBar, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { CONFIG } from './src/constants/config';
import AnimatedBackground from './src/components/AnimatedBackground';
import Intro from './src/components/Intro';
import AQ32logo from './src/components/AQ32logo';
import TemperatureControl from './src/components/TemperatureControl';
import { Thermometer, Sun, Droplets } from 'lucide-react-native';
import HistoryScreen from './src/components/HistoryScreen';

export default function App() {
  const { width } = useWindowDimensions();
  const isDesktop = width > 900;

  const [showIntro, setShowIntro] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'history'
  const [metrics, setMetrics] = useState({
    temperature: 26.4,
    ph: 7.2,
    lighting: 78,
    updatedAt: null
  });
  const [targetTemperature, setTargetTemperature] = useState(26.4);
  const [connected, setConnected] = useState(false);

  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const isConnecting = useRef(false);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      isConnecting.current = true; // prevent reconnect on unmount
      if (ws.current) ws.current.close();
    };
  }, []);

  const connectWebSocket = () => {
    if (isConnecting.current) return;
    isConnecting.current = true;

    try {
      // Close any existing connection first
      if (ws.current) {
        ws.current.onclose = null; // prevent triggering reconnect
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
        // Clear any existing timer before scheduling a new reconnect
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        reconnectTimer.current = setTimeout(connectWebSocket, 5000);
      };

      ws.current.onerror = (e) => {
        console.error('WebSocket error:', e.type || 'connection failed');
      };

    } catch (e) {
      console.error('Connection error:', e);
      isConnecting.current = false;
      // Schedule retry even on exception
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      reconnectTimer.current = setTimeout(connectWebSocket, 5000);
    }
  };

  const handleIncreaseTemp = () => {
    setTargetTemperature(prev => {
      const newTemp = Math.round((prev + 0.5) * 10) / 10;
      return newTemp;
    });
  };

  const handleDecreaseTemp = () => {
    setTargetTemperature(prev => {
      const newTemp = Math.round((prev - 0.5) * 10) / 10;
      return newTemp;
    });
  };

  if (showIntro) {
    return <Intro onComplete={() => setShowIntro(false)} />;
  }

  if (currentView === 'history') {
    return <HistoryScreen onBack={() => setCurrentView('dashboard')} />;
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

          {/* Top Bar (Logo + Buttons) - Revised Layout */}
          <View style={[styles.topBar, isDesktop && styles.topBarDesktop]}>
            <View style={styles.logoAndButtons}>
              <View style={styles.logoWrapper}>
                <AQ32logo />
              </View>
              <View style={styles.authButtons}>
                <TouchableOpacity style={styles.smallButton} onPress={() => console.log('Login pressed')}>
                  <Text style={styles.smallButtonText}>login</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.smallButton}
                  onPress={() => setCurrentView('history')}
                >
                  <Text style={styles.smallButtonText}>Nuestra Historia</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Main Hero Section */}
          <View style={[styles.heroSection, isDesktop && styles.heroSectionDesktop]}>

            {/* Left Column: Content */}
            <View style={[styles.heroContent, isDesktop && styles.heroContentDesktop]}>


              <Text style={[styles.title, isDesktop && styles.alignLeft, isDesktop && styles.titleDesktop]}>AquaControl 32</Text>

              <Text style={[styles.subtitle, isDesktop && styles.alignLeft]}>
                Supervisa y controla tu ambiente desde cualquier lugar
              </Text>

              <View style={[styles.actions, isDesktop && styles.alignLeft, isDesktop && { justifyContent: 'flex-start' }]}>
                <TouchableOpacity style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>{isDesktop ? "Conectar dispositivo" : "Conectar"}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ghostButton}>
                  <Text style={styles.ghostButtonText}>{isDesktop ? "Seleccionar dispositivo" : "Demo"}</Text>
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

                {/* Light Control - Conditional Layout */}
                {isDesktop ? (
                  // Desktop Layout for Light Control (matches web screenshot)
                  <View style={styles.lightControlDesktop}>
                    <View style={styles.lightButtons}>
                      <TouchableOpacity style={styles.lightBtn}><Text style={styles.lightBtnText}>ON</Text></TouchableOpacity>
                    </View>
                    <View style={{ height: 10 }} />
                    <View style={styles.lightButtons}>
                      <TouchableOpacity style={styles.lightBtn}><Text style={styles.lightBtnText}>OFF</Text></TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  // Mobile Layout for Light Control (Original: Label + Stacked buttons in box)
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

                {/* Metrics Section - Conditional Layout */}
                {isDesktop ? (
                  // Desktop: Vertical List of Horizontal Rows
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
                        <Text style={styles.metricValue}>
                          {metrics.ph || '--'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  // Mobile: Grid of Cards (Restored)
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
                      <Text style={styles.metricValueMobile}>
                        {metrics.ph || '--'}
                      </Text>
                      <Text style={styles.metricSub}>Balanceado</Text>
                    </View>
                  </View>
                )}

                {/* Timeline visual (Line) - Desktop only (or adapted) */}
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
  mainContainer: {
    flex: 1,
    backgroundColor: '#000000', // Black background as in screenshot
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
    paddingTop: 50, // Extra padding for top bar on mobile
  },
  scrollContentDesktop: {
    alignItems: 'center', // Center the max-width container
    paddingTop: 40,
  },
  topBar: {
    width: '100%',
    marginBottom: 40,
    maxWidth: 1200,
  },
  topBarDesktop: {
    marginBottom: 60,
  },
  logoAndButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 20,
  },
  logoWrapper: {
    transform: [{ scale: 2 }], // Made logo larger as requested
    marginRight: 0,
    marginLeft: -10,
    marginTop: 0,
    marginBottom: 0,
  },
  authButtons: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginLeft: -50,
  },
  smallButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  smallButtonText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },

  heroSection: {
    width: '100%',
    maxWidth: 500,
    gap: 40,
  },
  heroSectionDesktop: {
    maxWidth: 1200,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // Center vertically
    gap: 80,
  },
  heroContent: {
    alignItems: 'center',
    flex: 1,
  },
  heroContentDesktop: {
    alignItems: 'flex-start',
    maxWidth: 600,
  },
  heroPanelWrapper: {
    width: '100%',
  },
  heroPanelWrapperDesktop: {
    flex: 1,
    maxWidth: 500,
  },

  badgeWrapper: {
    marginBottom: 10,
  },
  badgeWrapperDesktop: {
    alignSelf: 'flex-start',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  badgeText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  title: {
    fontSize: 35,
    fontWeight: 'bold',
    color: '#708294ff',
    textAlign: 'center',
    marginBottom: 20,
  },
  titleDesktop: {
    fontSize: 48,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  alignLeft: {
    textAlign: 'left',
    alignSelf: 'flex-start',
  },

  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginBottom: 40,
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#26335273',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  primaryButtonText: {
    color: '#79849dff',
    fontWeight: '700',
    fontSize: 14,
  },
  ghostButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  ghostButtonText: {
    color: '#e2e8f0',
    fontWeight: '600',
    fontSize: 14,
  },

  controlsRow: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'center',
    width: '100%',
  },
  controlWrapper: {
    // Wrapper for temp control
  },

  /* Light Control Styles */
  lightControlDesktop: {
    justifyContent: 'center',
    gap: 15,
  },
  lightControlMobile: {
    backgroundColor: '#0f172a', // Dark panel bg to match original
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 90,
  },
  controlLabel: {
    color: '#94a3b8',
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '600'
  },
  mobileLightBtnContainer: {
    gap: 10,
    width: '100%',
    alignItems: 'center'
  },
  lightButtons: {
    // individual wrappers for desktop
  },
  lightBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  mobileLightBtnWidth: {
    width: '100%',
    minWidth: 70,
  },
  lightBtnOff: {
    opacity: 0.5,
  },
  lightBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },

  /* Right Panel Styles - Matching Screenshot */
  panel: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)', // Darker, transparent
    borderRadius: 24,
    padding: 17,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  panelTitle: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusOk: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  statusError: {
    backgroundColor: 'rgba(26, 196, 145, 0.2)',
  },
  statusText: {
    color: '#57ff94ff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  /* Desktop Metrics List */
  metricsList: {
    gap: 15,
  },
  metricRow: {
    backgroundColor: 'rgba(4, 12, 28, 0.6)', // Deep blue-black
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(30, 41, 59, 0.5)',
    alignItems: 'center',
  },
  metricInfo: {
    alignItems: 'center',
    gap: 5,
  },
  metricLabel: {
    color: '#f8fafc', // White text for label in screenshot
    fontSize: 16,
    fontWeight: '600',
  },
  metricValue: {
    color: '#cbd5e1',
    fontSize: 24,
  },

  /* Mobile Metrics Grid (Restored) */
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    backgroundColor: 'rgba(2, 6, 23, 0.6)',
    borderRadius: 14,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
    width: '30%', // Approx 3 cards per row with gap
    minWidth: 90,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  metricLabelMobile: {
    color: '#94a3b8',
    fontSize: 12,
  },
  metricValueMobile: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricSub: {
    color: '#64748b',
    fontSize: 10,
  },

  timelineLine: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 30,
    width: '120%', // visual overflow
    marginLeft: '-10%',
    shadowColor: '#fff',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },

  timeline: {
    gap: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.1)',
    paddingBottom: 8,
  },
  timelineItemLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  eventText: {
    color: '#cbd5e1',
    fontSize: 14,
  },

  features: {
    marginTop: 80,
    gap: 20,
    maxWidth: 1200,
    flexDirection: 'column',
    width: '100%',
  },
  featuresDesktop: {
    flexDirection: 'row',
  },
  featureCard: {
    flex: 1,
    padding: 20,
  },
  featureTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  featureText: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 22,
  },
});
