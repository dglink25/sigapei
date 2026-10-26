-- Rôle applicatif du service Paiement : SANS droit de propriétaire, donc soumis à l'isolation par établissement (RLS)
-- et incapable de modifier ou supprimer les tables en ajout seul (grand livre, audit, reçus, historiques).
-- À exécuter une fois par le propriétaire du schéma, après les migrations. Puis : GRANT paiement_app TO <utilisateur_de_connexion>;
-- et définir DB_ROLE_APPLICATIF=paiement_app (le service fait SET LOCAL ROLE à chaque transaction).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'paiement_app') THEN
    CREATE ROLE paiement_app NOLOGIN NOBYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA paiement TO paiement_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA paiement TO paiement_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA paiement TO paiement_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA paiement TO paiement_app;

-- Tables en ajout seul : ni modification, ni suppression, même en cas de bug applicatif
REVOKE UPDATE, DELETE, TRUNCATE ON paiement.ecriture, paiement.ecriture_groupe, paiement.historique_statut,
  paiement.audit_evenement, paiement.appel_agregateur, paiement.recu FROM paiement_app;
-- Données financières : jamais de suppression
REVOKE DELETE, TRUNCATE ON paiement.encaissement, paiement.decaissement, paiement.remboursement, paiement.compte,
  paiement.portefeuille, paiement.compte_reception, paiement.sequence_recu, paiement.etat_transition, paiement.devise,
  paiement.agregateur, paiement.mode_paiement FROM paiement_app;
-- Référentiel des transitions : lecture seule pour l'application
REVOKE INSERT, UPDATE ON paiement.etat_transition FROM paiement_app;
