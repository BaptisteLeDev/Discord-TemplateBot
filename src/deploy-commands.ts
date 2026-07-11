/**
 * Deploiement des commandes slash sur Discord.
 *
 * Si DISCORD_GUILD_ID est defini : deploiement sur cette guild (instantane, dev).
 * Sinon : deploiement global (propagation jusqu'a 1h).
 *
 *   bun run deploy-commands
 */
import { REST, Routes } from "discord.js";
import { loadConfig } from "./config";
import { creerCommandes } from "./commands/index";
import { executerAuDemarrage } from "./run-entrypoint";

export async function deploy(): Promise<void> {
  const config = loadConfig();
  const body = creerCommandes().map((c) => c.data.toJSON());
  const rest = new REST({ version: "10" }).setToken(config.discord.token);

  if (config.discord.guildId) {
    console.log(`Deploiement de ${body.length} commande(s) sur la guild ${config.discord.guildId}`);
    await rest.put(
      Routes.applicationGuildCommands(config.discord.applicationId, config.discord.guildId),
      { body },
    );
  } else {
    console.log(`Deploiement global de ${body.length} commande(s) (jusqu'a 1h de propagation)`);
    await rest.put(Routes.applicationCommands(config.discord.applicationId), { body });
  }
  console.log("Commandes deployees.");
}

// Tout rejet (token invalide, 401, reseau) -> log + exit 1 actionnable au lieu d'un
// unhandledRejection muet. Garde `import.meta.main` : importer ce module (test) ne
// declenche pas le deploiement.
if (import.meta.main) {
  void executerAuDemarrage("deploy", deploy);
}
