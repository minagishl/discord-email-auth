type User = {
	id: string;
	username: string;
	avatar: string;
	discriminator: string;
	publicFlags: number;
	flags: number;
	banner: string | null;
	accentColor: number;
	globalName: string;
	avatarDecorationData: string | null;
	bannerColor: string | null;
	clan: string | null;
	primaryGuild: string | null;
	mfaEnabled: boolean;
	locale: string;
	premiumType: number;
};
