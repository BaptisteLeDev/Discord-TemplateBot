/**
 * Exports all registered slash commands.
 * New commands should be added to the array.
 */
import { pingCommand } from './ping';
import { Command } from './types';

export const commands: Command[] = [pingCommand];

export default commands;
