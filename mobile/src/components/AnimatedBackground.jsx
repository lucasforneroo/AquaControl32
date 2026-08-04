import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Circle, Rect, Line, Defs, RadialGradient, Stop, LinearGradient, Path } from 'react-native-svg';

const AnimatedBackground = ({ isAlert = false, isDanger = false, isNeutral = false }) => {
    const { width, height } = useWindowDimensions();
    const [tick, setTick] = useState(0);

    // Refs for mutable data
    const particlesRef = useRef([]);
    const laserPointsRef = useRef([]);
    const timeRef = useRef(0);
    const frameIdRef = useRef(null);
    const isInitialized = useRef(false);
    
    // Smooth transition ref (0 to 1, over 2 seconds)
    const transitionRef = useRef(0); 
    const lastTimeRef = useRef(Date.now());

    // Initialize particles and laser points when dimensions are available
    useEffect(() => {
        if (width === 0 || height === 0) return;

        // Minimalist tech particles
        const particleCount = 30;
        const newParticles = [];

        for (let i = 0; i < particleCount; i++) {
            newParticles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 2 + 0.5,
                speedY: Math.random() * 0.15 + 0.05,
                opacity: Math.random() * 0.6 + 0.1,
                type: Math.random() > 0.5 ? 'circle' : 'square'
            });
        }
        particlesRef.current = newParticles;

        // Laser snake line at the BOTTOM
        const laserPoints = [];
        const laserLength = 12; 
        const laserY = height * 0.92; 

        for (let i = 0; i < laserLength; i++) {
            laserPoints.push({
                x: (width / (laserLength - 1)) * i,
                y: laserY,
                offset: i * 0.3
            });
        }
        laserPointsRef.current = laserPoints;
        isInitialized.current = true;

        // Animation Loop - optimized to do less work
        const animate = () => {
            const now = Date.now();
            const delta = (now - lastTimeRef.current) / 1000;
            lastTimeRef.current = now;
            
            timeRef.current += delta;

            // Update particles
            particlesRef.current.forEach(p => {
                p.y -= p.speedY * 60 * delta;
                if (p.y < -10) {
                    p.y = height + 10;
                    p.x = Math.random() * width;
                }
            });

            // SMOOTH TRANSITION
            const target = (isAlert || isDanger) ? 1 : 0;
            if (transitionRef.current < target) {
                transitionRef.current = Math.min(target, transitionRef.current + delta * 0.5);
            } else if (transitionRef.current > target) {
                transitionRef.current = Math.max(target, transitionRef.current - delta * 0.25);
            }

            setTick(t => t + 1);
            frameIdRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
        };
    }, [width, height, isAlert, isDanger]);

    if (!isInitialized.current) return <View style={styles.container} />;

    // Calculate laser path string
    const getLaserPath = () => {
        const points = laserPointsRef.current;
        if (points.length === 0) return '';
        let path = `M ${points[0].x} ${points[0].y + Math.sin(timeRef.current * 2 + points[0].offset) * 8}`;
        for (let i = 1; i < points.length; i++) {
            const y = points[i].y + Math.sin(timeRef.current * 2 + points[i].offset) * 8;
            path += ` L ${points[i].x} ${y}`;
        }
        return path;
    };

    const laserPathD = getLaserPath();

    // COLOR LOGIC
    const t = transitionRef.current;
    const factor = (Math.sin(timeRef.current * 1.5) + 1) / 2;
    
    // 1-second parpadeo (oscillation) for alert: sin(2 * PI * time)
    // We use a fusion factor for the alert mode (oscillation between 0 and 1)
    const alertOscillation = (Math.sin(timeRef.current * Math.PI * 1) + 1) / 2;
    
    const rNorm = isNeutral ? 100 : 0;
    const gNorm = isNeutral ? 100 : Math.round(180 + 40 * factor);
    const bNorm = isNeutral ? 100 : Math.round(255 - 40 * factor);

    // Alert/Danger Color (Solid Red for particles)
    const rAlert = 255;
    const gAlert = isNeutral ? 50 : 0;
    const bAlert = isNeutral ? 50 : 0;

    // Party blending for Alert Mode
    let blendFactor = t;
    if (isAlert && !isDanger) {
        blendFactor = t * alertOscillation;
    }

    const r = Math.round(t > 0 ? (blendFactor * rAlert + (1 - blendFactor) * rNorm) : rNorm);
    const g = Math.round(t > 0 ? (blendFactor * gAlert + (1 - blendFactor) * gNorm) : gNorm);
    const b = Math.round(t > 0 ? (blendFactor * bAlert + (1 - blendFactor) * bNorm) : bNorm);
    
    const dynamicColor = isNeutral && !isDanger && !isAlert ? `rgba(150, 150, 150, ${factor * 0.5 + 0.3})` : `rgb(${r}, ${g}, ${b})`;
    const dynamicLineColor = isNeutral && !isDanger && !isAlert ? `rgba(100, 100, 100, 0.1)` : `rgba(${r}, ${g}, ${b}, 0.12)`;

    // BACKGROUND: Black with extremely subtle hints of deep space colors
    // In neutral mode, use pure black/dark grey
    const bgTop = isNeutral && !isDanger && !isAlert 
        ? `rgb(10, 10, 10)` 
        : `rgb(${Math.round(t * 20)}, ${Math.round(t * 8 + (1 - t) * 14 )}, ${Math.round(t * 8 + (1 - t) * 20)})`;
    const bgBottom = isNeutral && !isDanger && !isAlert 
        ? `rgb(2, 2, 2)` 
        : `rgb(${Math.round(t * 10)}, ${Math.round(t * 4 + (1 - t) * 1)}, ${Math.round(t * 4 + (1 - t) * 5)})`;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
                <Defs>
                    <LinearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={bgTop} />
                        <Stop offset="1" stopColor={bgBottom} />
                    </LinearGradient>
                </Defs>

                {/* Fondo Base - Fijo Negro */}
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#bgGrad)" />
                
                {/* Lines (Constellation) - Increased density back */}
                {particlesRef.current.map((p1, i) => (
                    particlesRef.current.slice(i + 1, i + 11).map((p2, j) => {
                        const dx = p1.x - p2.x;
                        const dy = p1.y - p2.y;
                        const distSq = dx * dx + dy * dy;
                        if (distSq < 6400) { 
                            return (
                                <Line
                                    key={`line-${i}-${i+j}`}
                                    x1={p1.x} y1={p1.y}
                                    x2={p2.x} y2={p2.y}
                                    stroke={dynamicLineColor}
                                    strokeWidth="0.5"
                                />
                            );
                        }
                        return null;
                    })
                ))}

                {/* Particles */}
                {particlesRef.current.map((p, i) => {
                    return p.type === 'circle' ? (
                        <Circle key={i} cx={p.x} cy={p.y} r={p.size} fill={dynamicColor} opacity={p.opacity} />
                    ) : (
                        <Rect key={i} x={p.x} y={p.y} width={p.size} height={p.size} fill={dynamicColor} opacity={p.opacity} />
                    );
                })}
            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
});

export default AnimatedBackground;
