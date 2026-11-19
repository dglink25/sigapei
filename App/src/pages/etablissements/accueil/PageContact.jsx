import { MapPin, Mail, Phone, BookOpen, LogIn, LayoutGrid } from 'lucide-react'
import LienConnexion from '../../../components/etablissements/LienConnexion'
import AccueilHero from '../../../components/etablissements/AccueilHero'
import PageBanner from '../../../components/etablissements/PageBanner'
import { useAccueil } from './AccueilLayout'
import usePageTitle from '../../../hooks/commun/usePageTitle'

export default function PageContact() {
  const { data, slug, connecte, lienEspace } = useAccueil()
  usePageTitle(`Contact - ${data?.nom ?? ''}`)
  const base = slug ? `/etablissements/${slug}` : ''

  return (
    <>
      <AccueilHero
        data={data} slug={slug} connecte={connecte} lienEspace={lienEspace}
        mode="page" titre="Nous Contacter" page="contact"
      />
      <PageBanner
        titre="Nous Contacter"
        fil={[
          { label: data?.nom ?? 'Accueil', href: base || '/' },
          { label: 'Contact' },
        ]}
        retour={base || '/'}
      />
      <section className="ae2-section ae2-section--contact" style={{ minHeight: '40vh' }}>
      <div className="ae2-container">
        <div className="ae2-section-head">
          <h2 className="ae2-section-titre">NOUS <span className="ae2-accent">CONTACTER</span></h2>
          <div className="ae2-section-barre" />
        </div>

        <div className="ae2-contact-grid">
          {data.adresseComplete && (
            <div className="ae2-contact-item">
              <MapPin size={20} className="ae2-contact-icon" />
              <div>
                <p className="ae2-contact-label">Adresse</p>
                <p className="ae2-contact-val">{data.adresseComplete}</p>
              </div>
            </div>
          )}
          {data.email && (
            <a href={`mailto:${data.email}`} className="ae2-contact-item ae2-contact-item--link">
              <Mail size={20} className="ae2-contact-icon" />
              <div>
                <p className="ae2-contact-label">Email</p>
                <p className="ae2-contact-val">{data.email}</p>
              </div>
            </a>
          )}
          {data.telephone1 && (
            <a href={`tel:${data.telephone1}`} className="ae2-contact-item ae2-contact-item--link">
              <Phone size={20} className="ae2-contact-icon" />
              <div>
                <p className="ae2-contact-label">Téléphone</p>
                <p className="ae2-contact-val">{data.telephone1}</p>
              </div>
            </a>
          )}
        </div>

        <div className="ae2-cta-box">
          <BookOpen size={26} className="ae2-cta-icon" />
          <div>
            <h3>Accédez à votre espace</h3>
            <p>Élèves, enseignants, parents et administration - connectez-vous pour accéder aux services.</p>
          </div>
          {connecte
            ? <a href={lienEspace} className="ae2-btn ae2-btn--gold"><LayoutGrid size={14} /> Mon espace</a>
            : <LienConnexion slug={slug} className="ae2-btn ae2-btn--gold"><LogIn size={14} /> Se connecter</LienConnexion>
          }
        </div>
      </div>
    </section>
    </>
  )
}
