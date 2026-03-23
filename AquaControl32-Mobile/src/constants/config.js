export const CONFIG = {
  // Usamos la IP detectada por tu backend (192.168.0.105)
  // ya que mDNS (aquacontrol.local) suele fallar en Android/Expo Go con tunel.
  BACKEND_URL: 'http://192.168.0.105:4000',
  WS_URL: 'ws://192.168.0.105:4000',
  FALLBACK_IP: '192.168.0.105'
};
