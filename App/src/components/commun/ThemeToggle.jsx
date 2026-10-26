import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../context/commun/ThemeContext'
import './ThemeToggle.css'

/**
 * Bouton bascule thème clair / sombre.
 * variant="icon"   → simple bouton icône (pour les topbars denses)
 * variant="pill"   → pill avec label (pour les menus latéraux)
 */
export default function ThemeToggle({ variant = 'icon', className = '' }) {
  const { isDark, toggle } = useTheme()

  if (variant === 'pill') {
    return (
      <button
        type="button"
        className={`tt-pill ${className}`}
        onClick={toggle}
        aria-label={isDark ? 'Passer en thème clair' : 'Passer en thème sombre'}
        title={isDark ? 'Thème clair' : 'Thème sombre'}
      >
        <span className="tt-pill-track">
          <span className="tt-pill-thumb">
            {isDark ? <Moon size={12} /> : <Sun size={12} />}
          </span>
        </span>
        <span className="tt-pill-label">{isDark ? 'Thème sombre' : 'Thème clair'}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      className={`tt-icon ${className}`}
      onClick={toggle}
      aria-label={isDark ? 'Passer en thème clair' : 'Passer en thème sombre'}
      title={isDark ? 'Thème clair' : 'Thème sombre'}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
