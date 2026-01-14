// src/controllers/PDFController.ts
import { Request, Response } from "express";
import { pdfService } from "@src/services/PDFService";

export class PDFController {
  static async get(req: Request, res: Response) {
    try {
      const { fileName } = req.params;
      const filePath = pdfService.getPDFPath(fileName);

      return res.sendFile(filePath);
    } catch (error: any) {
      return res.status(404).json({ message: "PDF no encontrado" });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const { fileName } = req.params;
      await pdfService.deletePDF(fileName);

      return res.status(200).json({ message: "PDF eliminado exitosamente" });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  static async getInfo(req: Request, res: Response) {
    try {
      const { fileName } = req.params;
      const info = await pdfService.getPDFInfo(fileName);

      if (!info) {
        return res.status(404).json({ message: "PDF no encontrado" });
      }

      return res.status(200).json(info);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const pdfs = await pdfService.listPDFs();
      return res.status(200).json({ pdfs });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }
}