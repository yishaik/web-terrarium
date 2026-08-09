import { buildArtifactManifest } from "./manifest.ts";
import type { LivingDocument } from "../../shared/document.ts";

type PdfObject = Array<string | Uint8Array>;
const W = 1240, H = 1754;

function concat(parts: Uint8Array[]) { const size = parts.reduce((sum, part) => sum + part.length, 0); const result = new Uint8Array(size); let offset = 0; for (const part of parts) { result.set(part, offset); offset += part.length; } return result; }
function bytesFromDataUrl(value: string) { const binary = atob(value.slice(value.indexOf(",") + 1)); const output = new Uint8Array(binary.length); for (let i = 0; i < binary.length; i += 1) output[i] = binary.charCodeAt(i); return output; }
function escapePdf(value: string) { return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/\r/g, "\\r").replace(/\n/g, "\\n"); }
function jsAscii(value: string) { return value.replace(/[\u007f-\uffff]/g, (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`); }
function isRtl(value: string) { return /[\u0590-\u08FF]/.test(value); }
function setText(ctx: CanvasRenderingContext2D, value: string, font: string, color: string) { ctx.font = font; ctx.fillStyle = color; ctx.direction = isRtl(value) ? "rtl" : "ltr"; ctx.textAlign = isRtl(value) ? "right" : "left"; }
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) { const lines: string[] = []; let line = ""; for (const word of text.split(/\s+/)) { const next = line ? `${line} ${word}` : word; if (line && ctx.measureText(next).width > width) { lines.push(line); line = word; } else line = next; } if (line) lines.push(line); return lines; }
function drawWrapped(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, lineHeight: number, font: string, color: string, maxLines: number) { setText(ctx, text, font, color); const anchor = isRtl(text) ? W - x : x; const lines = wrap(ctx, text, width).slice(0, maxLines); lines.forEach((line, index) => ctx.fillText(line, anchor, y + index * lineHeight)); return y + lines.length * lineHeight; }

function renderConsole(documentData: LivingDocument) {
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Canvas unavailable.");
  ctx.fillStyle = "#10241b"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(217,255,134,.08)"; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 44) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 44) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.fillStyle = "#d9ff86"; ctx.font = "800 18px Arial"; ctx.textAlign = "left"; ctx.direction = "ltr"; ctx.fillText("WT / INTELLIGENT OFFLINE PDF", 86, 92);
  ctx.fillStyle = "#789184"; ctx.font = "14px monospace"; ctx.textAlign = "right"; ctx.fillText(`DOCUMENT V${documentData.documentVersion} · ${documentData.sourceRefs.length} SOURCES`, W - 86, 92);
  let y = 220;
  y = drawWrapped(ctx, documentData.title, 86, y, W - 172, 84, "400 78px Georgia", "#f3f0e5", 4) + 28;
  y = drawWrapped(ctx, documentData.executiveSummary, 86, y, W - 172, 38, "400 27px Georgia", "#b9c7bd", 7) + 45;
  ctx.fillStyle = "#d9ff86"; ctx.fillRect(86, y, W - 172, 3); y += 48;
  ctx.fillStyle = "#9bae9f"; ctx.font = "800 14px Arial"; ctx.textAlign = "left"; ctx.fillText("OFFLINE EVIDENCE CONSOLE", 86, y); y += 35;
  ctx.fillStyle = "#f3f0e5"; ctx.font = "400 24px Georgia"; ctx.fillText("Type a question in the field below, then press ASK EVIDENCE.", 86, y); y += 38;
  ctx.fillStyle = "#83988a"; ctx.font = "17px Arial"; ctx.fillText("This PDF searches only its frozen findings. No network, API key, or server is required.", 86, y);

  const question = { x: 86, y: 805, width: W - 172, height: 82 };
  const button = { x: W - 336, y: 920, width: 250, height: 66 };
  const answer = { x: 86, y: 1030, width: W - 172, height: 470 };
  ctx.fillStyle = "#f3f0e5"; ctx.fillRect(question.x, question.y, question.width, question.height);
  ctx.strokeStyle = "#d9ff86"; ctx.strokeRect(question.x, question.y, question.width, question.height);
  ctx.fillStyle = "#d9ff86"; ctx.fillRect(button.x, button.y, button.width, button.height);
  ctx.fillStyle = "#10241b"; ctx.font = "900 18px Arial"; ctx.textAlign = "center"; ctx.fillText("ASK EVIDENCE →", button.x + button.width / 2, button.y + 42);
  ctx.fillStyle = "rgba(243,240,229,.07)"; ctx.fillRect(answer.x, answer.y, answer.width, answer.height);
  ctx.strokeStyle = "rgba(217,255,134,.28)"; ctx.strokeRect(answer.x, answer.y, answer.width, answer.height);
  ctx.fillStyle = "#6f8879"; ctx.font = "12px monospace"; ctx.textAlign = "left"; ctx.fillText(`EVIDENCE HASH ${documentData.basedOn.sourceFingerprint}`, 86, H - 68);
  return { jpeg: bytesFromDataUrl(canvas.toDataURL("image/jpeg", .93)), question, button, answer };
}

function buildRetrievalScript(documentData: LivingDocument) {
  const sourceMap = Object.fromEntries(documentData.sourceRefs.map((source) => [source.id, { title: source.title, url: source.url, domain: source.domain }]));
  const evidence = documentData.findings.filter((finding) => finding.status !== "retracted").map((finding) => ({ id: finding.id, title: finding.title, detail: finding.detail, confidence: finding.confidence, sourceIds: finding.sourceIds }));
  const encodedEvidence = jsAscii(JSON.stringify(evidence));
  const encodedSources = jsAscii(JSON.stringify(sourceMap));
  return `var WT_EVIDENCE=${encodedEvidence};var WT_SOURCES=${encodedSources};function wtTok(s){var a=String(s||'').toLowerCase().replace(/[^a-z0-9\\u0590-\\u08ff]+/g,' ').split(/\\s+/);var r=[];for(var i=0;i<a.length;i++){if(a[i].length>2&&r.indexOf(a[i])<0)r.push(a[i]);}return r;}function wtAsk(){var q=this.getField('WTQuestion').value;var t=wtTok(q);var scored=[];for(var i=0;i<WT_EVIDENCE.length;i++){var e=WT_EVIDENCE[i],s=(e.title+' '+e.detail).toLowerCase(),n=0;for(var j=0;j<t.length;j++){if(s.indexOf(t[j])>=0)n++;}if(n>0)scored.push({e:e,n:n});}scored.sort(function(a,b){return b.n-a.n;});var out='';if(!scored.length){out='This frozen document does not contain enough evidence to answer that without guessing.';}else{var take=Math.min(3,scored.length);for(var k=0;k<take;k++){var e=scored[k].e;out+=(k?"\\n\\n":'')+e.title+': '+e.detail;var src=[];for(var m=0;m<e.sourceIds.length;m++){var z=WT_SOURCES[e.sourceIds[m]];if(z)src.push(z.domain+' — '+z.url);}if(src.length)out+='\\nSources: '+src.slice(0,3).join(' | ');}out+='\\n\\nOffline retrieval only · document v${documentData.documentVersion}';}this.getField('WTAnswer').value=out;}wtAsk.call(this);`;
}

function buildPdf(documentData: LivingDocument, canonicalUrl: string) {
  const enc = new TextEncoder(); const visual = renderConsole(documentData); const script = buildRetrievalScript(documentData);
  const manifest = buildArtifactManifest({ document: documentData, artifactType: "intelligent-pdf", canonicalUrl });
  const objects: PdfObject[] = [[], [], []]; const add = (body: PdfObject) => { objects.push(body); return objects.length - 1; };
  const pageNumber = 3; objects.push([]);
  const imageNumber = add([`<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${visual.jpeg.length} >>\nstream\n`, visual.jpeg, "\nendstream"]);
  const content = "q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ"; const contentNumber = add([`<< /Length ${content.length} >>\nstream\n${content}\nendstream`]);
  const fontNumber = add(["<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]);
  const toRect = (box: {x:number;y:number;width:number;height:number}) => { const sx=595.28/W,sy=841.89/H; return `${(box.x*sx).toFixed(2)} ${(841.89-(box.y+box.height)*sy).toFixed(2)} ${((box.x+box.width)*sx).toFixed(2)} ${(841.89-box.y*sy).toFixed(2)}`; };
  const questionNumber = add([`<< /Type /Annot /Subtype /Widget /FT /Tx /T (WTQuestion) /Rect [${toRect(visual.question)}] /P ${pageNumber} 0 R /DA (/Helv 14 Tf 0.05 0.12 0.08 rg) /MK << /BG [0.95 0.94 0.90] /BC [0.85 1 0.52] >> /V (What does the evidence say?) >>`]);
  const answerNumber = add([`<< /Type /Annot /Subtype /Widget /FT /Tx /Ff 4096 /T (WTAnswer) /Rect [${toRect(visual.answer)}] /P ${pageNumber} 0 R /DA (/Helv 11 Tf 0.92 0.95 0.92 rg) /MK << /BG [0.08 0.17 0.12] /BC [0.45 0.65 0.43] >> /V (Ask a question above. The answer will use only evidence embedded in this PDF.) >>`]);
  const buttonNumber = add([`<< /Type /Annot /Subtype /Widget /FT /Btn /Ff 65536 /T (WTAsk) /Rect [${toRect(visual.button)}] /P ${pageNumber} 0 R /MK << /CA (ASK EVIDENCE) /BG [0.85 1 0.52] /BC [0.85 1 0.52] >> /DA (/Helv 11 Tf 0.05 0.12 0.08 rg) /A << /S /JavaScript /JS (${escapePdf(script)}) >> >>`]);
  const liveNumber = add([`<< /Type /Annot /Subtype /Link /Rect [43 20 250 38] /Border [0 0 0] /A << /S /URI /URI (${escapePdf(canonicalUrl)}) >> >>`]);
  const acroNumber = add([`<< /Fields [${questionNumber} 0 R ${answerNumber} 0 R ${buttonNumber} 0 R] /DR << /Font << /Helv ${fontNumber} 0 R >> >> /DA (/Helv 11 Tf 0 g) /NeedAppearances true >>`]);
  objects[1] = [`<< /Type /Catalog /Pages 2 0 R /AcroForm ${acroNumber} 0 R >>`]; objects[2] = [`<< /Type /Pages /Count 1 /Kids [${pageNumber} 0 R] >>`];
  objects[pageNumber] = [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${imageNumber} 0 R >> /Font << /Helv ${fontNumber} 0 R >> >> /Contents ${contentNumber} 0 R /Annots [${questionNumber} 0 R ${answerNumber} 0 R ${buttonNumber} 0 R ${liveNumber} 0 R] >>`];
  const infoNumber = add([`<< /Title (${escapePdf(documentData.title)} - Intelligent Offline PDF) /Creator (Web Terrarium) /Subject (${escapePdf(JSON.stringify(manifest))}) >>`]);

  const output: Uint8Array[] = [enc.encode("%PDF-1.7\n%WT-SMART\n")]; const offsets:number[]=[0]; let length=output[0].length;
  for(let i=1;i<objects.length;i++){offsets[i]=length;const body=concat(objects[i].map((part)=>typeof part==="string"?enc.encode(part):part));const bytes=concat([enc.encode(`${i} 0 obj\n`),body,enc.encode("\nendobj\n")]);output.push(bytes);length+=bytes.length;}
  const xref=length;output.push(enc.encode([`xref\n0 ${objects.length}\n0000000000 65535 f \n`,...offsets.slice(1).map((offset)=>`${String(offset).padStart(10,"0")} 00000 n \n`),`trailer\n<< /Size ${objects.length} /Root 1 0 R /Info ${infoNumber} 0 R >>\nstartxref\n${xref}\n%%EOF`].join("")));
  const bytes=concat(output);return { blob:new Blob([bytes.buffer as ArrayBuffer],{type:"application/pdf"}), manifest };
}

export function generateIntelligentPdf(documentData: LivingDocument, canonicalUrl: string) { return buildPdf(documentData, canonicalUrl); }
