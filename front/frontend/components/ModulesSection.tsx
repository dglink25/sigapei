"use client";

import React from "react";

export default function ModulesSection() {
  return (
    <section id="modules" className="sec-rv">
      <div className="w">
        <h2 className="rv">Tout ce dont un établissement a besoin.</h2>
        <p className="lead rv">
          Chaque information existe à un seul endroit. Elle est partagée entre modules, jamais recopiée.
        </p>

        <div className="mods" id="mods">
          <div className="mod big rv">
            <i className="dia" />
            <h3>Finances et paiements</h3>
            <p>
              Frais de scolarité, reçus automatiques, intégration Mobile Money (MTN, Orange, Moov, Wave) et banques. Suivi en direct des impayés et recouvrement.
            </p>
          </div>

          <div className="mod rv">
            <i className="dia" />
            <h3>Scolarité & Bulletins</h3>
            <p>
              Calcul automatique des moyennes, gestion des coefficients par série et édition des bulletins officiels en PDF sécurisés.
            </p>
          </div>

          <div className="mod rv">
            <i className="dia" />
            <h3>Vie Scolaire & Présences</h3>
            <p>
              Appel numérique en classe sur mobile, gestion des retards/absences et alertes directes transmises aux parents.
            </p>
          </div>

          <div className="mod rv">
            <i className="dia" />
            <h3>Inscriptions & Réinscriptions</h3>
            <p>
              Portail de pré-inscription en ligne, numérisation des pièces justificatives et validation des dossiers d&apos;admission.
            </p>
          </div>

          <div className="mod rv">
            <i className="dia" />
            <h3>E-Learning & Devoirs</h3>
            <p>
              Bibliothèque numérique, dépôt de cours, devoirs à rendre et quiz d&apos;évaluation accessibles 24/7.
            </p>
          </div>

          <div className="mod rv">
            <i className="dia" />
            <h3>Supervision Multi-Écoles</h3>
            <p>
              Consolidation des données pour les groupes scolaires, comparatifs inter-écoles et tableaux de bord consolidés.
            </p>
          </div>

          <div className="mod rv">
            <i className="dia" />
            <h3>Identité & Cartes QR-Code</h3>
            <p>
              Gestion fine des rôles et génération automatique des cartes d&apos;étudiants sécurisées avec QR-Code.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
