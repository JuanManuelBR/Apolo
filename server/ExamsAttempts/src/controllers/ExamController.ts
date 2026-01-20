import { Request, Response, NextFunction } from "express";
import { ExamService } from "@src/services/ExamService";
import { validateDTO, throwValidationErrors } from "@src/validators/common";
import { CreateExamAttemptDto } from "@src/dtos/Create-Examttempt.dto";
import { CreateExamAnswerDto } from "@src/dtos/Create-ExamAnswer.dto";
import { CreateExamEventDto } from "@src/dtos/Create-ExamEvent.dto";
import { CreateExamInProgressDto } from "@src/dtos/Create-ExamInProgress.dto";

export class ExamController {
  static async createAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = await validateDTO(CreateExamAttemptDto, req.body);
      if (errors.length) throwValidationErrors(errors);

      const result = await ExamService.createAttempt(req.body, req.app.get("io"));
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async createAnswer(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = await validateDTO(CreateExamAnswerDto, req.body);
      if (errors.length) throwValidationErrors(errors);

      const result = await ExamService.createAnswer(req.body, req.app.get("io"));
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async createEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = await validateDTO(CreateExamEventDto, req.body);
      if (errors.length) throwValidationErrors(errors);

      const result = await ExamService.createEvent(req.body, req.app.get("io"));
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async createExamInProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = await validateDTO(CreateExamInProgressDto, req.body);
      if (errors.length) throwValidationErrors(errors);

      const result = await ExamService.createExamInProgress(req.body, req.app.get("io"));
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
}
