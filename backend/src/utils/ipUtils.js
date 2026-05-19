import os from "os";

/**
 * Obtiene la dirección IP local (IPv4) de la máquina.
 * Útil para configurar el servidor de forma dinámica sin hardcodear IPs.
 * @returns {string} La dirección IP local o 'localhost' si no se encuentra.
 */
export function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Saltamos direcciones internas (loopback) e IPv6
            if (iface.family === "IPv4" && !iface.internal) {
                return iface.address;
            }
        }
    }
    return "localhost";
}
