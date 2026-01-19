import { ExamsController } from "@src/controllers/ExamController";
import { Router } from "express";

import { authenticateToken } from "@src/middlewares/auth";
import { upload } from "@src/middlewares/upload";
import { authorizeExamOwner } from "@src/middlewares/authorization";

const router = Router();

router.get("/:codigoExamen", ExamsController.getExamByCodigo);

router.post("/", upload.any(), ExamsController.addExam, authenticateToken);

router.get("/", ExamsController.listExams, authenticateToken);

router.get("/", ExamsController.listExams, authenticateToken);

router.get(
  "/me",
  authenticateToken,
  ExamsController.getExamsByUser,

  authorizeExamOwner,
);

router.delete("/:id", ExamsController.deleteExamsByUser, authenticateToken);

export default router;
