import { z } from 'zod';

/**
 * Esquema para los mensajes MQTT que envía el ESP32.
 * Ejemplo esperado: { "temps": [{ "id": "...", "temp": 25.5 }] }
 */
export const mqttPayloadSchema = z.object({
    temps: z.array(
        z.object({
            id: z.any().optional(),
            temp: z.any().nullable(),
        }).passthrough()
    ).optional(),
}).passthrough();

/**
 * Esquema para Google Auth.
 */
export const googleAuthSchema = z.object({
    token: z.string().min(1, "El token de Google es requerido"),
});

/**
 * Esquema para registrar el Push Token de Expo.
 */
export const pushTokenSchema = z.object({
    token: z.string().startsWith("ExponentPushToken", "Formato de token de Expo inválido"),
});

/**
 * Esquema para la autenticación (Login/Register).
 */
export const authSchema = z.object({
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

/**
 * Esquema para consulta de métricas históricas.
 */
export const metricsQuerySchema = z.object({
    hours: z.string().transform(v => parseInt(v)).pipe(z.number().min(1).max(168)).optional(),
});
