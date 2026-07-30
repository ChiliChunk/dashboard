---
name: lancer-app
description: Lance le dashboard Garmin complet en local — service Python (backend Garmin) + serveur Vite (front React). À utiliser dès que l'utilisateur demande de lancer, démarrer, tester ou prévisualiser l'app de ce dépôt.
---

# Lancer le dashboard Garmin

Ce projet a deux processus séparés à démarrer, dans cet ordre (le back en
premier : le front interroge `http://127.0.0.1:8799/activities` dès son
premier rendu).

## 1. Backend — service local Garmin (Python)

- Dossier : `garmin-service/`
- Commande : `main.py`, serveur HTTP standard (aucun framework), écoute sur
  `127.0.0.1:8799` uniquement.
- Dépendances requises : `garminconnect`, `python-dotenv` (voir
  `garmin-service/requirements.txt`).
- Identifiants : lus depuis `garmin-service/.env`
  (`GARMIN_EMAIL`, `GARMIN_PASSWORD` — voir `.env.example`). Si ce fichier
  n'existe pas, le service s'arrête immédiatement avec un message d'erreur
  explicite ; ne pas créer ce fichier soi-même, demander les identifiants à
  l'utilisateur.
- Interpréteur : sur cette machine, `C:\Python39\python.exe` a déjà les
  dépendances installées (vérifié le 2026-07-30). Si `garminconnect` n'est
  pas trouvé avec cet interpréteur, l'installer avec
  `pip install -r requirements.txt` (idéalement dans un venv dédié à
  `garmin-service/`) plutôt que de chercher un autre interpréteur système.

Lancer en arrière-plan (Bash) :

```bash
cd garmin-service && "C:\Python39\python.exe" main.py
```

Confirmation de démarrage attendue dans les logs :
`Service Garmin local à l'écoute sur http://127.0.0.1:8799`

## 2. Frontend — Vite + React

- Racine du dépôt, commande `npm run dev` (script dans `package.json`).
- Vite sert par défaut sur `http://localhost:5173`.
- Une configuration est déjà déclarée dans `.Codex/launch.json` sous le nom
  `dashboard-garmin` (`npm run dev`, port 5173) : utiliser
  `preview_start` avec `{"name": "dashboard-garmin"}` pour l'ouvrir dans le
  Browser pane plutôt que de relancer `npm run dev` à la main.

**Ne pas utiliser `wrangler pages dev`** pour ce projet : la fonctionnalité
002 a supprimé tout le dispositif serverless (OAuth Strava, session
chiffrée) — voir `specs/002-source-garmin/plan.md`, décision D4. Les
fonctions Cloudflare Pages restantes (`functions/api/health.ts`) ne sont
utiles qu'en déploiement, jamais en développement local. Le script
`pages:dev` du `package.json` est un résidu de la fonctionnalité 001 ; ne
pas s'y fier pour lancer l'app en local.

## Vérification rapide

```bash
curl -s "http://127.0.0.1:8799/activities?offset=0&limit=3" | head -c 200
```

Doit renvoyer un tableau JSON de 3 activités, de la plus récente à la plus
ancienne (pas une erreur 502 — une 502 indique un problème d'identifiants ou
une session Garmin expirée).

Le service expose une seule route, paginée : `GET /activities?offset=&limit=`
(`limit` plafonné à 200). Il ne filtre rien — c'est le front qui décide ce qui
est nouveau, en comparant au curseur stocké en IndexedDB
(`src/domain/incremental.ts`).

Le front à `http://localhost:5173` doit afficher la synthèse de la semaine
en cours sans message d'erreur de synchronisation.
