/**
 * Centralized configuration module.
 * Loads environment variables and exports them as a typed configuration object.
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  discord: {
    token: process.env.DISCORD_TOKEN || '',
    applicationId: process.env.DISCORD_APPLICATION_ID || '',
    guildId: process.env.DISCORD_GUILD_ID || '',
  },
  api: {
    port: parseInt(process.env.PORT || '3001', 10),
    host: process.env.HOST || '0.0.0.0',
  },
  // otherApi: {
  //   apiUrl: process.env.OPENFRONT_API_URL || '',
  //   apiKey: process.env.OPENFRONT_API_KEY || '',
  // },
  env: process.env.NODE_ENV || 'development',
};
