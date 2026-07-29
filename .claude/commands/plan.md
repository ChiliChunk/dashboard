---
description: Phase 2 — traduit une spec validée en plan technique
---

Tu vas produire le plan technique de la fonctionnalité : **$ARGUMENTS**
(si l'argument est vide, prends la fonctionnalité la plus récente dans `specs/`).

## Procédure

1. Lis `.specify/memory/constitution.md`.
2. Lis le `spec.md` de la fonctionnalité.
3. **Vérifie le statut de la spec.** S'il n'est pas `Validée`, ou si la section
   « Points à clarifier » contient encore des questions sans décision, **arrête-toi**
   et signale-le à l'utilisateur. Ne planifie pas sur une spec instable.
4. Lis `.specify/templates/plan-template.md`.
5. Rédige `specs/<id>-<slug>/plan.md`.

## Règles impératives

- **Le tableau de conformité à la constitution se remplit en premier**, pas en
  dernier. S'il révèle une violation, revois la conception avant d'écrire la suite.
- **Chaque composant se rattache à un critère d'acceptation.** Si tu ne peux pas
  écrire à quel `CA` sert un morceau d'architecture, c'est de la sur-conception :
  supprime-le.
- **N'ajoute aucun besoin.** Le plan ne fait qu'outiller la spec. Si tu penses
  qu'il manque une fonctionnalité, dis-le à l'utilisateur, ne l'ajoute pas.
- **Les décisions structurantes sont tracées** avec les options écartées et les
  conséquences acceptées.

## En fin de commande

Affiche le chemin du plan, les décisions structurantes et les risques identifiés.
N'enchaîne pas sur les tâches.
