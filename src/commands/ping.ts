/**
 * Simple ping command to verify bot is responsive.
 */
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
} from 'discord.js';
import { Command } from './types';

export const pingCommand: Command = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),

  async execute(interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction) {
    if (interaction.isChatInputCommand()) {
      await interaction.reply('Pong! 🏓');
    }
  },
};
