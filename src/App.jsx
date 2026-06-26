import { useEffect, useRef, useState, useCallback } from "react";
import { jsPDF } from "jspdf";

// High-density presets configured for a 2480x3508 preview matrix (300 DPI A4 aspect ratio)
const PRESETS = {
  classic: { spacing: 80, thickness: 4, ruleColor: "#a0aec0", paperColor: "#ffffff", side: 320, sideWidth: 6, sideColor: "#e53e3e" },
  minimal: { spacing: 60, thickness: 2, ruleColor: "#cbd5e0", paperColor: "#ffffff", side: 240, sideWidth: 3, sideColor: "#cbd5e0" },
  bold: { spacing: 120, thickness: 8, ruleColor: "#4a5568", paperColor: "#ffffff", side: 380, sideWidth: 10, sideColor: "#2b6cb0" },
  pastel: { spacing: 70, thickness: 4, ruleColor: "#fed7e2", paperColor: "#fffaf0", side: 280, sideWidth: 6, sideColor: "#b794f4" },
  graph: { spacing: 70, thickness: 2, ruleColor: "#cbd5e0", paperColor: "#ffffff", side: 300, sideWidth: 4, sideColor: "#3182ce" }
};

const STORAGE_KEY = "paperstudio-settings-vector-v7";

export default function App() {
  const canvasRef = useRef(null);

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  // Base state tracking high-density values
  const [spacing, setSpacing] = useState(80);
  const [thickness, setThickness] = useState(4);
  const [ruleColor, setRuleColor] = useState("#a0aec0");
  const [paperColor, setPaperColor] = useState("#ffffff");
  const [side, setSide] = useState(320);
  const [sideWidth, setSideWidth] = useState(6);
  const [sideColor, setSideColor] = useState("#e53e3e");

  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  /* ---------------- LOAD SETTINGS ---------------- */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const s = JSON.parse(saved);
        setSpacing(s.spacing ?? 80);
        setThickness(s.thickness ?? 4);
        setRuleColor(s.ruleColor ?? "#a0aec0");
        setPaperColor(s.paperColor ?? "#ffffff");
        setSide(s.side ?? 320);
        setSideWidth(s.sideWidth ?? 6);
        setSideColor(s.sideColor ?? "#e53e3e");
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  /* ---------------- SAVE SETTINGS ---------------- */
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ spacing, thickness, ruleColor, paperColor, side, sideWidth, sideColor })
    );
  }, [spacing, thickness, ruleColor, paperColor, side, sideWidth, sideColor]);

  /* ---------------- DRAW CANVAS PREVIEW ---------------- */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply template background color
    ctx.fillStyle = paperColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Visual ruled lines layout
    ctx.strokeStyle = ruleColor;
    ctx.lineWidth = thickness;
    ctx.lineCap = "round";

    for (let y = spacing; y < canvas.height; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Visual margin line layout
    ctx.fillStyle = sideColor;
    ctx.fillRect(side, 0, sideWidth, canvas.height);
  }, [spacing, thickness, ruleColor, paperColor, side, sideWidth, sideColor]);

  useEffect(() => {
    draw();
  }, [draw]);

  /* ---------------- PRESETS ---------------- */
  const applyPreset = (name) => {
    const p = PRESETS[name];
    if (!p) return;

    setSpacing(p.spacing);
    setThickness(p.thickness);
    setRuleColor(p.ruleColor);
    setPaperColor(p.paperColor);
    setSide(p.side);
    setSideWidth(p.sideWidth);
    setSideColor(p.sideColor);
  };

  const resetSettings = () => applyPreset("classic");

  /* ---------------- RASTER DOWNLOAD (IMAGE) ---------------- */
  const downloadPNG = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setDownloading(true);

    try {
      const link = document.createElement("a");
      link.download = `a4-notebook-raster-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  /* ---------------- TRUE VECTOR DOWNLOAD (PDF) ---------------- */
  const downloadPDF = async () => {
    setDownloading(true);

    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const scale = pageWidth / 2480;

      // 1. DRAW BACKGROUND (Vector Solid Rect)
      pdf.setFillColor(paperColor);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");

      // 2. DRAW RULED LINES (Vector Calculated Paths)
      pdf.setDrawColor(ruleColor);
      pdf.setLineWidth(thickness * scale);

      const spacingMm = spacing * scale;

      for (let y = spacingMm; y < pageHeight; y += spacingMm) {
        pdf.line(0, y, pageWidth, y);
      }

      // 3. DRAW MARGIN LINE (Vector Solid Shape)
      const marginPosMm = side * scale;
      const marginWidthMm = sideWidth * scale;

      pdf.setFillColor(sideColor);
      pdf.rect(marginPosMm, 0, marginWidthMm, pageHeight, "F");

      pdf.save(`a4-vector-notebook-${Date.now()}.pdf`);

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
    } catch (error) {
      console.error("Vector rendering system failure:", error);
      alert("Error compiling vector metrics into PDF format.");
    } finally {
      setDownloading(false);
    }
  };

  /* ---------------- COPY CONFIG ---------------- */
  const copySettings = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify({ spacing, thickness, ruleColor, paperColor, side, sideWidth, sideColor }, null, 2)
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  /* ---------------- CONTROL GRAPHS ---------------- */
  const ControlGroup = ({ label, type, value, onChange, min, max, step }) => {
    const [localColor, setLocalColor] = useState(value);

    useEffect(() => {
      if (type === "color") setLocalColor(value);
    }, [value, type]);

    return (
      <div className="space-y-1.5">
        <div className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-400 uppercase">
          {label}
        </div>

        {type === "range" ? (
          <div className="flex items-center gap-4 bg-slate-500/5 dark:bg-slate-400/5 px-3 py-2 rounded-xl border border-slate-200/40 dark:border-slate-700/30 backdrop-blur-md">
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={(e) => onChange(Number(e.target.value))}
              className="w-full accent-indigo-500 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
            <div className="text-xs w-8 text-right text-slate-700 dark:text-slate-200 font-mono font-bold">
              {value}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-slate-500/5 dark:bg-slate-400/5 p-2 rounded-xl border border-slate-200/40 dark:border-slate-700/30 backdrop-blur-md">
            <div className="relative w-8 h-7 rounded-lg overflow-hidden border border-slate-300/60 dark:border-slate-700/60 flex-shrink-0 shadow-inner">
              <input 
                type="color" 
                value={localColor} 
                onChange={(e) => setLocalColor(e.target.value)}
                onInput={(e) => onChange(e.target.value)}
                className="absolute scale-[2] transform -translate-x-2 -translate-y-2 w-14 h-14 cursor-pointer bg-transparent border-none p-0"
              />
            </div>
            <span className="text-xs text-slate-700 dark:text-slate-200 font-mono font-bold uppercase tracking-wider">{value}</span>
          </div>
        )}
      </div>
    );
  };

  /* ---------------- GLOSSY GLASSMORPHIC UI FRAME ---------------- */
  return (
    <div className={`h-screen w-screen overflow-hidden flex flex-col transition-colors duration-500 ${
      isDark 
        ? "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-zinc-950 to-black text-white" 
        : "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/40 via-slate-100 to-zinc-200/70 text-slate-900"
    }`}>

      {/* GLOSSY HEADER BAR */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-white/20 dark:border-slate-800/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl flex-shrink-0 z-10 shadow-sm shadow-slate-100/10">
        <div className="flex flex-col">
          <div className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent uppercase">
            Paper Studio Pro
          </div>
          <div className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
            Infinity-Zoom Vector Layout Engine
          </div>
        </div>

        <button
          onClick={() => setIsDark(!isDark)}
          className="text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 shadow-sm backdrop-blur-md"
        >
          {isDark ? "☀ LIGHT INTERFACE" : "🌙 DARK INTERFACE"}
        </button>
      </header>

      {/* CORE WORKSPACE Split FRAME */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* GLOSSY CONTROLS SIDEBAR */}
        <aside className="w-[330px] flex flex-col justify-between p-5 border-r border-white/10 dark:border-slate-800/40 bg-white/40 dark:bg-zinc-900/30 backdrop-blur-xl h-full flex-shrink-0 shadow-lg">
          
          <div className="space-y-4.5">
            {/* Template Profile Presets */}
            <div>
              <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 mb-2">
                A4 Profiles
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(PRESETS).map((p) => (
                  <button
                    key={p}
                    onClick={() => applyPreset(p)}
                    className="text-xs font-bold py-2 bg-white/60 dark:bg-zinc-900/50 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white rounded-xl capitalize border border-slate-200/50 dark:border-slate-800/50 shadow-sm transition-all duration-300 transform active:scale-95 text-center"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-200/50 dark:bg-slate-800/40" />

            {/* Matrix Vector Configuration */}
            <div className="space-y-3.5">
              <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500">
                Rule Parameters
              </div>
              <ControlGroup label="Line Spacing" type="range" value={spacing} onChange={setSpacing} min={30} max={300} step={1} />
              <ControlGroup label="Line Weight" type="range" value={thickness} onChange={setThickness} min={1} max={20} step={0.5} />
              <div className="grid grid-cols-2 gap-3">
                <ControlGroup label="Line Tint" type="color" value={ruleColor} onChange={setRuleColor} />
                <ControlGroup label="Paper Base" type="color" value={paperColor} onChange={setPaperColor} />
              </div>
            </div>

            <div className="h-px bg-slate-200/50 dark:bg-slate-800/40" />

            {/* Margin Rule Segment */}
            <div className="space-y-3.5">
              <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500">
                Margin Guidelines
              </div>
              <ControlGroup label="Margin Position" type="range" value={side} onChange={setSide} min={100} max={1000} step={1} />
              <ControlGroup label="Margin Width" type="range" value={sideWidth} onChange={setSideWidth} min={1} max={40} step={1} />
              <ControlGroup label="Margin Tint" type="color" value={sideColor} onChange={setSideColor} />
            </div>
          </div>

          {/* Persistent Action Panel Footer */}
          <div className="pt-4 space-y-2 flex-shrink-0">
            <button 
              onClick={downloadPDF} 
              disabled={downloading}
              className="w-full px-4 py-3.5 text-xs font-black rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 disabled:opacity-50 text-white shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-300 uppercase tracking-widest active:scale-[0.98]"
            >
              {downloading ? "Compiling Paths..." : "Export Vector PDF"}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={downloadPNG} 
                className="w-full text-xs py-2 font-bold bg-white/60 dark:bg-zinc-800/40 hover:bg-white dark:hover:bg-zinc-800 border border-slate-200/60 dark:border-slate-800/60 rounded-xl transition-all shadow-sm active:scale-95 text-slate-700 dark:text-slate-200"
              >
                Save Image
              </button>
              <button 
                onClick={copySettings} 
                className="w-full text-xs py-2 font-bold bg-white/60 dark:bg-zinc-800/40 hover:bg-white dark:hover:bg-zinc-800 border border-slate-200/60 dark:border-slate-800/60 rounded-xl transition-all shadow-sm active:scale-95 text-slate-700 dark:text-slate-200"
              >
                {copied ? "Copied ✓" : "Copy Config"}
              </button>
            </div>

            <button 
              onClick={resetSettings} 
              className="w-full text-[10px] font-bold pt-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-center transition-colors uppercase tracking-widest"
            >
              Reset to Factory Classic
            </button>
          </div>
        </aside>

        {/* WORKSPACE PREVIEW SHADOW STAGE */}
        <main className="flex-1 flex items-center justify-center p-8 overflow-hidden z-0">
          <div className="max-h-full max-w-full flex items-center justify-center relative">
            <canvas
              ref={canvasRef}
              width={2480}
              height={3508}
              className="max-h-[calc(100vh-6rem)] max-w-full w-auto h-auto shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200/50 dark:border-zinc-900/60 rounded-lg object-contain transition-all duration-500 ease-out"
              style={{ backgroundColor: paperColor }}
            />
          </div>
        </main>
      </div>

      {/* FLOAT GLOSSY NOTIFICATION BANNER */}
      {showSuccess && (
        <div className="absolute bottom-6 right-6 bg-emerald-500/90 text-white font-bold px-4 py-2.5 rounded-2xl text-xs shadow-xl backdrop-blur-md tracking-wide animate-bounce border border-emerald-400/30">
          Successfully Generated Vector Template! ✓
        </div>
      )}
    </div>
  );
}