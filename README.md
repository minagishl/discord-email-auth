# Discord Email Auth

A serverless application built with Cloudflare Workers and Hono that automates Discord role assignment based on email verification.

## Features

- **Discord Integration**: User authentication via Discord OAuth2
- **Email Verification**: Email verification through Google OAuth2
- **Role Assignment**: Automatic Discord role assignment
- **Serverless**: Built on Cloudflare Workers
- **TypeScript**: Type-safe development
- **Hono**: Lightweight framework for serverless environments

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Yarn](https://yarnpkg.com/) package manager
- [Cloudflare account](https://dash.cloudflare.com/sign-up) for deploying Workers
- [Discord Developer account](https://discord.com/developers/applications) for OAuth2 and bot setup
- [Google Cloud Console account](https://console.cloud.google.com/) for OAuth2 setup

## Setup Guide

### 1. Discord Configuration

1. Create a new application in the [Discord Developer Portal](https://discord.com/developers/applications)
2. Go to the "OAuth2" section and note down:
   - Client ID
   - Client Secret
3. Add redirect URI: `http://localhost:8787/auth/discord/callback` (for development)
4. Create a bot in the "Bot" section and note down the bot token
5. Enable the following bot permissions:
   - Manage Roles
   - View Channels
6. Invite the bot to your server using the OAuth2 URL with the required permissions

### 2. Google OAuth2 Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Google OAuth2 API
4. Configure the OAuth consent screen
5. Create OAuth2 credentials (Client ID and Client Secret)
6. Add authorized redirect URI: `http://localhost:8787/auth/google/callback` (for development)

### 3. Project Setup

1. Clone the repository:

   ```sh
   git clone https://github.com/minagishl/discord-email-auth.git
   cd discord-email-auth
   ```

2. Install dependencies:

   ```sh
   yarn install
   ```

3. Create environment variables file:

   ```sh
   cp .vars.example .dev.vars
   ```

4. Configure the environment variables in `.dev.vars` (see the `.vars.example` file for all required variables)

### 4. Local Development

1. Start the development server:

   ```sh
   yarn dev
   ```

2. The server will be available at `http://localhost:8787`

### 5. Deployment

1. Install Wrangler CLI globally (if not already installed):

   ```sh
   npm install -g wrangler
   ```

2. Login to Cloudflare:

   ```sh
   wrangler login
   ```

3. Configure your production environment variables in Cloudflare:

   ```sh
   wrangler secret put DISCORD_CLIENT_ID
   wrangler secret put DISCORD_CLIENT_SECRET
   # ... repeat for all environment variables
   ```

4. Deploy to Cloudflare Workers:

   ```sh
   yarn deploy
   ```

## Project Structure

```
├── src/
│   ├── index.ts     # Application entry point
│   ├── types/       # TypeScript type definitions
│   └── utils/       # Utility functions
├── docs/            # Documentation
├── .dev.vars        # Development environment variables
├── wrangler.json    # Cloudflare Workers configuration
└── package.json     # Project dependencies and scripts
```

## Available Scripts

- `yarn dev`: Start the development server
- `yarn format`: Check code formatting
- `yarn deploy`: Deploy to Cloudflare Workers with minification

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
