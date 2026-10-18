import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  MapPin, Mail, Phone, GraduationCap,
  BookOpen, Building2, LogIn, ExternalLink
} from 'lucide-react'
import { accueilService } from '../../services/etablissements/etablissement.service'
import { LOGIN_PATH } from '../../config/identite/routes'
import { ENV } from '../../config/commun/env'
import Loader from '../../components/commun/Loader'
import './AccueilEtablissement.css'

const TYPE_LABELS = {
  primaire:    'Primaire',
  secondaire:  'Secondaire',
  universite:  'Université',
  maternelle:  'Maternelle',
  professionnel: 'Professionnel',
}

export default function AccueilEtablissement() {
  const { slug } = useParams()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [erreur,  setErreur]  = useState(null)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    accueilService.lire(slug)
      .then(setData)
      .catch(() => setErreur('Établissement introuvable ou indisponible.'))
      .finally(() => setLoading(false))
  }, [slug])

  /* ── Chargement ── */
  if (loading) return <Loader label="Chargement…" />

  /* ── Erreur / non trouvé ── */
  if (erreur || !data) {
    return (
      <div className="ae-error">
        <div className="ae-error-card">
          <img src="/sigapei.png" alt={ENV.appName} className="ae-error-logo" />
          <Building2 size={48} className="ae-error-icon" />
          <h1>Établissement introuvable</h1>
          <p>{erreur ?? "Cet établissement n'existe pas ou n'est plus actif."}</p>
          <Link to="/" className="ae-btn">Retour à l'accueil SIGAPEI</Link>
        </div>
      </div>
    )
  }

  /* ── Établissement suspendu ── */
  if (data.degrade) {
    return (
      <div className="ae-error">
        <div className="ae-error-card">
          <img src="/sigapei.png" alt={ENV.appName} className="ae-error-logo" />
          <Building2 size={48} className="ae-error-icon ae-error-icon--warn" />
          <h1>{data.nom ?? 'Établissement'}</h1>
          <p>{data.message ?? "Cet établissement n'est pas accessible pour le moment."}</p>
          <Link to="/" className="ae-btn ae-btn--ghost">Retour à l'accueil SIGAPEI</Link>
        </div>
      </div>
    )
  }

  const types = Array.isArray(data.types) ? data.types : []

  return (
    <div className="ae-page">

      {/* ── Header ── */}
      <header className="ae-header">
        <div className="ae-header-inner">
          <div className="ae-header-brand">
            {data.logoUrl
              ? <img src={data.logoUrl} alt={data.nom} className="ae-logo" />
              : <div className="ae-logo-placeholder"><Building2 size={28} /></div>
            }
            <div>
              <h1 className="ae-nom">{data.nom}</h1>
              {types.length > 0 && (
                <div className="ae-types">
                  {types.map(t => (
                    <span key={t} className="ae-type-badge">
                      <GraduationCap size={12} /> {TYPE_LABELS[t] ?? t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <Link to={LOGIN_PATH} className="ae-btn ae-btn--login">
            <LogIn size={16} /> Se connecter
          </Link>
        </div>
      </header>

      {/* ── Héro ── */}
      <section className="ae-hero">
        <div className="ae-hero-inner">
          <div className="ae-hero-badge">
            <span className="ae-code">{data.code}</span>
            <span className="ae-statut">Établissement actif</span>
          </div>
          <h2 className="ae-hero-titre">Bienvenue à <strong>{data.nom}</strong></h2>
          <p className="ae-hero-sub">
            Géré sur la plateforme {ENV.appName} - Système Intégré de Gestion et
            d'Administration des Établissements Privés d'Enseignement Intégrés
          </p>
          <div className="ae-hero-actions">
            <Link to={LOGIN_PATH} className="ae-btn">
              <LogIn size={16} /> Connexion espace établissement
            </Link>
            <Link to="/" className="ae-btn ae-btn--ghost">
              <ExternalLink size={15} /> SIGAPEI
            </Link>
          </div>
        </div>
      </section>

      {/* ── Informations ── */}
      <section className="ae-section">
        <div className="ae-section-inner">
          <h3 className="ae-section-title">Informations de contact</h3>
          <div className="ae-cards">
            {data.adresseComplete && (
              <div className="ae-card">
                <div className="ae-card-icon"><MapPin size={20} /></div>
                <div>
                  <p className="ae-card-label">Adresse</p>
                  <p className="ae-card-val">{data.adresseComplete}</p>
                </div>
              </div>
            )}
            {data.email && (
              <a href={`mailto:${data.email}`} className="ae-card ae-card--link">
                <div className="ae-card-icon"><Mail size={20} /></div>
                <div>
                  <p className="ae-card-label">E-mail</p>
                  <p className="ae-card-val">{data.email}</p>
                </div>
              </a>
            )}
            {data.telephone1 && (
              <a href={`tel:${data.telephone1}`} className="ae-card ae-card--link">
                <div className="ae-card-icon"><Phone size={20} /></div>
                <div>
                  <p className="ae-card-label">Téléphone</p>
                  <p className="ae-card-val">{data.telephone1}</p>
                </div>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ── CTA connexion ── */}
      <section className="ae-cta">
        <div className="ae-cta-inner">
          <BookOpen size={32} className="ae-cta-icon" />
          <h3>Accédez à votre espace</h3>
          <p>Élèves, enseignants, parents et administration - connectez-vous pour accéder aux services de l'établissement.</p>
          <Link to={LOGIN_PATH} className="ae-btn ae-btn--gold">
            <LogIn size={16} /> Se connecter
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="ae-footer">
        <p>
          {data.nom} · Propulsé par{' '}
          <a href="/" target="_blank" rel="noreferrer">{ENV.appName}</a>
        </p>
      </footer>
    </div>
  )
}
