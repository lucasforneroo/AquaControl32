-- Migration for reconstruccion-luz

ALTER TABLE system_settings DROP COLUMN IF EXISTS light_mode;
ALTER TABLE system_settings DROP COLUMN IF EXISTS light_start_time;
ALTER TABLE system_settings DROP COLUMN IF EXISTS light_end_time;
ALTER TABLE system_settings DROP COLUMN IF EXISTS light_manual_intensity;

ALTER TABLE system_settings ADD COLUMN light_override_schedule_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE system_settings ADD COLUMN light_schedule_start VARCHAR(5) DEFAULT '09:00';
ALTER TABLE system_settings ADD COLUMN light_schedule_end VARCHAR(5) DEFAULT '21:00';
ALTER TABLE system_settings ADD COLUMN light_override_intensity_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE system_settings ADD COLUMN light_intensity_value INTEGER DEFAULT 100;
