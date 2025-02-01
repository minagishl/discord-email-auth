# Guide

## Introduction

This guide explains how to set up and use the **Discord Email Auth** application. This application assigns Discord roles to users based on their verified email domains. It is built using **Cloudflare Workers** and **Hono**.

## Prerequisites

Before installing and running the application, ensure that you have the following dependencies installed on your system:

- **Node.js** (latest LTS version recommended)
- **Yarn** (latest version)
- **Cloudflare Account** (for deploying the application)

## Installation

### 1. Clone the repository

```sh
git clone https://github.com/minagishl/discord-email-auth.git
cd discord-email-auth
```

### 2. Install dependencies

```sh
yarn install
```

### 3. Configure environment variables

Copy the example environment file and fill in the required credentials.

```sh
cp .vars.example .dev.vars
```

Edit `.dev.vars` with the correct values for:

- `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, and `DISCORD_ROLE_ID`
- `JWT_SECRET`

### 4. Generate `JWT_SECRET`

To generate a secure `JWT_SECRET`, you can use OpenSSL:

```sh
openssl rand -hex 32
```

Alternatively, on Linux/macOS, you can use:

```sh
head -c 32 /dev/urandom | xxd -p
```

Copy the output and use it as the value for `JWT_SECRET` in `.dev.vars`.

## Running the Application

### 1. Start the development server

Run the following command to start a local development server:

```sh
yarn dev
```

### 2. OAuth Flow

The authentication process involves two main steps:

1. Users log in with their **Discord account**.
2. Users verify their **Google email address**.

Only users with allowed email domains (e.g., `nnn.ed.jp`, `n-jr.jp`, `nnn.ac.jp`) will be assigned the designated Discord role.

## Deployment

Once configured and tested locally, you can deploy the application using:

```sh
yarn deploy
```

This will deploy the application to **Cloudflare Workers**.

## Available Commands

| Command       | Description                                   |
| ------------- | --------------------------------------------- |
| `yarn dev`    | Starts the local development server           |
| `yarn format` | Formats the code using **Prettier**           |
| `yarn deploy` | Deploys the application to Cloudflare Workers |

## License

This project is licensed under the **MIT License**. See the [LICENSE](../LICENSE) file for details.
