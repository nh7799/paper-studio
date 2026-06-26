export default function PremiumSlider({ label, value, onChange, min, max, step = 1, unit = "", format }) {
  const display = format ? format(value) : `${value}${unit}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-luxury-pearl/50 font-medium">{label}</span>
        <span className="stat-value text-xs">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="luxury-input-range"
      />
    </div>
  );
}
