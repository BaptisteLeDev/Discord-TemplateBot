/**
 * API routes for bot-related data.
 * Currently exposes guild count.
 */
import { FastifyInstance } from 'fastify';
import { bot } from '../client';

export default async function websiteRoutes(fastify: FastifyInstance) {
  fastify.get('/guild-count', async () => {
    const guildCount = bot.guilds.cache.size;
    return { guildCount };
  });
}
