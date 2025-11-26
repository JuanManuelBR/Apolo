import { ExamsController } from "./ExamController";
import { QuestionService } from "@src/services/QuestionsService";
import { Request, Response } from "express";
import { creado_test_question_dto } from "@src/types/Question";

const questionService = new QuestionService();

export class QuestionsController {
  static async createTestQuestion(req: Request, res: Response) {
    try {
      const data: creado_test_question_dto = req.body;
      const question = await questionService.addTestType(data);
      return res.status(201).json({
        success: true,
        data: question,
      });
    } catch (error) {
      console.error("Error en createTestQuestion:", error);
      return res.status(500).json({
        success: false,
        message: "Error al crear la pregunta",
      });
    }
  }
}
