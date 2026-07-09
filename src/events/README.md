# Events - handlers d'évènements Discord (adapters)

> Dossier **volontairement vide** dans le gabarit.

Les évènements Discord (hors slash commands) se branchent ici : `guildMemberAdd`,
`messageCreate`, `guildMemberUpdate`, etc. Comme les commandes, ce sont des **adapters** :
ils reçoivent un évènement Discord, le traduisent vers une fonction pure de `src/domain/`,
puis appliquent le résultat. Aucune logique métier directement dans le handler.

Convention : un fichier par évènement, fabrique qui reçoit ses dépendances injectées
(`creerGestionnaire...`), test colocalisé `*.test.ts`. L'abonnement se fait dans
`src/client.ts` (`this.on(Events.X, ...)`).

Tant qu'aucun évènement n'est nécessaire, ne rien ajouter (anti-cérémonie).
