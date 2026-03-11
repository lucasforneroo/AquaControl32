import jwt from "jsonwebtoken";

/**
 * Middleware para proteger rutas con JWT
 * Verifica que el token sea válido y extrae datos del usuario
 */
export function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: "No se proporcionó token de autorización" });
    }

    // Formato esperado: "Bearer <token>"
    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Formato de token inválido" });
    }

    try {
        // Verificar y decodificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Agregar datos del usuario al request
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
        };

        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ error: "Token expirado" });
        }

        if (error.name === "JsonWebTokenError") {
            return res.status(403).json({ error: "Token inválido" });
        }

        return res.status(403).json({ error: "Error verificando token" });
    }
}

/**
 * Middleware para verificar rol de administrador
 */
export function requireAdmin(req, res, next) {
    if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Acceso denegado: se requiere rol de administrador" });
    }
    next();
}