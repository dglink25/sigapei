"use client";

import React from "react";

interface HeroSectionProps {
  apprenants: number;
  presence: number;
  recettes: number;
  isSuspended: boolean;
  onToggleSuspended: () => void;
}

export default function HeroSection({
  apprenants,
  presence,
  recettes,
  isSuspended,
  onToggleSuspended,
}: HeroSectionProps) {
  const headlineWords = [
    "Toute",
    "la",
    "vie",
    "de",
    "votre",
    "école,",
    "dans",
    "une",
    "seule",
    "plateforme.",
  ];

  return (
    <section className="hero sec-rv">
      {/* Parallax Background Shapes */}
      <div className="par p1" data-d="30">
        <div className="sh" />
      </div>
      <div className="par p2" data-d="-22">
        <div className="sh" />
      </div>
      <div className="par p3" data-d="18">
        <div className="sh" />
      </div>
      <div className="par p4" data-d="-34">
        <div className="sh" />
      </div>

      <div className="w">
        <div>
          {/* Animated H1 Title (Word by Word) */}
          <h1 id="h1">
            {headlineWords.map((word, idx) => (
              <React.Fragment key={idx}>
                <span
                  className="wd"
                  style={{ animationDelay: `${0.1 + idx * 0.08}s` }}
                >
                  {word}
                </span>
                {" "}
              </React.Fragment>
            ))}
          </h1>

          <p className="lead hi">
            Inscriptions, notes, bulletins, paiements, présences et demandes de
            documents. Une seule base de vérité pour le fondateur,
            l&apos;enseignant, l&apos;apprenant et le parent.
          </p>

          <div className="cta hi">
            <a className="btn b-o" href="#final">
              Inscrire mon établissement
            </a>
            <a className="btn b-l" href="#modules">
              Découvrir les modules
            </a>
          </div>

          <div className="cyc hi">
            <span>
              <i className="dia" />
              Primaire
            </span>
            <span>
              <i className="dia" />
              Secondaire
            </span>
            <span>
              <i className="dia" />
              Universitaire
            </span>
            <span>
              <i className="dia" />
              Installable sur mobile
            </span>
          </div>
        </div>

        {/* Visual Interactive Dashboard Showcase */}
        <div className="vis">
          {/* Notification Chips */}
          <div className="chip c1">
            <i className="dia" />
            <div>
              Paiement reçu<small>MTN MoMo · 25 000 FCFA</small>
            </div>
          </div>

          <div className="chip c2">
            <i className="dia" />
            <div>
              Bulletin publié<small>6e A · parents notifiés</small>
            </div>
          </div>

          <div className="chip c3">
            <i className="dia" />
            <div>
              Absence signalée<small>Parent prévenu en direct</small>
            </div>
          </div>

          {/* Main Dashboard Box */}
          <div
            className={`dash ${isSuspended ? "off" : ""}`}
            id="dash"
            aria-label="Aperçu du tableau de bord"
          >
            <div className="bar">
              <i />
              <i />
              <i />
              <b>app.sigapei.com/les-flamboyants/administration</b>
            </div>

            <div className="dbody">
              <div className="dash-side">
                <div className="on">Tableau de bord</div>
                <div>Apprenants</div>
                <div>Notes</div>
                <div>Finances</div>
                <div>Demandes</div>
                <div>Personnel</div>
              </div>

              <div className="main">
                <div className="top">
                  <strong>Les Flamboyants</strong>
                  <button
                    className="sw"
                    id="sw"
                    onClick={onToggleSuspended}
                    aria-pressed={isSuspended}
                    aria-label="Simuler une suspension de l'établissement"
                  >
                    <b id="swl">{isSuspended ? "Suspendu" : "Actif"}</b>
                    <span />
                  </button>
                </div>

                {/* KPI Metrics */}
                <div className="kp">
                  <div>
                    <small>Apprenants</small>
                    <b>{apprenants}</b>
                  </div>
                  <div>
                    <small>Présence</small>
                    <b>
                      <span>{presence}</span> %
                    </b>
                  </div>
                  <div>
                    <small>Recettes FCFA</small>
                    <b>
                      <span>{recettes}</span> M
                    </b>
                  </div>
                </div>

                {/* Animated Chart Bars */}
                <div className="chart" id="chart" aria-hidden="true">
                  <i data-h="45" />
                  <i data-h="60" />
                  <i data-h="52" />
                  <i data-h="74" />
                  <i data-h="68" />
                  <i className="a" data-h="88" />
                  <i data-h="80" />
                </div>

                <div className="alert">
                  <i className="dia" />
                  12 soldes impayés depuis plus de 30 jours
                </div>
              </div>
            </div>

            {/* Lock Screen Overlay */}
            <div className="lock">
              <strong>Accès suspendu</strong>
              Cet établissement est suspendu. Contactez la plateforme E-Académique.
              <small style={{ color: "var(--mut)" }}>
                Effet immédiat, une seule écriture en base.
              </small>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
