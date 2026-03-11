import pool from "../config/db.js";
import jwt from "jsonwebtoken";
import { verifyGoogleToken } from "../services/googleService.js";

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
            console.log(`✅ Nuevo usuario creado: ${email}`);
        } else {
            user = result.rows[0];
            console.log(`✅ Usuario existente: ${email}`);
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
        console.error("❌ Error en autenticación:", error.message);

        if (error.message === "Invalid Google token") {
            return res.status(401).json({ error: "Token de Google inválido" });
        }

        res.status(500).json({ error: "Error en el servidor de autenticación" });
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
        console.error("❌ Error obteniendo perfil:", error.message);
        res.status(500).json({ error: "Error obteniendo perfil de usuario" });
    }
}