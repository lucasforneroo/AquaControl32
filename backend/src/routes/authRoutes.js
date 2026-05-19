import express from "express";
const router = express.Router();
import { 
    googleAuth, 
    register, 
    login, 
    getProfile, 
    updatePushToken 
} from "../controllers/authController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validationMiddleware.js";
import { googleAuthSchema, pushTokenSchema } from "../utils/schemas.js";

/**
 * POST /auth/google
 * Autenticación con Google OAuth
 * Body: { token: "google_id_token" }
 */
router.post("/google", validate(googleAuthSchema), googleAuth);

/**
 * POST /auth/register
 * Registro con email y contraseña
 */
router.post("/register", register);

/**
 * POST /auth/login
 * Login con email y contraseña
 */
router.post("/login", login);

/**
 * POST /auth/push-token
 * Guardar el Push Token de Expo para el usuario
 * Body: { token: "ExponentPushToken[...]" }
 */
router.post("/push-token", authenticate, validate(pushTokenSchema), updatePushToken);

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