import { createRemoteJWKSet, jwtVerify } from "jose";

// JWKS URL
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

// Verify the Google token
export async function verifyGoogleIdToken(token: string, clientId: string) {
	try {
		const JWKS = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

		const { payload } = await jwtVerify(token, JWKS, {
			issuer: ["https://accounts.google.com", "accounts.google.com"],
			audience: clientId,
		});

		return payload;
	} catch (error) {
		console.error("Token verification failed:", error);
		throw new Error("Invalid token");
	}
}
