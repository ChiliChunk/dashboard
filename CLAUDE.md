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

- Constitution : rédigée (v1.0.0)
- Fonctionnalité en cours : `specs/001-dashboard-strava/`
- Phase atteinte : **4 — implémentation, 40/43 tâches terminées (2026-07-29).
  `npx tsc --noEmit`, `npm run lint` et `npm run test` (73 tests) passent tous.
  `npm run build` produit un site statique fonctionnel (903 modules) servi
  avec succès via `wrangler pages dev`.**
- D5 (fond cartographique) tranchée le 2026-07-29 : fond activable, désactivé
  par défaut (`src/ui/TrackView.tsx`). T052 est faite.
- Polices Inter embarquées (`public/fonts/*.woff2`, licence SIL, téléchargement
  autorisé explicitement le 2026-07-29). T003 est complète.
- **Restent T073, T074, T075** (lot 7) : elles exigent respectivement un test
  multi-navigateurs réel (Firefox/Safari, hors de cet environnement), un
  compte Strava vivant authentifié, et une révocation d'autorisation
  déclenchée depuis Strava. Non automatisables (le plan, section 7, l'admet
  explicitement).
- **Aucune donnée réelle synchronisée** : sans identifiants Strava
  (`STRAVA_CLIENT_ID`/`STRAVA_CLIENT_SECRET` dans `.dev.vars`, gitignored),
  l'application ne peut être vérifiée visuellement au-delà de l'écran de
  connexion. L'utilisateur a choisi de créer l'application Strava lui-même et
  d'éditer `.dev.vars` directement — en attente de confirmation pour relancer
  T074 et la vérification visuelle complète qui en dépend.
- Référence visuelle : `specs/001-dashboard-strava/design/maquette-tableau-de-bord.html`
  — fait autorité sur le registre visuel, pas par omission (décision Q11).

## Contexte technique retenu

Décidé lors du cadrage, à confirmer en phase `/plan` :

- Front statique Vite + React + TypeScript strict
- Une fonction serverless unique pour l'échange de tokens OAuth (le
  `client_secret` Strava ne peut pas vivre côté navigateur)
- Hébergement en palier gratuit, scale-to-zero
