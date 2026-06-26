export default function Toast({ message, type = "success", visible }) {
  if (!visible) return null;

  const styles = {
    success: "border-emerald-500/30 bg-emerald-950/80 text-emerald-300",
    info: "border-luxury-gold/30 bg-luxury-graphite/90 text-luxury-gold-light",
    error: "border-red-500/30 bg-red-950/80 text-red-300",
  };

  const icons = { success: "✓", info: "◆", error: "✕" };

  return (
    <div className={`fixed bottom-20 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border backdrop-blur-xl shadow-luxury text-sm font-medium animate-fade-up ${styles[type]}`}>
      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/10 text-xs">{icons[type]}</span>
      {message}
    </div>
  );
}
