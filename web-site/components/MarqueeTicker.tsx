"use client";

import React from "react";

export default function MarqueeTicker() {
  const tickerItems = [
    "sigapei • SIGAPEI",
    "Une seule base de vérité",
    "Présences en temps réel",
    "Inscriptions en ligne",
    "Bulletins certifiés PDF",
    "Paiements Mobile Money & Banque",
    "Cartes QR-Code sécurisées",
    "Du primaire à l'université",
  ];

  return (
    <div className="tk" aria-hidden="true">
      <div className="tr2" id="tk">
        <span>
          {tickerItems.map((item, idx) => (
            <React.Fragment key={idx}>
              <i className="dia" />
              <span>{item}</span>
            </React.Fragment>
          ))}
        </span>
        <span>
          {tickerItems.map((item, idx) => (
            <React.Fragment key={`repeat-${idx}`}>
              <i className="dia" />
              <span>{item}</span>
            </React.Fragment>
          ))}
        </span>
      </div>
    </div>
  );
}
