"use client";

import React from "react";

export default function SecuritySection() {
  return (
    <section id="securite" className="band sec-rv">
      <div className="w">
        <h2 className="rv">Sécurité &amp; Souveraineté des Données</h2>
        <p className="lead rv">
          Vos données scolaires et financières sont chiffrées et protégées selon les normes internationales les plus strictes.
        </p>

        <div className="trust">
          <div className="tr">
            <div className="n">99.9%</div>
            <p>Disponibilité garantie avec haute fiabilité et sauvegardes automatiques en temps réel.</p>
          </div>

          <div className="tr">
            <div className="n">256-bit</div>
            <p>Toutes les transactions financières et données personnelles sont intégralement chiffrées.</p>
          </div>

          <div className="tr">
            <div className="n">Conforme</div>
            <p>Respect strict des lois et réglementations sur la protection des données personnelles.</p>
          </div>
        </div>

        {/* Payment Partners Badges */}
        <div className="pay">
          <span>MTN Mobile Money</span>
          <span>Orange Money</span>
          <span>Moov Money</span>
          <span>Wave</span>
          <span>Visa / Mastercard</span>
          <span>Virement Bancaire</span>
        </div>
      </div>
    </section>
  );
}
