/**
 * Custom Discord Client implementation.
 * Handles command registration and interaction events.
 */
import {
  Client,
  GatewayIntentBits,
  Events,
  Collection,
  Interaction,
} from 'discord.js';
import { config } from './config';
import { Command } from './commands/types';
import { commands as registeredCommands } from './commands';

export class BotClient extends Client {
  public commands: Collection<string, Command>;

  constructor() {
    super({
      intents: [GatewayIntentBits.Guilds],
    });

    this.commands = new Collection();
    this.registerCommands();
    this.setupListeners();
  }

  private registerCommands() {
    for (const cmd of registeredCommands) {
      this.commands.set(cmd.data.name, cmd);
    }
  }

  private setupListeners() {
    this.once(Events.ClientReady, (c) => {
      console.log(`✅ Discord Bot Ready! Logged in as ${c.user.tag}`);
    });

    this.on(Events.InteractionCreate, this.handleInteraction.bind(this));
  }

  private async handleInteraction(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = this.commands.get(interaction.commandName);

    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`,
      );
      return;
    }

    try {
      await command.execute(interaction as any);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: 'There was an error while executing this command!',
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: 'There was an error while executing this command!',
          ephemeral: true,
        });
      }
    }
  }

  public async start() {
    await this.login(config.discord.token);
  }
}

export const bot = new BotClient();
