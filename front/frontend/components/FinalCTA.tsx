"use client";

import React from "react";

export default function FinalCTA() {
  return (
    <section id="final" className="final">
      <div className="w">
        <i className="lg w-24 h-24 mx-auto mb-6 block" role="img" aria-label="Logo E-Académique" />
        <h2 className="rv">Prêt à moderniser la gestion de votre établissement ?</h2>
        <p className="rv">
          Rejoignez les centaines d&apos;écoles qui font confiance à E-Académique pour leur transformation numérique.
        </p>
        <div className="cta rv mt-6">
          <a className="btn b-o" href="#">
            Inscrire mon établissement
          </a>
          <a className="btn b-l" href="#profils">
            Explorer les fonctionnalités
          </a>
        </div>
      </div>
    </section>
  );
}
