interface ExpiryPickerProps {
  value: number
  onChange: (hours: number) => void
}

export function ExpiryPicker({ value, onChange }: ExpiryPickerProps) {
  const options = [
    { label: '1 hour', hours: 1, icon: '⚡' },
    { label: '6 hours', hours: 6, icon: '🕐' },
    { label: '24 hours (Default)', hours: 24, icon: '📅' },
    { label: '7 days', hours: 168, icon: '📆' },
    { label: 'Never expire', hours: 8760, icon: '♾️' } // 1 year ~ "never"
  ]

  return (
    <div className="expiry-picker">
      <label htmlFor="expiry-select">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        Auto-delete after:
      </label>
      <select
        id="expiry-select"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="expiry-select"
      >
        {options.map((opt) => (
          <option key={opt.hours} value={opt.hours}>
            {opt.icon} {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
