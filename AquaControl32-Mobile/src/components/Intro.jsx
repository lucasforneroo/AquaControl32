import React, { useEffect, useState, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const Intro = ({ onComplete }) => {
    const [phase, setPhase] = useState('flicker');

    // Animated values
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const logoScale = useRef(new Animated.Value(0.8)).current;
    const linesOpacity = useRef(new Animated.Value(0)).current;
    const linesScale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Sequence
        const sequence = async () => {
            // Phase 1: Flicker
            Animated.sequence([
                Animated.timing(logoOpacity, { toValue: 0.2, duration: 100, useNativeDriver: true }),
                Animated.timing(logoOpacity, { toValue: 0, duration: 50, useNativeDriver: true }),
                Animated.timing(logoOpacity, { toValue: 0.5, duration: 100, useNativeDriver: true }),
                Animated.timing(logoOpacity, { toValue: 0.2, duration: 50, useNativeDriver: true }),
                Animated.timing(logoOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            ]).start(() => setPhase('solid'));

            // Wait a bit
            setTimeout(() => {
                setPhase('expand');
                // Phase 2: Expand lines and logo slightly
                Animated.parallel([
                    Animated.timing(linesOpacity, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(linesScale, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.spring(logoScale, {
                        toValue: 1,
                        friction: 5,
                        useNativeDriver: true,
                    }),
                ]).start();

                // Finish
                setTimeout(onComplete, 2000);
            }, 1500);
        };

        sequence();
    }, []);

    return (
        <View style={styles.container}>
            <Animated.View style={[
                styles.logoContainer,
                {
                    opacity: logoOpacity,
                    transform: [{ scale: logoScale }]
                }
            ]}>
                <Image
                    source={require('../../assets/AQ32Logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </Animated.View>

            {/* Tech lines effect */}
            <Animated.View style={[
                styles.linesContainer,
                {
                    opacity: linesOpacity,
                    transform: [{ scale: linesScale }]
                }
            ]}>
                <View style={styles.lineHorizontal} />
                <View style={styles.lineVertical} />
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
    },
    logoContainer: {
        zIndex: 10,
    },
    logo: {
        width: width * 0.6,
        height: 100,
    },
    linesContainer: {
        position: 'absolute',
        width: width * 0.8,
        height: width * 0.8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    lineHorizontal: {
        position: 'absolute',
        width: '100%',
        height: 1,
        backgroundColor: '#38bdf8',
        shadowColor: '#38bdf8',
        shadowOpacity: 1,
        shadowRadius: 10,
    },
    lineVertical: {
        position: 'absolute',
        height: '100%',
        width: 1,
        backgroundColor: '#38bdf8',
        shadowColor: '#38bdf8',
        shadowOpacity: 1,
        shadowRadius: 10,
    },
});

export default Intro;
