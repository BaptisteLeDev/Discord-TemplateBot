/**
 * Configures and starts the Fastify API server.
 * Includes Swagger documentation and CORS settings.
 */
import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import cors from '@fastify/cors';
import websiteRoutes from './bot.api';

export async function createApiServer() {
  const fastify = Fastify({
    logger: true,
  });

  // Enable CORS for browser requests (adjust origin as needed)
  await fastify.register(cors, {
    origin: true,
  });

  // Register Swagger for API documentation
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'TemplateBot Internal API',
        description: 'API for observability and control',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:3001',
          description: 'Local server',
        },
      ],
    },
  });

  // Register Swagger UI for interactive API docs
  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
    transformStaticCSP: (header) => {
      try {
        const apiUrl = 'http://localhost:3001';
        if (!header || typeof header !== 'string') return header;
        // If a connect-src directive already exists, append the API url if missing
        if (/connect-src[^;]*;/.test(header)) {
          return header.replace(/connect-src([^;]*);/, (match, srcs) => {
            if (srcs.includes(apiUrl)) return match;
            return `connect-src${srcs} ${apiUrl};`;
          });
        }
        // Otherwise, add a connect-src directive allowing self and the API URL
        return header.endsWith(';')
          ? `${header} connect-src 'self' ${apiUrl};`
          : `${header}; connect-src 'self' ${apiUrl};`;
      } catch (err) {
        return header;
      }
    },
  });

  // Health check endpoint
  fastify.get('/health', async () => {
    return { status: 'ok', uptime: process.uptime() };
  });

  // Website-facing endpoints
  await fastify.register(websiteRoutes, { prefix: '/website' });

  return fastify;
}
