interface ExpiryPickerProps {
  value: number
  onChange: (hours: number) => void
}

export function ExpiryPicker({ value, onChange }: ExpiryPickerProps) {
  const options = [
    { label: '1 hour', hours: 1 },
    { label: '6 hours', hours: 6 },
    { label: '24 hours (Default)', hours: 24 },
    { label: '7 days', hours: 168 },
    { label: 'Never expire', hours: 8760 } // 1 year ~ "never"
  ]

  return (
    <div className="expiry-picker">
      <label htmlFor="expiry-select">
        <i className="ph ph-clock"></i>
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
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
