import logger from '../utils/logger.js';

/**
 * Middleware para validar el cuerpo de la petición (body), parámetros o query usando Zod.
 * @param {import('zod').ZodSchema} schema - El esquema de Zod a utilizar.
 * @param {'body' | 'query' | 'params'} target - Qué parte de la petición validar.
 */
export const validate = (schema, target = 'body') => (req, res, next) => {
    const dataToValidate = req[target];
    const result = schema.safeParse(dataToValidate);

    if (result.success) {
        req[target] = result.data; // Reemplazar con datos transformados si aplica
        return next();
    }

    const errors = result.error.format();
    logger.warn(`[Validation] Error de validación en ${req.method} ${req.path}:`, { errors, target });

    return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: errors
    });
};
