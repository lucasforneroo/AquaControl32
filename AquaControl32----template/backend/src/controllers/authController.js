import pool from "../config/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { verifyGoogleToken } from "../services/googleService.js";
import logger from "../utils/logger.js";

/**
 * Maneja autenticación con Google
 * Verifica token, crea/encuentra usuario, devuelve JWT
 */
export async function googleAuth(req, res) {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: "Token no proporcionado" });
        }

        // Verificar token con Google
        const { googleId, email, name, picture } = await verifyGoogleToken(token);

        // Buscar usuario existente
        let result = await pool.query(
            "SELECT * FROM users WHERE google_id = $1",
            [googleId]
        );

        let user;

        if (result.rows.length === 0) {
            // Crear nuevo usuario
            const insertResult = await pool.query(
                `INSERT INTO users (google_id, email, name, picture)
         VALUES ($1, $2, $3, $4)
         RETURNING id, google_id, email, name, picture, role, created_at`,
                [googleId, email, name, picture]
            );
            user = insertResult.rows[0];
            logger.info(`✅ Nuevo usuario creado: ${email}`);
        } else {
            user = result.rows[0];
            logger.info(`✅ Usuario existente: ${email}`);
        }

        // Generar JWT propio
        const accessToken = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role || "user",
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" } // Token válido por 7 días
        );

        // Devolver token y datos básicos del usuario
        res.json({
            token: accessToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                picture: user.picture,
                role: user.role,
            },
        });

    } catch (error) {
        logger.error("Error en autenticación:", error);

        if (error.message === "Invalid Google token") {
            return res.status(401).json({ error: "Token de Google inválido" });
        }

        res.status(500).json({ error: "Error en el servidor de autenticación" });
    }
}

/**
 * Registra un nuevo usuario con email y contraseña
 */
export async function register(req, res) {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: "Faltan campos obligatorios" });
        }

        // Verificar si el usuario ya existe
        const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: "El email ya está registrado" });
        }

        // Hashear contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insertar usuario
        const result = await pool.query(
            "INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name, role, created_at",
            [email, hashedPassword, name]
        );

        const user = result.rows[0];

        // Generar JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role || "user" },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(201).json({ token, user });

    } catch (error) {
        logger.error("Error en registro:", error);
        res.status(500).json({ error: "Error al registrar usuario" });
    }
}

/**
 * Inicia sesión con email y contraseña
 */
export async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email y contraseña requeridos" });
        }

        // Buscar usuario
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Credenciales inválidas" });
        }

        const user = result.rows[0];

        // Verificar si es un usuario de Google sin contraseña (opcional, pero buena práctica)
        if (!user.password) {
            return res.status(400).json({ error: "Esta cuenta usa Google Login. Por favor, usa Google para entrar." });
        }

        // Verificar contraseña
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Credenciales inválidas" });
        }

        // Generar JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role || "user" },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                picture: user.picture,
                role: user.role
            }
        });

    } catch (error) {
        logger.error("Error en login:", error);
        res.status(500).json({ error: "Error al iniciar sesión" });
    }
}

/**
 * Obtiene el perfil del usuario autenticado
 */
export async function getProfile(req, res) {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT id, email, name, picture, role, created_at 
       FROM users 
       WHERE id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        res.json(result.rows[0]);

    } catch (error) {
        logger.error("Error obteniendo perfil:", error);
        res.status(500).json({ error: "Error obteniendo perfil de usuario" });
    }
}

/**
 * Actualiza el Push Token del usuario para notificaciones
 */
export async function updatePushToken(req, res) {
    try {
        const userId = req.user.id;
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: "Token no proporcionado" });
        }

        await pool.query(
            "UPDATE users SET push_token = $1 WHERE id = $2",
            [token, userId]
        );

        logger.info(`[Push] Token actualizado para usuario ${userId}`);
        res.json({ success: true, message: "Token actualizado correctamente" });

    } catch (error) {
        logger.error("[Push] Error actualizando token:", error);
        res.status(500).json({ error: "Error al actualizar token de notificaciones" });
    }
}