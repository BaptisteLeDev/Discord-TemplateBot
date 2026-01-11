/**
 * Application Entry Point
 *
 * Bootstraps the application by:
 * 1. Validating configuration
 * 2. Starting the Fastify API server
 * 3. Starting the Discord bot client
 *
 * The order is critical: API must start before the bot for health monitoring.
 *
 * @module index
 */

import { bot } from './client.js';
import { createApiServer } from './api/server.js';
import { config, validateConfig } from './config.js';

/**
 * Bootstrap Application
 *
 * Initializes and starts all application components in the correct order.
 * Implements graceful shutdown on SIGINT and SIGTERM signals.
 *
 * @throws {Error} If API server or Discord bot fails to start
 */
async function bootstrap() {
  console.log('🚀 Starting TemplateBot...');
  console.log(`📊 Environment: ${config.env}`);

  try {
    // Validate configuration before starting
    validateConfig();

    // 1. Start Internal API Server (MUST be first)
    // This ensures health checks and monitoring are available even if bot fails
    if (config.features.enableApi) {
      const api = await createApiServer();
      const address = await api.listen({
        port: config.api.port,
        host: config.api.host,
      });
      console.log(`🌐 API Server listening at ${address}`);

      if (config.features.enableSwagger) {
        console.log(`📚 Swagger UI available at ${address}/docs`);
      }
    }

    // 2. Start Discord Bot (MUST be second)
    // Bot depends on API for health monitoring
    await bot.start();

    console.log('✅ Application started successfully');

    // Graceful shutdown handlers
    setupGracefulShutdown();
  } catch (err) {
    console.error('❌ Failed to start application:', err);
    process.exit(1);
  }
}

/**
 * Setup Graceful Shutdown
 *
 * Registers signal handlers for clean application shutdown.
 * Ensures Discord bot disconnects properly and resources are released.
 */
function setupGracefulShutdown() {
  const shutdown = async (signal: string) => {
    console.log(`\n⚠️  Received ${signal}, shutting down gracefully...`);

    try {
      // Destroy Discord client connection
      await bot.destroy();
      console.log('✅ Discord bot disconnected');

      // Exit cleanly
      process.exit(0);
    } catch (err) {
      console.error('❌ Error during shutdown:', err);
      process.exit(1);
    }
  };

  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  // Handle SIGTERM (Docker/K8s stop)
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}

// Start the application
void bootstrap();
