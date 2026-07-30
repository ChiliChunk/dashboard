# Dashboard Garmin — instructions projet

## État actuel

- **Source de données : Garmin**, remplace Strava (API devenue payante).
  Identifiants configurés dans `garmin-service/.env`, pas de flux de connexion
  dans l'application.
- Deux points d'attention issus d'une vérification avec un compte Garmin réel :
  la distinction Garmin entre durée déplacée (`movingDuration`) et durée
  écoulée (`elapsedDuration`), et l'absence d'un appel Garmin équivalent à
  « détail d'une activité » côté Strava (le détail d'une sortie est lu depuis
  le cache local déjà synchronisé, pas re-demandé au réseau).
- Laissés pour une itération suivante si besoin : cadence, puissance et tracé
  GPS pour les activités Garmin (noms de champs confirmés mais pas encore
  câblés — voir `src/domain/schemas.ts`).

## Contexte technique retenu

- Front statique Vite + React + TypeScript strict
- Plus de fonction serverless ni de flux OAuth : le service qui parle à
  Garmin (`garmin-service/`, Python) tourne en local, sur la machine de
  l'utilisateur, et n'écoute que sur `127.0.0.1`
- Coût d'exploitation nul par construction : tout tourne en local, rien n'est
  hébergé à distance
