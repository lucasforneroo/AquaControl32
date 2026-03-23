import React, { useEffect } from 'react';
import { View, StyleSheet, Animated, useWindowDimensions } from 'react-native';

const SkeletonLoader = () => {
    const { width } = useWindowDimensions();
    const isDesktop = width > 900;
    const opacity = new Animated.Value(0.3);

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const AnimatedStyle = { opacity };

    return (
        <View style={styles.container}>
            {/* Top Bar Skeleton */}
            <View style={styles.topBar}>
                <Animated.View style={[styles.logo, AnimatedStyle]} />
                <View style={styles.topButtons}>
                    <Animated.View style={[styles.smallBtn, AnimatedStyle]} />
                    <Animated.View style={[styles.smallBtn, AnimatedStyle]} />
                    <Animated.View style={[styles.smallBtn, AnimatedStyle]} />
                </View>
            </View>

            <View style={[styles.content, isDesktop && styles.contentDesktop]}>
                {/* Title and Subtitle */}
                <View style={styles.heroText}>
                    <Animated.View style={[styles.title, AnimatedStyle]} />
                    <Animated.View style={[styles.subtitle, AnimatedStyle]} />
                </View>

                {/* Main Card (Temperature) */}
                <View style={[styles.card, isDesktop && styles.cardDesktop]}>
                    <View style={styles.cardHeader}>
                        <Animated.View style={[styles.badge, AnimatedStyle]} />
                        <Animated.View style={[styles.icon, AnimatedStyle]} />
                    </View>
                    <Animated.View style={[styles.tempValue, AnimatedStyle]} />
                    <View style={styles.controls}>
                        <Animated.View style={[styles.controlBtn, AnimatedStyle]} />
                        <Animated.View style={[styles.controlBtn, AnimatedStyle]} />
                    </View>
                </View>

                {/* Side metrics (Desktop) or bottom (Mobile) */}
                <View style={styles.metricsGrid}>
                    <Animated.View style={[styles.metricCard, AnimatedStyle]} />
                    <Animated.View style={[styles.metricCard, AnimatedStyle]} />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, paddingTop: 60 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
    logo: { width: 120, height: 30, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 },
    topButtons: { flexDirection: 'row', gap: 10 },
    smallBtn: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10 },
    
    content: { flex: 1, alignItems: 'center' },
    contentDesktop: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 40 },
    
    heroText: { width: '100%', alignItems: 'center', marginBottom: 40 },
    title: { width: '70%', height: 40, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, marginBottom: 15 },
    subtitle: { width: '50%', height: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 6 },
    
    card: { width: '100%', maxWidth: 400, height: 350, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 32, padding: 25 },
    cardDesktop: { width: 400 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
    badge: { width: 100, height: 30, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 15 },
    icon: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
    tempValue: { width: '60%', height: 80, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, alignSelf: 'center', marginBottom: 40 },
    controls: { flexDirection: 'row', justifyContent: 'center', gap: 30 },
    controlBtn: { width: 60, height: 60, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 30 },
    
    metricsGrid: { flexDirection: 'row', gap: 20, marginTop: 40, width: '100%', justifyContent: 'center' },
    metricCard: { width: 120, height: 100, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20 }
});

export default SkeletonLoader;
