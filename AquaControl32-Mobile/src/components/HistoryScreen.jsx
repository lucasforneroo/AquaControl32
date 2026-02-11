import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, Dimensions, Linking, Platform } from 'react-native';
import { ArrowLeft, Instagram, Linkedin, Github, Mail } from 'lucide-react-native';
import AnimatedBackground from './AnimatedBackground';

const { width } = Dimensions.get('window');
const isDesktop = width > 900;

const HistoryScreen = ({ onBack }) => {

    const openLink = (url) => {
        Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
    };

    const socialLinks = [
        { icon: <Instagram color="#E1306C" size={24} />, url: 'https://www.instagram.com/lucasforneroo/', label: 'Instagram' },
        { icon: <Linkedin color="#0077b5" size={24} />, url: 'https://www.linkedin.com/in/lucas-fornero-9b7b3b1b3/', label: 'LinkedIn' },
        { icon: <Github color="#ffffff" size={24} />, url: 'https://github.com/lucasforneroo', label: 'GitHub' },
        { icon: <Mail color="#EA4335" size={24} />, url: 'mailto:lucasfornero@gmail.com', label: 'Email' },
    ];

    return (
        <View style={styles.container}>
            {/* Background is reused if desired, or we can make it static black */}
            <AnimatedBackground />

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <ArrowLeft color="#94a3b8" size={24} />
                        <Text style={styles.backText}>Volver</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <Text style={styles.title}>Nuestra Historia</Text>

                    <View style={styles.card}>
                        <Text style={styles.paragraph}>
                            Soy Lucas Fornero, creador de AquaControl 32 y estudiante de ingenieria en computacion,esta app nacio primero siendo solo un ESP32 de la materia ingenieria 1,luego fue creciendo y se convirtio en lo que es hoy.
                        </Text>
                        <Text style={styles.paragraph}>
                            El proyecto AquaControl 32 nació de la necesidad de mantener un ecosistema acuático estable y saludable sin la constante intervención manual.
                        </Text>
                        <Text style={styles.paragraph}>
                            Comenzamos como un pequeño experimento con un microcontrolador ESP32 y unos pocos sensores. Con el tiempo, fuimos perfeccionando el código y el diseño para crear una solución robusta y accesible.
                        </Text>
                        <Text style={styles.paragraph}>
                            Hoy, AquaControl 32 permite monitorear temperatura, iluminación y pH en tiempo real, brindando tranquilidad a los acuaristas de todo el mundo.
                        </Text>
                    </View>

                    <View style={styles.socialSection}>
                        <Text style={styles.socialTitle}>Contáctame</Text>
                        <View style={styles.socialRow}>
                            {socialLinks.map((link, index) => (
                                <TouchableOpacity key={index} style={styles.socialButton} onPress={() => openLink(link.url)}>
                                    {link.icon}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>© 2026 AquaControl Team By Lucas Fornero</Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    safeArea: {
        flex: 1,
    },
    header: {
        padding: 20,
        marginTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.2)',
    },
    backText: {
        color: '#94a3b8',
        fontSize: 16,
        fontWeight: '500',
    },
    content: {
        padding: 20,
        alignItems: 'center',
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginBottom: 30,
        textAlign: 'center',
        marginTop: 20,
    },
    card: {
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.2)',
        width: '100%',
        gap: 20,
    },
    paragraph: {
        color: '#cbd5e1',
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'justify',
    },
    socialSection: {
        marginTop: 30,
        width: '100%',
        alignItems: 'center',
        gap: 15,
    },
    socialTitle: {
        color: '#94a3b8',
        fontSize: 18,
        fontWeight: '600',
    },
    socialRow: {
        flexDirection: 'row',
        gap: 20,
    },
    socialButton: {
        padding: 12,
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        borderRadius: 50, // Circle
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    footer: {
        marginTop: 40,
        alignItems: 'center',
        marginBottom: 20,
    },
    footerText: {
        color: '#64748b',
        fontSize: 14,
    }
});

export default HistoryScreen;
