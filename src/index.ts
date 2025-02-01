import { Hono, type Context } from "hono";
import { sign, verify } from "hono/jwt";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { generateState, validateState } from "./utils/csrf";
import { verifyGoogleIdToken } from "./utils/token";
import { fetchWithTimeout } from "./utils/fetch";

type Bindings = {
	DISCORD_CLIENT_ID: string;
	DISCORD_CLIENT_SECRET: string;
	GOOGLE_CLIENT_ID: string;
	GOOGLE_CLIENT_SECRET: string;
	DISCORD_GUILD_ID: string;
	DISCORD_ROLE_ID: string;
	CALLBACK_URL: string;
	DISCORD_API_BASE: string;
	DISCORD_BOT_TOKEN: string;
	DISCORD_NOTIFICATION_WEBHOOK?: string;
	JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", async (c: Context) => {
	const state = await generateState();
	setCookie(c, "oauth_state", state, {
		httpOnly: true,
		secure: true,
		sameSite: "Lax",
		maxAge: 600, // 10 minutes
	});

	const url = new URL(`${c.env.DISCORD_API_BASE}/oauth2/authorize`);
	url.searchParams.set("client_id", c.env.DISCORD_CLIENT_ID);
	url.searchParams.set(
		"redirect_uri",
		`${c.env.CALLBACK_URL}/auth/discord/callback`,
	);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("scope", "identify");
	url.searchParams.set("state", state);

	return c.redirect(url.toString());
});

app.get("/auth/discord/callback", async (c: Context) => {
	const code = c.req.query("code");
	const state = c.req.query("state");

	// Check if the state is valid
	if (!state || !validateState(c, state)) {
		return c.json({ error: "Invalid state parameter" }, 400);
	}

	if (!code) {
		return c.json("No code provided");
	}

	try {
		const tokenResponse = await fetch(
			`${c.env.DISCORD_API_BASE}/oauth2/token`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Accept: "application/json",
				},
				body: new URLSearchParams({
					client_id: c.env.DISCORD_CLIENT_ID,
					client_secret: c.env.DISCORD_CLIENT_SECRET,
					grant_type: "authorization_code",
					code,
					redirect_uri: `${c.env.CALLBACK_URL}/auth/discord/callback`,
				}),
			},
		);

		if (!tokenResponse.ok) {
			throw new Error("Failed to get Discord token");
		}

		const token: DiscordTokenResponse = await tokenResponse.json();
		if (!token.access_token) {
			return c.json({ error: "Failed to get access token" }, 400);
		}

		const userResponse = await fetch(`${c.env.DISCORD_API_BASE}/users/@me`, {
			headers: {
				Authorization: `Bearer ${token.access_token}`,
				Accept: "application/json",
			},
		});

		if (!userResponse.ok) {
			throw new Error("Failed to get Discord user");
		}

		const user: User = await userResponse.json();
		const discordUserId = user.id;
		if (!discordUserId) {
			return c.json({ error: "Failed to get user" }, 400);
		}

		// Save discordUserId safely with JWT
		const jwt = await sign({ discordUserId }, c.env.JWT_SECRET);
		setCookie(c, "discord_user", jwt, {
			httpOnly: true,
			secure: true,
			sameSite: "Lax",
			maxAge: 600,
		});

		const redirectUrl = new URL(`${c.env.CALLBACK_URL}/auth/google/callback`);
		const googleState = await generateState();

		setCookie(c, "oauth_state", googleState, {
			httpOnly: true,
			secure: true,
			sameSite: "Lax",
			maxAge: 600,
		});

		const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/auth");
		googleAuthUrl.searchParams.set("client_id", c.env.GOOGLE_CLIENT_ID);
		googleAuthUrl.searchParams.set("redirect_uri", redirectUrl.toString());
		googleAuthUrl.searchParams.set("response_type", "code");
		googleAuthUrl.searchParams.set("scope", "openid email profile");
		googleAuthUrl.searchParams.set("state", googleState);

		return c.redirect(googleAuthUrl.toString());
	} catch (error) {
		console.error("Discord authentication error:", error);
		return c.json({ error: "Authentication failed" }, 500);
	}
});

app.get("/auth/google/callback", async (c: Context) => {
	const code = c.req.query("code");
	const state = c.req.query("state");

	// Check if the state is valid
	if (!state || !validateState(c, state)) {
		return c.json({ error: "Invalid state parameter" }, 400);
	}

	if (!code) {
		return c.json({ error: "No code provided" }, 400);
	}

	// Get discordUserId from JWT
	const discordJwt = getCookie(c, "discord_user");
	if (!discordJwt) {
		return c.json({ error: "Discord authentication required" }, 401);
	}

	try {
		const payload = await verify(discordJwt, c.env.JWT_SECRET);
		const discordUserId = payload.discordUserId;

		const redirectUrl = new URL(`${c.env.CALLBACK_URL}/auth/google/callback`);

		const googleTokenResponse = await fetch(
			"https://oauth2.googleapis.com/token",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Accept: "application/json",
				},
				body: new URLSearchParams({
					client_id: c.env.GOOGLE_CLIENT_ID,
					client_secret: c.env.GOOGLE_CLIENT_SECRET,
					code,
					grant_type: "authorization_code",
					redirect_uri: redirectUrl.toString(),
				}),
			},
		);

		if (!googleTokenResponse.ok) {
			throw new Error("Failed to get Google token");
		}

		const googleTokenData: GoogleTokenResponse =
			await googleTokenResponse.json();
		if (!googleTokenData.id_token) {
			return c.json({ error: "Failed to get Google token" }, 400);
		}

		// Verify the Google ID token
		const verifiedPayload = await verifyGoogleIdToken(
			googleTokenData.id_token,
			c.env.GOOGLE_CLIENT_ID,
		);

		const email = verifiedPayload.email as string;
		if (!email) {
			return c.json({ error: "Failed to get email" }, 400);
		}

		const allowedDomains = ["nnn.ed.jp", "n-jr.jp", "nnn.ac.jp"];
		const emailDomain = email.split("@")[1];
		if (!allowedDomains.includes(emailDomain)) {
			return c.json({ error: "Email domain not allowed" }, 403);
		}

		const userResponse = await fetchWithTimeout(
			`${c.env.DISCORD_API_BASE}/guilds/${c.env.DISCORD_GUILD_ID}/members/${discordUserId}`,
			{
				method: "GET",
				headers: {
					Authorization: `Bot ${c.env.DISCORD_BOT_TOKEN}`,
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				timeout: 5000,
			},
		);

		if (userResponse.status === 404) {
			return c.json({ error: "User not found" }, 404);
		}

		if (!userResponse.ok) {
			throw new Error("Failed to get Discord user");
		}

		// Assign a role
		const roleResponse = await fetch(
			`${c.env.DISCORD_API_BASE}/guilds/${c.env.DISCORD_GUILD_ID}/members/${discordUserId}/roles/${c.env.DISCORD_ROLE_ID}`,
			{
				method: "PUT",
				headers: {
					Authorization: `Bot ${c.env.DISCORD_BOT_TOKEN}`,
					"Content-Type": "application/json",
				},
			},
		);

		if (roleResponse.status !== 204) {
			throw new Error("Failed to assign role");
		}

		// Webhook notification (optional)
		if (c.env.DISCORD_NOTIFICATION_WEBHOOK) {
			await fetch(c.env.DISCORD_NOTIFICATION_WEBHOOK, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					content: `Role assigned to ${email} (${discordUserId})`,
				}),
			}).catch((error) => console.error("Webhook notification failed:", error));
		}

		// Delete session cookies after authentication is complete
		deleteCookie(c, "discord_user");
		deleteCookie(c, "oauth_state");

		return c.json({ message: "Role assigned successfully", email });
	} catch (error) {
		console.error("Google authentication error:", error);
		return c.json({ error: "Authentication failed" }, 500);
	}
});

export default app;
