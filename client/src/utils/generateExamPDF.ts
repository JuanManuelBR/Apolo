import { jsPDF } from "jspdf";

// ─── Layout constants ─────────────────────────────────────────────────────────
const MARGIN = 20;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - MARGIN * 2;
const PAGE_H = 297;
const FOOTER_H = 18;
const MAX_Y = PAGE_H - FOOTER_H;

// ─── Grayscale palette ────────────────────────────────────────────────────────
const BLACK   = [0, 0, 0]         as const;
const GRAY_20 = [51, 51, 51]      as const; // near-black text
const GRAY_50 = [100, 100, 100]   as const; // secondary text
const GRAY_70 = [150, 150, 150]   as const; // light labels
const GRAY_90 = [220, 220, 220]   as const; // rules / borders


// ─── Helpers ──────────────────────────────────────────────────────────────────
function checkBreak(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > MAX_Y) {
    doc.addPage();
    return MARGIN + 10;
  }
  return y;
}

function writeWrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxW: number,
  leading = 5.2,
): number {
  const lines = doc.splitTextToSize(String(text ?? ""), maxW);
  for (const line of lines) {
    y = checkBreak(doc, y, leading);
    doc.text(line, x, y);
    y += leading;
  }
  return y;
}

function rule(doc: jsPDF, y: number, thick = false): number {
  y = checkBreak(doc, y, 4);
  doc.setDrawColor(...GRAY_90);
  doc.setLineWidth(thick ? 0.5 : 0.25);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  return y;
}

// ─── Image loader ─────────────────────────────────────────────────────────────
async function loadImage(
  url: string,
): Promise<{ base64: string; format: string; width: number; height: number } | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const format = blob.type.includes("png") ? "PNG" : blob.type.includes("gif") ? "GIF" : "JPEG";
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
    const { width, height } = await new Promise<{ width: number; height: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.src = base64;
    });
    return { base64, format, width, height };
  } catch {
    return null;
  }
}

// ─── Footer on every page ─────────────────────────────────────────────────────
function stampFooters(doc: jsPDF, examName: string) {
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    // thin rule above footer
    doc.setDrawColor(...GRAY_90);
    doc.setLineWidth(0.25);
    doc.line(MARGIN, PAGE_H - FOOTER_H + 2, PAGE_W - MARGIN, PAGE_H - FOOTER_H + 2);
    // left: exam name truncated
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY_70);
    const truncated = examName.length > 60 ? examName.slice(0, 57) + "…" : examName;
    doc.text(truncated, MARGIN, PAGE_H - FOOTER_H + 7);
    // right: page number
    const label = `Página ${p} de ${total}`;
    const lw = doc.getTextWidth(label);
    doc.text(label, PAGE_W - MARGIN - lw, PAGE_H - FOOTER_H + 7);
  }
}

// ─── Per-type renderers ───────────────────────────────────────────────────────

function renderTest(doc: jsPDF, q: any, y: number, withAnswers: boolean): number {
  const options: any[] = q.options ?? [];
  for (const opt of options) {
    const correct = opt.esCorrecta === true;
    y = checkBreak(doc, y, 6);
    doc.setFontSize(9.5);

    // Use drawn circles instead of Unicode characters (Unicode not supported by built-in Helvetica)
    const cx = MARGIN + 8.5;
    const cy = y - 1.8;

    doc.setLineWidth(0.3);
    if (withAnswers && correct) {
      doc.setFillColor(...GRAY_20);
      doc.setDrawColor(...GRAY_20);
      doc.circle(cx, cy, 1.5, "F"); // filled circle for correct answer
    } else {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...GRAY_50);
      doc.circle(cx, cy, 1.5, "S"); // open circle for regular option
    }

    // Reset draw/fill state after circle
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...BLACK);

    doc.setFont("helvetica", withAnswers && correct ? "bold" : "normal");
    doc.setTextColor(...GRAY_20);
    const lines = doc.splitTextToSize(opt.texto ?? "", CONTENT_W - 14);
    doc.text(lines, MARGIN + 12, y);
    y += lines.length * 5.2 + 1;
  }
  return y;
}

function renderOpen(doc: jsPDF, q: any, y: number, withAnswers: boolean): number {
  if (withAnswers) {
    const kws: any[] = q.keywords ?? [];
    const exact: string | null = q.textoRespuesta ?? null;

    if (kws.length > 0) {
      y = checkBreak(doc, y, 6);
      doc.setFont("helvetica", "bolditalic");
      doc.setFontSize(8.5);
      doc.setTextColor(...GRAY_50);
      doc.text("Palabras clave:", MARGIN + 6, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...GRAY_20);
      y = writeWrapped(doc, kws.map((k: any) => k.texto).join(",  "), MARGIN + 8, y, CONTENT_W - 8);
    }

    if (exact) {
      y = checkBreak(doc, y, 6);
      doc.setFont("helvetica", "bolditalic");
      doc.setFontSize(8.5);
      doc.setTextColor(...GRAY_50);
      doc.text("Respuesta exacta:", MARGIN + 6, y);
      y += 5;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9.5);
      doc.setTextColor(...GRAY_20);
      y = writeWrapped(doc, `"${exact}"`, MARGIN + 8, y, CONTENT_W - 8);
    }
  } else {
    // blank lines for student answer
    doc.setDrawColor(...GRAY_90);
    doc.setLineWidth(0.3);
    for (let i = 0; i < 4; i++) {
      y = checkBreak(doc, y, 8);
      doc.line(MARGIN + 6, y, PAGE_W - MARGIN, y);
      y += 8;
    }
  }
  return y;
}

function renderFillBlanks(doc: jsPDF, q: any, y: number, withAnswers: boolean): number {
  if (withAnswers) {
    if (q.textoCorrecto) {
      y = checkBreak(doc, y, 6);
      doc.setFont("helvetica", "bolditalic");
      doc.setFontSize(8.5);
      doc.setTextColor(...GRAY_50);
      doc.text("Texto completo:", MARGIN + 6, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...GRAY_20);
      y = writeWrapped(doc, q.textoCorrecto, MARGIN + 8, y, CONTENT_W - 8);
    }

    const blanks: any[] = (q.respuestas ?? []).slice().sort((a: any, b: any) => a.posicion - b.posicion);
    if (blanks.length > 0) {
      y = checkBreak(doc, y, 6);
      doc.setFont("helvetica", "bolditalic");
      doc.setFontSize(8.5);
      doc.setTextColor(...GRAY_50);
      doc.text("Respuestas por espacio:", MARGIN + 6, y);
      y += 5;
      for (const b of blanks) {
        y = checkBreak(doc, y, 5.5);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...GRAY_20);
        doc.text(`[${b.posicion}]  ${b.textoCorrecto}`, MARGIN + 8, y);
        y += 5.5;
      }
    }
  } else {
    if (q.textoCorrecto) {
      y = checkBreak(doc, y, 6);
      doc.setFont("helvetica", "bolditalic");
      doc.setFontSize(8.5);
      doc.setTextColor(...GRAY_50);
      doc.text("Texto completo:", MARGIN + 6, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...GRAY_20);
      y = writeWrapped(doc, q.textoCorrecto, MARGIN + 8, y, CONTENT_W - 8);
    }
  }
  return y;
}

function renderMatch(doc: jsPDF, q: any, y: number, withAnswers: boolean): number {
  const pares: any[] = q.pares ?? [];
  if (pares.length === 0) return y;

  const colA    = MARGIN + 6;
  const midX    = MARGIN + 6 + (CONTENT_W - 10) * 0.46;
  const colB    = midX + 10;

  // column headers
  y = checkBreak(doc, y, 7);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY_50);
  doc.text("Columna A", colA, y);
  if (withAnswers) doc.text("Columna B", colB, y);
  y += 1.5;
  y = rule(doc, y) + 3;

  for (const par of pares) {
    y = checkBreak(doc, y, 6);
    const textA = par.itemA?.text ?? "";
    const textB = par.itemB?.text ?? "";

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...GRAY_20);

    const linesA = doc.splitTextToSize(textA, midX - colA - 4);
    doc.text(linesA, colA, y);

    if (withAnswers) {
      doc.setTextColor(...GRAY_50);
      doc.text("—", midX, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...GRAY_20);
      const linesB = doc.splitTextToSize(textB, PAGE_W - MARGIN - colB - 2);
      doc.text(linesB, colB, y);
    }

    y += Math.max(linesA.length, 1) * 5.2 + 0.5;
  }
  return y;
}

// ─── Main export function ─────────────────────────────────────────────────────
export async function generateExamPDF(
  exam: any,
  incluirRespuestas: boolean,
  profesorName: string,
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const questions: any[] = exam.questions ?? [];
  const totalPts = questions.reduce((s: number, q: any) => s + (q.puntaje ?? 0), 0);
  const dateStr = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });

  let y = MARGIN + 6;

  // ── Cover / header block ───────────────────────────────────────────────────
  // Thick top rule
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(1);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 7;

  // Exam name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...BLACK);
  const titleLines = doc.splitTextToSize(exam.nombre ?? "Examen", CONTENT_W);
  for (const line of titleLines) {
    y = checkBreak(doc, y, 9);
    doc.text(line, MARGIN, y);
    y += 8;
  }
  y += 1;

  // Thin rule
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 5;

  // Meta row
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_20);
  doc.text(`Profesor: ${profesorName}`, MARGIN, y);
  doc.text(`Código: ${exam.codigoExamen ?? ""}`, MARGIN + 70, y);
  const dateW = doc.getTextWidth(`Fecha: ${dateStr}`);
  doc.text(`Fecha: ${dateStr}`, PAGE_W - MARGIN - dateW, y);
  y += 5.5;

  doc.text(`Preguntas: ${questions.length}`, MARGIN, y);
  doc.text(`Puntaje total: ${totalPts.toFixed(1)} pts`, MARGIN + 70, y);
  y += 5;

  // Thick bottom rule
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(1);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 10;

  // ── Questions ──────────────────────────────────────────────────────────────
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    y = checkBreak(doc, y, 10);

    // Score aligned to the right (with "(parcial)" indicator when applicable)
    const pts = q.puntaje ?? 0;
    const parcialSuffix = q.calificacionParcial === true ? " (parcial)" : "";
    const scoreStr = `${pts} pt${pts !== 1 ? "s" : ""}${parcialSuffix}`;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_50);
    const sw = doc.getTextWidth(scoreStr);
    doc.text(scoreStr, PAGE_W - MARGIN - sw, y);

    // Question number + enunciado on the same line
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...BLACK);
    doc.text(`${i + 1}.`, MARGIN, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY_20);
    const enunciadoLines = doc.splitTextToSize(q.enunciado ?? "", CONTENT_W - sw - 12);
    doc.text(enunciadoLines, MARGIN + 8, y);
    y += enunciadoLines.length * 5.5 + 3;

    // Note for open questions with no automatic evaluation (manual grading)
    if (q.type === "open" && (!q.keywords || q.keywords.length === 0) && !q.textoRespuesta) {
      y = checkBreak(doc, y, 5);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(...GRAY_50);
      doc.text("Calificación manual por el profesor", MARGIN + 8, y);
      y += 5;
    }

    // Question image — centered, below enunciado/note
    if (q.nombreImagen) {
      const img = await loadImage(q.nombreImagen);
      if (img) {
        const PX_TO_MM = 0.264583;
        const maxW = CONTENT_W * 0.6; // max 60% of content width
        const maxH = 50;
        let imgW = img.width * PX_TO_MM;
        let imgH = img.height * PX_TO_MM;
        if (imgW > maxW) { imgH = imgH * (maxW / imgW); imgW = maxW; }
        if (imgH > maxH) { imgW = imgW * (maxH / imgH); imgH = maxH; }
        const imgX = MARGIN + (CONTENT_W - imgW) / 2; // centered
        y = checkBreak(doc, y, imgH + 4);
        doc.addImage(img.base64, img.format, imgX, y, imgW, imgH);
        y += imgH + 4;
      }
    }

    // Answer / options
    switch (q.type) {
      case "test":        y = renderTest(doc, q, y, incluirRespuestas); break;
      case "open":        y = renderOpen(doc, q, y, incluirRespuestas); break;
      case "fill_blanks": y = renderFillBlanks(doc, q, y, incluirRespuestas); break;
      case "match":       y = renderMatch(doc, q, y, incluirRespuestas); break;
    }

    y += 4;

    // Divider between questions
    if (i < questions.length - 1) {
      y = checkBreak(doc, y, 5);
      doc.setDrawColor(...GRAY_90);
      doc.setLineWidth(0.25);
      doc.line(MARGIN, y, PAGE_W - MARGIN, y);
      y += 7;
    }
  }

  stampFooters(doc, exam.nombre ?? "Examen");

  const safe = (exam.nombre ?? "examen").replace(/[/\\?%*:|"<>]/g, "-");
  const suffix = incluirRespuestas ? " (respuestas)" : "";
  doc.save(`${safe}${suffix}.pdf`);
}
