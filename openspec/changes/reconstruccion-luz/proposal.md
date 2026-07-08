# Proposal: reconstruccion-luz

## Intent
Simplificar el control de la luz eliminando los modos rígidos (auto/manual/programado) para depender de una compensación ambiental por defecto. Proveer controles de override (horario e intensidad) en la interfaz administrativa para mayor flexibilidad. Aumentar la robustez del firmware mediante parseo seguro de JSON y corregir la lógica invertida del hardware.

## Scope

### In Scope
- UI/UX: Remover modos rígidos y agregar sección de "checklist" para overrides (horario de encendido y fijar intensidad de luz).
- Backend: Cronjob que evalúe si la opción de horario está activa y envíe comandos MQTT.
- Firmware: Incorporar `ArduinoJson` para el parseo seguro de payloads, previniendo que actualizaciones parciales rompan el estado.
- Firmware: Corregir la lógica invertida del Darlington en `ledcWrite` (0 = encendido máximo, 255 = apagado).

### Out of Scope
- Migración de otros subsistemas del firmware a `ArduinoJson` que no estén relacionados con la recepción de settings/estado.
- Rediseño visual general de la aplicación (solo se ajustarán los controles de iluminación).

## Approach
- **UI/UX:** Actualizar el frontend para mostrar switches/checkboxes para el control de la luz, adaptando las vistas administrativas.
- **Backend:** Añadir una tarea programada (cronjob) que compruebe la base de datos/estado cada minuto, evaluando la franja horaria configurada y disparando los payloads MQTT según corresponda.
- **Firmware:** Refactorizar el callback de suscripción MQTT para usar `StaticJsonDocument` o `DynamicJsonDocument` con `ArduinoJson`. Ajustar la escritura del PWM mapeando los valores inversamente para el Darlington.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `web/` / `mqtt-ui/` | Modified | Componentes de la interfaz para el control de iluminación |
| `backend/` | Modified | Lógica de cronjob y evaluación de horarios |
| `firmware/` | Modified | Manejo de MQTT y control PWM (`ledcWrite`) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Corrupción de memoria en ESP32 por JSON | Low | Usar capacidad de buffer calculada estrictamente para `ArduinoJson` |
| Fallo temporal de conexión MQTT en el cronjob | Medium | Implementar política de retries en el envío de comandos del backend |

## Rollback Plan
- Revertir las ramas de frontend y backend a la versión previa a la reconstrucción.
- Restaurar el firmware flasheando el backup previo (o revirtiendo los cambios en el código de control de luces).

## Success Criteria
- [ ] La luz compensa automáticamente por defecto usando el sensor exterior.
- [ ] Activar override de horario enciende/apaga la luz en la franja seleccionada.
- [ ] Activar override de intensidad fija la luz, ignorando al sensor exterior.
- [ ] El envío de payloads parciales (ej. solo temperatura) no altera la iluminación.
- [ ] El hardware responde correctamente (0 = brillo máximo, 255 = apagado).
