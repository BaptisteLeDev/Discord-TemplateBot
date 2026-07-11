/**
 * Catalogue i18n a TYPAGE FORT (socle de flotte). Les messages parametriques sont
 * des FONCTIONS -> l'acces est une lecture de propriete native : une cle absente est
 * une erreur de COMPILATION, jamais un miss runtime (pas de dot-path `t("a.b")`).
 *
 * `en: Messages` force le catalogue anglais a porter TOUTES les cles de FR (derive
 * anti-drift). FR est la reference remplie du gabarit ; EN est une traduction de
 * base, cohérente et complete, a affiner bot par bot (extraction i18n fine = tache
 * separee, cf. plan de migration).
 */
import type { LocaleTag } from "../domain/locale";

export interface Messages {
  config: {
    /** Description de la commande /config (localisee sur Discord). */
    commandeDescription: string;
    langue: {
      sousCommandeDescription: string;
      optionDescription: string;
      definie: (p: { locale: string }) => string;
      invalide: string;
    };
    couleur: {
      sousCommandeDescription: string;
      optionDescription: string;
      definie: (p: { couleur: string }) => string;
      reinitialisee: string;
      invalide: string;
    };
    afficher: {
      sousCommandeDescription: string;
      titre: string;
      champLangue: string;
      champCouleur: string;
      valeurDefaut: string;
    };
    permissionRefusee: string;
    horsServeur: string;
  };
  ping: {
    description: string;
    reponse: (p: { latence: number }) => string;
  };
  erreurGenerique: string;
}

export const fr: Messages = {
  config: {
    commandeDescription: "Personnalise le bot pour ce serveur (langue, couleur).",
    langue: {
      sousCommandeDescription: "Definit la langue du bot sur ce serveur.",
      optionDescription: "Langue a utiliser.",
      definie: ({ locale }) => `Langue definie sur \`${locale}\`.`,
      invalide: "Langue invalide. Choisis une langue proposee dans la liste.",
    },
    couleur: {
      sousCommandeDescription: "Definit la couleur des embeds (hex, ou `reset`).",
      optionDescription:
        "Couleur hexadecimale (ex. #5865F2), ou `reset` pour la couleur par defaut.",
      definie: ({ couleur }) => `Couleur des embeds definie sur \`${couleur}\`.`,
      reinitialisee: "Couleur des embeds reinitialisee sur la couleur par defaut.",
      invalide: "Couleur invalide. Utilise un hex comme `#5865F2`, ou `reset`.",
    },
    afficher: {
      sousCommandeDescription: "Affiche la configuration actuelle du serveur.",
      titre: "Configuration du serveur",
      champLangue: "Langue",
      champCouleur: "Couleur des embeds",
      valeurDefaut: "(par defaut)",
    },
    permissionRefusee: "Tu dois avoir la permission Gerer le serveur pour utiliser cette commande.",
    horsServeur: "Cette commande ne peut etre utilisee que sur un serveur.",
  },
  ping: {
    description: "Repond Pong avec la latence.",
    reponse: ({ latence }) => `Pong ! Latence : ${latence}ms`,
  },
  erreurGenerique: "Une erreur est survenue.",
};

export const en: Messages = {
  config: {
    commandeDescription: "Customize the bot for this server (language, color).",
    langue: {
      sousCommandeDescription: "Set the bot language for this server.",
      optionDescription: "Language to use.",
      definie: ({ locale }) => `Language set to \`${locale}\`.`,
      invalide: "Invalid language. Pick one of the languages offered in the list.",
    },
    couleur: {
      sousCommandeDescription: "Set the embed color (hex, or `reset`).",
      optionDescription: "Hex color (e.g. #5865F2), or `reset` for the default color.",
      definie: ({ couleur }) => `Embed color set to \`${couleur}\`.`,
      reinitialisee: "Embed color reset to the default color.",
      invalide: "Invalid color. Use a hex like `#5865F2`, or `reset`.",
    },
    afficher: {
      sousCommandeDescription: "Show the current server configuration.",
      titre: "Server configuration",
      champLangue: "Language",
      champCouleur: "Embed color",
      valeurDefaut: "(default)",
    },
    permissionRefusee: "You need the Manage Server permission to use this command.",
    horsServeur: "This command can only be used in a server.",
  },
  ping: {
    description: "Replies Pong with the latency.",
    reponse: ({ latence }) => `Pong! Latency: ${latence}ms`,
  },
  erreurGenerique: "An error occurred.",
};

export const CATALOGUE: Record<LocaleTag, Messages> = { fr, en };
