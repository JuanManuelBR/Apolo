import { NextFunction, Request, Response } from "express";
import { ExamService } from "@src/services/ExamsService";
import { throwHttpError } from "@src/utils/errors";

const exam_service = new ExamService();

export class ExamsController {
  static async addExam(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body;
      const cookies = req.headers.cookie;

      const examen = await exam_service.addExam(data, cookies);

      return res.status(201).json({
        message: "Examen creado correctamente",
        examen,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listExams(req: Request, res: Response, next: NextFunction) {
    try {
      const examenes = await exam_service.listExams();

      return res.status(200).json(examenes);
    } catch (error) {
      next(error);
    }
  }

  static async getExamsByUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.params.id);

      if (isNaN(userId)) {
        throwHttpError("ID de usuario inválido", 400);
      }

      const examenes = await exam_service.getExamsByUser(
        userId,
        req.headers.cookie
      );

      return res.status(200).json(examenes);
    } catch (error) {
      next(error);
    }
  }

  static async deleteExamsByUser(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = Number(req.params.id);

      if (isNaN(userId)) {
        throwHttpError("ID de usuario inválido", 400);
      }

      await exam_service.deleteExamsByUser(userId, req.headers.cookie);

      return res.status(200).json({
        message: "Exámenes eliminados correctamente",
      });
    } catch (error) {
      next(error);
    }
  }
}
