/**
 * Type definitions for Discord commands.
 */
import {
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';

export interface Command {
  data: SlashCommandBuilder;
  execute: (
    interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction,
  ) => Promise<void>;
}
