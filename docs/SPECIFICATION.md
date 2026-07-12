# Spécification fonctionnelle — Famille Patience

## Agent pointeur

> **Un agent pointeur n'est pas une responsabilité permanente, mais une affectation temporaire liée à un événement.**
>
> **Tout membre**, quelle que soit sa responsabilité dans la plateforme (**Membre, Référent ou Conseiller**), peut être désigné comme agent pointeur pour un ou plusieurs événements.
>
> Lorsqu'il est désigné, il obtient automatiquement l'accès à la section **Mes événements**, où sont affichés uniquement les événements pour lesquels il est agent pointeur.
>
> Les événements ouverts (en cours) sont affichés en haut de la liste et sont mis en évidence (par exemple en vert). En sélectionnant un événement ouvert, un bouton **« Présences »** permet d'ouvrir l'application de pointage afin d'enregistrer les présences des participants.
>
> Lorsque l'événement est clôturé par l'administrateur, l'accès au pointage pour cet événement est automatiquement retiré.

### Règles d'administration

- À l'**ouverture** d'un événement, l'administrateur doit désigner **au moins un** agent pointeur (maximum 5).
- Aucun événement ne peut être ouvert sans agent pointeur.
- À chaque nouvel événement, une **nouvelle sélection** est requise (même membres que précédemment).
- À la **clôture**, toutes les affectations agents de cet événement sont révoquées (`EventAgentAssignment.is_active = False`).

### Interface membre (`/membre/evenements`)

| État | Comportement |
|------|----------------|
| Affectation active (≥1 événement ouvert) | **Mes événements** liste uniquement les événements assignés (ouverts puis terminés). |
| Sans affectation active | **Mes événements** affiche les participations personnelles du membre (à venir, participations, passés). |
| Événement ouvert | Carte verte, bouton **Présences** → application de pointage (`/membre/pointage`). |
| Événement terminé | Consultation seule (informations + historique des présences). |

### Interface administrateur (`/gestion/`)

- Ouverture d'événement avec sélection obligatoire des agents pointeurs.
- Pointage en direct disponible sur `/gestion/pointage` (scan admin, indépendant des agents).

## Accès et applications

| URL | Rôle |
|-----|------|
| `/membre/` | Membre, Référent, Conseiller (interface adaptée au rôle) |
| `/gestion/` | Administrateur uniquement |

L'inscription crée toujours un compte **Membre**. Les rôles Référent et Conseiller sont attribués par l'administrateur.
