import { buildArtifactManifest } from "./manifest.ts";
import type { LivingDocument } from "../../shared/document.ts";

type CanvasLink = { x: number; y: number; width: number; height: number; url: string };
type RenderedPage = { jpeg: Uint8Array; links: CanvasLink[]; width: number; height: number };
type PdfObject = Array<string | Uint8Array>;

const PAGE_W = 1240;
const PAGE_H = 1754;
const MARGIN = 92;

function bytesFromDataUrl(value: string) {
  const binary = atob(value.slice(value.indexOf(",") + 1));
  const output = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) output[i] = binary.charCodeAt(i);
  return output;
}
function isRtl(value: string) { return /[\u0590-\u08FF]/.test(value); }
function canvasPage() {
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_W; canvas.height = PAGE_H;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable in this browser.");
  return { canvas, context };
}
function setText(context: CanvasRenderingContext2D, text: string, font: string, color = "#10241b") {
  context.font = font; context.fillStyle = color; context.textAlign = isRtl(text) ? "right" : "left"; context.direction = isRtl(text) ? "rtl" : "ltr";
}
function wrapLines(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  for (const paragraph of text.split(/\n+/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && context.measureText(candidate).width > maxWidth) { lines.push(line); line = word; } else line = candidate;
    }
    if (line) lines.push(line);
  }
  return lines;
}
function drawWrapped(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, font: string, color?: string, maxLines = 100) {
  setText(context, text, font, color);
  const anchor = isRtl(text) ? PAGE_W - x : x;
  const lines = wrapLines(context, text, maxWidth).slice(0, maxLines);
  lines.forEach((line, index) => context.fillText(line, anchor, y + index * lineHeight));
  return y + lines.length * lineHeight;
}
function drawHeader(context: CanvasRenderingContext2D, documentData: LivingDocument, pageNumber: number) {
  context.fillStyle = "#f3f0e5"; context.fillRect(0, 0, PAGE_W, PAGE_H);
  context.fillStyle = "#10241b"; context.fillRect(0, 0, PAGE_W, 74);
  context.fillStyle = "#d9ff86"; context.font = "700 25px Georgia"; context.textAlign = "left"; context.direction = "ltr"; context.fillText("WT", MARGIN, 47);
  context.fillStyle = "#a5b3a8"; context.font = "600 14px Arial"; context.fillText(`LIVING RESEARCH DOCUMENT / V${documentData.documentVersion}`, 155, 46);
  context.textAlign = "right"; context.fillText(String(pageNumber).padStart(2, "0"), PAGE_W - MARGIN, 46); context.textAlign = "left";
}
function drawFooter(context: CanvasRenderingContext2D, documentData: LivingDocument) {
  context.strokeStyle = "rgba(16,36,27,.22)"; context.beginPath(); context.moveTo(MARGIN, PAGE_H - 66); context.lineTo(PAGE_W - MARGIN, PAGE_H - 66); context.stroke();
  context.fillStyle = "#68796e"; context.font = "12px Arial"; context.textAlign = "left"; context.direction = "ltr";
  context.fillText(`Garden: ${documentData.gardenSlug} / Evidence: ${documentData.sourceRefs.length} sources`, MARGIN, PAGE_H - 38);
  context.textAlign = "right"; context.fillText(documentData.basedOn.sourceFingerprint, PAGE_W - MARGIN, PAGE_H - 38);
}

function renderDocument(documentData: LivingDocument, canonicalUrl: string): RenderedPage[] {
  const pages: RenderedPage[] = [];
  let links: CanvasLink[] = [], pageNumber = 1, current = canvasPage(), y = 155;
  drawHeader(current.context, documentData, pageNumber);
  const finish = () => { drawFooter(current.context, documentData); pages.push({ jpeg: bytesFromDataUrl(current.canvas.toDataURL("image/jpeg", .92)), links, width: PAGE_W, height: PAGE_H }); };
  const nextPage = () => { finish(); pageNumber += 1; links = []; current = canvasPage(); drawHeader(current.context, documentData, pageNumber); y = 132; };
  const ensure = (height: number) => { if (y + height > PAGE_H - 105) nextPage(); };
  const sectionTitle = (number: string, label: string, title: string) => {
    ensure(130); current.context.strokeStyle = "#10241b"; current.context.beginPath(); current.context.moveTo(MARGIN, y); current.context.lineTo(PAGE_W - MARGIN, y); current.context.stroke(); y += 34;
    current.context.fillStyle = "#73a36f"; current.context.font = "400 24px Georgia"; current.context.textAlign = "left"; current.context.fillText(number, MARGIN, y);
    current.context.fillStyle = "#617268"; current.context.font = "800 13px Arial"; current.context.fillText(label, MARGIN + 72, y); y += 48;
    y = drawWrapped(current.context, title, MARGIN + 72, y, PAGE_W - MARGIN * 2 - 72, 52, "400 46px Georgia", "#10241b", 3) + 28;
  };

  current.context.fillStyle = "#10241b"; current.context.font = "700 14px Arial"; current.context.fillText("WEB TERRARIUM / FROZEN SNAPSHOT", MARGIN, y); y += 55;
  y = drawWrapped(current.context, documentData.title, MARGIN, y, PAGE_W - MARGIN * 2, 94, "400 84px Georgia", "#10241b", 4) + 22;
  y = drawWrapped(current.context, documentData.executiveSummary, MARGIN, y, PAGE_W - MARGIN * 2, 42, "400 30px Georgia", "#53645a", 9) + 42;
  current.context.fillStyle = "#d9ff86"; current.context.fillRect(MARGIN, y, PAGE_W - MARGIN * 2, 3); y += 38;
  [`Version ${documentData.documentVersion}`, `${documentData.basedOn.runCount} growth cycles`, `${documentData.sourceRefs.length} sources`, `Generated ${new Date(documentData.generatedAt).toLocaleDateString()}`].forEach((item, index) => { current.context.font = "600 15px Arial"; current.context.fillStyle = "#607167"; current.context.textAlign = "left"; current.context.fillText(item, MARGIN + index * 255, y); }); y += 78;

  sectionTitle("01", "CURRENT PICTURE", "What the evidence says now");
  documentData.findings.filter((finding) => finding.status !== "retracted").forEach((finding, index) => {
    ensure(180); current.context.strokeStyle = "rgba(16,36,27,.18)"; current.context.beginPath(); current.context.moveTo(MARGIN + 72, y); current.context.lineTo(PAGE_W - MARGIN, y); current.context.stroke(); y += 30;
    current.context.fillStyle = "#89998f"; current.context.font = "14px monospace"; current.context.textAlign = "left"; current.context.fillText(String(index + 1).padStart(2, "0"), MARGIN, y);
    y = drawWrapped(current.context, finding.title, MARGIN + 72, y, PAGE_W - MARGIN * 2 - 72, 34, "400 30px Georgia", "#10241b", 3) + 14;
    y = drawWrapped(current.context, finding.detail, MARGIN + 72, y, PAGE_W - MARGIN * 2 - 72, 27, "20px Arial", "#596a60", 9) + 20;
    current.context.fillStyle = finding.confidence === "high" ? "#10241b" : "#dfe8d7"; current.context.fillRect(MARGIN + 72, y, 145, 29);
    current.context.fillStyle = finding.confidence === "high" ? "#d9ff86" : "#3b5744"; current.context.font = "700 12px Arial"; current.context.fillText(`${finding.confidence.toUpperCase()} CONFIDENCE`, MARGIN + 83, y + 20); y += 52;
  });
  if (documentData.openQuestions.some((question) => question.status === "open")) {
    sectionTitle("02", "RESEARCH FRONTIER", "Questions still alive");
    documentData.openQuestions.filter((question) => question.status === "open").forEach((question) => { ensure(110); current.context.fillStyle = "#73a36f"; current.context.font = "400 38px Georgia"; current.context.fillText("?", MARGIN, y + 6); y = drawWrapped(current.context, question.question, MARGIN + 72, y, PAGE_W - MARGIN * 2 - 72, 35, "400 28px Georgia", "#10241b", 4) + 20; });
  }
  sectionTitle("03", "EVIDENCE INDEX", `${documentData.sourceRefs.length} source specimens`);
  documentData.sourceRefs.forEach((source, index) => {
    ensure(90); current.context.fillStyle = "#87968d"; current.context.font = "13px monospace"; current.context.textAlign = "left"; current.context.fillText(String(index + 1).padStart(2, "0"), MARGIN, y);
    y = drawWrapped(current.context, source.title, MARGIN + 72, y, PAGE_W - MARGIN * 2 - 72, 27, "400 21px Georgia", "#10241b", 2);
    setText(current.context, source.url, "13px Arial", "#58735e"); current.context.textAlign = "left"; current.context.direction = "ltr"; const visibleUrl = source.url.slice(0, 100); current.context.fillText(visibleUrl, MARGIN + 72, y + 18);
    links.push({ x: MARGIN + 72, y: y + 2, width: Math.min(current.context.measureText(visibleUrl).width, PAGE_W - MARGIN * 2 - 72), height: 24, url: source.url }); y += 74;
  });
  ensure(120); current.context.fillStyle = "#dfe8d7"; current.context.fillRect(MARGIN, y, PAGE_W - MARGIN * 2, 82); current.context.fillStyle = "#10241b"; current.context.font = "700 14px Arial"; current.context.fillText("LIVE DOCUMENT", MARGIN + 22, y + 31); current.context.font = "16px Arial"; current.context.fillStyle = "#4b6152"; current.context.fillText(canonicalUrl, MARGIN + 22, y + 57); links.push({ x: MARGIN + 22, y: y + 37, width: PAGE_W - MARGIN * 2 - 44, height: 26, url: canonicalUrl });
  finish(); return pages;
}

function escapePdfString(value: string) { return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[\r\n]+/g, " "); }
function concat(parts: Uint8Array[]) { const size = parts.reduce((sum, part) => sum + part.length, 0); const result = new Uint8Array(size); let offset = 0; for (const part of parts) { result.set(part, offset); offset += part.length; } return result; }

function buildPdf(pages: RenderedPage[], title: string, manifest: string) {
  const enc = new TextEncoder();
  const objects: PdfObject[] = [[], ["<< /Type /Catalog /Pages 2 0 R >>"], []];
  const add = (parts: PdfObject) => { objects.push(parts); return objects.length - 1; };
  const pageNumbers: number[] = [];

  pages.forEach((page) => {
    const pageNumber = objects.length; objects.push([]); pageNumbers.push(pageNumber);
    const imageNumber = add([`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`, page.jpeg, "\nendstream"]);
    const content = "q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ";
    const contentNumber = add([`<< /Length ${content.length} >>\nstream\n${content}\nendstream`]);
    const annotations = page.links.map((link) => {
      const sx = 595.28 / page.width, sy = 841.89 / page.height;
      const x1 = link.x * sx, x2 = (link.x + link.width) * sx, y1 = 841.89 - (link.y + link.height) * sy, y2 = 841.89 - link.y * sy;
      return add([`<< /Type /Annot /Subtype /Link /Rect [${x1.toFixed(2)} ${y1.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}] /Border [0 0 0] /A << /S /URI /URI (${escapePdfString(link.url)}) >> >>`]);
    });
    objects[pageNumber] = [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${imageNumber} 0 R >> >> /Contents ${contentNumber} 0 R${annotations.length ? ` /Annots [${annotations.map((n) => `${n} 0 R`).join(" ")}]` : ""} >>`];
  });
  objects[2] = [`<< /Type /Pages /Count ${pageNumbers.length} /Kids [${pageNumbers.map((n) => `${n} 0 R`).join(" ")}] >>`];
  const infoNumber = add([`<< /Title (${escapePdfString(title)}) /Creator (Web Terrarium) /Subject (${escapePdfString(manifest)}) >>`]);
  const output: Uint8Array[] = [enc.encode("%PDF-1.7\n%WT\n")];
  const offsets: number[] = [0]; let length = output[0].length;
  for (let i = 1; i < objects.length; i += 1) {
    offsets[i] = length; const body = concat(objects[i].map((part) => typeof part === "string" ? enc.encode(part) : part)); const objectBytes = concat([enc.encode(`${i} 0 obj\n`), body, enc.encode("\nendobj\n")]); output.push(objectBytes); length += objectBytes.length;
  }
  const xref = length; const lines = [`xref\n0 ${objects.length}\n0000000000 65535 f \n`, ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`), `trailer\n<< /Size ${objects.length} /Root 1 0 R /Info ${infoNumber} 0 R >>\nstartxref\n${xref}\n%%EOF`]; output.push(enc.encode(lines.join("")));
  const bytes = concat(output); return new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
}

export function generateLivingDocumentPdf(documentData: LivingDocument, canonicalUrl: string) {
  const manifest = buildArtifactManifest({ document: documentData, artifactType: "pdf", canonicalUrl });
  return { blob: buildPdf(renderDocument(documentData, canonicalUrl), `${documentData.title} - Living Research Document v${documentData.documentVersion}`, JSON.stringify(manifest)), manifest };
}
