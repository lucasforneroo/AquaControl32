import winston from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize, align } = winston.format;

// Formato personalizado para los logs
const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} [${level}]: ${stack || message}${metaStr}`;
});

// Crear el logger
const logger = winston.createLogger({
    level: 'debug',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        logFormat
    ),
    transports: [
        // Escribir todos los logs con nivel 'error' y menor en error.log
        new winston.transports.File({ 
            filename: path.join('logs', 'error.log'), 
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Escribir todos los logs en combined.log
        new winston.transports.File({ 
            filename: path.join('logs', 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
    ],
});

// Mostrar también en consola con colores para mejor visisbilidad en Docker
logger.add(new winston.transports.Console({
    format: combine(
        colorize({ all: true }),
        timestamp({ format: 'HH:mm:ss' }),
        align(),
        logFormat
    ),
}));

export default logger;
