import { buildArtifactManifest } from "./manifest.ts";
import type { LivingDocument } from "../../shared/document.ts";

type CanvasLink = { x: number; y: number; width: number; height: number; url: string };
type RenderedPage = { jpeg: Uint8Array; links: CanvasLink[]; width: number; height: number };

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
  context.font = font; context.fillStyle = color;
  context.textAlign = isRtl(text) ? "right" : "left";
  context.direction = isRtl(text) ? "rtl" : "ltr";
}

function wrapLines(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const paragraphs = text.split(/\n+/);
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && context.measureText(candidate).width > maxWidth) { lines.push(line); line = word; }
      else line = candidate;
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

function drawHeader(context: CanvasRenderingContext2D, document: LivingDocument, pageNumber: number) {
  context.fillStyle = "#f3f0e5"; context.fillRect(0, 0, PAGE_W, PAGE_H);
  context.fillStyle = "#10241b"; context.fillRect(0, 0, PAGE_W, 74);
  context.fillStyle = "#d9ff86"; context.font = "700 25px Georgia"; context.textAlign = "left"; context.direction = "ltr"; context.fillText("WT", MARGIN, 47);
  context.fillStyle = "#a5b3a8"; context.font = "600 14px Arial"; context.fillText(`LIVING RESEARCH DOCUMENT / V${document.documentVersion}`, 155, 46);
  context.textAlign = "right"; context.fillText(String(pageNumber).padStart(2, "0"), PAGE_W - MARGIN, 46);
  context.textAlign = "left";
}

function drawFooter(context: CanvasRenderingContext2D, document: LivingDocument) {
  context.strokeStyle = "rgba(16,36,27,.22)"; context.beginPath(); context.moveTo(MARGIN, PAGE_H - 66); context.lineTo(PAGE_W - MARGIN, PAGE_H - 66); context.stroke();
  context.fillStyle = "#68796e"; context.font = "12px Arial"; context.textAlign = "left"; context.direction = "ltr";
  context.fillText(`Garden: ${document.gardenSlug}  /  Evidence: ${document.sourceRefs.length} sources`, MARGIN, PAGE_H - 38);
  context.textAlign = "right"; context.fillText(document.basedOn.sourceFingerprint, PAGE_W - MARGIN, PAGE_H - 38);
}

function renderDocument(documentData: LivingDocument, canonicalUrl: string): RenderedPage[] {
  const pages: RenderedPage[] = [];
  let links: CanvasLink[] = [];
  let pageNumber = 1;
  let current = canvasPage();
  drawHeader(current.context, documentData, pageNumber);
  let y = 155;

  const finish = () => {
    drawFooter(current.context, documentData);
    pages.push({ jpeg: bytesFromDataUrl(current.canvas.toDataURL("image/jpeg", .92)), links, width: PAGE_W, height: PAGE_H });
  };
  const nextPage = () => {
    finish(); pageNumber += 1; links = []; current = canvasPage(); drawHeader(current.context, documentData, pageNumber); y = 132;
  };
  const ensure = (height: number) => { if (y + height > PAGE_H - 105) nextPage(); };

  current.context.fillStyle = "#10241b"; current.context.font = "700 14px Arial"; current.context.letterSpacing = "2px";
  current.context.fillText("WEB TERRARIUM / FROZEN SNAPSHOT", MARGIN, y); y += 55;
  y = drawWrapped(current.context, documentData.title, MARGIN, y, PAGE_W - MARGIN * 2, 94, "400 84px Georgia", "#10241b", 4) + 22;
  y = drawWrapped(current.context, documentData.executiveSummary, MARGIN, y, PAGE_W - MARGIN * 2, 42, "400 30px Georgia", "#53645a", 9) + 42;
  current.context.fillStyle = "#d9ff86"; current.context.fillRect(MARGIN, y, PAGE_W - MARGIN * 2, 3); y += 38;
  const meta = [`Version ${documentData.documentVersion}`, `${documentData.basedOn.runCount} growth cycles`, `${documentData.sourceRefs.length} sources`, `Generated ${new Date(documentData.generatedAt).toLocaleDateString()}`];
  current.context.font = "600 15px Arial"; current.context.fillStyle = "#607167"; current.context.textAlign = "left"; meta.forEach((item, index) => current.context.fillText(item, MARGIN + index * 255, y));
  y += 78;

  const sectionTitle = (number: string, label: string, title: string) => {
    ensure(130); current.context.strokeStyle = "#10241b"; current.context.beginPath(); current.context.moveTo(MARGIN, y); current.context.lineTo(PAGE_W - MARGIN, y); current.context.stroke(); y += 34;
    current.context.fillStyle = "#73a36f"; current.context.font = "400 24px Georgia"; current.context.textAlign = "left"; current.context.fillText(number, MARGIN, y);
    current.context.fillStyle = "#617268"; current.context.font = "800 13px Arial"; current.context.fillText(label, MARGIN + 72, y); y += 48;
    y = drawWrapped(current.context, title, MARGIN + 72, y, PAGE_W - MARGIN * 2 - 72, 52, "400 46px Georgia", "#10241b", 3) + 28;
  };

  sectionTitle("01", "CURRENT PICTURE", "What the evidence says now");
  documentData.findings.filter((finding) => finding.status !== "retracted").forEach((finding, index) => {
    ensure(180); current.context.strokeStyle = "rgba(16,36,27,.18)"; current.context.beginPath(); current.context.moveTo(MARGIN + 72, y); current.context.lineTo(PAGE_W - MARGIN, y); current.context.stroke(); y += 30;
    current.context.fillStyle = "#89998f"; current.context.font = "14px monospace"; current.context.textAlign = "left"; current.context.fillText(String(index + 1).padStart(2, "0"), MARGIN, y);
    y = drawWrapped(current.context, finding.title, MARGIN + 72, y, PAGE_W - MARGIN * 2 - 72, 34, "400 30px Georgia", "#10241b", 3) + 14;
    y = drawWrapped(current.context, finding.detail, MARGIN + 72, y, PAGE_W - MARGIN * 2 - 72, 27, "20px Arial", "#596a60", 9) + 20;
    current.context.fillStyle = finding.confidence === "high" ? "#10241b" : "#dfe8d7"; current.context.fillRect(MARGIN + 72, y, 145, 29);
    current.context.fillStyle = finding.confidence === "high" ? "#d9ff86" : "#3b5744"; current.context.font = "700 12px Arial"; current.context.fillText(`${finding.confidence.toUpperCase()} CONFIDENCE`, MARGIN + 83, y + 20); y += 52;
  });

  if (documentData.openQuestions.length) {
    sectionTitle("02", "RESEARCH FRONTIER", "Questions still alive");
    documentData.openQuestions.filter((question) => question.status === "open").forEach((question) => {
      ensure(110); current.context.fillStyle = "#73a36f"; current.context.font = "400 38px Georgia"; current.context.textAlign = "left"; current.context.fillText("?", MARGIN, y + 6);
      y = drawWrapped(current.context, question.question, MARGIN + 72, y, PAGE_W - MARGIN * 2 - 72, 35, "400 28px Georgia", "#10241b", 4) + 20;
    });
  }

  sectionTitle("03", "EVIDENCE INDEX", `${documentData.sourceRefs.length} source specimens`);
  documentData.sourceRefs.forEach((source, index) => {
    ensure(90); const rowY = y; current.context.fillStyle = "#87968d"; current.context.font = "13px monospace"; current.context.textAlign = "left"; current.context.fillText(String(index + 1).padStart(2, "0"), MARGIN, y);
    y = drawWrapped(current.context, source.title, MARGIN + 72, y, PAGE_W - MARGIN * 2 - 72, 27, "400 21px Georgia", "#10241b", 2);
    setText(current.context, source.url, "13px Arial", "#58735e"); current.context.textAlign = "left"; current.context.direction = "ltr"; current.context.fillText(source.url.slice(0, 100), MARGIN + 72, y + 18);
    const measured = Math.min(current.context.measureText(source.url.slice(0, 100)).width, PAGE_W - MARGIN * 2 - 72);
    links.push({ x: MARGIN + 72, y: y + 2, width: measured, height: 24, url: source.url }); y += 54;
    current.context.strokeStyle = "rgba(16,36,27,.12)"; current.context.beginPath(); current.context.moveTo(MARGIN + 72, y); current.context.lineTo(PAGE_W - MARGIN, y); current.context.stroke(); y += 20;
    if (rowY === y) y += 1;
  });

  ensure(120); current.context.fillStyle = "#dfe8d7"; current.context.fillRect(MARGIN, y, PAGE_W - MARGIN * 2, 82);
  current.context.fillStyle = "#10241b"; current.context.font = "700 14px Arial"; current.context.textAlign = "left"; current.context.fillText("LIVE DOCUMENT", MARGIN + 22, y + 31);
  current.context.font = "16px Arial"; current.context.fillStyle = "#4b6152"; current.context.fillText(canonicalUrl, MARGIN + 22, y + 57);
  links.push({ x: MARGIN + 22, y: y + 37, width: PAGE_W - MARGIN * 2 - 44, height: 26, url: canonicalUrl });

  finish();
  return pages;
}

function escapePdfString(value: string) { return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[\r\n]+/g, " "); }

function buildPdf(pages: RenderedPage[], title: string, manifest: string) {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let length = 0; let objectNumber = 0;
  const push = (value: string | Uint8Array) => { const bytes = typeof value === "string" ? enc.encode(value) : value; chunks.push(bytes); length += bytes.length; };
  const addObject = (body: string | ((number: number) => void)) => { objectNumber += 1; offsets[objectNumber] = length; push(`${objectNumber} 0 obj\n`); typeof body === "function" ? body(objectNumber) : push(body); push("\nendobj\n"); return objectNumber; };

  push("%PDF-1.7\n%\xE2\xE3\xCF\xD3\n");
  const catalogNumber = addObject("<< /Type /Catalog /Pages 2 0 R >>");
  const pageObjects: number[] = [];
  const reservedPagesNumber = 2;
  objectNumber = 2; offsets[2] = -1;

  pages.forEach((page) => {
    const imageNumber = objectNumber + 2;
    const contentNumber = objectNumber + 3;
    const annotationNumbers = page.links.map((_, index) => contentNumber + 1 + index);
    const pageNumber = objectNumber + 1;
    offsets[pageNumber] = length; push(`${pageNumber} 0 obj\n<< /Type /Page /Parent ${reservedPagesNumber} 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${imageNumber} 0 R >> >> /Contents ${contentNumber} 0 R${annotationNumbers.length ? ` /Annots [${annotationNumbers.map((n) => `${n} 0 R`).join(" ")}]` : ""} >>\nendobj\n`); objectNumber = pageNumber; pageObjects.push(pageNumber);
    addObject(() => { push(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`); push(page.jpeg); push("\nendstream"); });
    const content = "q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ";
    addObject(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    page.links.forEach((link) => {
      const sx = 595.28 / page.width; const sy = 841.89 / page.height;
      const x1 = link.x * sx; const x2 = (link.x + link.width) * sx; const y1 = 841.89 - (link.y + link.height) * sy; const y2 = 841.89 - link.y * sy;
      addObject(`<< /Type /Annot /Subtype /Link /Rect [${x1.toFixed(2)} ${y1.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}] /Border [0 0 0] /A << /S /URI /URI (${escapePdfString(link.url)}) >> >>`);
    });
  });

  const infoNumber = addObject(`<< /Title (${escapePdfString(title)}) /Creator (Web Terrarium) /Subject (${escapePdfString(manifest)}) >>`);
  const pagesBody = `<< /Type /Pages /Count ${pageObjects.length} /Kids [${pageObjects.map((n) => `${n} 0 R`).join(" ")}] >>`;
  const pagesBytes = enc.encode(`2 0 obj\n${pagesBody}\nendobj\n`);
  const insertion = chunks.findIndex((chunk, index) => index > 0 && offsets[3] === chunks.slice(0, index).reduce((sum, item) => sum + item.length, 0));
  if (insertion < 0) throw new Error("Could not assemble PDF page tree.");
  chunks.splice(insertion, 0, pagesBytes); const shift = pagesBytes.length; length += shift; offsets[2] = offsets[3];
  for (let i = 3; i < offsets.length; i += 1) if (offsets[i] >= offsets[2]) offsets[i] += shift;

  const xref = length; push(`xref\n0 ${objectNumber + 1}\n0000000000 65535 f \n`);
  for (let i = 1; i <= objectNumber; i += 1) push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${objectNumber + 1} /Root ${catalogNumber} 0 R /Info ${infoNumber} 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(chunks, { type: "application/pdf" });
}

export function generateLivingDocumentPdf(documentData: LivingDocument, canonicalUrl: string) {
  const manifest = buildArtifactManifest({ document: documentData, artifactType: "pdf", canonicalUrl });
  const pages = renderDocument(documentData, canonicalUrl);
  return { blob: buildPdf(pages, `${documentData.title} - Living Research Document v${documentData.documentVersion}`, JSON.stringify(manifest)), manifest };
}
