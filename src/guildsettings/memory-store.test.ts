/**
 * L'adapter en memoire doit honorer le contrat du port GuildSettingsStore (#socle).
 */
import { contratGuildSettingsStore } from "./store.contract";
import { creerMemoryGuildSettingsStore } from "./memory-store";

contratGuildSettingsStore("memory", async () => creerMemoryGuildSettingsStore());
