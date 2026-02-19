import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { cloudinary } from "../config/cloudinary";

function extractPublicId(urlOrId: string): string {
  if (!urlOrId.startsWith("http")) return urlOrId;
  // Extraer publicId desde URL de Cloudinary (sin extensión)
  const match = urlOrId.match(/\/upload\/(?:v\d+\/)?(.+?)(\.[^.]+)?$/);
  return match ? match[1] : urlOrId;
}

export class ImageService {
  async saveImage(file: any): Promise<{ publicId: string; url: string }> {
    const isGif = file.mimetype === "image/gif";

    let processedBuffer: Buffer;

    if (isGif) {
      processedBuffer = await sharp(file.buffer, { animated: true })
        .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
        .gif({ loop: 0, effort: 7, dither: 0.5 })
        .toBuffer();
    } else {
      processedBuffer = await sharp(file.buffer)
        .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
    }

    const publicId = `exams/images/${uuidv4()}`;

    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { public_id: publicId, resource_type: "image" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(processedBuffer);
    });

    console.log(`✅ Imagen subida a Cloudinary: ${result.public_id}`);
    return { publicId: result.public_id, url: result.secure_url };
  }

  async deleteImage(urlOrPublicId: string): Promise<void> {
    try {
      const publicId = extractPublicId(urlOrPublicId);
      await cloudinary.uploader.destroy(publicId);
      console.log(`🗑️ Imagen eliminada de Cloudinary: ${publicId}`);
    } catch (error) {
      console.error(`Error eliminando imagen: ${urlOrPublicId}`, error);
    }
  }

  getImageUrl(urlOrPublicId: string): string {
    if (urlOrPublicId.startsWith("http")) return urlOrPublicId;
    return cloudinary.url(urlOrPublicId, { secure: true });
  }

  async duplicateImage(urlOrPublicId: string): Promise<string | null> {
    try {
      const originalPublicId = extractPublicId(urlOrPublicId);
      const newPublicId = `exams/images/${uuidv4()}`;
      const result = await cloudinary.uploader.upload(
        cloudinary.url(originalPublicId, { secure: true }),
        { public_id: newPublicId, resource_type: "image" }
      );
      return result.secure_url;
    } catch (error) {
      console.error(`Error duplicando imagen: ${urlOrPublicId}`, error);
      return null;
    }
  }
}

export const imageService = new ImageService();