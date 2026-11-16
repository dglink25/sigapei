/**
 * AccueilFooter - Footer de la page publique d'un établissement.
 * 4 colonnes : identité + réseaux · liens rapides · contact · SIGAPEI
 */
import { MapPin, Mail, Phone, ExternalLink } from 'lucide-react'
import { Building2 } from 'lucide-react'
import { ENV } from '../../config/commun/env'
import { urlPlateforme } from '../../lib/etablissements/subdomain'
import './AccueilFooter.css'

export default function AccueilFooter({ data, navItems, onScrollTo }) {
  const rs = data.reseauxSociaux ?? {}

  return (
    <footer className="aef-footer">
      <div className="aef-inner">

        {/* Col 1 : identité */}
        <div className="aef-col aef-col--brand">
          {data.logoUrl
            ? <img src={data.logoUrl} alt={`Logo ${data.nom}`} className="aef-logo" loading="lazy" />
            : <div className="aef-logo-ph"><Building2 size={22} /></div>
          }
          <p className="aef-nom">{data.nom}</p>
          {data.devise && <p className="aef-devise">{data.devise}</p>}
          {data.adresseComplete && (
            <p className="aef-adresse"><MapPin size={12} /> {data.adresseComplete}</p>
          )}

          {/* Réseaux sociaux */}
          {(rs.facebook || rs.twitter || rs.linkedin || rs.instagram) && (
            <div className="aef-rs">
              {rs.facebook  && <a href={rs.facebook}  target="_blank" rel="noreferrer" aria-label="Facebook"  className="aef-rs-link"><span>f</span></a>}
              {rs.twitter   && <a href={rs.twitter}   target="_blank" rel="noreferrer" aria-label="Twitter"   className="aef-rs-link"><span>𝕏</span></a>}
              {rs.linkedin  && <a href={rs.linkedin}  target="_blank" rel="noreferrer" aria-label="LinkedIn"  className="aef-rs-link"><span>in</span></a>}
              {rs.instagram && <a href={rs.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="aef-rs-link"><span>ig</span></a>}
            </div>
          )}
        </div>

        {/* Col 2 : liens rapides */}
        <div className="aef-col">
          <h4 className="aef-col-titre">Liens rapides</h4>
          <ul className="aef-links">
            {navItems.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => onScrollTo(n.id)}>{n.label}</button>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3 : contact */}
        <div className="aef-col">
          <h4 className="aef-col-titre">Contact</h4>
          <ul className="aef-links">
            {data.email     && <li><a href={`mailto:${data.email}`}><Mail  size={12} /> {data.email}</a></li>}
            {data.telephone1 && <li><a href={`tel:${data.telephone1}`}><Phone size={12} /> {data.telephone1}</a></li>}
          </ul>
        </div>

        {/* Col 4 : SIGAPEI */}
        <div className="aef-col aef-col--sigapei">
          <a href={urlPlateforme('/')} target="_blank" rel="noreferrer" aria-label={ENV.appName}>
            <img src="/sigapei.png" alt={ENV.appName} className="aef-sigapei" loading="lazy" />
          </a>
          <p className="aef-propulse">
            Propulsé par{' '}
            <a href={urlPlateforme('/')} target="_blank" rel="noreferrer">{ENV.appName}</a>
          </p>
          <a href={urlPlateforme('/')} target="_blank" rel="noreferrer" className="aef-ext">
            <ExternalLink size={12} /> Découvrir SIGAPEI
          </a>
        </div>
      </div>

      <div className="aef-bottom">
        <p>© {new Date().getFullYear()} {data.nom} · Tous droits réservés · Propulsé par {ENV.appName}</p>
      </div>
    </footer>
  )
}
