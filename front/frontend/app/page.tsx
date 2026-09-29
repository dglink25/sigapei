"use client";

import React, { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import MarqueeTicker from "@/components/MarqueeTicker";
import ProfilesSection from "@/components/ProfilesSection";
import ModulesSection from "@/components/ModulesSection";
import StepsSection from "@/components/StepsSection";
import SecuritySection from "@/components/SecuritySection";
import OffersSection from "@/components/OffersSection";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

export default function Home() {
  const [isDark, setIsDark] = useState(false);
  const [isSide, setIsSide] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [activeNav, setActiveNav] = useState("top");

  // Counter states
  const [apprenants, setApprenants] = useState(0);
  const [presence, setPresence] = useState(0);
  const [recettes, setRecettes] = useState(0);

  // Reference for chart animation
  const chartRef = useRef<HTMLDivElement>(null);

  // Theme toggle handler
  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.setAttribute("data-theme", "light");
    }
  }, [isDark]);

  // Sidebar / Navbar layout toggle handler
  useEffect(() => {
    if (isSide) {
      document.body.classList.add("side");
    } else {
      document.body.classList.remove("side");
    }
  }, [isSide]);

  // Animate KPI numbers on mount
  useEffect(() => {
    let start = 0;
    const interval = setInterval(() => {
      start += 1;
      if (start <= 100) {
        setApprenants(Math.floor((620 * start) / 100));
        setPresence(Math.floor((96 * start) / 100));
        setRecettes(parseFloat(((8.4 * start) / 100).toFixed(1)));
      } else {
        clearInterval(interval);
      }
    }, 20);
    return () => clearInterval(interval);
  }, []);

  // Scroll Listener for Parallax (.par) and Active Link Highlight
  useEffect(() => {
    const handleScroll = () => {
      const sy = window.scrollY;

      // Parallax effect on floating shapes
      document.querySelectorAll<HTMLElement>(".par").forEach((el) => {
        const d = parseFloat(el.getAttribute("data-d") || "0");
        el.style.transform = `translateY(${sy * d * 0.015}px)`;
      });

      // Active Navigation Link Highlighting
      const sections = document.querySelectorAll<HTMLElement>("section[id]");
      let current = "top";
      sections.forEach((sec) => {
        const top = sec.offsetTop - 140;
        if (sy >= top) {
          current = sec.id;
        }
      });
      setActiveNav(current);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Intersection Observer for Scroll Reveal (.rv, .steps, #chart)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");

            // Animate Chart Bars on Scroll Reveal
            if (entry.target.id === "chart") {
              const bars = entry.target.querySelectorAll<HTMLElement>("i[data-h]");
              bars.forEach((bar) => {
                const h = bar.getAttribute("data-h");
                if (h) bar.style.height = `${h}%`;
              });
            }
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll(".rv, .steps, #chart").forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Header (Navbar + Scrim) */}
      <Header
        isDark={isDark}
        onToggleDark={() => setIsDark(!isDark)}
        isSide={isSide}
        onToggleSide={() => setIsSide(!isSide)}
        activeNav={activeNav}
      />

      {/* Page Content Container */}
      <div id="page">
        <main id="top">
          {/* Hero Section */}
          <HeroSection
            apprenants={apprenants}
            presence={presence}
            recettes={recettes}
            isSuspended={isSuspended}
            onToggleSuspended={() => setIsSuspended(!isSuspended)}
          />

          {/* Marquee Ticker */}
          <MarqueeTicker />

          {/* Profiles Section */}
          <ProfilesSection />

          {/* Modules Section */}
          <ModulesSection />

          {/* Steps Section */}
          <StepsSection />

          {/* Security & Sovereignty Band */}
          <SecuritySection />

          {/* Offers & Pricing Plans */}
          <OffersSection />

          {/* Final Call to Action */}
          <FinalCTA />
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </>
  );
}
