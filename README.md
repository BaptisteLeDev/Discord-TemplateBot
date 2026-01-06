# TemplateBot

TemplateBot is a robust and scalable Discord bot template built with TypeScript, Discord.js, and Fastify. It features a clean architecture, integrated API server for observability, and easy deployment scripts.

![License](https://img.shields.io/badge/license-ISC-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Discord.js](https://img.shields.io/badge/Discord.js-14.x-5865F2)
![Fastify](https://img.shields.io/badge/Fastify-5.x-000000)

## Features

- **TypeScript Support**: Fully typed codebase for better developer experience and reliability.
- **Clean Architecture**: Modular structure separating commands, events, services, and API logic.
- **Internal API**: Integrated Fastify server with Swagger UI for monitoring and control.
- **Slash Commands**: Easy-to-use handler for registering and executing Discord slash commands.
- **Docker Ready**: Includes scripts for containerization (optional).

## Architecture

The project is organized into the following directory structure:

```
src/
├── api/          # Internal API server (Fastify) and routes
├── commands/     # Discord slash command definitions and handlers
├── services/     # Business logic and external service integrations
├── types/        # Global type definitions
├── utils/        # Shared utility functions
├── client.ts     # Custom Discord Client implementation
├── config.ts     # Configuration loader (dotenv)
├── index.ts      # Application entry point
└── deploy-commands.ts # Script to register slash commands
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- pnpm (recommended) or npm/yarn
- A Discord Bot Token and Application ID

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Discord-Bot
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure Environment:**
   Copy `.example.env` to `.env` and fill in your credentials:
   ```bash
   cp .example.env .env
   ```
   
   **`.env` variables:**
   - `DISCORD_TOKEN`: Your bot token.
   - `DISCORD_APPLICATION_ID`: Your bot application ID.
   - `DISCORD_GUILD_ID`: (Optional) Guild ID for instant development command deployment.
   - `PORT`: API server port (default: 3001).

4. **Deploy Commands:**
   Register your slash commands with Discord:
   ```bash
   npm run deploy
   ```

### Running the Bot

- **Development Mode:**
  ```bash
  npm run dev
  ```
  Starts the bot with `ts-node` and auto-restarts on changes.

- **Production Build:**
  ```bash
  npm run build
  npm start
  ```

## API Documentation

When the bot is running, access the internal API documentation at:
`http://localhost:3001/docs`

This provides a Swagger UI to explore available endpoints.
