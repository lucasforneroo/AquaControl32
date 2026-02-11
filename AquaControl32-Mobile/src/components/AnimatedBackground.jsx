import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Rect, Line, Defs, RadialGradient, Stop, LinearGradient } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

const AnimatedBackground = () => {
    // State to force re-render
    const [tick, setTick] = useState(0);

    // Refs for mutable data to avoid closure staleness and heavy state operations
    const particlesRef = useRef([]);
    const laserPointsRef = useRef([]);
    const timeRef = useRef(0);
    const frameIdRef = useRef(null);

    // Initialize particles and laser points once
    useEffect(() => {
        // Minimalist tech particles
        const particleCount = 80; // Conservative count for SVG performance
        const newParticles = [];

        for (let i = 0; i < particleCount; i++) {
            newParticles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 2 + 1,
                speedY: Math.random() * 0.3 + 0.1,
                opacity: Math.random() * 0.3 + 0.1,
                type: Math.random() > 0.5 ? 'circle' : 'square'
            });
        }
        particlesRef.current = newParticles;

        // Laser snake line
        const laserPoints = [];
        const laserLength = 20; // Fewer points for SVG performance
        const laserY = height * 0.85;

        for (let i = 0; i < laserLength; i++) {
            laserPoints.push({
                x: (width / laserLength) * i,
                y: laserY,
                offset: i * 0.2
            });
        }
        laserPointsRef.current = laserPoints;

        // Animation Loop
        const animate = () => {
            timeRef.current += 0.05;

            // Update particles
            particlesRef.current.forEach(p => {
                p.y -= p.speedY;
                if (p.y < -10) {
                    p.y = height + 10;
                    p.x = Math.random() * width;
                }
            });

            // Trigger re-render
            setTick(prev => prev + 1);

            frameIdRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (frameIdRef.current) {
                cancelAnimationFrame(frameIdRef.current);
            }
        };
    }, []);

    // Generate lines based on current particle positions
    const renderLines = () => {
        const lines = [];
        const particles = particlesRef.current;

        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;

                if (Math.abs(dx) > 80 || Math.abs(dy) > 80) continue;

                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 80) {
                    lines.push(
                        <Line
                            key={`line-${i}-${j}`}
                            x1={particles[i].x}
                            y1={particles[i].y}
                            x2={particles[j].x}
                            y2={particles[j].y}
                            stroke="rgba(0, 168, 255, 0.15)"
                            strokeWidth="0.5"
                        />
                    );
                }
            }
        }
        return lines;
    };

    // Calculate laser path string
    const getLaserPath = () => {
        const points = laserPointsRef.current;
        if (points.length === 0) return '';

        let path = `M ${points[0].x} ${points[0].y + Math.sin(timeRef.current + points[0].offset) * 15}`;

        for (let i = 1; i < points.length; i++) {
            const y = points[i].y + Math.sin(timeRef.current + points[i].offset) * 15;
            path += ` L ${points[i].x} ${y}`;
        }
        return path;
    };

    const laserPathD = getLaserPath();

    return (
        <View style={StyleSheet.absoluteFill}>
            <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
                <Defs>
                    <RadialGradient
                        id="abyssGrad"
                        cx="50%"
                        cy="100%"
                        rx="50%"
                        ry="50%"
                        fx="50%"
                        fy="100%"
                        gradientUnits="userSpaceOnUse"
                    >
                        <Stop offset="0" stopColor="rgba(0, 10, 20, 0.4)" />
                        <Stop offset="1" stopColor="rgba(0, 0, 0, 0)" />
                    </RadialGradient>
                    <LinearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor="#000000" />
                        <Stop offset="1" stopColor="#000a14" />
                    </LinearGradient>
                </Defs>

                {/* Background */}
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#bgGrad)" />
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#abyssGrad)" />

                {/* Particles */}
                {particlesRef.current.map((p, i) => (
                    p.type === 'circle' ? (
                        <Circle
                            key={i}
                            cx={p.x}
                            cy={p.y}
                            r={p.size}
                            fill="#00ffe5ff"
                            opacity={p.opacity}
                        />
                    ) : (
                        <Rect
                            key={i}
                            x={p.x - p.size / 2}
                            y={p.y - p.size / 2}
                            width={p.size}
                            height={p.size}
                            fill="#0088cc"
                            opacity={p.opacity}
                        />
                    )
                ))}

                {/* Lines */}
                {renderLines()}

                {/* Laser Line */}
                {/* Glow */}
                <React.Fragment>
                    {/* SVG doesn't support easy shadowBlur like canvas without filters which are heavy/unsupported on some android versions.
                         Using multiple semi-transparent lines to simulate glow.
                     */}
                    {/* Main Beam */}
                    <DropdownPath d={laserPathD} stroke="#ffffff" strokeWidth="2" />

                    {/* Outer Glow 1 */}
                    <DropdownPath d={laserPathD} stroke="rgba(255,255,255,0.3)" strokeWidth="6" />

                    {/* Outer Glow 2 */}
                    <DropdownPath d={laserPathD} stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
                </React.Fragment>

            </Svg>
        </View>
    );
};

// Helper component to render Path since 'Path' name conflicts or needs import
import { Path } from 'react-native-svg';
const DropdownPath = (props) => <Path {...props} fill="none" strokeLinecap="round" strokeLinejoin="round" />;


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
});

export default AnimatedBackground;
