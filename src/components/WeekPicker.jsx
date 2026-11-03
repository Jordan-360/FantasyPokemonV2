import './WeekPicker.css'

// ‹ Week 4 › in the header: step back through played weeks or jump to one.
export default function WeekPicker({ options, value, onChange }) {
  const index = options.findIndex((o) => o.value === value)
  const prev = options[index - 1]
  const next = options[index + 1]

  return (
    <div className="week-picker">
      <button
        className="week-picker__step"
        onClick={() => onChange(prev.value)}
        disabled={!prev}
        aria-label="Previous week"
      >
        ‹
      </button>
      <label className="visually-hidden" htmlFor="week-picker">
        Week to view
      </label>
      <select
        id="week-picker"
        className="week-picker__select"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        className="week-picker__step"
        onClick={() => onChange(next.value)}
        disabled={!next}
        aria-label="Next week"
      >
        ›
      </button>
    </div>
  )
}
