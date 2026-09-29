"use client";

import React, { useState } from "react";

export default function ProfilesSection() {
  const [activeTab, setActiveTab] = useState(0);

  const profilesData = [
    {
      id: "fondateur",
      title: "Fondateur & Directeur Général",
      role: "Supervision Globale & Contrôle Financier",
      desc: "Supervision globale du réseau ou de l'établissement, suivi des recettes en temps réel, statistiques d'assiduité et contrôle d'accès instantané.",
      features: [
        "Tableau de bord consolidé pour l'ensemble des établissements du groupe",
        "Gestion immédiate du statut d'accès (activation / suspension en un clic)",
        "Traçabilité intégrale de toutes les transactions et actes administratifs",
        "Suivi analytique du taux de recouvrement et des impayés",
      ],
      phoneTitle: "Directeur Général",
      phoneSubtitle: "4 Écoles connectées",
      rows: [
        { label: "Recettes ce mois", val: "48.2 M FCFA", status: "ok", tag: "+14%" },
        { label: "Taux de présence", val: "96.8 %", status: "ok", tag: "Optimal" },
        { label: "Bulletins T1 validés", val: "100 %", status: "ok", tag: "Terminé" },
      ],
    },
    {
      id: "enseignant",
      title: "Enseignants & Équipe Pédagogique",
      role: "Appel Numérique & Suivi des Notes",
      desc: "Saisie rapide des notes sur smartphone ou tablette, appel numérique en classe en 3 secondes, cahier de texte électronique et transmission des devoirs.",
      features: [
        "Faire l'appel en classe depuis n'importe quel smartphone",
        "Saisie simplifiée des notes avec calcul automatique des moyennes",
        "Partage direct des cours, exercices et devoirs à la maison",
        "Communication fluide avec l'administration et les parents",
      ],
      phoneTitle: "Espace Enseignant",
      phoneSubtitle: "Classe de Terminale C",
      rows: [
        { label: "Appel du jour", val: "34 / 35 Présents", status: "ok", tag: "Fait" },
        { label: "Devoir de Math", val: "28 Copie(s) rendue(s)", status: "wa", tag: "En cours" },
        { label: "Moyenne Classe", val: "14.8 / 20", status: "ok", tag: "Satisfaisant" },
      ],
    },
    {
      id: "apprenant",
      title: "Apprenants & Étudiants",
      role: "Emploi du Temps, Devoirs & Bulletins",
      desc: "Consultation de l'emploi du temps en direct, cahier de devoirs interactif, téléchargement des cours et accès sécurisé aux bulletins scolaires.",
      features: [
        "Accès 24h/24 à l'emploi du temps et aux salles de cours",
        "Dépôt en ligne des travaux et devoirs à domicile",
        "Téléchargement des bulletins trimestriels en PDF sécurisé",
        "Bibliothèque numérique et ressources d'apprentissage",
      ],
      phoneTitle: "Espace Apprenant",
      phoneSubtitle: "KOUASSI Jean-Marc",
      rows: [
        { label: "Prochain cours", val: "Physique - Salle 12", status: "ok", tag: "14h00" },
        { label: "Moyenne T1", val: "15.4 / 20", status: "ok", tag: "Rang: 2e" },
        { label: "Devoirs à rendre", val: "2 Exercices", status: "wa", tag: "Demain" },
      ],
    },
    {
      id: "parent",
      title: "Parents d'Élèves & Tuteurs",
      role: "Alertes Instantanées & Paiements Mobile",
      desc: "Notifications instantanées des absences/retards, règlement des frais par Mobile Money (MTN, Orange, Moov, Wave), suivi des notes et demandes de documents.",
      features: [
        "Alertes instantanées SMS / WhatsApp en cas de retard ou d'absence",
        "Paiement rapide des frais de scolarité via Mobile Money ou Carte",
        "Consultation en temps réel des notes et appréciations des professeurs",
        "Demande et téléchargement des certificats de scolarité en ligne",
      ],
      phoneTitle: "Portail Parent",
      phoneSubtitle: "Suivi de 2 Enfants",
      rows: [
        { label: "Paiement Scolarité", val: "25 000 FCFA", status: "ok", tag: "Validé" },
        { label: "Présence aujourd'hui", val: "Présent en classe", status: "ok", tag: "07h45" },
        { label: "Alertes récents", val: "0 Absence", status: "ok", tag: "À jour" },
      ],
    },
    {
      id: "secretariat",
      title: "Secrétariat & Comptabilité",
      role: "Inscriptions, Cartes QR-Code & Facturation",
      desc: "Gestion des candidatures, suivi des impayés, impression automatique des cartes scolaires avec QR-Code et édition des états financiers officiels.",
      features: [
        "Validation en ligne des dossiers de pré-inscription et réinscription",
        "Facturation automatique et relance ciblée des soldes impayés",
        "Génération et impression des cartes d'étudiants avec QR-Code sécurisé",
        "Édition automatique des registres matricules et attestations",
      ],
      phoneTitle: "Secrétariat & Finance",
      phoneSubtitle: "Gestion Administrative",
      rows: [
        { label: "Nouvelles inscriptions", val: "+145 Dossiers", status: "ok", tag: "Validés" },
        { label: "Cartes imprimées", val: "620 Cartes QR", status: "ok", tag: "Terminé" },
        { label: "Relances scolarité", val: "12 Envoyer SMS", status: "wa", tag: "En attente" },
      ],
    },
  ];

  const current = profilesData[activeTab];

  return (
    <section id="profils">
      <div className="w">
        <h2 className="rv">Un espace pensé pour chacun.</h2>
        <p className="lead rv">
          Chaque profil voit uniquement ce qui lui sert, avec des droits définis par le fondateur.
        </p>

        {/* Tabs Bar */}
        <div className="tabs rv" role="tablist" id="tabs">
          {profilesData.map((p, idx) => (
            <button
              key={p.id}
              className="tab"
              role="tab"
              aria-selected={activeTab === idx}
              onClick={() => setActiveTab(idx)}
            >
              {p.title.split("&")[0]}
            </button>
          ))}
        </div>

        {/* Interactive Panel */}
        <div className="panel rv" id="panel" role="tabpanel">
          <div>
            <span className="tag ok mb-2 inline-block">{current.role}</span>
            <h3 className="text-2xl font-bold text-[#006B3C] dark:text-[#FFF6DD] mt-1 mb-3">
              {current.title}
            </h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              {current.desc}
            </p>

            <ul>
              {current.features.map((feat, fIdx) => (
                <li key={fIdx}>
                  <i className="dia" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {feat}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Phone Mockup Screen */}
          <div className="phone">
            <div className="scr">
              <div>
                <h4>{current.phoneTitle}</h4>
                <small>{current.phoneSubtitle}</small>
              </div>

              {current.rows.map((r, rIdx) => (
                <div key={rIdx} className="row">
                  <div>
                    <div className="text-[11px] text-slate-500 font-semibold">
                      {r.label}
                    </div>
                    <div className="text-xs font-bold text-slate-900">
                      {r.val}
                    </div>
                  </div>
                  <span className={`tag ${r.status}`}>{r.tag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
