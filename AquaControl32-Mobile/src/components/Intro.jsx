import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withTiming, 
    withSpring, 
    withSequence, 
    withDelay,
    runOnJS 
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

const Intro = ({ onComplete }) => {
    // Shared Values for Logo
    const logoScale = useSharedValue(0.5);
    const logoOpacity = useSharedValue(0);
    
    // Shared Values for Shockwaves
    const pulse1Scale = useSharedValue(1);
    const pulse1Opacity = useSharedValue(0);
    const pulse2Scale = useSharedValue(1);
    const pulse2Opacity = useSharedValue(0);

    useEffect(() => {
        // Logo Animation
        logoOpacity.value = withTiming(1, { duration: 800 });
        logoScale.value = withSpring(1.0, { damping: 12, stiffness: 90 });

        // Pulse 1 Trigger (with slight delay)
        pulse1Scale.value = withDelay(600, withTiming(4, { duration: 1500 }));
        pulse1Opacity.value = withDelay(600, withSequence(
            withTiming(0.4, { duration: 200 }),
            withTiming(0, { duration: 1300 })
        ));

        // Pulse 2 Trigger (extra delay)
        pulse2Scale.value = withDelay(900, withTiming(4, { duration: 1500 }));
        pulse2Opacity.value = withDelay(900, withSequence(
            withTiming(0.4, { duration: 200 }),
            withTiming(0, { duration: 1300 })
        ));

        // Finish sequence
        const timeout = setTimeout(() => {
            if (onComplete) onComplete();
        }, 3200);

        return () => clearTimeout(timeout);
    }, []);

    const logoStyle = useAnimatedStyle(() => ({
        opacity: logoOpacity.value,
        transform: [{ scale: logoScale.value }]
    }));

    const pulse1Style = useAnimatedStyle(() => ({
        opacity: pulse1Opacity.value,
        transform: [{ scale: pulse1Scale.value }]
    }));

    const pulse2Style = useAnimatedStyle(() => ({
        opacity: pulse2Opacity.value,
        transform: [{ scale: pulse2Scale.value }]
    }));

    return (
        <View style={styles.container}>
            {/* Background Pulses */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <AnimatedCircle 
                    cx={width / 2} 
                    cy={height / 2} 
                    r="100" 
                    stroke="#38bdf8" 
                    strokeWidth="3" 
                    fill="none" 
                    animatedStyle={pulse1Style}
                />
                <AnimatedCircle 
                    cx={width / 2} 
                    cy={height / 2} 
                    r="120" 
                    stroke="#0ea5e9" 
                    strokeWidth="2" 
                    fill="none" 
                    animatedStyle={pulse2Style}
                />
            </View>

            {/* Logo */}
            <Animated.View style={[styles.logoContainer, logoStyle]}>
                <Image
                    source={require('../../assets/AQ32Logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </Animated.View>
        </View>
    );
};

// Helper component for animated SVG elements in Reanimated 3
const AnimatedCircle = ({ animatedStyle, ...props }) => {
    return (
        <Animated.View style={[StyleSheet.absoluteFill, animatedStyle, { alignItems: 'center', justifyContent: 'center' }]}>
            <Svg height="100%" width="100%">
                <Circle {...props} />
            </Svg>
        </Animated.View>
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
    svgContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoContainer: {
        zIndex: 10,
    },
    logo: {
        width: width * 0.7,
        height: 120,
    }
});

export default Intro;
