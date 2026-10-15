---
inclusion: always
---

# Sécurité et conformité — règles non négociables

## 1. Sécurité applicative (section 16)
1. Toute saisie ou modification de note est **vérifiée contre l'affectation réelle** de l'enseignant (`rh.affectations`) à la date de saisie, ET contre l'appartenance de l'apprenant à la classe (`scolarite.classes` / `scolarite.apprenants`).
2. **Chiffrement en transit (TLS)** pour toute communication API.
3. **Chiffrement au repos** pour les PDF de bulletins ET pour toute capture de surveillance de niveau 2.
4. Toute modification de note après clôture est journalisée de façon **immuable** (`audit_note`) : aucune mise à jour ni suppression possible sur cette table.
5. **Aucun identifiant technique interne** exposé en URL ou en réponse API (uniquement les `uuid`).
6. Accès aux notes et bulletins **strictement filtré par `tenant_id` et par relation** (enseignant→ses classes, parent→ses enfants rattachés, apprenant→son propre dossier).
7. Protection renforcée des données des **mineurs** : bulletins accessibles uniquement aux parents rattachés et au personnel autorisé.
8. Captures de surveillance niveau 2 : **purgées automatiquement** après le délai configuré (30 jours par défaut) et **jamais transmises à un service tiers d'analyse automatique**.
9. **Aucune donnée biométrique** n'est traitée par le module.
10. Téléchargement du PDF de bulletin : **URL signée, expirante** (même règle que tout document de la plateforme). Le PDF est stocké dans le schéma `documents`, référencé par `uuid`, **jamais dupliqué**.
11. Super Administrateur : uniquement statistiques consolidées **anonymisées** ; aucune note individuelle hors contexte de support.
12. Authentification : JWT fourni par la Gateway ; la Gateway vérifie aussi le statut du tenant. Appels vers E-learning : **jeton de service**.
13. Secrets (variables d'environnement) : GitHub Actions Secrets en production, jamais commités.

## 2. Droits d'accès par rôle (récapitulatif exécutoire)
- **Enseignant** : écrit/lit uniquement les notes des couples (matière, classe) pour lesquels il est affecté.
- **Censeur/Administrateur** : lit tout dans son `tenant_id` ; peut forcer une correction **tracée avec motif obligatoire** ; configure coefficients, modèles, grilles ; supervise une composition en direct.
- **Apprenant** : lecture seule de son dossier ; passe une composition programmée.
- **Parent** : lecture seule des dossiers de ses enfants rattachés.
- **Super Administrateur** : agrégats anonymisés uniquement.

## 3. Cadre légal des compositions en ligne (section 10.4) — APDP Bénin / principes équivalents RGPD
La plateforme s'adresse très majoritairement à des **apprenants mineurs**. Principes issus de la recommandation de la CNIL du 8 juin 2023 sur la télésurveillance des examens en ligne, transposables au Code du numérique béninois et à l'APDP :
1. **La reconnaissance faciale par webcam est un traitement biométrique interdit** → ne jamais l'implémenter.
2. **Base légale contractuelle** : les modalités d'examen sont fixées dans le **règlement intérieur accepté à l'inscription**, jamais un consentement recueilli sous contrainte.
3. **Alternative réelle, sérieuse et équitable** (passation **en présentiel**) toujours proposée à qui refuse la surveillance à distance.
4. Accès aux données captées **strictement réservé au personnel habilité** de l'établissement.
5. Aucune télésurveillance n'élimine le risque de fraude à zéro, même en présentiel : **la proportionnalité prime sur l'exhaustivité**.

## 4. Interdictions explicites (V1)
- **Aucune détection automatisée de triche par IA** (analyse faciale, analyse comportementale). Choix délibéré : traitement qualifié de biométrique, risque juridique disproportionné pour un public mineur.
- **Aucune décision automatisée de sanction** : la technologie informe, l'humain décide.
- **Aucun flux vidéo continu** (uniquement des photos fixes espacées, niveau 2).
- **Aucune transmission à un tiers** des captures.
- **Aucune note stockée en double**, aucune moyenne/rang figé avant clôture.
- **Aucune écriture directe** d'un autre microservice dans `evaluations.notes`.
- **Aucun coefficient, barème, échelle, arrondi codé en dur.**

## 5. Auditabilité
- 100 % des corrections de notes tracées dans `audit_note` (note, auteur, valeur avant, valeur après, motif, date).
- 100 % des incidents de surveillance tracés dans `surveillance_incident` (évaluation, apprenant, type d'anomalie, horodatage, niveau de preuve) — **jamais de donnée biométrique**.
- Si un PDF avait déjà été généré avant une correction : **nouvelle version** produite, l'ancienne reste consultable en archive.
- Invalidation automatique du cache Redis du bulletin à toute correction post-publication.
