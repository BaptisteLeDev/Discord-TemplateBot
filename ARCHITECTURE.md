# Architecture Documentation

This document provides a comprehensive overview of the Discord TemplateBot architecture, design patterns, and implementation details.

## 📑 Table of Contents

- [Overview](#overview)
- [Architecture Principles](#architecture-principles)
- [System Architecture](#system-architecture)
- [Design Patterns](#design-patterns)
- [Module Structure](#module-structure)
- [Data Flow](#data-flow)
- [Configuration Management](#configuration-management)
- [Error Handling Strategy](#error-handling-strategy)
- [API Design](#api-design)
- [Scalability Considerations](#scalability-considerations)

## 🎯 Overview

Discord TemplateBot is a professional Discord bot template built with:

- **Language:** TypeScript 5.7 (strict mode)
- **Runtime:** Node.js 18+
- **Bot Framework:** Discord.js v14
- **API Framework:** Fastify v5
- **Package Manager:** pnpm v8
- **Testing:** Vitest
- **Validation:** Zod

### Key Features

- ✅ Type-safe configuration
- ✅ Comprehensive error handling
- ✅ RESTful API with OpenAPI documentation
- ✅ Modular command system
- ✅ Graceful shutdown handling
- ✅ Production-ready logging

## 🏛️ Architecture Principles

### 1. Separation of Concerns

Each module has a single, well-defined responsibility:

- **Client** - Discord bot lifecycle and event handling
- **Commands** - Command definitions and execution
- **API** - REST endpoints and health monitoring
- **Config** - Configuration management and validation
- **Services** - Business logic and external integrations

### 2. Dependency Inversion

High-level modules don't depend on low-level modules. Both depend on abstractions:

```typescript
// Commands depend on Command interface, not implementation
interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}
```

### 3. Single Responsibility

Each class/module has one reason to change:

```typescript
// BotClient: Only responsible for Discord client management
// Server: Only responsible for API server management
// Config: Only responsible for configuration
```

### 4. Open/Closed Principle

Open for extension, closed for modification:

- Add new commands without modifying core client
- Add new API routes without changing server logic
- Add new services without touching other modules

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Application Entry                   │
│                    (index.ts)                        │
└───────────────┬─────────────────────────────────────┘
                │
                ├──────────────┬──────────────┐
                │              │              │
┌───────────────▼──┐  ┌────────▼──────┐  ┌───▼────────┐
│  Configuration   │  │  API Server   │  │ Bot Client │
│    (config.ts)   │  │  (Fastify)    │  │(Discord.js)│
└──────────────────┘  └───────────────┘  └────────────┘
                              │                  │
                      ┌───────▼───────┐  ┌──────▼──────┐
                      │  API Routes   │  │  Commands   │
                      │  (bot.api.ts) │  │  (commands/)│
                      └───────────────┘  └─────────────┘
```

### Component Diagram

```
┌─────────────────────────────────────────────┐
│              Discord Bot Client              │
│  ┌────────────────────────────────────────┐ │
│  │   Command Registry (Collection)        │ │
│  │   - ping                               │ │
│  │   - [other commands]                   │ │
│  └────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │   Event Handlers                       │ │
│  │   - onReady                            │ │
│  │   - handleInteraction                  │ │
│  │   - onError                            │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│              Fastify API Server              │
│  ┌────────────────────────────────────────┐ │
│  │   Plugins                              │ │
│  │   - CORS                               │ │
│  │   - Swagger/OpenAPI                    │ │
│  │   - Error Handler                      │ │
│  └────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │   Routes                               │ │
│  │   - /health                            │ │
│  │   - /website/stats                     │ │
│  │   - /website/commands                  │ │
│  │   - /website/guilds                    │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

## 🎨 Design Patterns

### 1. Singleton Pattern

**Used in:** `BotClient`

**Purpose:** Ensure only one bot instance exists throughout the application.

**Implementation:**

```typescript
// src/client.ts
export class BotClient extends Client {
  // Class implementation
}

// Single instance exported
export const bot = new BotClient();

// Usage anywhere in the app
import { bot } from './client.js';
```

**Benefits:**
- Centralized bot state
- No accidental multiple instances
- Easy to access from any module

### 2. Command Pattern

**Used in:** Slash command system

**Purpose:** Encapsulate commands as objects with data and execution logic.

**Implementation:**

```typescript
// Command interface
interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

// Command implementation
export const pingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  
  async execute(interaction) {
    await interaction.reply('Pong!');
  },
};
```

**Benefits:**
- Easy to add new commands
- Commands are self-contained
- Testable in isolation
- Clear separation of data and behavior

### 3. Observer Pattern

**Used in:** Discord.js event system

**Purpose:** React to events without tight coupling.

**Implementation:**

```typescript
// Register observers (event listeners)
this.once(Events.ClientReady, this.onReady.bind(this));
this.on(Events.InteractionCreate, this.handleInteraction.bind(this));
this.on(Events.Error, this.onError.bind(this));
```

**Benefits:**
- Loose coupling between components
- Easy to add/remove event handlers
- Follows Discord.js architecture

### 4. Factory Pattern

**Used in:** Server creation

**Purpose:** Encapsulate complex server setup logic.

**Implementation:**

```typescript
// src/api/server.ts
export async function createApiServer(): Promise<FastifyInstance> {
  const fastify = Fastify({ /* config */ });
  
  // Setup plugins, routes, error handlers
  await fastify.register(cors);
  await fastify.register(swagger);
  // ...
  
  return fastify;
}
```

**Benefits:**
- Complex setup encapsulated
- Easy to test
- Reusable configuration

### 5. Strategy Pattern

**Used in:** Environment-based configuration

**Purpose:** Different behaviors based on environment.

**Implementation:**

```typescript
// src/config.ts
export const config = {
  features: {
    enableSwagger: env.NODE_ENV === 'development', // Strategy based on env
  },
  
  // src/api/server.ts
  logger: {
    transport: config.isDevelopment ? prettyTransport : standardTransport,
  },
};
```

## 📦 Module Structure

### Core Modules

#### 1. `index.ts` - Application Entry Point

**Responsibilities:**
- Bootstrap application
- Start API server
- Start bot client
- Setup graceful shutdown

**Key Functions:**
- `bootstrap()` - Main initialization
- `setupGracefulShutdown()` - Process signal handlers

#### 2. `config.ts` - Configuration Management

**Responsibilities:**
- Load environment variables
- Validate configuration with Zod
- Export typed config object

**Exports:**
- `config` - Validated configuration object
- `validateConfig()` - Manual validation function
- `Config` - TypeScript type

#### 3. `client.ts` - Discord Bot Client

**Responsibilities:**
- Extend Discord.js Client
- Register slash commands
- Handle interactions
- Manage bot lifecycle

**Key Methods:**
- `registerCommands()` - Load commands
- `setupListeners()` - Register event handlers
- `handleInteraction()` - Process interactions
- `getStatistics()` - Get bot stats
- `start()` - Login to Discord

#### 4. `api/server.ts` - API Server

**Responsibilities:**
- Create Fastify instance
- Configure plugins (CORS, Swagger)
- Register routes
- Setup error handlers

**Exports:**
- `createApiServer()` - Factory function

#### 5. `api/bot.api.ts` - API Routes

**Responsibilities:**
- Define REST endpoints
- Implement route handlers
- Document with OpenAPI schemas

**Routes:**
- `GET /website/health` - Health check
- `GET /website/stats` - Bot statistics
- `GET /website/commands` - Command list
- `GET /website/guilds` - Guild list

### Command System

#### Structure

```
src/commands/
├── index.ts          # Command exports
├── types.ts          # Command interface
└── ping.ts           # Example command
```

#### Command Interface

```typescript
export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}
```

#### Adding Commands

1. Create command file
2. Implement Command interface
3. Export in `index.ts`
4. Run `pnpm run deploy`

## 🔄 Data Flow

### Bot Startup Flow

```
┌──────────────┐
│  index.ts    │ Entry point
└──────┬───────┘
       │
       ├─> validateConfig()
       │   └─> Zod validation
       │
       ├─> createApiServer()
       │   ├─> Create Fastify instance
       │   ├─> Register plugins
       │   ├─> Register routes
       │   └─> Return server
       │
       ├─> api.listen()
       │   └─> Start listening on port
       │
       ├─> bot.start()
       │   ├─> client.login()
       │   ├─> Emit ClientReady event
       │   └─> Bot is ready
       │
       └─> setupGracefulShutdown()
           └─> Register signal handlers
```

### Command Execution Flow

```
User types /ping in Discord
       │
       ▼
Discord sends Interaction
       │
       ▼
┌──────────────────────┐
│  InteractionCreate   │ Event emitted
│       Event          │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ handleInteraction()  │ Client method
└──────┬───────────────┘
       │
       ├─> Check if ChatInputCommand
       │
       ├─> Get command from registry
       │   commands.get('ping')
       │
       ├─> Execute command
       │   await command.execute(interaction)
       │
       └─> Handle errors
           └─> Reply with error message
```

### API Request Flow

```
HTTP GET /website/stats
       │
       ▼
┌──────────────────┐
│  Fastify Router  │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Route Handler   │ In bot.api.ts
└──────┬───────────┘
       │
       ├─> Check bot.isReady()
       │
       ├─> Get stats from bot
       │   bot.getStatistics()
       │
       ├─> Format response
       │
       └─> Return JSON
```

## ⚙️ Configuration Management

### Environment Variables

Loaded from `.env` file and validated with Zod:

```typescript
const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_APPLICATION_ID: z.string().min(1),
  DISCORD_GUILD_ID: z.string().optional(),
  PORT: z.string().default('3001').transform(Number),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']),
});
```

### Type-Safe Access

```typescript
// Fully typed config object
export const config = {
  discord: {
    token: env.DISCORD_TOKEN,
    applicationId: env.DISCORD_APPLICATION_ID,
    guildId: env.DISCORD_GUILD_ID,
  },
  api: {
    port: env.PORT,
    host: env.HOST,
  },
  // ...
} as const;

// Usage
import { config } from './config.js';
const token = config.discord.token; // Type: string
```

### Feature Flags

```typescript
export const config = {
  features: {
    enableApi: true,
    enableSwagger: env.NODE_ENV === 'development',
  },
};

// Usage
if (config.features.enableSwagger) {
  await fastify.register(swaggerUi);
}
```

## 🚨 Error Handling Strategy

### Layers of Error Handling

#### 1. Configuration Level

```typescript
const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error('Invalid configuration:', result.error);
  throw new Error('Configuration validation failed');
}
```

#### 2. Application Bootstrap Level

```typescript
try {
  await bootstrap();
} catch (err) {
  console.error('Failed to start:', err);
  process.exit(1); // Fatal error, exit
}
```

#### 3. Command Execution Level

```typescript
try {
  await command.execute(interaction);
} catch (error) {
  console.error('Command error:', error);
  await replyError(interaction, 'Command failed');
}
```

#### 4. API Level

```typescript
fastify.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  reply.status(500).send({
    error: 'Internal Server Error',
    message: config.isDevelopment ? error.message : 'Server error',
  });
});
```

### Error Logging

- **Development:** Detailed errors with stack traces
- **Production:** Sanitized errors, no sensitive data

## 🌐 API Design

### RESTful Principles

- **GET** for retrieving data (idempotent)
- **Proper status codes** (200, 503, etc.)
- **JSON responses** with consistent structure
- **Versioned if needed** (via URL prefix)

### OpenAPI Documentation

All endpoints documented with schemas:

```typescript
fastify.get('/stats', {
  schema: {
    description: 'Get bot statistics',
    tags: ['bot'],
    response: {
      200: {
        type: 'object',
        properties: {
          guilds: { type: 'number' },
          // ...
        },
      },
    },
  },
}, handler);
```

### Response Formats

Consistent structure:

```typescript
// Success
{
  "guilds": 10,
  "users": 1500,
  // ...
}

// Error
{
  "error": "Error type",
  "message": "Human-readable message",
  "statusCode": 503
}
```

## 📈 Scalability Considerations

### Horizontal Scaling

For multiple bot instances:

- **Shared cache:** Use Redis for shared state
- **Message queue:** Use RabbitMQ or similar for task distribution
- **Database:** Centralize bot data

### Performance Optimization

- **Caching:** Cache Discord API responses
- **Rate limiting:** Respect Discord rate limits
- **Async operations:** Non-blocking I/O
- **Connection pooling:** For databases

### Monitoring

- **Metrics:** Expose Prometheus metrics
- **Logging:** Structured logging with Pino
- **Health checks:** Regular health endpoints
- **Alerting:** Set up alerts for errors

### Resource Management

- **Memory:** Monitor heap usage
- **CPU:** Profile command execution
- **Network:** Track API calls

## 🔐 Security Considerations

### Secrets Management

- **Never commit .env** - Add to `.gitignore`
- **Use environment variables** - No hardcoded secrets
- **Rotate tokens regularly**

### Input Validation

- **Validate all inputs** - Use Zod for runtime validation
- **Sanitize user input** - Prevent injection attacks
- **Rate limit commands** - Prevent abuse

### API Security

- **CORS:** Restrict origins in production
- **Authentication:** Add auth for sensitive endpoints
- **HTTPS:** Use TLS in production

## 📚 Further Reading

- [Discord.js Guide](https://discordjs.guide/)
- [Fastify Best Practices](https://www.fastify.io/docs/latest/Guides/Getting-Started/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

---

**Last Updated:** 2026-01-06
**Version:** 1.0.0
**Maintainer:** BotDiscordFactory
