/**
 * Script to deploy slash commands to Discord.
 * Can deploy to a specific guild (instant) or globally (cached).
 */
import { REST, Routes } from 'discord.js';
import { config } from './config';
import { commands as registeredCommands } from './commands';

const commands = registeredCommands.map((c) => c.data.toJSON());

const rest = new REST({ version: '10' }).setToken(config.discord.token);

const deploy = async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`,
    );

    if (config.discord.guildId) {
      console.log(
        `🔧 Deploying to guild ${config.discord.guildId} (instant updates for testing)`,
      );
      const data = await rest.put(
        Routes.applicationGuildCommands(
          config.discord.applicationId,
          config.discord.guildId,
        ),
        { body: commands },
      );
      console.log(
        `✅ Successfully reloaded ${(data as any).length} guild command(s).`,
      );
    } else {
      console.log(
        `🌍 Deploying globally (may take up to 1 hour to propagate to all servers)`,
      );
      const data = await rest.put(
        Routes.applicationCommands(config.discord.applicationId),
        { body: commands },
      );
      console.log(
        `✅ Successfully reloaded ${(data as any).length} global command(s).`,
      );
    }
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
};

deploy();
