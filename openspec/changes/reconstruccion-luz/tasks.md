# Tasks: reconstruccion-luz

## Phase 1: Foundation / Data Model
- [x] 1.1 Create migration to drop old `mode` columns related to light (Auto, Manual, Programmed).
- [x] 1.2 Create migration to add boolean `light_override_schedule_enabled` to configuration table.
- [x] 1.3 Create migration to add time fields `light_schedule_start` and `light_schedule_end` to configuration table.
- [x] 1.4 Create migration to add boolean `light_override_intensity_enabled` to configuration table.
- [x] 1.5 Create migration to add integer field `light_intensity_value` (0-100) to configuration table.
- [x] 1.6 Update backend configuration models/schemas to include the new fields.

## Phase 2: Backend Implementation (Node-cron & MQTT)
- [x] 2.1 Update settings HTTP endpoints (GET/POST/PUT) to handle the new override fields.
- [x] 2.2 Install `node-cron` dependency in the backend project.
- [x] 2.3 Create cronjob script and configure it to run `* * * * *` (every minute).
- [x] 2.4 Implement logic in the cronjob to query the database for all configurations.
- [x] 2.5 Implement evaluation logic: If `light_override_schedule_enabled` is true, check if current server time is within `light_schedule_start` and `light_schedule_end`.
- [x] 2.6 Implement evaluation logic: Decide `light_on` (boolean) and extract `intensity` from `light_intensity_value` if `light_override_intensity_enabled` is true.
- [x] 2.7 Construct MQTT payload (`{"light_on": true, "intensity": 80}`) and publish to the ESP32 device topic.
- [x] 2.8 Add connection failure and retry policies to the MQTT publishing logic.

## Phase 3: Firmware Implementation (ESP32)
- [x] 3.1 Include `ArduinoJson` library in the firmware project.
- [x] 3.2 Refactor MQTT callback in `src/mqtt.cpp` to use `StaticJsonDocument<256> doc`.
- [x] 3.3 Add `deserializeJson(doc, payload)` in the callback and remove old manual string parsing.
- [x] 3.4 Add condition `doc.containsKey("light_on")` before updating the global `light_on` state.
- [x] 3.5 Add condition `doc.containsKey("intensity")` before updating the global `intensity` state.
- [x] 3.6 Refactor `src/light.cpp` to map `intensity` (0-100) to `mapped_intensity` (0-255).
- [x] 3.7 Implement Darlington inversion in `src/light.cpp`: `uint8_t final_pwm = 255 - mapped_intensity;`.
- [x] 3.8 Update `ledcWrite(LIGHT_PWM_CHANNEL, final_pwm);` calls with the inverted value.

## Phase 4: Frontend Implementation (React Native)
- [x] 4.1 Remove old Mode Selectors (Auto/Manual/Programmed) from the lighting configuration screen.
- [x] 4.2 Add Toggle switch component for `light_override_schedule_enabled`.
- [x] 4.3 Add conditional rendering to show `light_schedule_start` and `light_schedule_end` time pickers when schedule override is ON.
- [x] 4.4 Add Toggle switch component for `light_override_intensity_enabled`.
- [x] 4.5 Add conditional rendering to show Slider (0-100%) for `light_intensity_value` when intensity override is ON.
- [x] 4.6 Update API service calls to send the new payload structure on save.

## Phase 5: Testing
- [ ] 5.1 Test: Verify database migrations apply and rollback correctly.
- [ ] 5.2 Test: Verify backend cronjob triggers every minute and calculates time range correctly.
- [ ] 5.3 Test: Send MQTT payload with missing fields to ESP32 and verify it doesn't overwrite existing state.
- [ ] 5.4 Test: Measure voltage at Darlington output to ensure `intensity: 100` yields 0 PWM (max voltage) and `intensity: 0` yields 255 PWM (0V).
- [ ] 5.5 Test: Verify React Native UI correctly hides/shows schedule and intensity inputs based on toggles.
