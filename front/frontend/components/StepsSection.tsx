"use client";

import React from "react";

export default function StepsSection() {
  return (
    <section id="demarrer" className="sec-rv sect-alt">
      <div className="w">
        <h2 className="rv">Comment démarrer avec sigapei ?</h2>
        <p className="lead rv">
          Une mise en service rapide en 4 étapes simples, sans infrastructure lourde ni installation complexe.
        </p>

        <div className="steps in">
          <div className="st">
            <em>01</em>
            <h3>Inscription de l&apos;école</h3>
            <p>Création de votre espace établissement personnalisé en moins de 2 minutes.</p>
          </div>

          <div className="st">
            <em>02</em>
            <h3>Import des effectifs</h3>
            <p>Importation facile des apprenants et enseignants via fichier Excel / CSV.</p>
          </div>

          <div className="st">
            <em>03</em>
            <h3>Paramétrage des cycles</h3>
            <p>Configuration des classes, séries, coefficients et frais de scolarité.</p>
          </div>

          <div className="st">
            <em>04</em>
            <h3>Ouverture des accès</h3>
            <p>Envoi des identifiants sécurisés aux enseignants, apprenants et parents.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
