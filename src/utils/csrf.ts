import type { Context } from "hono";
import { deleteCookie, getCookie } from "hono/cookie";

// Function to generate state for CSRF protection
export async function generateState(): Promise<string> {
	const buffer = new Uint8Array(48);
	crypto.getRandomValues(buffer);
	const state = Array.from(buffer)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	const timestamp = Date.now().toString(16);
	return state + timestamp;
}

// Validate the CSRF token
export function validateState(c: Context, state: string): boolean {
	const savedState = getCookie(c, "oauth_state");
	deleteCookie(c, "oauth_state");
	return savedState === state;
}
