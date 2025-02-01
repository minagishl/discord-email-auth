import { Hono } from "hono";
import { decode } from "hono/jwt";

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
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", async (c) => {
	const url = new URL(`${c.env.DISCORD_API_BASE}/oauth2/authorize`);
	url.searchParams.set("client_id", c.env.DISCORD_CLIENT_ID);
	url.searchParams.set(
		"redirect_uri",
		`${c.env.CALLBACK_URL}/auth/discord/callback`,
	);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("scope", "identify");

	return c.redirect(url.toString());
});

app.get("/auth/discord/callback", async (c) => {
	const code = c.req.query("code");
	if (!code) {
		return c.json("No code provided");
	}

	const tokenResponse = await fetch(`${c.env.DISCORD_API_BASE}/oauth2/token`, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: c.env.DISCORD_CLIENT_ID,
			client_secret: c.env.DISCORD_CLIENT_SECRET,
			grant_type: "authorization_code",
			code,
			redirect_uri: `${c.env.CALLBACK_URL}/auth/discord/callback`,
		}),
	});

	const token: DiscordTokenResponse = await tokenResponse.json();
	if (!token.access_token) {
		return c.json({ error: "Failed to get access token" }, 400);
	}

	const userResponse = await fetch(`${c.env.DISCORD_API_BASE}/users/@me`, {
		headers: { Authorization: `Bearer ${token.access_token}` },
	});

	const user: User = await userResponse.json();
	const discordUserId = user.id;
	if (!discordUserId) {
		return c.json({ error: "Failed to get user" }, 400);
	}

	const redirectUrl = new URL(`${c.env.CALLBACK_URL}/auth/google/callback`);

	// Redirect to Google OAuth
	const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/auth");
	googleAuthUrl.searchParams.set("client_id", c.env.GOOGLE_CLIENT_ID);
	googleAuthUrl.searchParams.set("redirect_uri", redirectUrl.toString());
	googleAuthUrl.searchParams.set("response_type", "code");
	googleAuthUrl.searchParams.set("scope", "openid email profile");
	googleAuthUrl.searchParams.set("state", discordUserId);

	return c.redirect(googleAuthUrl.toString());
});

app.get("/auth/google/callback", async (c) => {
	const code = c.req.query("code");
	const discordUserId = c.req.query("state"); // Discord user id

	if (!code || !discordUserId) return c.json({ error: "Invalid request" }, 400);

	const redirectUrl = new URL(`${c.env.CALLBACK_URL}/auth/google/callback`);

	// Get Google token
	const googleTokenResponse = await fetch(
		"https://oauth2.googleapis.com/token",
		{
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				client_id: c.env.GOOGLE_CLIENT_ID,
				client_secret: c.env.GOOGLE_CLIENT_SECRET,
				code,
				grant_type: "authorization_code",
				redirect_uri: redirectUrl.toString(),
			}),
		},
	);

	const googleTokenData: GoogleTokenResponse = await googleTokenResponse.json();
	if (!googleTokenData.id_token) {
		return c.json({ error: "Failed to get Google token" }, 400);
	}

	// Decode Google ID Token
	const decodedToken = decode(googleTokenData.id_token);
	const email = decodedToken.payload.email as string;

	if (!email) {
		return c.json({ error: "Failed to get email" }, 400);
	}

	// Allowed email domains
	const allowedDomains = ["nnn.ed.jp", "n-jr.jp", "nnn.ac.jp"];

	// Check if the email domain is allowed
	const emailDomain = email.split("@")[1];
	if (!allowedDomains.includes(emailDomain)) {
		return c.json({ error: "Email domain not allowed" }, 403);
	}

	const userResponse = await fetch(
		`${c.env.DISCORD_API_BASE}/guilds/${c.env.DISCORD_GUILD_ID}/members/${discordUserId}`,
		{
			method: "GET",
			headers: {
				Authorization: `Bot ${c.env.DISCORD_BOT_TOKEN}`,
				"Content-Type": "application/json",
			},
		},
	);

	if (userResponse.status === 404) {
		return c.json({ error: "User not found" }, 404);
	}

	// Discord role assignment
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
		return c.json({ error: "Failed to assign role" }, 500);
	}

	// Discord notification
	if (c.env.DISCORD_NOTIFICATION_WEBHOOK !== undefined) {
		const notificationResponse = await fetch(
			c.env.DISCORD_NOTIFICATION_WEBHOOK,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					content: `Role assigned to ${email} (${discordUserId})`,
				}),
			},
		);

		if (notificationResponse.status !== 204) {
			return c.json({ error: "Failed to send notification" }, 500);
		}
	}

	return c.json({ message: "Role assigned successfully", email });
});

export default app;
