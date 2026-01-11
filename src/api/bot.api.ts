/**
 * Bot API Routes Module
 *
 * Provides REST API endpoints for bot statistics, health checks,
 * and command information.
 *
 * All routes are prefixed with `/website` (configured in server.ts)
 *
 * @module api/bot.api
 */

import { FastifyInstance, FastifyPluginCallback, FastifyReply, FastifyRequest } from 'fastify';
import { bot } from '../client.js';

/**
 * API Response Types
 */

interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  bot: {
    ready: boolean;
    ping: number;
  };
}

interface BotStatsResponse {
  online: boolean;
  username: string;
  userId: string;
  guilds: number;
  users: number;
  commands: number;
  uptime: number;
  ping: number;
  readySince: string;
}

interface CommandInfo {
  name: string;
  description: string;
  options: number;
}

interface CommandsListResponse {
  total: number;
  commands: CommandInfo[];
}

interface GuildInfo {
  id: string;
  name: string;
  memberCount: number;
  joinedAt: string;
}

interface GuildsListResponse {
  total: number;
  guilds: GuildInfo[];
}

interface ErrorResponse {
  error: string;
}

/**
 * Register Bot API Routes
 *
 * Registers all bot-related API endpoints with Swagger documentation.
 *
 * @param fastify - Fastify instance
 */
const botRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done): void => {
  /**
   * Health Check Endpoint
   *
   * GET /website/health
   *
   * Provides detailed health information about the bot and API.
   */
  fastify.get<{ Reply: HealthResponse }>(
    '/health',
    {
      schema: {
        description: 'Health check endpoint for monitoring bot status',
        tags: ['health'],
        response: {
          200: {
            description: 'Health check successful',
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['healthy', 'unhealthy'] },
              timestamp: { type: 'string', format: 'date-time' },
              uptime: { type: 'number', description: 'Process uptime in seconds' },
              bot: {
                type: 'object',
                properties: {
                  ready: { type: 'boolean' },
                  ping: { type: 'number', description: 'WebSocket ping in ms' },
                },
              },
            },
          },
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply): Promise<HealthResponse> => {
      const isHealthy = bot.isReady() && bot.ws.ping < 1000;

      return reply.code(isHealthy ? 200 : 503).send({
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        bot: {
          ready: bot.isReady(),
          ping: bot.ws.ping,
        },
      });
    },
  );

  /**
   * Bot Statistics Endpoint
   *
   * GET /website/stats
   *
   * Returns comprehensive statistics about the bot.
   */
  fastify.get<{ Reply: BotStatsResponse | ErrorResponse }>(
    '/stats',
    {
      schema: {
        description: 'Get comprehensive bot statistics',
        tags: ['bot'],
        response: {
          200: {
            description: 'Bot statistics retrieved successfully',
            type: 'object',
            properties: {
              online: { type: 'boolean' },
              username: { type: 'string' },
              userId: { type: 'string' },
              guilds: { type: 'number', description: 'Number of guilds (servers)' },
              users: { type: 'number', description: 'Total user count across all guilds' },
              commands: { type: 'number', description: 'Number of registered commands' },
              uptime: { type: 'number', description: 'Bot uptime in seconds' },
              ping: { type: 'number', description: 'WebSocket ping in milliseconds' },
              readySince: { type: 'string', format: 'date-time' },
            },
          },
          503: {
            description: 'Bot not ready',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      if (!bot.isReady()) {
        await reply.code(503).send({ error: 'Bot not ready' });
        return;
      }

      const stats = bot.getStatistics();

      await reply.send({
        online: stats.ready,
        username: stats.username,
        userId: stats.userId,
        guilds: stats.guilds,
        users: stats.users,
        commands: stats.commands,
        uptime: stats.uptime,
        ping: stats.ping,
        readySince: bot.readyAt?.toISOString() || new Date().toISOString(),
      });
    },
  );

  /**
   * Commands List Endpoint
   *
   * GET /website/commands
   *
   * Returns a list of all registered commands.
   */
  fastify.get<{ Reply: CommandsListResponse }>(
    '/commands',
    {
      schema: {
        description: 'List all registered bot commands',
        tags: ['bot'],
        response: {
          200: {
            description: 'Commands list retrieved successfully',
            type: 'object',
            properties: {
              total: { type: 'number' },
              commands: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    options: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    (): CommandsListResponse => {
      const commandsList: CommandInfo[] = Array.from(bot.commands.values()).map((cmd) => ({
        name: cmd.data.name,
        description: cmd.data.description,
        options: cmd.data.options?.length || 0,
      }));

      return {
        total: commandsList.length,
        commands: commandsList,
      };
    },
  );

  /**
   * Guild Count Endpoint (Legacy)
   *
   * GET /website/guild-count
   *
   * Returns the number of guilds the bot is in.
   * Kept for backwards compatibility, prefer /stats instead.
   *
   * @deprecated Use /stats instead
   */
  fastify.get<{ Reply: { guildCount: number } }>(
    '/guild-count',
    {
      schema: {
        description: 'Get guild count (deprecated, use /stats instead)',
        tags: ['bot'],
        deprecated: true,
        response: {
          200: {
            description: 'Guild count retrieved',
            type: 'object',
            properties: {
              guildCount: { type: 'number' },
            },
          },
        },
      },
    },
    (): { guildCount: number } => ({
      guildCount: bot.guilds.cache.size,
    }),
  );

  /**
   * Guilds List Endpoint
   *
   * GET /website/guilds
   *
   * Returns detailed information about all guilds the bot is in.
   * Limited to basic info for privacy reasons.
   */
  fastify.get<{ Reply: GuildsListResponse | ErrorResponse }>(
    '/guilds',
    {
      schema: {
        description: 'List all guilds the bot is in',
        tags: ['bot'],
        response: {
          200: {
            description: 'Guilds list retrieved successfully',
            type: 'object',
            properties: {
              total: { type: 'number' },
              guilds: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    memberCount: { type: 'number' },
                    joinedAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          503: {
            description: 'Bot not ready',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      if (!bot.isReady()) {
        await reply.code(503).send({ error: 'Bot not ready' });
        return;
      }

      const guilds: GuildInfo[] = bot.guilds.cache.map((guild) => ({
        id: guild.id,
        name: guild.name,
        memberCount: guild.memberCount,
        joinedAt: guild.joinedAt?.toISOString() || new Date().toISOString(),
      }));

      await reply.send({
        total: guilds.length,
        guilds,
      });
    },
  );

  done();
};

export default botRoutes;
