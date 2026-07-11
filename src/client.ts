/**
 * Client Discord du gabarit.
 *
 * Etend le Client Discord.js avec un registre de commandes et le routage des
 * interactions. C'est l'ADAPTER cote Discord : il implemente le port StatsProvider
 * pour exposer ses metriques a l'API sans que celle-ci connaisse Discord.js.
 *
 * Les commandes/events sont les adapters qui traduisent une interaction vers
 * le domaine pur (src/domain). Le gabarit ne livre que /ping comme exemple.
 */
import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  MessageFlags,
  type Interaction,
} from "discord.js";
import type { Command } from "./commands/types";
import { creerCommandes, creerDepsParDefaut } from "./commands/index";
import type { GuildSettingsStore } from "./guildsettings/store";
import type { BotStats, StatsProvider } from "./api/stats-provider";
import packageJson from "../package.json" with { type: "json" };

export class BotClient extends Client implements StatsProvider {
  public readonly commands = new Collection<string, Command>();
  private commandsToday = 0;

  constructor() {
    // Intents minimaux : seul Guilds est requis pour les slash commands. Ajouter
    // les intents (dont les privilegies) au cas par cas selon les features du bot.
    //
    // allowedMentions NEUTRE par defaut (socle de flotte) : aucun @everyone/role/user
    // n'est pinge tant qu'une commande ne l'autorise pas explicitement. Un bot derive
    // qui echo de l'input ne peut donc pas declencher de ping de masse par accident.
    super({
      intents: [GatewayIntentBits.Guilds],
      allowedMentions: { parse: [], repliedUser: false },
    });
    this.once(Events.ClientReady, (c) => {
      console.log(`Bot pret : connecte comme ${c.user.tag} (${c.guilds.cache.size} serveurs)`);
    });
    // Filet de securite : le routage est fire-and-forget, on rattache un .catch pour
    // qu'un rejet imprevu (hors du try interne) ne devienne jamais un unhandledRejection.
    this.on(Events.InteractionCreate, (interaction) => {
      void this.handleInteraction(interaction).catch((err) =>
        console.error("Rejet non gere du routeur d'interactions :", err),
      );
    });
    this.on(Events.Error, (err) => console.error("Erreur client Discord :", err));
  }

  /**
   * Enregistre les commandes en injectant le socle (store de reglages). Appele APRES le
   * demarrage de l'API (cf. index.ts) : `getStats` ne depend pas du store, donc l'API
   * peut monter et servir /health avant que la DB soit prete. Retourne `this` pour le
   * chainage a la composition.
   */
  public brancherCommandes(settingsStore?: GuildSettingsStore): this {
    const deps = creerDepsParDefaut({ settingsStore });
    for (const cmd of creerCommandes(deps)) {
      this.commands.set(cmd.data.name, cmd);
    }
    return this;
  }

  private async handleInteraction(interaction: Interaction): Promise<void> {
    if (interaction.isAutocomplete()) {
      const cmd = this.commands.get(interaction.commandName);
      if (cmd?.autocomplete) {
        try {
          await cmd.autocomplete(interaction);
        } catch (err) {
          console.error(`Erreur autocomplete /${interaction.commandName} :`, err);
        }
      }
      return;
    }
    if (!interaction.isChatInputCommand()) return;
    const command = this.commands.get(interaction.commandName);
    if (!command) {
      console.error(`Commande inconnue : /${interaction.commandName}`);
      return;
    }
    try {
      this.commandsToday += 1;
      await command.execute(interaction);
    } catch (err) {
      console.error(`Erreur a l'execution de /${interaction.commandName} :`, err);
      const payload = {
        content: "Une erreur est survenue.",
        flags: MessageFlags.Ephemeral,
      } as const;
      // Feedback de secours BEST-EFFORT, dans son propre try/catch : sur cold-start
      // l'interaction peut avoir expire (10062) ou etre deja acquittee (40060). On log
      // sans relancer -> pas d'unhandledRejection, pas de catch silencieux.
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload);
        } else {
          await interaction.reply(payload);
        }
      } catch (secondaire) {
        console.error(`Echec du feedback d'erreur pour /${interaction.commandName} :`, secondaire);
      }
    }
  }

  /** Implementation du port StatsProvider (contrat /stats). */
  public getStats(): BotStats {
    return {
      guildCount: this.guilds.cache.size,
      userCount: this.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0),
      commandsToday: this.commandsToday,
      discordLatencyMs: this.isReady() ? Math.round(this.ws.ping) : -1,
      version: packageJson.version,
    };
  }

  public async start(token: string): Promise<void> {
    await this.login(token);
  }
}
