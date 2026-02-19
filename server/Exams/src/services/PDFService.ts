import { v4 as uuidv4 } from "uuid";
import { PDFDocument } from "pdf-lib";
import { cloudinary } from "../config/cloudinary";

function extractPublicId(urlOrId: string): string {
  if (!urlOrId.startsWith("http")) return urlOrId;
  const match = urlOrId.match(/\/upload\/(?:v\d+\/)?(.+?)(\.[^.]+)?$/);
  return match ? match[1] : urlOrId;
}

export class PDFService {
  private maxSizeMB = 50;

  async savePDF(file: any): Promise<{ publicId: string; url: string }> {
    if (file.mimetype !== "application/pdf") {
      throw new Error("El archivo debe ser un PDF");
    }

    const originalSizeMB = file.buffer.length / (1024 * 1024);
    if (originalSizeMB > this.maxSizeMB) {
      throw new Error(`El PDF excede el tamaño máximo de ${this.maxSizeMB}MB`);
    }

    let pdfBuffer: Buffer;

    try {
      const pdfDoc = await PDFDocument.load(file.buffer);
      const compressed = await pdfDoc.save({ useObjectStreams: false });
      pdfBuffer = Buffer.from(compressed);

      const compressedMB = pdfBuffer.length / (1024 * 1024);
      const reduction = (((originalSizeMB - compressedMB) / originalSizeMB) * 100).toFixed(2);
      console.log(`📦 PDF comprimido: ${originalSizeMB.toFixed(2)}MB → ${compressedMB.toFixed(2)}MB (${reduction}% reducción)`);
    } catch {
      console.warn(`⚠️ No se pudo comprimir el PDF, subiendo original`);
      pdfBuffer = file.buffer;
    }

    const publicId = `exams/pdfs/${uuidv4()}`;

    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { public_id: publicId, resource_type: "raw" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(pdfBuffer);
    });

    console.log(`✅ PDF subido a Cloudinary: ${result.public_id}`);
    return { publicId: result.public_id, url: result.secure_url };
  }

  async deletePDF(urlOrPublicId: string): Promise<void> {
    try {
      const publicId = extractPublicId(urlOrPublicId);
      await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
      console.log(`🗑️ PDF eliminado de Cloudinary: ${publicId}`);
    } catch (error) {
      console.error(`Error eliminando PDF: ${urlOrPublicId}`, error);
    }
  }

  getPDFUrl(urlOrPublicId: string): string {
    if (urlOrPublicId.startsWith("http")) return urlOrPublicId;
    return cloudinary.url(urlOrPublicId, { secure: true, resource_type: "raw" });
  }

  async duplicatePDF(urlOrPublicId: string): Promise<string | null> {
    try {
      const originalPublicId = extractPublicId(urlOrPublicId);
      const newPublicId = `exams/pdfs/${uuidv4()}`;
      const result = await cloudinary.uploader.upload(
        cloudinary.url(originalPublicId, { secure: true, resource_type: "raw" }),
        { public_id: newPublicId, resource_type: "raw" }
      );
      return result.secure_url;
    } catch (error) {
      console.error(`Error duplicando PDF: ${urlOrPublicId}`, error);
      return null;
    }
  }

  async getPDFInfo(urlOrPublicId: string): Promise<any> {
    try {
      const publicId = extractPublicId(urlOrPublicId);
      const result = await cloudinary.api.resource(publicId, { resource_type: "raw" });
      return {
        publicId,
        sizeMB: result.bytes / (1024 * 1024),
        url: result.secure_url,
      };
    } catch (error) {
      console.error(`Error obteniendo info del PDF: ${urlOrPublicId}`, error);
      return null;
    }
  }
}

export const pdfService = new PDFService();