import './admin-ui.css'

export function SkeletonList({ rows = 5 }) {
  return (
    <div role="status" aria-live="polite">
      <span className="ap-sr">Chargement…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="ap-skel-row" aria-hidden="true">
          <span className="ap-skel ap-skel--tile" style={{ '--i': i }} />
          <span className="ap-skel ap-skel--line" style={{ '--i': i }} />
          <span className="ap-skel ap-skel--short" style={{ '--i': i }} />
        </div>
      ))}
    </div>
  )
}

export function SkeletonCards({ n = 3 }) {
  return (
    <div className="ap-skel-cards" role="status" aria-live="polite">
      <span className="ap-sr">Chargement…</span>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="ap-skel ap-skel--card" style={{ '--i': i }} aria-hidden="true" />
      ))}
    </div>
  )
}
