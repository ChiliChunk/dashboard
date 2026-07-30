# Dashboard Strava — instructions projet

Ce dépôt suit une méthode **Spec-Driven Development**. Lis la constitution avant
toute action : `.specify/memory/constitution.md`.

## Règle d'or

**Aucun code n'est écrit sans spec validée.** Si on te demande d'implémenter une
fonctionnalité qui n'a pas de `spec.md` approuvé dans `specs/`, ne code pas :
propose de lancer `/specify` d'abord.

## Cycle de travail

Quatre phases, chacune produisant un livrable relu et validé par un humain avant
de passer à la suivante :

| Phase | Commande     | Produit                          | Question à laquelle il répond |
|-------|--------------|----------------------------------|-------------------------------|
| 1     | `/specify`   | `specs/<id>-<slug>/spec.md`      | Quoi et pourquoi              |
| 2     | `/plan`      | `specs/<id>-<slug>/plan.md`      | Comment, techniquement        |
| 3     | `/tasks`     | `specs/<id>-<slug>/tasks.md`     | Dans quel ordre               |
| 4     | `/implement` | Le code                          | —                             |

Ne saute jamais une phase. Ne fusionne jamais deux phases dans une même réponse.

## Discipline de spécification

- Une spec décrit **le comportement observable**, jamais l'implémentation. Pas de
  nom de librairie, pas de nom de fonction, pas de schéma de base dans un `spec.md`.
- Toute ambiguïté est marquée `[À CLARIFIER: question précise]` plutôt que
  tranchée en silence. Une hypothèse implicite est une dette.
- Tout critère d'acceptation est vérifiable : une machine ou un relecteur doit
  pouvoir statuer sans débat.

## Discipline d'implémentation

- On implémente **une tâche à la fois**, dans l'ordre de `tasks.md`.
- Chaque tâche terminée est cochée dans `tasks.md` dans la foulée.
- Si une tâche s'avère impossible ou mal définie, on s'arrête et on remonte le
  problème à la spec ou au plan. On n'improvise pas.

## État actuel

- Constitution : rédigée (v1.0.0). Toujours en vigueur pour la fonctionnalité
  002, à une exception près : l'article IV (« le quota Strava est une
  ressource rare ») est **sans objet** depuis l'abandon de Strava — signalé
  dans `specs/002-source-garmin/plan.md` (section 1 et risques), non corrigé
  silencieusement. Un amendement explicite de la constitution serait
  cohérent mais reste une décision de gouvernance distincte, non prise ici.
- **Fonctionnalité 001** (`specs/001-dashboard-strava/`) : implémentation
  gelée à 40/43 tâches (2026-07-29). L'API Strava étant devenue payante,
  cette fonctionnalité est remplacée par la 002 plutôt que poursuivie — les
  restantes T073–T075 ne seront pas traitées.
- **Fonctionnalité en cours : `specs/002-source-garmin/`** — remplace Strava
  par un compte Garmin comme source de données, sans démarche de connexion
  dans l'application (identifiants configurés dans `garmin-service/.env`).
- Phase atteinte : **4 — implémentation, 15/15 tâches terminées (2026-07-29).**
  `npx tsc --noEmit`, `npm run lint`, `npm run test` (72 tests) et
  `npm run build` passent tous. **Vérifié avec un compte Garmin réel** (T012,
  T051) : toutes les vues existantes (synthèse, répartition par jour, liste,
  détail d'une sortie, progression) affichent correctement de vraies
  activités Garmin.
- Deux erreurs de conception corrigées grâce à cette vérification réelle,
  détaillées dans `specs/002-source-garmin/tasks.md` (notes T011/T012/T033) :
  la distinction Garmin entre durée déplacée (`movingDuration`) et durée
  écoulée (`elapsedDuration`), et l'absence d'un appel Garmin équivalent à
  « détail d'une activité » côté Strava (le détail d'une sortie est lu depuis
  le cache local déjà synchronisé, pas re-demandé au réseau).
- Hors périmètre de la fonctionnalité 002, laissés pour une itération
  suivante si besoin : cadence, puissance et tracé GPS pour les activités
  Garmin (noms de champs confirmés mais pas encore câblés — voir
  `src/domain/schemas.ts`).
- Référence visuelle de la fonctionnalité 001 (conservée à titre historique) :
  `specs/001-dashboard-strava/design/maquette-tableau-de-bord.html`.

## Contexte technique retenu

- Front statique Vite + React + TypeScript strict (inchangé depuis 001)
- Plus de fonction serverless ni de flux OAuth : le service qui parle à
  Garmin (`garmin-service/`, Python) tourne en local, sur la machine de
  l'utilisateur, et n'écoute que sur `127.0.0.1`
- Coût d'exploitation nul par construction : tout tourne en local, rien n'est
  hébergé à distance (`specs/002-source-garmin/plan.md`, décision D1)
