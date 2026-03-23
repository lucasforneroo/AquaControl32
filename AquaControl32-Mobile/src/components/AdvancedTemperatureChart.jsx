import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

const screenWidth = Dimensions.get('window').width;

const AdvancedTemperatureChart = ({ data, settings }) => {
    if (!data || data.length === 0) return null;

    // Transformar datos para gifted-charts
    const labelInterval = Math.ceil(data.length / 5);

    const lineData = data.map((d, index) => {
        return {
            value: parseFloat(d.temperature),
            label: index % labelInterval === 0 ? new Date(d.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            labelTextStyle: { color: '#64748b', fontSize: 10, width: 60 },
            hideDataPoint: true,
        };
    });

    // Encontrar min/max
    const values = data.map(d => parseFloat(d.temperature));
    const minDataVal = Math.min(...values);
    const maxDataVal = Math.max(...values);
    
    // Umbrales
    const tYellow = parseFloat(settings.max_ideal_temp) || 24;
    const tRed = parseFloat(settings.max_alert_temp) || 26;

    // Eje Y: Garantizar que incluya datos y umbrales
    const absoluteMin = Math.min(minDataVal, tYellow, 15);
    const absoluteMax = Math.max(maxDataVal, tRed, 30);

    const yAxisOffset = Math.floor(absoluteMin - 2);
    const maxValue = Math.ceil(absoluteMax + 5);
    const stepValue = Math.ceil((maxValue - yAxisOffset) / 5);

    return (
        <View style={styles.container}>
            <View style={styles.chartWrapper}>
                <LineChart
                    data={lineData}
                    width={screenWidth - 100} 
                    height={220}
                    initialSpacing={0}
                    spacing={(screenWidth - 100) / (lineData.length > 1 ? lineData.length : 1)}
                    color="rgba(146, 179, 255, 0.6)" 
                    thickness={2.5}
                    
                    // Grid
                    showVerticalLines
                    verticalLinesColor="rgba(148, 163, 184, 0.15)"
                    verticalLinesThickness={1}
                    verticalLinesType="dashed"
                    verticalLinesStrokeDashArray={[5, 5]}
                    
                    rulesType="dashed"
                    rulesColor="rgba(148, 163, 184, 0.15)"
                    dashGap={5}
                    dashWidth={2}
                    
                    yAxisTextStyle={styles.axisText}
                    yAxisThickness={1}
                    yAxisColor="rgba(255,255,255,0.1)"
                    xAxisThickness={1}
                    xAxisColor="rgba(255,255,255,0.1)"
                    yAxisLabelSuffix="°"
                    noOfSections={5}
                    stepValue={stepValue}
                    yAxisOffset={yAxisOffset}
                    
                    // Líneas de Referencia (Legacy props para 1.4.15)
                    showReferenceLine1={true}
                    referenceLine1Position={tYellow}
                    referenceLine1Config={{
                        color: 'rgba(251, 191, 36, 0.5)',
                        dashArray: [5, 5],
                        thickness: 1.5,
                    }}
                    showReferenceLine2={true}
                    referenceLine2Position={tRed}
                    referenceLine2Config={{
                        color: 'rgba(239, 68, 68, 0.5)',
                        dashArray: [5, 5],
                        thickness: 1.5,
                    }}
                    
                    curved
                    isAnimated={false} 
                    areaChart
                    startFillColor="rgba(146, 179, 255, 0.2)"
                    endFillColor="transparent"
                    startOpacity={0.2}
                    endOpacity={0.05}
                    
                    pointerConfig={{
                        pointerStripHeight: 160,
                        pointerStripColor: 'rgba(255,255,255,0.1)',
                        pointerStripWidth: 1,
                        pointerColor: 'rgba(146, 179, 255, 0.8)',
                        radius: 4,
                        pointerLabelComponent: items => {
                            if (!items || items.length === 0) return null;
                            return (
                                <View style={styles.tooltip}>
                                    <Text style={styles.tooltipText}>
                                        {items[0].value}°C
                                    </Text>
                                </View>
                            );
                        },
                    }}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 10,
        backgroundColor: '#000', 
        borderRadius: 24,
        paddingVertical: 30,
        borderWidth: 1,
        borderColor: 'rgba(139, 185, 255, 0.4)', 
        alignItems: 'center',
        overflow: 'hidden',
        width: screenWidth - 55, // Un poco más ancho
    },
    chartWrapper: {
        marginLeft: -15, // Compensa el padding para centrar el gráfico internamente
    },
    axisText: {
        color: '#64748b',
        fontSize: 10,
    },
    tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        padding: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(146, 179, 255, 0.4)',
        bottom: 20,
        left: -15,
    },
    tooltipText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
    }
});

export default AdvancedTemperatureChart;
