import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronUp, ChevronDown } from 'lucide-react-native';

const TemperatureControl = ({ temperature, onIncrease, onDecrease }) => {
    return (
        <View style={styles.temperatureControl}>
            <View style={styles.controlButtons}>
                {/* Boton de incremento */}
                <TouchableOpacity
                    style={[styles.controlBtn, styles.controlBtnUp]}
                    onPress={onIncrease}
                    activeOpacity={0.7}
                    accessibilityLabel="Aumentar temperatura"
                >
                    <ChevronUp color="#ffffff" size={24} />
                </TouchableOpacity>

                {/* Boton de decremento */}
                <TouchableOpacity
                    style={[styles.controlBtn, styles.controlBtnDown]}
                    onPress={onDecrease}
                    activeOpacity={0.7}
                    accessibilityLabel="Disminuir temperatura"
                >
                    <ChevronDown color="#ffffff" size={24} />
                </TouchableOpacity>
            </View>

            {/* Display de temperatura */}
            <View style={styles.temperatureDisplay}>
                <Text style={styles.temperatureValue}>{temperature} °C</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    temperatureControl: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.15)',
    },
    controlButtons: {
        flexDirection: 'column',
        gap: 8,
    },
    controlBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    controlBtnUp: {
        backgroundColor: 'rgba(56, 189, 248, 0.2)',
    },
    controlBtnDown: {
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
    },
    temperatureDisplay: {
        paddingHorizontal: 10,
    },
    temperatureValue: {
        color: '#f8fafc',
        fontSize: 24,
        fontWeight: 'bold',
        fontVariant: ['tabular-nums'],
    },
});

export default TemperatureControl;
