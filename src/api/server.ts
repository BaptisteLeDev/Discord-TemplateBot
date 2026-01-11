/**
 * Fastify API Server Module
 *
 * Creates and configures the Fastify API server with:
 * - OpenAPI/Swagger documentation
 * - CORS support
 * - Request logging
 * - Error handling
 * - Health checks
 *
 * @module api/server
 */

import Fastify, { FastifyInstance, type FastifyError, type FastifyServerOptions } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import cors from '@fastify/cors';
import { config } from '../config.js';
import botRoutes from './bot.api.js';

/**
 * Create and Configure API Server
 *
 * Initializes a Fastify server with all necessary plugins and routes.
 * Includes comprehensive logging, error handling, and API documentation.
 *
 * @returns Configured Fastify instance
 *
 * @example
 * ```ts
 * const api = await createApiServer();
 * await api.listen({ port: 3001, host: '0.0.0.0' });
 * ```
 */
export async function createApiServer(): Promise<FastifyInstance> {
  // Configure logger with proper typing to satisfy exactOptionalPropertyTypes
  const logger: FastifyServerOptions['logger'] = config.isDevelopment
    ? {
        level: config.logging.level,
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
            colorize: true,
          },
        },
      }
    : {
        level: config.logging.level,
      };

  // Create Fastify instance with logging configuration
  const fastify = Fastify({
    logger,
    requestIdLogLabel: 'reqId',
    disableRequestLogging: false,
    trustProxy: true,
  });

  // Register global error handler
  fastify.setErrorHandler<FastifyError>((error, request, reply) => {
    request.log.error(error);

    // Don't leak error details in production
    const statusCode = error.statusCode ?? 500;
    const message = config.isDevelopment ? error.message : 'Internal Server Error';

    void reply.status(statusCode).send({
      error: 'Internal Server Error',
      message,
      statusCode,
    });
  });

  // Enable CORS for browser requests
  await fastify.register(cors, {
    origin: config.isDevelopment ? true : false, // Restrict in production
    credentials: true,
  });

  // Register OpenAPI/Swagger documentation
  if (config.features.enableSwagger) {
    await fastify.register(swagger, {
      openapi: {
        openapi: '3.1.0',
        info: {
          title: 'Discord TemplateBot API',
          description: 'REST API for Discord bot statistics, health monitoring, and control',
          version: '1.0.0',
          contact: {
            name: 'BotDiscordFactory',
            url: 'https://github.com/your-username/bot-discord-factory',
          },
          license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT',
          },
        },
        servers: [
          {
            url: `http://localhost:${config.api.port}`,
            description: 'Development server',
          },
        ],
        tags: [
          {
            name: 'health',
            description: 'Health check and monitoring endpoints',
          },
          {
            name: 'bot',
            description: 'Bot statistics and information endpoints',
          },
        ],
      },
    });

    // Register Swagger UI
    await fastify.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
        filter: true,
        showCommonExtensions: true,
        syntaxHighlight: {
          activate: true,
          theme: 'monokai',
        },
      },
      staticCSP: true,
      transformStaticCSP: (header) => header,
    });
  }

  // Root endpoint - API information
  fastify.get('/', () => ({
    name: 'Discord TemplateBot API',
    version: '1.0.0',
    docs: config.features.enableSwagger ? '/docs' : 'Disabled in production',
    endpoints: {
      health: '/health',
      website: '/website/*',
    },
  }));

  // Global health check endpoint
  fastify.get('/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
  }));

  // Register bot-specific routes
  await fastify.register(botRoutes, { prefix: '/website' });

  // Log registered routes in development
  if (config.isDevelopment) {
    fastify.ready(() => {
      console.log('📋 Registered routes:');
      console.log(fastify.printRoutes());
    });
  }

  return fastify;
}
