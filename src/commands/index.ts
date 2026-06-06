/**
 * Registre des commandes slash. Toute nouvelle commande s'ajoute ici.
 *
 * Fabrique : on expose une fonction plutot qu'un tableau constant pour permettre
 * d'injecter des dependances aux commandes qui en ont besoin (config, services
 * du domaine). Le gabarit ne livre que /ping comme exemple.
 */
import { pingCommand } from './ping';
import type { Command } from './types';

export function creerCommandes(): Command[] {
  return [pingCommand];
}
