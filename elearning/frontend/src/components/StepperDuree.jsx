/**
 * Sélecteur de durée par pas de 5 minutes (5 à 180 par défaut).
 * Utilisé pour le chronomètre des quiz.
 */
export function StepperDuree({
  minutes,
  onChange,
  min = 5,
  max = 180,
  pas = 5,
}) {
  return (
    <div className="stepper">
      <button
        type="button"
        aria-label="Réduire la durée"
        disabled={minutes <= min}
        onClick={() => onChange(Math.max(min, minutes - pas))}
      >
        −
      </button>
      <span className="stepper-valeur">{minutes} min</span>
      <button
        type="button"
        aria-label="Augmenter la durée"
        disabled={minutes >= max}
        onClick={() => onChange(Math.min(max, minutes + pas))}
      >
        +
      </button>
    </div>
  )
}
