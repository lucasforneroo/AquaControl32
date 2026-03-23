import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Sun } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Device from 'expo-device';

const LightingControl = ({ status, onToggle, label = "" }) => {
    const isMainLightOn = status === 'on';

    const handlePress = () => {
        if (Device.isDevice) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        onToggle(!isMainLightOn);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity 
                onPress={handlePress}
                activeOpacity={0.7}
                style={[
                    styles.button,
                    isMainLightOn ? styles.buttonOn : styles.buttonOff
                ]}
            >
                <Sun 
                    size={32} 
                    color={isMainLightOn ? "#ffffffff" : "#ffffffff"} 
                    fill={isMainLightOn ? "#fdfeffff" : "transparent"}
                />
            </TouchableOpacity>
            <Text style={styles.statusText}>
                {isMainLightOn ? 'ENCENDIDO' : 'APAGADO'}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
    },
    label: {
        color: '#94a3b8',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    button: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(148, 163, 184, 0.3)',
        // Shadow/Glow effect for ON state
        shadowColor: "#ffffffff",
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 10,
    },
    buttonOn: {
        borderColor: '#6097b0ff',
        backgroundColor: 'rgba(14, 165, 233, 0.15)',
        shadowOpacity: 0.5,
        elevation: 8,
    },
    buttonOff: {
        shadowOpacity: 0,
        elevation: 0,
    },
    statusText: {
        marginTop: 10,
        color: '#64748b',
        fontSize: 12,
        fontWeight: 'bold',
    }
});

export default LightingControl;
