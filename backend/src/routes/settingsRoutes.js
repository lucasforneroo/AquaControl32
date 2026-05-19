import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';

const router = express.Router();

// GET /settings - Obtener configuración global
router.get('/', getSettings);

// PUT /settings - Actualizar configuración global
router.put('/', updateSettings);

export default router;
