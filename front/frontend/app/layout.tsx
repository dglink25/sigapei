import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "E-Académique — La gestion scolaire, de l'école primaire à l'université",
  description:
    "Inscriptions, notes, bulletins, paiements, présences et demandes de documents. Une seule base de vérité pour le fondateur, l'enseignant, l'apprenant et le parent.",
  keywords: [
    "SIGAPEI",
    "E-Académique",
    "Gestion scolaire",
    "Bulletins scolaires",
    "Vie scolaire",
    "Inscriptions en ligne",
    "E-learning",
    "Paiements Mobile Money",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${poppins.variable}`}>
      <body>{children}</body>
    </html>
  );
}
