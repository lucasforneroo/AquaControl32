import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Verifica y decodifica el ID token de Google
 * @param {string} idToken - Token de Google recibido del frontend
 * @returns {Promise<Object>} Payload con datos del usuario
 */
export async function verifyGoogleToken(idToken) {
    try {
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        return {
            googleId: payload.sub,
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
        };
    } catch (error) {
        console.error("Error verifying Google token:", error.message);
        throw new Error("Invalid Google token");
    }
}