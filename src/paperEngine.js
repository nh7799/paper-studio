import { jsPDF } from "jspdf";
import { PAPER_FORMATS, LINE_STYLES } from "./constants";

function getDimensions(settings) {
  const fmt = PAPER_FORMATS[settings.format] || PAPER_FORMATS.a4;
  const portrait = settings.orientation !== "landscape";
  return {
    width: portrait ? fmt.width : fmt.height,
    height: portrait ? fmt.height : fmt.width,
    mmW: portrait ? fmt.mmW : fmt.mmH,
    mmH: portrait ? fmt.mmH : fmt.mmW,
  };
}

function applyLineStyle(ctx, style, thickness) {
  const dash = LINE_STYLES[style]?.dash || [];
  ctx.setLineDash(dash.map((d) => d * (thickness / 3)));
  ctx.lineWidth = thickness;
  ctx.lineCap = style === "dotted" ? "round" : "butt";
}

function drawRuledLines(ctx, width, height, settings) {
  ctx.strokeStyle = settings.ruleColor;
  applyLineStyle(ctx, settings.lineStyle, settings.thickness);
  for (let y = settings.spacing; y < height; y += settings.spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawGraphGrid(ctx, width, height, settings) {
  ctx.strokeStyle = settings.ruleColor;
  applyLineStyle(ctx, settings.lineStyle, settings.thickness);
  for (let x = settings.spacing; x < width; x += settings.spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = settings.spacing; y < height; y += settings.spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawDotGrid(ctx, width, height, settings) {
  ctx.fillStyle = settings.ruleColor;
  const dotSize = Math.max(2, settings.thickness);
  for (let x = settings.spacing; x < width; x += settings.spacing) {
    for (let y = settings.spacing; y < height; y += settings.spacing) {
      ctx.beginPath();
      ctx.arc(x, y, dotSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawCornell(ctx, width, height, settings) {
  const headerH = height * 0.12;
  const footerH = height * 0.15;
  const cueW = width * 0.28;

  ctx.strokeStyle = settings.ruleColor;
  applyLineStyle(ctx, settings.lineStyle, settings.thickness);

  ctx.beginPath();
  ctx.moveTo(0, headerH);
  ctx.lineTo(width, headerH);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cueW, headerH);
  ctx.lineTo(cueW, height - footerH);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, height - footerH);
  ctx.lineTo(width, height - footerH);
  ctx.stroke();

  ctx.setLineDash([]);
  drawRuledLines(ctx, width, height - footerH, {
    ...settings,
    spacing: settings.spacing,
  });

  ctx.fillStyle = settings.sideColor;
  ctx.globalAlpha = 0.15;
  ctx.fillRect(0, 0, width, headerH);
  ctx.fillRect(0, height - footerH, width, footerH);
  ctx.fillRect(0, headerH, cueW, height - headerH - footerH);
  ctx.globalAlpha = 1;
}

function drawMusicStaff(ctx, width, height, settings) {
  const staffGap = settings.spacing * 5;
  ctx.strokeStyle = settings.ruleColor;
  ctx.lineWidth = settings.thickness;
  ctx.setLineDash([]);

  for (let y = staffGap; y < height; y += staffGap + settings.spacing * 2) {
    for (let i = 0; i < 5; i++) {
      const lineY = y + i * (settings.spacing * 0.8);
      if (lineY >= height) break;
      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.lineTo(width, lineY);
      ctx.stroke();
    }
  }
}

function drawMargin(ctx, width, height, settings) {
  if (settings.layoutMode === "cornell" || settings.layoutMode === "music")
    return;
  ctx.fillStyle = settings.sideColor;
  ctx.fillRect(settings.side, 0, settings.sideWidth, height);
}

function drawHeaderFooter(ctx, width, height, settings) {
  ctx.fillStyle = settings.ruleColor;
  ctx.globalAlpha = 0.5;
  ctx.font = `${Math.round(width * 0.012)}px "DM Sans", sans-serif`;
  ctx.textAlign = "center";

  if (settings.headerText) {
    ctx.fillText(settings.headerText, width / 2, height * 0.04);
  }
  if (settings.footerText) {
    ctx.fillText(settings.footerText, width / 2, height * 0.97);
  }
  ctx.globalAlpha = 1;
}

function drawWatermark(ctx, width, height, settings) {
  if (!settings.watermarkText) return;
  ctx.save();
  ctx.globalAlpha = settings.watermarkOpacity;
  ctx.fillStyle = settings.ruleColor;
  ctx.font = `500 ${Math.round(width * 0.06)}px "Instrument Serif", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 6);
  ctx.fillText(settings.watermarkText, 0, 0);
  ctx.restore();
}

export function drawPaper(canvas, settings) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { width, height } = getDimensions(settings);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = settings.paperColor;
  ctx.fillRect(0, 0, width, height);

  switch (settings.layoutMode) {
    case "graph":
      drawGraphGrid(ctx, width, height, settings);
      break;
    case "dot":
      drawDotGrid(ctx, width, height, settings);
      break;
    case "cornell":
      drawCornell(ctx, width, height, settings);
      break;
    case "music":
      drawMusicStaff(ctx, width, height, settings);
      break;
    case "blank":
      break;
    default:
      drawRuledLines(ctx, width, height, settings);
  }

  drawMargin(ctx, width, height, settings);
  drawHeaderFooter(ctx, width, height, settings);
  drawWatermark(ctx, width, height, settings);
}

export function computeStats(settings) {
  const { width, height, mmW, mmH } = getDimensions(settings);
  const scale = mmW / width;
  const lineCount =
    settings.layoutMode === "ruled" || settings.layoutMode === "cornell"
      ? Math.floor((height - settings.spacing) / settings.spacing)
      : settings.layoutMode === "graph"
        ? Math.floor(width / settings.spacing) *
          Math.floor(height / settings.spacing)
        : 0;

  return {
    lineCount,
    marginMm: Math.round(settings.side * scale * 10) / 10,
    spacingMm: Math.round(settings.spacing * scale * 10) / 10,
    pageSize: `${mmW} × ${mmH} mm`,
    pixelSize: `${width} × ${height}`,
    width,
    height,
  };
}

export async function exportPNG(canvas) {
  const link = document.createElement("a");
  link.download = `paper-studio-pro-${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png", 1.0);
  link.click();
}

export function encodeSettings(settings) {
  return btoa(JSON.stringify(settings));
}

export function decodeSettings(hash) {
  try {
    return JSON.parse(atob(hash));
  } catch {
    return null;
  }
}
