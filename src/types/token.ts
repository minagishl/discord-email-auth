type DiscordTokenResponse = {
	token_type: string;
	access_token: string;
	expires_in: number;
	refresh_token: string;
	scope: string;
};
type GoogleTokenResponse = {
	access_token: string;
	expires_in: number;
	token_type: string;
	scope: string;
	id_token: string;
};
