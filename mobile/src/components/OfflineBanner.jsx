import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { WifiOff } from 'lucide-react-native';

const OfflineBanner = ({ isVisible }) => {
    const translateY = React.useRef(new Animated.Value(-100)).current;

    useEffect(() => {
        Animated.spring(translateY, {
            toValue: isVisible ? 0 : -100,
            useNativeDriver: true,
            bounciness: 8,
        }).start();
    }, [isVisible]);

    return (
        <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
            <View style={styles.content}>
                <WifiOff size={16} color="#fff" />
                <Text style={styles.text}>Sin conexión - Usando caché local</Text>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 40,
        left: 0,
        right: 0,
        zIndex: 1000,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    content: {
        backgroundColor: 'rgba(239, 68, 68, 0.9)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        gap: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    text: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    }
});

export default OfflineBanner;
