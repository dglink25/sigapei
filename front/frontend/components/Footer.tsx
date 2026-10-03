"use client";

import React from "react";

export default function Footer() {
  return (
    <footer>
      <div className="w">
        <div className="flex items-center gap-3">
          <i className="lg w-9 h-9 block" role="img" aria-label="Logo" />
          <span className="ft-brand">SIGAPEI</span>
        </div>
        <div>© 2026 SIGAPEI. Tous droits réservés.</div>
        <div className="flex gap-4 text-xs">
          <a href="#" className="hover:underline">Mentions légales</a>
          <a href="#" className="hover:underline">Confidentialité</a>
          <a href="#" className="hover:underline">Sécurité</a>
        </div>
      </div>
    </footer>
  );
}
