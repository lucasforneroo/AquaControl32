import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const AQ32logo = () => {
    return (
        <View style={styles.container}>
            <Image
                source={require('../../assets/AQ32Logo.png')}
                style={styles.logo}
                resizeMode="contain"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        width: 180,
        height: 50,
    },
});

export default AQ32logo;
