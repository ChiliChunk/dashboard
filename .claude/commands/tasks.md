---
description: Phase 3 — découpe un plan validé en tâches atomiques ordonnées
---

Tu vas produire la liste de tâches de la fonctionnalité : **$ARGUMENTS**
(si l'argument est vide, prends la fonctionnalité la plus récente dans `specs/`).

## Procédure

1. Lis la constitution, le `spec.md` et le `plan.md` de la fonctionnalité.
2. **Vérifie que le plan est au statut `Validé`.** Sinon, arrête-toi et signale-le.
3. Lis `.specify/templates/tasks-template.md`.
4. Rédige `specs/<id>-<slug>/tasks.md`.

## Règles impératives

- **Une tâche = une session de travail.** Si elle touche plus de trois ou quatre
  fichiers, découpe-la.
- **Chaque tâche cite les critères d'acceptation qu'elle couvre.** À la fin, tout
  critère de la spec doit être couvert par au moins une tâche. Vérifie-le
  explicitement et signale les manques.
- **L'ordre est un vrai ordre.** Les dépendances sont déclarées. Ce qui peut
  vraiment tourner en parallèle est marqué `[P]`.
- **« Terminé quand » est une condition observable**, pas une intention.
- Les tâches de test sont des tâches à part entière, pas une note en bas de page.

## En fin de commande

Affiche le nombre de tâches par lot, et la liste des critères d'acceptation qui
ne seraient couverts par aucune tâche.
