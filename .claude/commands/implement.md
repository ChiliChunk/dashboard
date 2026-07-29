---
description: Phase 4 — exécute les tâches d'une fonctionnalité, une par une
---

Tu vas implémenter la fonctionnalité : **$ARGUMENTS**
(si l'argument est vide, prends la fonctionnalité la plus récente dans `specs/`).

## Procédure

1. Lis la constitution, puis `spec.md`, `plan.md` et `tasks.md`.
2. Identifie la **première tâche non cochée** dans l'ordre du fichier.
3. Vérifie que ses dépendances sont toutes cochées. Sinon, arrête-toi et signale
   l'incohérence.
4. Implémente **cette tâche uniquement**.
5. Vérifie sa condition « Terminé quand ». Si elle porte sur des tests, lance-les
   réellement et rapporte la sortie.
6. Coche la tâche dans `tasks.md` et mets à jour le tableau de suivi.
7. Rends la main en indiquant la tâche suivante. **N'enchaîne pas** sans accord.

## Règles impératives

- **Une seule tâche par invocation.** Le contrôle humain entre les tâches est le
  cœur de la méthode ; l'enchaînement automatique le supprime.
- **N'implémente rien qui ne soit pas dans la tâche courante.** Pas de
  refactorisation opportuniste, pas de fonctionnalité anticipée, pas de « pendant
  que j'y suis ».
- **Si la tâche est infaisable ou mal définie, arrête-toi.** Remonte le problème
  au `plan.md` ou au `spec.md` et propose l'amendement. N'improvise jamais une
  solution qui s'écarte des documents.
- **Si tu constates un écart entre le code existant et la spec**, signale-le
  avant de continuer.

## En fin de commande

Affiche : la tâche traitée, les fichiers modifiés, le résultat de la vérification
(y compris les échecs, tels quels), et la tâche suivante.
