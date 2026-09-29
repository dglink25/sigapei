"use client";

import React from "react";

export default function OffersSection() {
  return (
    <section id="offres">
      <div className="w">
        <h2 className="rv">Des tarifs adaptés à la taille de votre école.</h2>
        <p className="lead rv">
          Pas de frais cachés. Choisissez la formule correspondant à votre effectif d&apos;apprenants.
        </p>

        <div className="plans">
          <div className="pl">
            <h3>Primaire &amp; Maternelle</h3>
            <div className="who">Écoles élémentaires &amp; préscolaires</div>
            <ul>
              <li><i className="dia" />Appel numérique quotidien</li>
              <li><i className="dia" />Bulletins simples &amp; compétences</li>
              <li><i className="dia" />Suivi des frais de scolarité</li>
              <li><i className="dia" />Alertes SMS aux parents</li>
            </ul>
            <a className="btn b-l" href="#final">Demander un devis</a>
          </div>

          <div className="pl hot">
            <span className="pop">Le plus choisi</span>
            <h3>Collège &amp; Lycée</h3>
            <div className="who">Établissements secondaires</div>
            <ul>
              <li><i className="dia" />Gestion des séries &amp; coefs</li>
              <li><i className="dia" />Bulletins PDF sécurisés</li>
              <li><i className="dia" />Paiements Mobile Money</li>
              <li><i className="dia" />Cartes d&apos;élèves QR-Code</li>
              <li><i className="dia" />E-Learning &amp; Devoirs</li>
            </ul>
            <a className="btn b-o" href="#final">Choisir cette formule</a>
          </div>

          <div className="pl">
            <h3>Université &amp; Supérieur</h3>
            <div className="who">Facultés &amp; Grands Instituts</div>
            <ul>
              <li><i className="dia" />Système LMD &amp; Crédits ECTS</li>
              <li><i className="dia" />Portail d&apos;examens &amp; délibérations</li>
              <li><i className="dia" />Gestion des vacataires</li>
              <li><i className="dia" />Suivi des mémoires &amp; stages</li>
            </ul>
            <a className="btn b-l" href="#final">Demander un devis</a>
          </div>

          <div className="pl">
            <h3>Groupe Scolaire</h3>
            <div className="who">Réseaux multi-établissements</div>
            <ul>
              <li><i className="dia" />Dashboard consolidé réseau</li>
              <li><i className="dia" />Transferts d&apos;élèves inter-écoles</li>
              <li><i className="dia" />Supervision budgétaire groupe</li>
              <li><i className="dia" />Support dédié 24/7 &amp; API</li>
            </ul>
            <a className="btn b-l" href="#final">Contact Groupe</a>
          </div>
        </div>
      </div>
    </section>
  );
}
