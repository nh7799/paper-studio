import { useEffect } from "react";
import { KEYBOARD_SHORTCUTS } from "../constants";

export default function ShortcutsModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 rounded-2xl glass-panel border border-luxury-gold/20 shadow-luxury-lg animate-fade-up p-6">
        <h2 className="font-display text-2xl text-gradient-gold mb-1">Keyboard Shortcuts</h2>
        <p className="text-xs text-luxury-pearl/40 mb-5">Professional workflow accelerators</p>
        <div className="space-y-2">
          {KEYBOARD_SHORTCUTS.map((s) => (
            <div key={s.action} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
              <span className="text-sm text-luxury-pearl/70">{s.action}</span>
              <div className="flex gap-1">
                {s.keys.map((k) => <span key={k} className="kbd">{k}</span>)}
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="luxury-btn-secondary w-full mt-5 text-sm">Close</button>
      </div>
    </div>
  );
}
