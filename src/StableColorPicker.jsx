import { HexColorPicker } from "react-colorful";
import { useEffect, useRef, useState } from "react";

const StableColorPicker = ({ label, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleMouseDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  return (
    <div ref={wrapperRef} className="space-y-2 relative">
      <div className="text-[11px] text-luxury-pearl/50 font-medium">{label}</div>
      <div
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-luxury-gold/20 cursor-pointer transition-all duration-200"
      >
        <div
          className="w-8 h-7 rounded-lg border border-white/10 shadow-inner"
          style={{ backgroundColor: value }}
        />
        <input
          value={value}
          onChange={(e) => {
            if (e.target.value.startsWith("#") || e.target.value === "") {
              onChange(e.target.value);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-full bg-transparent text-xs font-mono font-medium uppercase outline-none text-luxury-pearl/80"
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-2 p-3 rounded-xl shadow-luxury glass-panel border border-luxury-gold/20">
          <HexColorPicker color={value} onChange={onChange} style={{ width: 200, height: 140 }} />
        </div>
      )}
    </div>
  );
};

export default StableColorPicker;
