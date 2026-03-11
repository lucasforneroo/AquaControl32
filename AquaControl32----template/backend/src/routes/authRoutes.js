import express from "express";
const router = express.Router();
import { googleAuth, getProfile } from "../controllers/authController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

/**
 * POST /auth/google
 * Autenticación con Google OAuth
 * Body: { token: "google_id_token" }
 */
router.post("/google", googleAuth);

/**
 * GET /auth/profile
 * Obtener perfil del usuario autenticado
 * Requiere: Header Authorization: Bearer <jwt_token>
 */
router.get("/profile", authenticate, getProfile);

/**
 * GET /auth/verify
 * Verificar si el token JWT es válido
 */
router.get("/verify", authenticate, (req, res) => {
    res.json({
        valid: true,
        user: req.user
    });
});

export default router;