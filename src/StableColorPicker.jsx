import { HexColorPicker } from "react-colorful";
import { useEffect, useRef, useState } from "react";

const StableColorPicker = ({ label, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Close ONLY when clicking outside entire component
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
    <div ref={wrapperRef} className="space-y-1.5 relative">
      {/* LABEL */}
      <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
        {label}
      </div>

      {/* TRIGGER */}
      <div
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 p-2 rounded-xl border bg-slate-500/5 dark:bg-slate-400/5 cursor-pointer"
      >
        {/* SWATCH */}
        <div
          className="w-9 h-7 rounded-lg border shadow-sm"
          style={{ backgroundColor: value }}
        />

        {/* HEX INPUT */}
        <input
          value={value}
          onChange={(e) => {
            if (e.target.value.startsWith("#") || e.target.value === "") {
              onChange(e.target.value);
            }
          }}
          className="w-full bg-transparent text-xs font-mono font-bold uppercase outline-none"
        />
      </div>

      {/* POPUP PICKER (FULL CONTROLLED UI) */}
      {open && (
        <div className="absolute z-50 mt-2 p-3 rounded-xl shadow-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-700">
          <HexColorPicker color={value} onChange={onChange} />
        </div>
      )}
    </div>
  );
};

export default StableColorPicker;