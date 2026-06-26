import { useEffect } from "react";

export default function CommandPalette({ open, onClose, commands, query, setQuery }) {
  const filtered = commands.filter(
    (c) =>
      c.label.toLowerCase().includes(query.toLowerCase()) ||
      c.group?.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 rounded-2xl glass-panel border border-luxury-gold/20 shadow-luxury-lg animate-fade-up overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06]">
          <svg className="w-4 h-4 text-luxury-gold/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, presets, exports..."
            className="flex-1 bg-transparent text-sm text-luxury-pearl placeholder:text-luxury-pearl/30 outline-none"
          />
          <span className="kbd">ESC</span>
        </div>
        <div className="max-h-72 overflow-y-auto inspector-scroll py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-luxury-pearl/30">No commands found</div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                onClick={() => { cmd.action(); onClose(); }}
                className={`command-item w-full ${i === 0 ? "command-item-active" : ""}`}
              >
                <span className="text-base w-6 text-center opacity-60">{cmd.icon}</span>
                <div className="flex-1 text-left">
                  <div className="text-sm text-luxury-pearl/90">{cmd.label}</div>
                  {cmd.group && <div className="text-[10px] text-luxury-pearl/30 uppercase tracking-wider">{cmd.group}</div>}
                </div>
                {cmd.shortcut && (
                  <div className="flex gap-1">
                    {cmd.shortcut.map((k) => <span key={k} className="kbd">{k}</span>)}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
