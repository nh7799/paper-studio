import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import StableColorPicker from "./StableColorPicker";
import CommandPalette from "./components/CommandPalette";
import Toast from "./components/Toast";
import PremiumSlider from "./components/PremiumSlider";
import ShortcutsModal from "./components/ShortcutsModal";
import { useHistory } from "./hooks/useHistory";
import {
  DEFAULT_SETTINGS,
  STORAGE_KEY,
  PRESETS,
  PAPER_FORMATS,
  LAYOUT_MODES,
  LINE_STYLES,
  EXPORT_QUALITIES,
} from "./constants";
import {
  drawPaper,
  computeStats,
  exportPNG,
  encodeSettings,
  decodeSettings,
} from "./paperEngine";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";

function loadInitialSettings() {
  try {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const decoded = decodeSettings(hash);
      if (decoded) return { ...DEFAULT_SETTINGS, ...decoded };
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch (e) {
    console.error("Settings load error:", e);
  }
  return { ...DEFAULT_SETTINGS };
}

export default function App() {
  const canvasRef = useRef(null);
  const viewportRef = useRef(null);

  const {
    state: settings,
    push: updateSettings,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory(loadInitialSettings);

  const [activeTab, setActiveTab] = useState("design");
  const [activePreset, setActivePreset] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "success",
  });
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [recentExports, setRecentExports] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("paperstudio-exports") || "[]");
    } catch {
      return [];
    }
  });

  const set = useCallback(
    (patch) =>
      updateSettings((prev) => ({
        ...prev,
        ...(typeof patch === "function" ? patch(prev) : patch),
      })),
    [updateSettings],
  );

  const showToast = useCallback((message, type = "success") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  }, []);

  const stats = useMemo(() => {
    try {
      return computeStats(settings);
    } catch (e) {
      console.error("computeStats error:", e);
      return {
        width: 800,
        height: 1131,
        lineCount: 20,
        spacingMm: 5,
        marginMm: 10,
        pageSize: "Custom",
        pixelSize: "800×1131",
      };
    }
  }, [settings]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    if (!w || !h) return;

    ctx.fillStyle = settings.paperColor || "#ffffff";
    ctx.fillRect(0, 0, w, h);

    try {
      drawPaper(canvas, settings);
    } catch (e) {
      console.error("drawPaper error:", e);
      ctx.strokeStyle = settings.ruleColor || "#cccccc";
      ctx.lineWidth = settings.thickness || 1;
      const spacing = settings.spacing || 50;
      for (let y = spacing; y < h; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      if (settings.side && settings.side < w) {
        ctx.strokeStyle = settings.sideColor || "#999999";
        ctx.lineWidth = settings.sideWidth || 2;
        ctx.beginPath();
        ctx.moveTo(settings.side, 0);
        ctx.lineTo(settings.side, h);
        ctx.stroke();
      }
      showToast("Rendering recovered – see console", "info");
    }
  }, [settings, showToast]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const applyPreset = useCallback(
    (key) => {
      const p = PRESETS[key];
      if (!p) return;
      set({ ...p, format: settings.format, orientation: settings.orientation });
      setActivePreset(key);
      showToast(`Applied "${p.name}" template`);
    },
    [set, settings.format, settings.orientation, showToast],
  );

  const handleExportSVG = useCallback(() => {
    try {
      const width = canvasRef.current?.width || 800;
      const height = canvasRef.current?.height || 1131;
      const lines = [];
      lines.push(
        `<rect width="${width}" height="${height}" fill="${settings.paperColor}" />`,
      );
      if (settings.side) {
        lines.push(
          `<line x1="${settings.side}" y1="0" x2="${settings.side}" y2="${height}" stroke="${settings.sideColor}" stroke-width="${settings.sideWidth}" />`,
        );
      }
      const lineCount =
        stats.lineCount || Math.floor(height / settings.spacing);
      for (let i = 0; i < lineCount; i++) {
        const y = settings.spacing + i * settings.spacing;
        if (y < height) {
          let dash = "";
          if (settings.lineStyle === "dashed") dash = 'stroke-dasharray="6,4"';
          if (settings.lineStyle === "dotted") dash = 'stroke-dasharray="2,4"';
          lines.push(
            `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${settings.ruleColor}" stroke-width="${settings.thickness}" ${dash} />`,
          );
        }
      }
      if (settings.watermarkText) {
        lines.push(
          `<text x="${width / 2}" y="${height / 2}" fill="${settings.ruleColor}" opacity="${settings.watermarkOpacity}" font-family="sans-serif" font-size="${width * 0.07}" font-weight="bold" text-anchor="middle" transform="rotate(-45 ${width / 2} ${height / 2})">${settings.watermarkText}</text>`,
        );
      }
      if (settings.headerText) {
        lines.push(
          `<text x="${width / 2}" y="50" fill="${settings.ruleColor}" opacity="0.5" font-family="sans-serif" font-size="14" text-anchor="middle" letter-spacing="1">${settings.headerText}</text>`,
        );
      }
      if (settings.footerText) {
        lines.push(
          `<text x="${width / 2}" y="${height - 40}" fill="${settings.ruleColor}" opacity="0.5" font-family="sans-serif" font-size="12" text-anchor="middle" letter-spacing="1">${settings.footerText}</text>`,
        );
      }
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n${lines.join("\n")}\n</svg>`;
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `paper-${settings.format || "custom"}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const entry = { type: "SVG", time: Date.now(), format: settings.format };
      setRecentExports((prev) => [entry, ...prev].slice(0, 5));
      showToast("Vector SVG downloaded");
    } catch (e) {
      console.error(e);
      showToast("SVG export failed", "error");
    }
  }, [settings, stats, showToast]);

  const handleExportPDF = useCallback(async () => {
    setDownloading(true);
    try {
      const PAPER_SIZES_PT = {
        a4: [595.28, 841.89],
        a5: [419.53, 595.28],
        a3: [841.89, 1190.55],
        letter: [612, 792],
        legal: [612, 1008],
        executive: [522, 756],
      };

      const formatKey = settings.format || "a4";
      const format = PAPER_FORMATS[formatKey] || PAPER_FORMATS.a4;
      let pageSize = PAPER_SIZES_PT[formatKey];

      if (!pageSize) {
        const mmToPt = 2.83465;
        pageSize = [format.mmW * mmToPt, format.mmH * mmToPt];
      }

      const isLandscape = settings.orientation === "landscape";
      if (isLandscape) {
        pageSize = [pageSize[1], pageSize[0]];
      }

      const canvasW = isLandscape ? format.height : format.width;
      const pdfScale = pageSize[0] / canvasW;

      const styles = StyleSheet.create({
        page: {
          padding: 0,
          backgroundColor: settings.paperColor || "#ffffff",
          flexDirection: "column",
        },
        gridLine: {
          borderBottomWidth: `${(settings.thickness || 1) * pdfScale}px`,
          borderBottomColor: settings.ruleColor || "#000000",
          borderBottomStyle:
            settings.lineStyle === "dashed"
              ? "dashed"
              : settings.lineStyle === "dotted"
                ? "dotted"
                : "solid",
          height: `${(settings.spacing || 50) * pdfScale}px`,
          width: "100%",
          flexShrink: 0,
        },
        marginLineWrapper: {
          position: "absolute",
          top: 0,
          bottom: 0,
          left: (settings.side || 0) * pdfScale,
          width: `${(settings.sideWidth || 2) * pdfScale}px`,
          backgroundColor: settings.sideColor || "#999999",
        },
        header: {
          fontSize: 14 * pdfScale,
          color: settings.ruleColor || "#000000",
          opacity: 0.5,
          textAlign: "center",
          marginTop: 20 * pdfScale,
          fontFamily: "Helvetica",
          position: "absolute",
          width: "100%",
          top: 0,
        },
        footer: {
          fontSize: 12 * pdfScale,
          color: settings.ruleColor || "#000000",
          opacity: 0.5,
          textAlign: "center",
          marginBottom: 20 * pdfScale,
          fontFamily: "Helvetica",
          position: "absolute",
          width: "100%",
          bottom: 0,
        },
        watermark: {
          fontSize: pageSize[0] * 0.06,
          color: settings.ruleColor || "#000000",
          opacity: settings.watermarkOpacity || 0.15,
          fontWeight: "bold",
          textAlign: "center",
          transform: "rotate(-30deg)",
          position: "absolute",
          top: "50%",
          left: "50%",
          marginTop: -(pageSize[0] * 0.06 * 0.5),
          marginLeft: -(pageSize[0] * 0.06 * 1.5),
          fontFamily: "Helvetica-Bold",
        },
      });

      const PdfDocument = () => {
        const gridLineCount = Math.floor(
          pageSize[1] / ((settings.spacing || 50) * pdfScale),
        );

        return (
          <Document>
            {Array.from({ length: settings.pageCount || 1 }).map(
              (_, pageIdx) => (
                <Page key={pageIdx} size={pageSize} style={styles.page}>
                  {Array.from({ length: gridLineCount }).map((_, i) => (
                    <View
                      key={`grid-${pageIdx}-${i}`}
                      style={styles.gridLine}
                    />
                  ))}

                  {settings.side && settings.side > 0 && (
                    <View style={styles.marginLineWrapper} />
                  )}

                  {settings.headerText && (
                    <Text style={styles.header}>{settings.headerText}</Text>
                  )}

                  {settings.footerText && (
                    <Text style={styles.footer}>{settings.footerText}</Text>
                  )}

                  {settings.watermarkText && (
                    <Text style={styles.watermark}>
                      {settings.watermarkText}
                    </Text>
                  )}
                </Page>
              ),
            )}
          </Document>
        );
      };

      const blob = await pdf(<PdfDocument />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `paper-${settings.format || "custom"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const entry = { type: "PDF", time: Date.now(), format: settings.format };
      setRecentExports((prev) => [entry, ...prev].slice(0, 5));
      showToast(
        `Vector PDF exported (${settings.pageCount || 1} page${(settings.pageCount || 1) > 1 ? "s" : ""})`,
      );
    } catch (e) {
      console.error("PDF generation error:", e);
      showToast(
        "PDF export failed: " + (e.message || "unknown error"),
        "error",
      );
    } finally {
      setDownloading(false);
    }
  }, [settings, stats, showToast]);

  const handleExportPNG = useCallback(async () => {
    if (!canvasRef.current) return;
    setDownloading(true);
    try {
      await exportPNG(canvasRef.current);
      showToast("PNG saved");
    } catch {
      showToast("PNG export failed", "error");
    } finally {
      setDownloading(false);
    }
  }, [showToast]);

  const copyConfig = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(settings, null, 2));
      showToast("Config copied", "info");
    } catch {
      showToast("Copy failed", "error");
    }
  }, [settings, showToast]);

  const shareLink = useCallback(async () => {
    const url = `${window.location.origin}${window.location.pathname}#${encodeSettings(settings)}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast("Share link copied", "info");
    } catch {
      showToast("Share failed", "error");
    }
  }, [settings, showToast]);

  const commands = useMemo(
    () => [
      ...Object.entries(PRESETS).map(([key, p]) => ({
        id: `preset-${key}`,
        label: `Apply ${p.name}`,
        group: "Templates",
        icon: "◈",
        action: () => applyPreset(key),
      })),
      {
        id: "export-pdf",
        label: "Export Vector PDF",
        group: "Export",
        icon: "↓",
        shortcut: ["⌘", "S"],
        action: handleExportPDF,
      },
      {
        id: "export-svg",
        label: "Export SVG",
        group: "Export",
        icon: "📐",
        shortcut: ["⌘", "G"],
        action: handleExportSVG,
      },
      {
        id: "export-png",
        label: "Export PNG",
        group: "Export",
        icon: "◻",
        shortcut: ["⌘", "E"],
        action: handleExportPNG,
      },
      {
        id: "copy",
        label: "Copy Config",
        group: "Share",
        icon: "⎘",
        shortcut: ["⌘", "C"],
        action: copyConfig,
      },
      {
        id: "share",
        label: "Copy Share Link",
        group: "Share",
        icon: "🔗",
        action: shareLink,
      },
      {
        id: "undo",
        label: "Undo",
        group: "Edit",
        icon: "↩",
        shortcut: ["⌘", "Z"],
        action: undo,
      },
      {
        id: "redo",
        label: "Redo",
        group: "Edit",
        icon: "↪",
        shortcut: ["⌘", "⇧", "Z"],
        action: redo,
      },
      ...Object.entries(LAYOUT_MODES).map(([key, m]) => ({
        id: `layout-${key}`,
        label: `Switch to ${m.label}`,
        group: "Layout",
        icon: m.icon,
        action: () => set({ layoutMode: key }),
      })),
      ...Object.entries(PAPER_FORMATS).map(([key, f]) => ({
        id: `format-${key}`,
        label: `Paper size ${f.label}`,
        group: "Format",
        icon: "▭",
        action: () => set({ format: key }),
      })),
    ],
    [
      applyPreset,
      handleExportPDF,
      handleExportSVG,
      handleExportPNG,
      copyConfig,
      shareLink,
      undo,
      redo,
      set,
    ],
  );

  useEffect(() => {
    const handler = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "k") {
        e.preventDefault();
        setCmdOpen(true);
        return;
      }
      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (mod && (e.key === "Z" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }
      if (mod && e.key === "s") {
        e.preventDefault();
        handleExportPDF();
        return;
      }
      if (mod && e.key === "g") {
        e.preventDefault();
        handleExportSVG();
        return;
      }
      if (mod && e.key === "e") {
        e.preventDefault();
        handleExportPNG();
        return;
      }
      if (mod && e.key === "c" && !e.shiftKey) {
        e.preventDefault();
        copyConfig();
        return;
      }
      if (mod && e.key === "0") {
        e.preventDefault();
        setZoom(100);
        return;
      }
      if (mod && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        setZoom((z) => Math.min(400, z + 25));
        return;
      }
      if (mod && e.key === "-") {
        e.preventDefault();
        setZoom((z) => Math.max(25, z - 25));
        return;
      }
      if (e.key === "f" && !mod) {
        e.preventDefault();
        setIsFullscreen((f) => !f);
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    undo,
    redo,
    handleExportPDF,
    handleExportSVG,
    handleExportPNG,
    copyConfig,
  ]);

  const tabs = [
    { id: "design", label: "Design" },
    { id: "typography", label: "Typography" },
    { id: "export", label: "Export" },
  ];

  const canvasWidth = stats.width && stats.width > 0 ? stats.width : 800;
  const canvasHeight = stats.height && stats.height > 0 ? stats.height : 1131;

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-luxury-obsidian text-luxury-pearl relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="ambient-orb w-[600px] h-[600px] -top-48 -right-48 bg-luxury-gold/[0.04]" />
        <div
          className="ambient-orb w-[400px] h-[400px] bottom-0 left-1/4 bg-indigo-500/[0.03]"
          style={{ animationDelay: "1.5s" }}
        />
        <div className="absolute inset-0 noise-overlay opacity-50" />
      </div>

      <header className="relative h-14 flex items-center justify-between px-5 border-b border-white/[0.06] glass-panel flex-shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-luxury-gold-light to-luxury-gold-dark flex items-center justify-center shadow-glow">
              <span className="font-display text-luxury-obsidian text-sm font-bold">
                P
              </span>
            </div>
            <div>
              <div className="font-display text-lg text-gradient-gold leading-none">
                Paper Studio Pro
              </div>
              <div className="text-[9px] text-luxury-pearl/30 uppercase tracking-[0.25em] font-medium">
                Enterprise Edition
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-1 ml-4 pl-4 border-l border-white/[0.06]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-luxury-pearl/40 font-mono">
              VECTOR ENGINE v3.2
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCmdOpen(true);
              setCmdQuery("");
            }}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-[11px] text-luxury-pearl/40 transition-all"
          >
            <span>Search commands</span>
            <span className="kbd">⌘K</span>
          </button>
          <button
            onClick={() => setShortcutsOpen(true)}
            className="luxury-btn-secondary text-[11px] px-3 py-1.5 hidden sm:block"
          >
            Shortcuts
          </button>
          <button
            onClick={undo}
            disabled={!canUndo}
            className="luxury-btn-secondary text-[11px] px-2.5 py-1.5 disabled:opacity-30"
            title="Undo"
          >
            ↩
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="luxury-btn-secondary text-[11px] px-2.5 py-1.5 disabled:opacity-30"
            title="Redo"
          >
            ↪
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden min-h-0 relative z-10">
        {!isFullscreen && (
          <aside
            className={`${sidebarCollapsed ? "w-0 opacity-0" : "w-[360px] opacity-100"} flex flex-col border-r border-white/[0.06] glass-panel flex-shrink-0 transition-all duration-300 overflow-hidden`}
          >
            <div className="flex items-center gap-1 p-3 border-b border-white/[0.04]">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`tab-pill flex-1 ${activeTab === t.id ? "tab-pill-active" : "tab-pill-inactive"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto inspector-scroll p-4 space-y-5">
              {activeTab === "design" && (
                <>
                  <section>
                    <div className="section-label mb-3">Curated Templates</div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(PRESETS).map(([key, p]) => (
                        <button
                          key={key}
                          onClick={() => applyPreset(key)}
                          className={`preset-card ${activePreset === key ? "preset-card-active" : ""}`}
                        >
                          <div className="text-[9px] uppercase tracking-wider text-luxury-gold/50 mb-0.5">
                            {p.tag}
                          </div>
                          <div className="text-xs font-medium text-luxury-pearl/90">
                            {p.name}
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                  <div className="h-px bg-white/[0.04]" />
                  <section className="space-y-3">
                    <div className="section-label">Document Format</div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {Object.entries(PAPER_FORMATS).map(([key, f]) => (
                        <button
                          key={key}
                          onClick={() => set({ format: key })}
                          className={`text-[10px] py-2 rounded-lg border transition-all ${settings.format === key ? "border-luxury-gold/40 bg-luxury-gold/10 text-luxury-gold-light" : "border-white/[0.06] text-luxury-pearl/40 hover:border-white/[0.12]"}`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {["portrait", "landscape"].map((o) => (
                        <button
                          key={o}
                          onClick={() => set({ orientation: o })}
                          className={`flex-1 text-[11px] py-2 rounded-lg border capitalize transition-all ${settings.orientation === o ? "border-luxury-gold/40 bg-luxury-gold/10 text-luxury-gold-light" : "border-white/[0.06] text-luxury-pearl/40 hover:border-white/[0.12]"}`}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </section>
                  <div className="h-px bg-white/[0.04]" />
                  <section className="space-y-3">
                    <div className="section-label">Layout Engine</div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {Object.entries(LAYOUT_MODES).map(([key, m]) => (
                        <button
                          key={key}
                          onClick={() => set({ layoutMode: key })}
                          title={m.description}
                          className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border transition-all ${settings.layoutMode === key ? "border-luxury-gold/40 bg-luxury-gold/10 text-luxury-gold-light" : "border-white/[0.06] text-luxury-pearl/40 hover:border-white/[0.12]"}`}
                        >
                          <span className="text-base">{m.icon}</span>
                          <span className="text-[9px]">{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                  <div className="h-px bg-white/[0.04]" />
                  <section className="space-y-4">
                    <div className="section-label">Rule Parameters</div>
                    <PremiumSlider
                      label="Line Spacing"
                      value={settings.spacing}
                      onChange={(v) => set({ spacing: v })}
                      min={20}
                      max={300}
                      unit="px"
                    />
                    <PremiumSlider
                      label="Line Weight"
                      value={settings.thickness}
                      onChange={(v) => set({ thickness: v })}
                      min={1}
                      max={20}
                      step={0.5}
                    />
                    <div className="flex gap-1.5">
                      {Object.entries(LINE_STYLES).map(([key, s]) => (
                        <button
                          key={key}
                          onClick={() => set({ lineStyle: key })}
                          className={`flex-1 text-[10px] py-2 rounded-lg border transition-all ${settings.lineStyle === key ? "border-luxury-gold/40 bg-luxury-gold/10 text-luxury-gold-light" : "border-white/[0.06] text-luxury-pearl/40"}`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <StableColorPicker
                        label="Line Color"
                        value={settings.ruleColor}
                        onChange={(v) => set({ ruleColor: v })}
                      />
                      <StableColorPicker
                        label="Paper Color"
                        value={settings.paperColor}
                        onChange={(v) => set({ paperColor: v })}
                      />
                    </div>
                  </section>
                  <div className="h-px bg-white/[0.04]" />
                  <section className="space-y-4">
                    <div className="section-label">Margin Guidelines</div>
                    <PremiumSlider
                      label="Margin Position"
                      value={settings.side}
                      onChange={(v) => set({ side: v })}
                      min={80}
                      max={1200}
                    />
                    <PremiumSlider
                      label="Margin Width"
                      value={settings.sideWidth}
                      onChange={(v) => set({ sideWidth: v })}
                      min={1}
                      max={40}
                    />
                    <StableColorPicker
                      label="Margin Color"
                      value={settings.sideColor}
                      onChange={(v) => set({ sideColor: v })}
                    />
                  </section>
                </>
              )}
              {activeTab === "typography" && (
                <>
                  <section className="space-y-4">
                    <div className="section-label">Header & Footer</div>
                    <div className="space-y-2">
                      <label className="text-[11px] text-luxury-pearl/50">
                        Header Text
                      </label>
                      <input
                        value={settings.headerText}
                        onChange={(e) => set({ headerText: e.target.value })}
                        placeholder="Document title, chapter name..."
                        className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-luxury-pearl/80 placeholder:text-luxury-pearl/20 outline-none focus:border-luxury-gold/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] text-luxury-pearl/50">
                        Footer Text
                      </label>
                      <input
                        value={settings.footerText}
                        onChange={(e) => set({ footerText: e.target.value })}
                        placeholder="Page numbers, copyright, date..."
                        className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-luxury-pearl/80 placeholder:text-luxury-pearl/20 outline-none focus:border-luxury-gold/30"
                      />
                    </div>
                  </section>
                  <div className="h-px bg-white/[0.04]" />
                  <section className="space-y-4">
                    <div className="section-label">Watermark</div>
                    <div className="space-y-2">
                      <label className="text-[11px] text-luxury-pearl/50">
                        Watermark Text
                      </label>
                      <input
                        value={settings.watermarkText}
                        onChange={(e) => set({ watermarkText: e.target.value })}
                        placeholder="CONFIDENTIAL, DRAFT, Brand name..."
                        className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-luxury-pearl/80 placeholder:text-luxury-pearl/20 outline-none focus:border-luxury-gold/30"
                      />
                    </div>
                    <PremiumSlider
                      label="Watermark Opacity"
                      value={Math.round(settings.watermarkOpacity * 100)}
                      onChange={(v) => set({ watermarkOpacity: v / 100 })}
                      min={2}
                      max={30}
                      format={(v) => `${v}%`}
                    />
                  </section>
                </>
              )}
              {activeTab === "export" && (
                <>
                  <section className="space-y-4">
                    <div className="section-label">Export Quality</div>
                    <div className="space-y-2">
                      {Object.entries(EXPORT_QUALITIES).map(([key, q]) => (
                        <button
                          key={key}
                          onClick={() => set({ exportQuality: key })}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${settings.exportQuality === key ? "border-luxury-gold/40 bg-luxury-gold/10" : "border-white/[0.06] hover:border-white/[0.12]"}`}
                        >
                          <div className="text-left">
                            <div className="text-sm text-luxury-pearl/80">
                              {q.label}
                            </div>
                            <div className="text-[10px] text-luxury-pearl/30">
                              {q.dpi} DPI
                            </div>
                          </div>
                          <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-luxury-gold/15 text-luxury-gold/80">
                            {q.badge}
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                  <div className="h-px bg-white/[0.04]" />
                  <section className="space-y-4">
                    <div className="section-label">Multi-Page Export</div>
                    <PremiumSlider
                      label="Page Count"
                      value={settings.pageCount}
                      onChange={(v) => set({ pageCount: v })}
                      min={1}
                      max={100}
                      format={(v) => `${v} page${v > 1 ? "s" : ""}`}
                    />
                  </section>
                  <div className="h-px bg-white/[0.04]" />
                  {recentExports.length > 0 && (
                    <section>
                      <div className="section-label mb-3">Recent Exports</div>
                      <div className="space-y-1.5">
                        {recentExports.map((e, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                          >
                            <span className="text-[11px] text-luxury-pearl/50">
                              {e.type} · {PAPER_FORMATS[e.format]?.label}
                            </span>
                            <span className="text-[10px] font-mono text-luxury-pearl/25">
                              {new Date(e.time).toLocaleTimeString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
            <div className="p-4 border-t border-white/[0.04] space-y-2 flex-shrink-0">
              <button
                onClick={handleExportPDF}
                disabled={downloading}
                className="luxury-btn-primary w-full text-xs uppercase tracking-[0.15em] disabled:opacity-50"
              >
                {downloading ? "Generating PDF..." : "Export Vector PDF"}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleExportPNG}
                  className="luxury-btn-secondary text-[11px]"
                >
                  Save PNG
                </button>
                <button
                  onClick={handleExportSVG}
                  className="luxury-btn-secondary text-[11px] border-luxury-gold/30 text-luxury-gold-light hover:bg-luxury-gold/5"
                >
                  Export SVG
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={copyConfig}
                  className="luxury-btn-secondary text-[11px]"
                >
                  Copy Config
                </button>
                <button
                  onClick={() => applyPreset("executive")}
                  className="luxury-btn-secondary text-[11px]"
                >
                  Reset
                </button>
              </div>
            </div>
          </aside>
        )}
        {!isFullscreen && (
          <button
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-5 h-12 rounded-r-lg glass-panel border border-l-0 border-white/[0.06] flex items-center justify-center text-luxury-pearl/30 hover:text-luxury-gold transition-all"
            style={{ left: sidebarCollapsed ? 0 : 360 }}
          >
            {sidebarCollapsed ? "›" : "‹"}
          </button>
        )}
        <main
          ref={viewportRef}
          className="flex-1 flex flex-col overflow-hidden min-w-0"
        >
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.04] glass-panel flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-[10px] uppercase tracking-wider text-luxury-pearl/30">
                Live Preview
              </span>
              <span className="text-[10px] font-mono text-luxury-gold/50">
                {stats.pageSize}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom((z) => Math.max(25, z - 25))}
                className="kbd cursor-pointer hover:bg-white/10"
              >
                −
              </button>
              <span className="text-[11px] font-mono text-luxury-pearl/50 w-12 text-center">
                {zoom}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(400, z + 25))}
                className="kbd cursor-pointer hover:bg-white/10"
              >
                +
              </button>
              <button
                onClick={() => setZoom(100)}
                className="luxury-btn-secondary text-[10px] px-2 py-1 ml-1"
              >
                Fit
              </button>
              <button
                onClick={() => setIsFullscreen((f) => !f)}
                className="luxury-btn-secondary text-[10px] px-2 py-1"
              >
                {isFullscreen ? "Exit" : "Fullscreen"}
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-6 overflow-auto inspector-scroll relative">
            <div
              className="relative transition-transform duration-300 ease-out"
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: "center center",
              }}
            >
              <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                className="shadow-luxury-lg rounded-sm object-contain max-h-[calc(100vh-8rem)] max-w-full"
                style={{ backgroundColor: settings.paperColor }}
              />
              <div className="absolute inset-0 rounded-sm pointer-events-none ring-1 ring-black/10" />
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.04] glass-panel flex-shrink-0 text-[10px] font-mono">
            <div className="flex items-center gap-4 text-luxury-pearl/30">
              <span>
                Lines:{" "}
                <span className="text-luxury-gold-light/70">
                  {stats.lineCount}
                </span>
              </span>
              <span>
                Spacing:{" "}
                <span className="text-luxury-gold-light/70">
                  {stats.spacingMm}mm
                </span>
              </span>
              <span>
                Margin:{" "}
                <span className="text-luxury-gold-light/70">
                  {stats.marginMm}mm
                </span>
              </span>
            </div>
            <div className="flex items-center gap-4 text-luxury-pearl/30">
              <span>{stats.pixelSize}px</span>
              <span>{LAYOUT_MODES[settings.layoutMode]?.label}</span>
              <span className="text-luxury-gold/40">
                {EXPORT_QUALITIES[settings.exportQuality]?.label}
              </span>
            </div>
          </div>
        </main>
      </div>

      <CommandPalette
        open={cmdOpen}
        onClose={() => {
          setCmdOpen(false);
          setCmdQuery("");
        }}
        commands={commands}
        query={cmdQuery}
        setQuery={setCmdQuery}
      />
      <ShortcutsModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
      <Toast {...toast} />
    </div>
  );
}
