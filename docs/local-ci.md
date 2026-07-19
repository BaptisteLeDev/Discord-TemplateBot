# CI locale (etage 2) - Windows + Podman + act

La CI de la flotte est **a deux etages** (economie de billing GitHub Actions) :

| Etage | Fichier | Declencheur | Contenu | Ou ca tourne |
|-------|---------|-------------|---------|--------------|
| 1 - online allege | `.github/workflows/ci.yml` | push `main` + PR | install, typecheck, lint, `bun test` | GitHub (rapide, peu couteux) |
| 1 - securite | `.github/workflows/security-audit.yml` | cron hebdo + manuel | `bun audit` | GitHub (quelques secondes/semaine) |
| **2 - lourd** | `.github/workflows/deep.yml` | `workflow_dispatch` **seulement** | build image, smoke `/health`, SonarQube, CodeQL | **local** (ce document) |

`deep.yml` n'a **aucun** trigger automatique : il ne consomme **jamais** de minutes GitHub.
On le joue en local avec [`act`](https://nektosact.com) branche sur **Podman**.

---

## 1. Prerequis (Windows)

- **Podman Desktop** / Podman CLI avec une **machine Podman** (VM WSL2) deja installee.
  Verifier : `podman machine list` doit montrer une machine `Running`.
- **act** : `winget install nektos.act` (ou `scoop install act`, ou `choco install act-cli`).
- **CodeQL CLI** (pour le CodeQL local) : bundle `codeql` depuis
  <https://github.com/github/codeql-action/releases> (asset `codeql-bundle-*`), decompresse
  et ajoute au `PATH`. Le bundle inclut les query packs (`codeql/javascript-queries`).
- **sonar-scanner** : fourni via l'action `SonarSource/sonarqube-scan-action` quand on passe
  par `act`. En invocation directe (hors act), utiliser l'image Podman
  `sonarsource/sonar-scanner-cli` (aucune install Java requise cote hote).

> Les commandes ci-dessous se lancent **depuis la racine du repo**. Les chemins de socket en
> `unix:///run/user/1000/...` supposent une machine Podman **rootless** avec `uid 1000`
> (cas par defaut WSL2). Adapter l'uid via `id -u` si besoin.

---

## 2. Demarrer Podman et exposer le socket Docker-compatible

`act` parle l'API **Docker Engine** ; Podman l'expose via un socket compatible. Il faut donc
pointer `DOCKER_HOST` (et/ou `--container-daemon-socket`) vers le socket Podman.

### Option A (recommandee) - lancer act DANS la WSL qui heberge Podman

C'est le chemin le plus fiable, surtout parce que le job `build-smoke` fait du **docker build /
docker run** (Docker-in-Docker) : un socket **unix** local evite les soucis de named pipe Windows.

```bash
# Dans la distro WSL (ex. Ubuntu) ou tourne Podman :

# 1. Activer le socket Podman rootless (persistant)
systemctl --user enable --now podman.socket

# 2. Verifier le chemin du socket
echo "unix://$XDG_RUNTIME_DIR/podman/podman.sock"
#   -> typiquement unix:///run/user/1000/podman/podman.sock

# 3. Pointer act / clients Docker vers Podman (pour la session)
export DOCKER_HOST="unix://$XDG_RUNTIME_DIR/podman/podman.sock"

# 4. Sanity check : le CLI docker (ou podman) repond
docker info >/dev/null && echo "Podman OK via socket"
```

### Option B - depuis PowerShell (Windows natif)

```powershell
# Recuperer le socket expose par la machine Podman
podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}'

# Exposer via DOCKER_HOST (npipe Windows OU chemin remonte par la commande ci-dessus)
$env:DOCKER_HOST = "npipe:////./pipe/podman-machine-default"
```

> Option B fonctionne pour des workflows simples, mais le Docker-in-Docker du job
> `build-smoke` est plus capricieux via named pipe. En cas de galere, basculer sur l'option A.

---

## 3. Lancer l'etage 2 avec act

Commande type (depuis la racine du repo) :

```bash
act workflow_dispatch \
  -W .github/workflows/deep.yml \
  --container-daemon-socket unix:///run/user/1000/podman/podman.sock
```

- `workflow_dispatch` : l'evenement qui declenche `deep.yml`.
- `-W .github/workflows/deep.yml` : cible ce workflow uniquement.
- `--container-daemon-socket ...` : **le** point cle avec Podman. Ce socket est monte dans le
  conteneur runner pour que les etapes `docker build` / `docker run` du job `build-smoke`
  atteignent le daemon Podman de l'hote. La valeur peut etre le chemin ou l'URI `unix://`.
  (Alternative equivalente : ne pas passer ce flag mais exporter `DOCKER_HOST`, cf. section 2.)

Jouer un seul job :

```bash
act workflow_dispatch -W .github/workflows/deep.yml -j build-smoke \
  --container-daemon-socket unix:///run/user/1000/podman/podman.sock
```

Premiere execution : `act` demande quelle taille d'image runner utiliser -> choisir
**Medium** (`catthehacker/ubuntu:act-latest`, inclut le CLI docker). On peut figer ce choix
dans `~/.actrc` : `-P ubuntu-latest=catthehacker/ubuntu:act-latest`.

### Secrets / variables pour act

`deep.yml` (job `sonarqube`) lit `SONAR_HOST_URL` et `SONAR_TOKEN` depuis les secrets. En
local, les fournir a act **sans jamais les committer** :

```bash
# fichier .secrets a la racine. NE PAS committer : l'ajouter au .gitignore du bot derive
# (echo '.secrets' >> .gitignore) ou le placer hors du repo et passer --secret-file <chemin>.
cat > .secrets <<'EOF'
SONAR_HOST_URL=http://host.containers.internal:9000
SONAR_TOKEN=squ_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EOF

act workflow_dispatch -W .github/workflows/deep.yml --secret-file .secrets \
  --container-daemon-socket unix:///run/user/1000/podman/podman.sock
```

`host.containers.internal` est l'alias Podman pour joindre l'hote (ou tourne le conteneur
SonarQube) **depuis** le conteneur runner d'act. (Equivalent Docker : `host.docker.internal`.)

---

## 4. SonarQube en local (Podman)

### 4.1 Demarrer le serveur SonarQube

```bash
# Serveur SonarQube (Community), publie sur :9000
podman run -d --name sonarqube -p 9000:9000 sonarqube:community
```

Attendre le demarrage (`podman logs -f sonarqube` jusqu'a `SonarQube is operational`), puis
ouvrir <http://localhost:9000> (login initial `admin` / `admin`, changement de mot de passe
impose au premier login).

Creer le projet + un jeton :
1. **Create Project > Local** : cle projet = `botfactory-discord-template-bot`
   (doit correspondre a `sonar.projectKey` dans `sonar-project.properties`).
2. **My Account > Security > Generate Token** : copier le jeton (`squ_...`) -> c'est
   `SONAR_TOKEN`.

### 4.2 Lancer l'analyse

**Via act** (le job `sonarqube` de `deep.yml`, avec le `.secrets` de la section 3) :

```bash
act workflow_dispatch -W .github/workflows/deep.yml -j sonarqube --secret-file .secrets \
  --container-daemon-socket unix:///run/user/1000/podman/podman.sock
```

**Ou en direct** (sans act, plus simple pour iterer) via l'image scanner Podman, en montant
le repo. Depuis la racine :

```bash
# (optionnel) couverture pour Sonar
bun test --coverage --coverage-reporter=lcov   # -> coverage/lcov.info

podman run --rm \
  -e SONAR_HOST_URL="http://host.containers.internal:9000" \
  -e SONAR_TOKEN="squ_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -v "$(pwd):/usr/src:z" \
  sonarsource/sonar-scanner-cli
```

Le scanner lit `sonar-project.properties` (sources `src`, tests colocalises `*.test.ts` +
`*.contract.ts` classes comme tests, `src/db/test-db.ts` exclu). Resultats sur
<http://localhost:9000>.

---

## 5. CodeQL en local (CodeQL CLI, pas l'action)

L'action `github/codeql-action/analyze` **uploade** le SARIF vers GitHub code scanning : elle
suppose l'infra GitHub et **ne tourne pas** en autonomie sous act. En local on utilise la
**CodeQL CLI** (`codeql`) : creation d'une base puis analyse vers un SARIF sur disque.

```bash
# 1. Creer la base CodeQL pour JS/TS (pas de build : Bun/TS interprete)
codeql database create codeql-db \
  --language=javascript-typescript \
  --source-root=. \
  --overwrite

# 2. Analyser avec la suite de securite standard, sortie SARIF
codeql database analyze codeql-db \
  codeql/javascript-queries:codeql-suites/javascript-security-extended.qls \
  --format=sarif-latest \
  --output=codeql.sarif \
  --threads=0

# 3. (optionnel) resume lisible en console
codeql database analyze codeql-db \
  codeql/javascript-queries:codeql-suites/javascript-security-and-quality.qls \
  --format=csv --output=codeql.csv --threads=0
```

- `--language=javascript-typescript` : un seul extracteur couvre JS et TS.
- `codeql/javascript-queries` : query pack livre avec le bundle CodeQL. Suites utiles :
  `javascript-security-extended.qls` (securite ++), `javascript-security-and-quality.qls`
  (securite + qualite).
- Le `codeql.sarif` produit s'ouvre dans VS Code (extension **SARIF Viewer**) ou peut, si un
  jour on le souhaite, etre pousse manuellement (`gh api ... /code-scanning/sarifs`). En local,
  on se contente de le lire : **aucun** upload GitHub, **aucun** billing.

> `codeql-db/`, `codeql.sarif`, `codeql.csv` sont des artefacts locaux : les garder hors de
> git (ajouter au `.gitignore` du bot derive si besoin).

---

## 6. Pieges connus (Windows / Podman / act)

- **`Cannot connect to the Docker daemon`** : `DOCKER_HOST` non exporte ou machine Podman
  arretee. `podman machine start`, puis re-exporter `DOCKER_HOST` (section 2).
- **Docker-in-Docker qui echoue dans `build-smoke`** : le flag `--container-daemon-socket`
  n'est pas passe, ou pointe un socket rootful alors que Podman tourne rootless (ou l'inverse).
  Verifier le chemin avec `echo unix://$XDG_RUNTIME_DIR/podman/podman.sock`.
- **Smoke test qui ne joint pas `/health`** : la sonde de `deep.yml` utilise `docker exec`
  (probe 127.0.0.1 **dans** le conteneur), justement pour eviter les pieges de port publie
  entre conteneurs soeurs sous act. Ne pas la remplacer par `curl localhost:3001` cote runner.
- **SonarQube injoignable depuis le job** : depuis un conteneur (act/scanner), l'hote se joint
  via `host.containers.internal` (Podman), pas `localhost`. Verifier aussi que le port 9000 est
  bien publie (`podman ps`).
- **SonarQube qui refuse de demarrer** (Elasticsearch) : la VM WSL2 peut manquer de
  `vm.max_map_count`. Dans la WSL : `sudo sysctl -w vm.max_map_count=262144`.
- **`codeql: command not found`** : bundle CodeQL absent du `PATH`. Verifier
  `codeql version` et `codeql resolve languages` (doit lister `javascript`).
- **act lent au premier run** : il telecharge l'image runner `catthehacker/ubuntu` (~1 Go).
  Normal, une seule fois ; figer le choix dans `~/.actrc`.
