---
description: Phase 1 — rédige la spécification fonctionnelle d'une fonctionnalité
---

Tu vas rédiger une spécification pour : **$ARGUMENTS**

## Procédure

1. Lis `.specify/memory/constitution.md`.
2. Lis `.specify/templates/spec-template.md`.
3. Détermine l'identifiant de la fonctionnalité : examine `specs/`, prends le
   numéro suivant sur trois chiffres, ajoute un slug court en minuscules.
4. Rédige `specs/<id>-<slug>/spec.md` en suivant strictement le template.

## Règles impératives

- **Zéro technique.** Aucun nom de librairie, de framework, de fonction, de table
  ou de composant. Si tu écris « React », « fetch » ou « localStorage », tu es
  hors sujet : ces éléments appartiennent à la phase `/plan`.
- **Marque les ambiguïtés, ne les résous pas.** Chaque fois que la demande laisse
  un choix ouvert qui changerait le produit, écris
  `[À CLARIFIER: question précise]` et reporte-le dans la section 7. Ne comble
  jamais un trou par une hypothèse silencieuse.
- **Tout critère d'acceptation est vérifiable.** « L'interface est rapide » est
  refusé ; « la première vue s'affiche en moins de 2 s sur une connexion 4G » est
  accepté.
- **Le périmètre exclu est obligatoire.** Liste explicitement ce que la
  fonctionnalité ne fera pas.

## En fin de commande

Affiche à l'utilisateur : le chemin du fichier créé, la liste des points à
clarifier, et rien d'autre. N'enchaîne pas sur le plan — la spec doit d'abord
être relue et validée par un humain.
